#!/bin/sh
# Run from the deployment checkout. No credential is accepted as an argument.
# Disable both shell trace modes before reading credential data.
set +vx
set -eu

if ! awk 'BEGIN {
    value = ENVIRON["STRIPE_SECRET_KEY"]
    if (value == "" || index(value, "\r") || index(value, "\n")) exit 1
}' </dev/null; then
    printf '%s\n' 'Stripe credential must be a nonempty single line' >&2
    exit 1
fi

if [ -L backend.env ] || { [ -e backend.env ] && [ ! -f backend.env ]; }; then
    printf '%s\n' 'Refusing a non-regular backend.env' >&2
    exit 1
fi

umask 077
stripe_env_tmp=$(mktemp backend.env.tmp.XXXXXX)
trap 'rm -f "$stripe_env_tmp"' 0
trap 'exit 1' HUP INT TERM

# Retain the existing file's mode; a new environment file starts private.
stripe_env_input=/dev/null
if [ -f backend.env ]; then
    cp -p backend.env "$stripe_env_tmp"
    stripe_env_input=backend.env
fi

# Credential bytes stay data in ENVIRON, not shell source, sed syntax or argv.
if ! awk '
    /^ZENAO_STRIPE_SECRET_KEY=/ {
        print "ZENAO_STRIPE_SECRET_KEY=" ENVIRON["STRIPE_SECRET_KEY"]
        found = 1
        next
    }
    { print }
    END {
        if (!found) print "ZENAO_STRIPE_SECRET_KEY=" ENVIRON["STRIPE_SECRET_KEY"]
    }
' "$stripe_env_input" >"$stripe_env_tmp"; then
    printf '%s\n' 'Unable to prepare Stripe environment update' >&2
    exit 1
fi

mv "$stripe_env_tmp" backend.env
