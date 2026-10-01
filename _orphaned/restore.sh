#!/usr/bin/env bash
# Restore every isolated file to its original path.
# Each move is independent: a failure on one does not stop the rest.
set -u
cd "$(dirname "$0")/.." || exit 1
restored=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if [ -e "$f" ]; then
    echo "skip (already exists): $f"
    continue
  fi
  mkdir -p "$(dirname "$f")"
  if git mv "_orphaned/$f" "$f" 2>/dev/null; then
    restored=$((restored + 1))
  else
    mv "_orphaned/$f" "$f" && restored=$((restored + 1))
  fi
done < <(python3 -c "import json;print(chr(10).join(json.load(open('_orphaned/manifest.json'))['files']))")
echo "restored: $restored"
