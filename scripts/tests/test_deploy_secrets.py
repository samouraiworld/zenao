"""Execute the real deployment shell blocks with dummy credentials and local stubs.

No SSH, network, Docker daemon, credential store, or user's home is accessed.
"""

import os
from pathlib import Path
import re
import shlex
import shutil
import stat
import subprocess
import tempfile
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[2]
HELPER = ROOT / "scripts/update-stripe-env.sh"
WORKFLOWS = ROOT / ".github/workflows"
SECRET = "sk_test_fixture_'\"|&$(touch injected)-not-a-real-key"


def step(file, name):
    """Extract one uniquely named step without installing a YAML dependency.

    actionlint separately validates YAML. Fail closed if the layout changes.
    """
    blocks = re.split(r"(?m)^      - ", (WORKFLOWS / file).read_text())[1:]
    matches = [b for b in blocks if b.startswith(f"name: {name}\n")]
    if len(matches) != 1:
        raise AssertionError(f"Expected one workflow step: {file}/{name}")
    return matches[0]


def literal(block, field, indent):
    lines = block.splitlines(keepends=True)
    marker = " " * indent + field + ": |\n"
    index = lines.index(marker)
    body = []
    for line in lines[index + 1 :]:
        if line.strip() and not line.startswith(" " * (indent + 2)):
            break
        body.append(line)
    return textwrap.dedent("".join(body))


def transferred_script(block, script, values):
    # Mirror drone-ssh's quoted env transfer, including the workflow's trace guard.
    prefix = literal(block, "envs_format", 10)
    names = re.search(r"(?m)^          envs: (.+)$", block).group(1).split(",")
    exports = "".join(
        prefix.replace("{NAME}", name).replace("{VALUE}", shlex.quote(values[name]))
        for name in names
    )
    return exports + script


class DeploymentSecretsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "zenao"
        (self.repo / "scripts").mkdir(parents=True)
        shutil.copyfile(HELPER, self.repo / "scripts/update-stripe-env.sh")
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.log = self.root / "commands"
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ["PATH"])
        self.env["FIXTURE_COMMAND_LOG"] = str(self.log)
        self.env["STRIPE_SECRET_KEY"] = SECRET
        for command in ["git", "docker"]:
            self.stub(command, 'printf "%s\\n" "$0 $*" >> "$FIXTURE_COMMAND_LOG"\n')

    def stub(self, name, body):
        path = self.bin / name
        path.write_text("#!/bin/sh\n" + body)
        path.chmod(0o700)

    def execute(self, script, cwd=None, env=None):
        # Start with BOTH diagnostic modes enabled. Secret transfer must turn
        # them off before exporting the dummy value, not after the export.
        result = subprocess.run(
            ["bash", "-evx", "-o", "pipefail", "-c", script],
            cwd=cwd or self.root,
            env=env or self.env,
            text=True,
            capture_output=True,
            timeout=10,
        )
        self.assertNotIn(SECRET, result.stdout + result.stderr)
        self.assertFalse((self.root / "injected").exists())
        self.assertFalse((self.repo / "injected").exists())
        return result

    def test_actual_remote_upgrades_keep_value_data_and_deploy_order(self):
        for file, name, compose in [
            ("deploy-prod.yml", "Upgrade backend", "prod.backend.docker-compose.yml"),
            ("deploy-staging.yml", "Upgrade services", "staging.docker-compose.yml"),
        ]:
            with self.subTest(file=file):
                target = self.repo / "backend.env"
                target.write_text("UNRELATED=retained\nZENAO_STRIPE_SECRET_KEY=old\n")
                target.chmod(0o640)
                self.log.write_text("")
                block = step(file, name)
                self.assertIn("          debug: false\n", block)
                self.assertIn("          allenvs: false\n", block)
                script = transferred_script(block, literal(block, "script", 10), {"STRIPE_SECRET_KEY": SECRET})
                result = self.execute(script)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(target.read_text(), f"UNRELATED=retained\nZENAO_STRIPE_SECRET_KEY={SECRET}\nZENAO_PAID_EVENTS_ENABLED=true\n")
                self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o640)
                commands = self.log.read_text()
                self.assertNotIn(SECRET, commands)
                expected = [
                    f"docker compose -f {compose} up -d --wait otel-collector jaeger",
                    f"git restore {compose}",
                    f"docker compose -f {compose} up -d --build backend",
                ]
                self.assertEqual([line.split("/bin/")[1] for line in commands.splitlines()], expected)

    def test_standalone_configuration_needs_no_new_remote_helper(self):
        (self.repo / "scripts/update-stripe-env.sh").unlink()
        block = step("configure-staging-stripe.yml", "Configure Stripe env vars + add admin SSH key")
        # Exclude the unchanged authorized_keys operation; never touch HOME.
        script = literal(block, "script", 10).split("# Add Stripe + app config to backend.env (idempotent)\n", 1)[1]
        script = 'set -e\nAPP_BASE_URL="https://deploy-preview-123--zenao.netlify.app"\n' + script
        script = transferred_script(block, script, {"PR_NUMBER": "123", "STRIPE_SECRET_KEY": SECRET})
        result = self.execute(script)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.repo / "backend.env").read_text(), f"ZENAO_STRIPE_SECRET_KEY={SECRET}\nZENAO_PAID_EVENTS_ENABLED=true\nZENAO_APP_BASE_URL=https://deploy-preview-123--zenao.netlify.app\n")
        self.assertEqual(stat.S_IMODE((self.repo / "backend.env").stat().st_mode), 0o600)

    def test_symlink_target_is_not_overwritten(self):
        outside = self.root / "outside.env"
        outside.write_text("UNRELATED=retained\n")
        (self.repo / "backend.env").symlink_to(outside)
        result = self.execute("sh scripts/update-stripe-env.sh", cwd=self.repo)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(outside.read_text(), "UNRELATED=retained\n")
        self.assertTrue((self.repo / "backend.env").is_symlink())

    def test_invalid_or_failed_write_keeps_original_and_stops_docker(self):
        target = self.repo / "backend.env"
        original = "UNRELATED=retained\nZENAO_STRIPE_SECRET_KEY=old\n"
        block = step("deploy-prod.yml", "Upgrade backend")
        for value in ["", "line1\nline2", "line1\rline2"]:
            with self.subTest(value_kind=repr(value)):
                target.write_text(original)
                self.log.write_text("")
                script = transferred_script(block, literal(block, "script", 10), {"STRIPE_SECRET_KEY": value})
                result = self.execute(script)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(target.read_text(), original)
                self.assertEqual(self.log.read_text(), "")
                self.assertEqual(list(self.repo.glob("backend.env.tmp.*")), [])
        # Force the data-writing awk invocation to fail, after validation/copy.
        real_awk = shutil.which("awk")
        self.stub("awk", f'if [ "$#" -eq 1 ]; then exec {shlex.quote(real_awk)} "$@"; fi\nexit 7\n')
        target.write_text(original)
        result = self.execute(transferred_script(block, literal(block, "script", 10), {"STRIPE_SECRET_KEY": SECRET}))
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(target.read_text(), original)
        self.assertEqual(list(self.repo.glob("backend.env.tmp.*")), [])

    def test_backup_and_atlas_receive_secrets_without_source_or_argv(self):
        for file, environment in [("deploy-prod.yml", "prod"), ("deploy-staging.yml", "staging")]:
            with self.subTest(file=file):
                # These local substitutes inspect inputs but log only booleans.
                self.stub("curl", 'test "$1" = -q || exit 9\ncase "$*" in *"$TURSO_API_TOKEN"*) exit 12;; esac\ncase "$*" in *"--output /dev/null"*) ;; *) exit 13;; esac\nheaders=$(cat)\ncase "$headers" in *"$TURSO_API_TOKEN"*) ;; *) exit 10;; esac\nexit "${FIXTURE_CURL_EXIT:-0}"\n')
                # Even a tool that echoes its full token-bearing URL on failure
                # must not leak that output through the workflow.
                self.stub("atlas", 'test -n "$TURSO_TOKEN" || exit 11\ncase "$*" in *"$TURSO_TOKEN"*) exit 12;; esac\nprintf "%s\\n" "$TURSO_TOKEN"\nprintf "%s\\n" "$TURSO_TOKEN" >&2\nexit "${FIXTURE_ATLAS_EXIT:-0}"\n')
                env = dict(self.env, TURSO_API_TOKEN=SECRET, TURSO_TOKEN=SECRET)
                for name in ["Backup DB", "Migrate DB"]:
                    block = step(file, name)
                    script = literal(block, "run", 8).replace("${{ steps.date.outputs.date }}", "fixture-date")
                    self.assertNotIn("${{ secrets.", script)
                    result = self.execute(script, env=env)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    failed = dict(env, FIXTURE_CURL_EXIT="7", FIXTURE_ATLAS_EXIT="7")
                    result = self.execute(script, env=failed)
                    self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
