#!/usr/bin/env bash
# Builds a throwaway Quartz site with this plugin installed, so a change to
# Quartz's own plugin API fails here rather than in someone's published site.
#
# This smoke test deliberately installs a pushed remote ref to exercise the real
# plugin installer. Pass a ref to check a branch other than main.
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_spec="${1:-github:grafanaKibana/quartz-tabsdown#main}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "→ plugin source: $source_spec"
git clone -q --depth 1 --branch v5 https://github.com/jackyzha0/quartz.git "$work/quartz"
cd "$work/quartz"
echo "→ quartz $(node -p "require('./package.json').version") at $(git rev-parse --short HEAD)"
npm install --no-audit --no-fund --silent
cp quartz.config.default.yaml quartz.config.yaml

mkdir -p content
cat > content/target.md <<'NOTE'
---
title: Target
---

Target body.
NOTE

cp "$script_dir/../test/fixtures/quartz-smoke.md" content/index.md

node ./quartz/bootstrap-cli.mjs plugin add "$source_spec"
node ./quartz/bootstrap-cli.mjs build

node "$script_dir/check-quartz-smoke.mjs" public/index.html
