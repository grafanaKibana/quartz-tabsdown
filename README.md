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
    options:
      position: top
      layout: one
```

Or wire it up directly in `quartz.ts`:

```typescript
import { Tabsdown } from "quartz-tabsdown";

transformers: [Tabsdown({ position: "top", layout: "one" })];
```

## Options

| Option     | Values                           | Default | Effect                                       |
| ---------- | -------------------------------- | ------- | -------------------------------------------- |
| `position` | `top`, `left`, `right`, `bottom` | `top`   | Where the tab list sits.                     |
| `layout`   | `one`, `multi`                   | `one`   | Keep labels on one scrollable line, or wrap. |

Both are site-wide defaults. A block's own `config:` marker wins over them.

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

## Malformed blocks

A block that cannot be parsed renders a diagnostic with the message, the line, and the original source, instead of dropping the content.

## Styling

Styles are injected inline and use Quartz's own theme variables, so tabs follow the active theme. Override the `.tabsdown*` classes or the `--tabsdown-*` custom properties in your own stylesheet to change spacing, radius, or colours.

## Development

```bash
npm install
npm run check
```

`src/parser.ts` is vendored from [obsidian-tabsdown](https://github.com/grafanaKibana/obsidian-tabsdown) so both plugins accept exactly the same syntax; it is plain TypeScript with no Obsidian imports. Keep the two copies in sync, along with `test/parser.test.ts`.

## License

MIT
