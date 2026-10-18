#!/bin/sh
# Stop: when this session edited code, block the end of the turn while clippy, typecheck or a touched story fails.
# Gives up after two blocks so a stuck check gets reported instead of looping. CLAUDE_SKIP_VERIFY=1 skips it.

input=$(cat)
session=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{let j={};try{j=JSON.parse(d)}catch{}process.stdout.write(j.session_id||"default")})')
tmp="${TMPDIR:-/tmp}"
marker="$tmp/bamdoodle-dirty-$session"
counter="$tmp/bamdoodle-stop-blocks-$session"

[ -f "$marker" ] || exit 0
[ "${CLAUDE_SKIP_VERIFY:-}" = "1" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$root" || exit 0

blocks=$(cat "$counter" 2>/dev/null || echo 0)
if [ "$blocks" -ge 2 ]; then
  rm -f "$marker" "$counter"
  printf '{"systemMessage":"verify-stop: still failing after two blocks; letting the turn end. Report the failure instead of working around it."}\n'
  exit 0
fi

block() {
  echo $((blocks + 1)) > "$counter"
  printf '%s' "$1" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(JSON.stringify({decision:"block",reason:d})))'
  exit 0
}

changed=$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u)

if printf '%s\n' "$changed" | grep -q '^server/'; then
  output=$(cd server && cargo clippy --all-targets --quiet -- -D warnings 2>&1) || block "cargo clippy failed, fix before finishing:
$(printf '%s\n' "$output" | head -40)"
  if printf '%s\n' "$changed" | grep -q '^server/src/protocol.rs'; then
    (cd server && cargo test --quiet export_bindings >/dev/null 2>&1)
  fi
fi

if printf '%s\n' "$changed" | grep -q '^web/' && [ -x web/node_modules/.bin/tsc ]; then
  output=$(cd web && node_modules/.bin/tsc -b 2>&1) || block "typecheck failed (tsc -b in web/), fix before finishing:
$(printf '%s\n' "$output" | head -40)"
  stories=$(printf '%s\n' "$changed" | grep -E '^web/src/.*\.stories\.tsx$' | sed 's#^web/##' | while read -r story; do [ -f "web/$story" ] && echo "$story"; done | head -8)
  if [ -n "$stories" ]; then
    output=$(cd web && node_modules/.bin/vitest run --project=storybook $stories 2>&1) || block "story tests failed in $(printf '%s' "$stories" | tr '\n' ' '), fix before finishing:
$(printf '%s\n' "$output" | tail -60)"
  fi
fi

rm -f "$marker" "$counter"
exit 0
