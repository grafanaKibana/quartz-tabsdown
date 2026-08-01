# quartz-tabsdown

Tabbed Markdown blocks for [Quartz](https://quartz.jzhao.xyz/), using the same syntax as the [Obsidian Tabsdown](https://github.com/grafanaKibana/obsidian-tabsdown) plugin. A vault that already authors `tabsdown` blocks publishes them as real tabs instead of leaking the raw fence into the built site.

## Install

```bash
npx quartz plugin add github:grafanaKibana/quartz-tabsdown
```

```yaml
# quartz.config.yaml
plugins:
  - source: github:grafanaKibana/quartz-tabsdown
    enabled: true
```

Or wire it up directly in `quartz.ts`:

```typescript
import { Tabsdown } from "quartz-tabsdown";

transformers: [Tabsdown()];
```

The plugin takes no options. Each block configures itself with a `config:` marker, exactly as it does in Obsidian, and appearance comes from CSS.

It declares `order: 10` so it runs **before** Obsidian Flavored Markdown. Tab bodies are parsed into the tree during this pass, and the transformers that follow then process them like any other content — that is what makes wikilinks, highlights, and callouts work inside a tab. Raising the order above OFM's silently degrades those: a wikilink inside a tab renders as a dead link and a callout as a plain blockquote.

## Syntax

Start each tab with a column-zero `tab: <label>` marker. A block needs at least two non-empty, unique labels. Optional block configuration goes on a column-zero `config: <values>` line before the first tab; later position or layout values win.

`````markdown
````tabsdown
config: top, multi

tab: Python

```python
print("Hello Tabsdown")
```

tab: JavaScript

```javascript
console.log("Hello Tabsdown");
```
````
`````

Use matching backtick or tilde fences. The outer fence must be longer than every same-character fence inside it.

Tab bodies are parsed as Markdown before the rest of the pipeline runs, so links, embeds, callouts, math, and syntax highlighting all work inside a tab exactly as they do outside one.

### Icons

Start a label with `icon:<name>` to inline one of the bundled [Lucide](https://lucide.dev/icons/) icons:

````markdown
```tabsdown
tab: icon:code Python
tab: icon:file-text Notes
```
````

An unknown name renders nothing, and every tab still needs a label. Escape a literal label as `tab: \icon:name`, and a literal marker line as `\tab:`.

### Nested tabs

A tab body can hold another `tabsdown` block, as long as its fence is shorter than the one around it.

## Without JavaScript

The emitted HTML carries no tab roles and hides no panels. Every panel is present and preceded by its own label, so the content reads top to bottom. The client script then adds the ARIA tab semantics, hides the inactive panels, and hides the per-panel labels — a page that fails to load it degrades to a plain labelled list rather than to one visible tab.

Tabs respond to pointer, touch, and keyboard (arrow keys, `Home`, `End`).

## Mounting caller-owned panels

Custom Quartz components can use the browser bridge to place Tabsdown controls around live panels they already own. The API is optional because it is absent when the plugin or its client script is disabled; its public types are available from `quartz-tabsdown/types`.

```typescript
import type { TabsController, TabsdownRuntime } from "quartz-tabsdown/types";

const runtime: TabsdownRuntime | undefined = window.tabsdown;
let tabs: TabsController | undefined;

if (runtime) {
  tabs = runtime.mountTabs(container, {
    label: "Trace details",
    tabs: [
      { id: "trace", label: "Trace", panel: tracePanel },
      { id: "watch", label: "Watch", panel: watchPanel },
    ],
    selection: null,
    onSelectionChange(selection, previous) {
      console.log({ selection, previous });
    },
  });
}

tabs?.setSelection("trace");
tabs?.setAvailable("watch", false);
tabs?.destroy();
```

`selection` is nullable. User actions and availability-forced collapse call `onSelectionChange`; `setSelection` is silent. The returned controller also exposes its committed `selection` and can be destroyed repeatedly.

The panels are moved, not cloned. Tabsdown preserves their existing accessible names and focus targets, and `destroy()` returns them to the container in the supplied order with their managed attributes and classes restored. Quartz SPA cleanup destroys outstanding mounts automatically while keeping `window.tabsdown` available for the next page.

Mounted controls are a disclosure group built from native buttons with `aria-expanded`. They intentionally do not use the authored-fence ARIA tablist model or intercept arrow, `Home`, and `End` keys. Authored `tabsdown` fences nested inside a caller panel retain their normal tab behavior.

A host adapter can pass the standalone function without binding it:

```typescript
st.mount(root, config, { mountTabs: window.tabsdown!.mountTabs });
```

## Malformed blocks

A block that cannot be parsed renders a diagnostic with the message, the line, and the original source, instead of dropping the content.

## Styling

Styles are injected inline and resolve against Quartz's own theme variables, so tabs follow the active theme in both light and dark mode.

Every value that the Obsidian plugin exposes through Style Settings is a custom property here, defaulted to that control's default. Obsidian has a settings panel to move them; Quartz does not, so you set them in your own stylesheet:

```css
.tabsdown {
  --tabsdown-gap: 8px;
  --tabsdown-radius: 0;
}
```

| Property                             | Default             | Obsidian Style Settings control |
| ------------------------------------ | ------------------- | ------------------------------- |
| `--tabsdown-gap`                     | `4px`               | Gap between tabs                |
| `--tabsdown-radius`                  | `4px`               | Corner radius                   |
| `--tabsdown-content-spacing`         | `12px`              | Content spacing                 |
| `--tabsdown-animation-speed`         | `160ms`             | Animation speed                 |
| `--tabsdown-tab-min-size`            | `44px`              | Size                            |
| `--tabsdown-tab-padding-block`       | `0.5rem`            | Size                            |
| `--tabsdown-tab-padding-inline`      | `0.75rem`           | Size                            |
| `--tabsdown-accent-override`         | unset, theme accent | Accent                          |
| `--tabsdown-tab-background`          | `var(--highlight)`  | Palette                         |
| `--tabsdown-tab-border`              | `var(--lightgray)`  | Palette                         |
| `--tabsdown-tab-color`               | `var(--darkgray)`   | Palette                         |
| `--tabsdown-tab-hover-background`    | `var(--lightgray)`  | Palette                         |
| `--tabsdown-tab-hover-border`        | `var(--gray)`       | Palette                         |
| `--tabsdown-tab-selected-background` | accent              | Palette                         |
| `--tabsdown-tab-selected-border`     | accent              | Palette                         |
| `--tabsdown-tab-selected-color`      | `var(--light)`      | Palette                         |

Style Settings' preset _variants_ — compact density, underline personality, secondary palette, centred and equal-width alignment — are not ported, since there is no settings UI to switch them. The properties above cover the same ground from CSS.

`prefers-reduced-motion` drops the animation duration to zero, as in Obsidian.

## Development

```bash
npm install
npm run check
```

### Smoke-building against Quartz

```bash
npm run check:quartz
```

Clones Quartz's `v5` branch, installs this plugin into a throwaway site, builds it, and asserts on the emitted HTML — including that wikilinks, highlights, and callouts survive inside a tab, which only holds while this plugin runs before Obsidian Flavored Markdown. Quartz accepts only remote plugin sources, so this checks a pushed ref, not your working tree; pass one to test a branch (`npm run check:quartz -- 'github:grafanaKibana/quartz-tabsdown#my-branch'`).

Quartz v5 has no release tag — it builds from a moving default branch — so CI runs this weekly as well as per push.

### Staying in sync with obsidian-tabsdown

```bash
npm run check:upstream
```

`src/parser.ts` and `test/parser.test.ts` are vendored from [obsidian-tabsdown](https://github.com/grafanaKibana/obsidian-tabsdown) so both plugins accept exactly the same syntax, and every custom property above tracks a Style Settings control there. This command fetches both and fails on any of:

- a vendored file that no longer matches upstream, naming the first differing line;
- a Style Settings control with no matching custom property here — including one added upstream, which must either be ported or listed in the script's `NOT_PORTED` map with a reason;
- a slider default that no longer matches the upstream default;
- a `NOT_PORTED` entry for a control that upstream has since deleted.

CI runs it on every push and pull request, plus every Monday, so a change made in obsidian-tabsdown surfaces here even when nobody touches this repo.

## License

MIT
