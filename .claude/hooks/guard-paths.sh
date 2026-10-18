#!/bin/sh
# PreToolUse (Edit|Write): refuse edits to files that are generated, package-manager owned, secret or the
# maintainer's own (licence, logo). The reason tells Claude what to do instead.

input=$(cat)
file=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{let j={};try{j=JSON.parse(d)}catch{}process.stdout.write((j.tool_input&&(j.tool_input.file_path||j.tool_input.notebook_path))||"")})')
[ -n "$file" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in /*) ;; *) file="$root/$file" ;; esac

deny() {
  printf '%s' "$1" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:d}})))'
  exit 0
}

case "$file" in
  "$root"/web/src/protocol/generated/*)
    deny "web/src/protocol/generated/ is ts-rs output: change server/src/protocol.rs and run just protocol (skill protocol-change)." ;;
  */pnpm-lock.yaml)
    deny "pnpm-lock.yaml is owned by pnpm: change dependencies with pnpm add/remove, and only ones the maintainer agreed to." ;;
  */Cargo.lock)
    deny "Cargo.lock is owned by cargo: change dependencies with cargo add/remove, and only ones the maintainer agreed to." ;;
  "$root"/LICENSE)
    deny "Changing the licence is the maintainer's call: propose it instead (docs/decisions/0004-licence.md)." ;;
  "$root"/brand/logo.svg)
    deny "The logo is a brand asset, all rights reserved and not AGPL (brand/README.md): propose a change instead of making it." ;;
  */.env.example) ;;
  */.env|*/.env.*)
    deny "$(basename "$file") holds local secrets and is never edited by an agent; document new variables in the README or .env.example instead." ;;
esac

exit 0
