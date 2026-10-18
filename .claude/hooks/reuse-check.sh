#!/bin/sh
# PreToolUse (Write): before a new component, hook, utils or Rust module is created, list existing files whose
# names share a word with it, so Claude extends what exists instead of building a second one (AGENTS.md: reuse first).

input=$(cat)
file=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{let j={};try{j=JSON.parse(d)}catch{}process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")})')
[ -n "$file" ] || exit 0
[ -e "$file" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in
  "$root"/web/src/*.component.tsx|"$root"/web/src/*.hook.ts|"$root"/web/src/*.hook.tsx|"$root"/web/src/*.utils.ts) ;;
  "$root"/server/src/*.rs) ;;
  *) exit 0 ;;
esac

base=$(basename "$file")
name=${base%%.*}
words=$(printf '%s' "$name" \
  | sed -E 's/([a-z0-9])([A-Z])/\1 \2/g; s/([A-Z]+)([A-Z][a-z])/\1 \2/g; s/[_-]/ /g' \
  | tr '[:upper:]' '[:lower:]' | tr ' ' '\n' \
  | grep -v -E '^(use|component|hook|utils|util|button|list|item|view|panel|modal|dialog|form|input|label|card|state|types|test|tests|main|with|from|the|and|new)$' \
  | awk 'length($0) >= 4' | sort -u)
[ -n "$words" ] || exit 0

matches=""
for word in $words; do
  found=$(find "$root/web/src/components" "$root/web/src/app" "$root/web/src/protocol" "$root/server/src" -type f \
      \( -name "*.ts" -o -name "*.tsx" -o -name "*.rs" \) -iname "*$word*" 2>/dev/null \
    | grep -v -E '\.stories\.tsx$|\.test\.ts$|/generated/' | sed "s|^$root/||" | head -6)
  [ -n "$found" ] && matches="$matches$found
"
done
matches=$(printf '%s' "$matches" | sort -u | head -10)
[ -n "$matches" ] || exit 0

wordList=$(printf '%s' "$words" | tr '\n' ' ')
fileList=$(printf '%s' "$matches" | tr '\n' ' ')
printf 'reuse-check: %s does not exist yet. Existing files whose names match (%s): %s. If one of them covers the need, extend it instead (AGENTS.md: reuse first); otherwise continue.' "$base" "$wordList" "$fileList" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:d}})))'
exit 0
