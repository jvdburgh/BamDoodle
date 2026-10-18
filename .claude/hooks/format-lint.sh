#!/bin/sh
# PostToolUse: format the edited file, lint it, and mark the session dirty for verify-stop.sh.
# Errors block (exit 2); oxlint warnings come back as context so they get fixed while the file is open.

input=$(cat)
fields=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{let j={};try{j=JSON.parse(d)}catch{}process.stdout.write(((j.tool_input&&j.tool_input.file_path)||"")+"\n"+(j.session_id||"default"))})')
file=$(printf '%s' "$fields" | sed -n '1p')
session=$(printf '%s' "$fields" | sed -n '2p')
[ -n "$file" ] && [ -f "$file" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$root" || exit 0
marker="${TMPDIR:-/tmp}/bamdoodle-dirty-$session"

case "$file" in
  "$root"/server/*.rs)
    touch "$marker"
    output=$(cd server && rustfmt --edition 2024 "$file" 2>&1) || { printf 'rustfmt failed on %s:\n%s\n' "$file" "$output" >&2; exit 2; }
    ;;
  "$root"/web/*.ts|"$root"/web/*.tsx|"$root"/web/*.css|"$root"/web/*.json|"$root"/web/*.md)
    touch "$marker"
    bin="$root/web/node_modules/.bin"
    [ -x "$bin/oxfmt" ] || exit 0
    case "$file" in */protocol/generated/*) exit 0 ;; esac
    output=$(cd web && "$bin/oxfmt" "$file" 2>&1) || { printf 'oxfmt failed on %s:\n%s\n' "$file" "$output" >&2; exit 2; }
    case "$file" in
      *.ts|*.tsx)
        output=$(cd web && "$bin/oxlint" "$file" 2>&1) || { printf '%s\n' "$output" >&2; exit 2; }
        if printf '%s' "$output" | grep -q ': warning '; then
          printf 'oxlint warnings in the file you just edited; fix them now:\n%s' "$output" \
            | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:d}})))'
        fi
        ;;
    esac
    ;;
  "$root"/AGENTS.md|"$root"/CLAUDE.md|"$root"/.claude/*.md|"$root"/.github/*.md)
    touch "$marker"
    ;;
esac
exit 0
