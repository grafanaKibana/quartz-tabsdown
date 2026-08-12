# Mounting panels from another component

Custom Quartz components can give live DOM panels to Tabsdown and use the same controls without rendering Markdown. The browser API is absent when the plugin or client script is disabled. Public types are exported from `quartz-tabsdown/types`.

```typescript
import type { TabsController, TabsdownRuntime } from "quartz-tabsdown/types";

const runtime: TabsdownRuntime | undefined = window.tabsdown;
let tabs: TabsController | undefined;

if (runtime) {
  tabs = runtime.mountTabs(container, {
    label: "**Trace** details",
    selection: null,
    tabs: [
      { id: "trace", label: "**Trace**", panel: tracePanel },
      { id: "watch", label: "`Watch`", panel: watchPanel },
    ],
    onSelectionChange(selection, previous) {
      console.log({ selection, previous });
    },
  });
}

tabs?.setSelection("trace");
tabs?.setAvailable("watch", false);
tabs?.destroy();
```

Mounted controls act as a collapsible disclosure group. Selection starts at `null` unless you pass an ID, and activating the open control closes it.

- User actions and availability-forced closes call `onSelectionChange`; `setSelection` is silent.
- The controller exposes its current `selection`. Calling `destroy()` repeatedly is safe.
- Panels are moved, not cloned. Existing accessible names and focus targets are preserved. `destroy()` returns panels to the container in the supplied order and restores managed attributes and classes.
- Quartz SPA cleanup destroys outstanding mounts automatically and keeps `window.tabsdown` ready for the next page.
- Mounted controls use native buttons with `aria-expanded`. They do not intercept arrow, `Home`, or `End` keys.
- Authored `tabsdown` fences nested inside a caller-owned panel keep their normal tab behavior.

A host adapter can pass the standalone function without binding it:

```typescript
st.mount(root, config, { mountTabs: window.tabsdown!.mountTabs });
```
