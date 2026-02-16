#!/usr/bin/env bash
# Helper script to purge sensitive files/strings from git history.
# This script only emits recommended commands; run them locally.

set -euo pipefail

echo "This script shows recommended commands to purge secrets from git history. Read and run them locally."

cat <<'EOF'
# Example using git filter-repo (recommended):
# 1) Install: pip install git-filter-repo
# 2) Make a backup branch: git branch backup-before-purge
# 3) Run to remove specific file(s) or paths (here: server.log):
#    git filter-repo --invert-paths --paths server.log
# 4) Force-push rewritten history to remote (careful! coordinate with team):
#    git remote add origin <URL> # if not set
#    git push --force --all
#    git push --force --tags

# Example using BFG (alternative):
# 1) Download BFG jar
# 2) Create a list of sensitive files/strings and run:
#    java -jar bfg.jar --delete-files server.log
#    git reflog expire --expire=now --all && git gc --prune=now --aggressive
#    git push --force

echo "Read the commands above and run them in a cloned local repo. Coordinate secret rotation if any real secrets were exposed."
EOF
