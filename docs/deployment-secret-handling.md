# Deployment secret handling

This source change removes credential interpolation from the production,
staging and standalone staging-Stripe shell programs. It does not deploy,
recover host access, attest the running binary, rotate a key or establish that
an earlier log leaked a secret.

Stripe values use named SSH-action environment transfer. Its explicit
`envs_format` disables verbose/xtrace before each quoted export; action debug
and implicit all-environment forwarding remain off. The shell scripts also
disable both trace modes. The writer reads the value as environment data,
rejects empty/multiline values, preserves unrelated lines and existing mode,
and replaces `backend.env` only after preparing its complete replacement. A
new file is private. The writer keeps values out of sed programs, its shell
program and its tool arguments. SSH environment bootstrap still serializes a
quoted export into the remote command; the SSH server may expose that command
through process inspection. This relies on the trusted action/host boundary and
does not promise secret-free SSH transport command text or remote process argv.
The standalone workflow embeds the same writer because it does not
perform a checkout and must not depend on a newer helper on the server.

Turso backup headers travel through curl stdin; curl configuration and response
body output are disabled. Atlas reads its token through the existing
`TURSO_TOKEN` environment contract. Its stdout/stderr are intentionally withheld
because a failed migration can include the libsql URL's authentication query.
The step retains a generic failure and the existing maintenance rollback
condition. This trades raw migration diagnostics for a bounded logging surface;
do not recover those diagnostics by enabling trace or printing credentials.

Hosts, SSH trust configuration, credentials, action versions, manual dispatch
triggers, maintenance/backup/migration ordering and Compose targets are retained.
No SSH trust is certified: the known production host-key mismatch, provider
rescue-mode observation, current backend/DB/platform identity, legacy onboarding
disposition and deliberate rollout review remain blockers. Do not dispatch any
deployment/configuration workflow just to test this source fix. Standalone
staging configuration still has its existing authorized-key addition and
backend restart behavior; it is not a read-only diagnostic.

Run `python3 -B -m unittest discover -s scripts/tests -p 'test_deploy_secrets.py' -v`
for offline dummy-secret fixtures. They execute the real shell blocks with
local git/Docker/curl/Atlas substitutes, including inherited verbose/xtrace,
metacharacters, first-file creation, permission preservation, malformed input,
forced write failure and a migration tool echoing its token on both streams.
They do not access SSH, a network, real credentials or the user's home. They
prove these bounded shell/logging paths, not all possible logging by GitHub,
third-party actions, remote startup policy or a compromised host.

The SSH environment interface and quoting behavior are documented by
[ssh-action](https://github.com/appleboy/ssh-action/blob/v1/action.yml) and
[drone-ssh 1.8.2](https://github.com/appleboy/drone-ssh/blob/v1.8.2/plugin.go).
The inherited floating `@v1` action reference is unchanged; dependency pinning
or changing host fingerprints requires its own reviewed scope.
