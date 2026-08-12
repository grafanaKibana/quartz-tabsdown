# Development and verification

Install dependencies and run the local checks:

```bash
npm install
npm run check
```

## Smoke test against Quartz

```bash
npm run check:quartz
```

This command clones Quartz's moving `v5` branch, installs quartz-tabsdown into a temporary site, builds it, and checks the emitted HTML. Quartz accepts only remote plugin sources, so the command tests a pushed ref rather than the working tree:

```bash
npm run check:quartz -- 'github:grafanaKibana/quartz-tabsdown#my-branch'
```

CI also runs the smoke test weekly to catch Quartz changes.

## Check Obsidian parity

```bash
npm run check:upstream -- <40-character-obsidian-pr-head-sha>
```

`src/parser.ts` and `test/parser.test.ts` are vendored from [obsidian-tabsdown](https://github.com/grafanaKibana/obsidian-tabsdown). The same machine-readable contract drives style validation.

The check builds the package, fetches the requested upstream commit, and reports:

- parser files that no longer match;
- added, removed, or renamed Style Settings controls;
- changed types, defaults, enum values, ranges, steps, or units;
- numeric, color, or toggle controls without a plugin-owned CSS rule.

Push and pull-request CI pin the exact Obsidian implementation SHA. Running `npm run check:upstream` without one resolves `main` for the weekly drift check.
