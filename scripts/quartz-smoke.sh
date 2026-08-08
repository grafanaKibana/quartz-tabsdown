#!/usr/bin/env bash
# Builds a throwaway Quartz site with this plugin installed, so a change to
# Quartz's own plugin API fails here rather than in someone's published site.
#
# Quartz only accepts remote plugin sources, so this tests a pushed ref rather
# than the working tree. Pass a ref to check a branch other than main.
set -euo pipefail

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

cat > content/index.md <<'NOTE'
---
title: Smoke
---

````tabsdown
config: top, multi

tab: icon:code **Outer**

A [[target|wikilink]] and a ==highlight==.

> [!note] Callout
> Callout body.

```tabsdown
tab: Inner A
tab: Inner B
```

tab: [Second](https://example.test) <img src=x>
````
NOTE

node ./quartz/bootstrap-cli.mjs plugin add "$source_spec"
node ./quartz/bootstrap-cli.mjs build

html=public/index.html
status=0
expect() {
  if grep -q -- "$2" "$html"; then
    echo "  ok    $1"
  else
    echo "  FAIL  $1"
    status=1
  fi
}
reject() {
  if grep -q -- "$2" "$html"; then
    echo "  FAIL  $1"
    status=1
  else
    echo "  ok    $1"
  fi
}

echo "→ checking $html"
expect "tab list rendered" 'class="tabsdown__tablist"'
expect "panels rendered" 'class="tabsdown__panel"'
expect "block config applied" 'tabsdown--top tabsdown--multi'
expect "Lucide icon inlined" 'tabsdown__tab-icon'
expect "bounded label formatting rendered" '<span class="tabsdown__tab-label"><strong>Outer</strong></span>'
expect "unsupported label syntax stayed literal" '\[Second\](https://example.test) &#x3C;img src=x>'
expect "nested block rendered" 'tabsdown--top tabsdown--one'
expect "no-JS panel labels present" 'class="tabsdown__panel-label"'
expect "styles injected" '.tabsdown__tablist'
# These three only survive when this plugin runs before Obsidian Flavored
# Markdown, so they are the regression guard for plugin ordering.
expect "wikilink resolved inside a tab" 'internal-link'
expect "highlight converted inside a tab" 'text-highlight'
expect "callout rendered inside a tab" 'data-callout="note"'
reject "no raw tabsdown fence left behind" 'language-tabsdown'

exit $status
