import type { MountTabsOptions, TabsController } from "../types";

function tabsOf(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    root.querySelectorAll<HTMLButtonElement>(":scope > .tabsdown__tablist > .tabsdown__tab"),
  );
}

function panelsOf(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(":scope > .tabsdown__panels > .tabsdown__panel"),
  );
}

interface HeightOperation {
  frames: Set<number>;
  fallback: number;
  observer?: ResizeObserver;
  ignoreCancel: boolean;
  target: number;
  cleaned: boolean;
  cleanup: () => void;
  onTransition: (event: TransitionEvent) => void;
}

const heightOperations = new Map<HTMLElement, HeightOperation>();
const publicControllers = new Set<TabsController>();
const mountedPanels = new WeakSet<HTMLElement>();
const managedPanelAttributes = ["id", "role", "tabindex", "aria-labelledby", "hidden"] as const;
const genericPanelTags = new Set(["DIV", "SPAN", "PRE"]);
const focusableSelector =
  'a[href], audio[controls], button:not([disabled]), details, iframe, input:not([disabled]):not([type="hidden"]), select:not([disabled]), summary, textarea:not([disabled]), video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"]):not([disabled])';
let nextMountId = 0;

function isShadowIncludingAncestor(ancestor: Node, node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.parentNode ?? (current.getRootNode() as ShadowRoot).host ?? null;
  }
  return false;
}

function findById(scope: ParentNode, id: string): Element | null {
  if ("id" in scope && (scope as Element).id === id) return scope as Element;
  return scope.querySelector(`#${CSS.escape(id)}`);
}

function activeElementNear(node: Node): Element | null {
  const root = node.getRootNode() as Partial<DocumentOrShadowRoot>;
  let active = root.activeElement ?? null;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

interface MountedTab {
  id: string;
  button: HTMLButtonElement;
  panel: HTMLElement;
  available: boolean;
  restore: Map<string, string | null>;
  hadPanelClass: boolean;
}

function timeMs(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return value.trim().endsWith("ms") ? parsed : parsed * 1000;
}

function heightTransitionMs(wrapper: HTMLElement): number {
  const style = wrapper.ownerDocument.defaultView?.getComputedStyle(wrapper);
  if (!style) return 0;

  const properties = style.transitionProperty.split(",").map((value) => value.trim());
  const durations = style.transitionDuration.split(",").map(timeMs);
  const delays = style.transitionDelay.split(",").map(timeMs);
  let total = 0;
  properties.forEach((property, index) => {
    if (property === "all" || property === "height") {
      total = Math.max(
        0,
        (durations[index % durations.length] ?? 0) + (delays[index % delays.length] ?? 0),
      );
    }
  });
  return total;
}

function panelMarginBox(panel: HTMLElement): number {
  const style = panel.ownerDocument.defaultView?.getComputedStyle(panel);
  const margin = (value: string | undefined): number => {
    const parsed = Number.parseFloat(value ?? "");
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return (
    panel.getBoundingClientRect().height +
    margin(style?.marginBlockStart) +
    margin(style?.marginBlockEnd)
  );
}

function animateHeight(
  wrapper: HTMLElement,
  start: number,
  target: number,
  replacing: boolean,
): void {
  const view = wrapper.ownerDocument.defaultView;
  const duration = heightTransitionMs(wrapper);
  if (!view || duration <= 0 || Math.abs(start - target) < 0.5) return;

  const operation: HeightOperation = {
    frames: new Set<number>(),
    fallback: 0,
    ignoreCancel: replacing,
    target,
    cleaned: false,
    cleanup: () => {
      if (operation.cleaned) return;
      operation.cleaned = true;
      operation.frames.forEach((frame) => view.cancelAnimationFrame(frame));
      operation.frames.clear();
      view.clearTimeout(operation.fallback);
      operation.observer?.disconnect();
      wrapper.removeEventListener("transitionend", operation.onTransition);
      wrapper.removeEventListener("transitioncancel", operation.onTransition);
      if (heightOperations.get(wrapper) === operation) {
        wrapper.style.height = "";
        wrapper.classList.remove("tabsdown__panels--animating");
        heightOperations.delete(wrapper);
      }
    },
    onTransition: (event) => {
      if (
        heightOperations.get(wrapper) !== operation ||
        event.target !== wrapper ||
        event.propertyName !== "height"
      )
        return;
      if (event.type === "transitioncancel" && operation.ignoreCancel) {
        operation.ignoreCancel = false;
        return;
      }
      operation.cleanup();
    },
  };

  const armFallback = () => {
    view.clearTimeout(operation.fallback);
    operation.fallback = view.setTimeout(
      () => {
        if (heightOperations.get(wrapper) === operation) operation.cleanup();
      },
      Math.min(duration + 50, 2000),
    );
  };

  heightOperations.set(wrapper, operation);
  wrapper.style.height = `${start}px`;
  wrapper.classList.add("tabsdown__panels--animating");
  wrapper.getBoundingClientRect();
  wrapper.addEventListener("transitionend", operation.onTransition);
  wrapper.addEventListener("transitioncancel", operation.onTransition);
  armFallback();

  const panel = wrapper.querySelector<HTMLElement>(":scope > .tabsdown__panel:not([hidden])");
  const frame = view.requestAnimationFrame(() => {
    operation.frames.delete(frame);
    if (heightOperations.get(wrapper) === operation) {
      operation.target = panel ? panelMarginBox(panel) : operation.target;
      wrapper.style.height = `${operation.target}px`;
      if (replacing) {
        const clear = view.requestAnimationFrame(() => {
          operation.frames.delete(clear);
          if (heightOperations.get(wrapper) === operation) operation.ignoreCancel = false;
        });
        operation.frames.add(clear);
      }
    }
  });
  operation.frames.add(frame);

  if (panel && view.ResizeObserver) {
    operation.observer = new view.ResizeObserver(() => {
      if (heightOperations.get(wrapper) !== operation) return;
      const next = panelMarginBox(panel);
      if (Math.abs(next - operation.target) < 0.5) return;
      operation.target = next;
      operation.ignoreCancel = true;
      wrapper.style.height = `${next}px`;
      armFallback();
      const clear = view.requestAnimationFrame(() => {
        operation.frames.delete(clear);
        if (heightOperations.get(wrapper) === operation) operation.ignoreCancel = false;
      });
      operation.frames.add(clear);
    });
    operation.observer.observe(panel);
  }
}

function mountTabs(container: HTMLElement, options: MountTabsOptions): TabsController {
  if (options.tabs.length === 0) {
    throw new Error("Tabsdown: mountTabs needs at least one tab.");
  }
  if (options.label.trim() === "") {
    throw new Error("Tabsdown: mountTabs needs a nonblank group label.");
  }
  if (options.tabs.some((tab) => tab.label.trim() === "")) {
    throw new Error("Tabsdown: mountTabs tab labels must not be blank.");
  }
  if (new Set(options.tabs.map((tab) => tab.id)).size !== options.tabs.length) {
    throw new Error("Tabsdown: mountTabs tab ids must be unique.");
  }
  if (new Set(options.tabs.map((tab) => tab.panel)).size !== options.tabs.length) {
    throw new Error("Tabsdown: mountTabs panel elements must be unique.");
  }
  if (
    options.tabs.some((tab, index) =>
      options.tabs.some(
        (other, otherIndex) =>
          index !== otherIndex && isShadowIncludingAncestor(tab.panel, other.panel),
      ),
    )
  ) {
    throw new Error("Tabsdown: mounted panels must not contain each other.");
  }
  if (options.tabs.some((tab) => mountedPanels.has(tab.panel))) {
    throw new Error("Tabsdown: a panel is already mounted.");
  }

  const panelIds = options.tabs.map((tab) => tab.panel.id).filter(Boolean);
  if (new Set(panelIds).size !== panelIds.length) {
    throw new Error("Tabsdown: mountTabs panel DOM ids must be unique.");
  }

  const ownerDocument = container.ownerDocument;
  const idScopes = Array.from(
    new Set<ParentNode>([
      container.getRootNode() as ParentNode,
      ownerDocument as unknown as ParentNode,
    ]),
  );
  const findMountedId = (id: string): Element | null => {
    for (const scope of idScopes) {
      const found = findById(scope, id);
      if (found) return found;
    }
    return null;
  };
  if (
    options.tabs.some((tab) => {
      const existing = tab.panel.id ? findMountedId(tab.panel.id) : null;
      return existing !== null && existing !== tab.panel;
    })
  ) {
    throw new Error("Tabsdown: a panel DOM id is already used in the target tree.");
  }
  if (options.tabs.some((tab) => isShadowIncludingAncestor(tab.panel, container))) {
    throw new Error("Tabsdown: a mounted panel cannot contain its container.");
  }
  if (container.querySelector(":scope > .tabsdown--mounted")) {
    throw new Error("Tabsdown: this container already has mounted tabs.");
  }

  const mountId = `tabsdown-mount-${++nextMountId}`;
  const assignedIds = new Set(
    options.tabs
      .flatMap((tab) => [
        tab.panel.id,
        ...Array.from(tab.panel.querySelectorAll<HTMLElement>("[id]"), (element) => element.id),
      ])
      .filter(Boolean),
  );
  const uniqueId = (base: string): string => {
    let candidate = base;
    for (
      let suffix = 1;
      assignedIds.has(candidate) || findMountedId(candidate) !== null;
      suffix += 1
    ) {
      candidate = `${base}-${suffix}`;
    }
    assignedIds.add(candidate);
    return candidate;
  };

  const root = ownerDocument.createElement("div");
  root.className = "tabsdown tabsdown--mounted";
  root.dataset.tabsdown = "interactive";
  root.tabIndex = -1;
  const tabList = ownerDocument.createElement("div");
  tabList.className = "tabsdown__tablist";
  tabList.setAttribute("role", "group");
  tabList.setAttribute("aria-label", options.label);
  const panelsElement = ownerDocument.createElement("div");
  panelsElement.className = "tabsdown__panels";

  const focusedSpec = options.tabs.find((tab) => {
    const active = activeElementNear(tab.panel);
    return active !== null && isShadowIncludingAncestor(tab.panel, active);
  });
  const focusedElement = focusedSpec ? activeElementNear(focusedSpec.panel) : null;

  options.tabs.forEach((tab) => mountedPanels.add(tab.panel));
  const mountedTabs: MountedTab[] = options.tabs.map((tab, index) => {
    const buttonId = uniqueId(`${mountId}-tab-${index}`);
    const button = ownerDocument.createElement("button");
    button.type = "button";
    button.id = buttonId;
    button.className = "tabsdown__tab";
    const label = ownerDocument.createElement("span");
    label.className = "tabsdown__tab-label";
    label.textContent = tab.label;
    button.append(label);
    tabList.append(button);

    const restore = new Map<string, string | null>(
      managedPanelAttributes.map((name) => [name, tab.panel.getAttribute(name)]),
    );
    if (!tab.panel.id) tab.panel.id = uniqueId(`${mountId}-panel-${index}`);
    if (!tab.panel.getAttribute("role")?.trim() && genericPanelTags.has(tab.panel.tagName)) {
      tab.panel.setAttribute("role", "group");
    }
    const named =
      tab.panel.getAttribute("aria-labelledby")?.trim() ||
      tab.panel.getAttribute("aria-label")?.trim();
    if (!named) tab.panel.setAttribute("aria-labelledby", buttonId);
    if (!tab.panel.hasAttribute("tabindex") && !tab.panel.querySelector(focusableSelector)) {
      tab.panel.tabIndex = 0;
    }
    button.setAttribute("aria-controls", tab.panel.id);
    const hadPanelClass = tab.panel.classList.contains("tabsdown__panel");
    tab.panel.classList.add("tabsdown__panel");
    panelsElement.append(tab.panel);

    return {
      id: tab.id,
      button,
      panel: tab.panel,
      available: true,
      restore,
      hadPanelClass,
    };
  });

  root.append(tabList, panelsElement);
  container.append(root);

  let selection: string | null = null;
  let notifying = false;
  let destroyed = false;
  const find = (id: string): MountedTab | undefined => mountedTabs.find((tab) => tab.id === id);
  const applyState = (): void => {
    mountedTabs.forEach((tab) => {
      const active = tab.id === selection;
      tab.button.hidden = !tab.available;
      tab.button.setAttribute("aria-expanded", active ? "true" : "false");
      tab.panel.hidden = !active;
    });
    root.classList.toggle("tabsdown--collapsed", selection === null);
  };
  const commit = (next: string | null, notify: boolean): void => {
    const previous = selection;
    if (next === previous) return;
    const start = panelsElement.getBoundingClientRect().height;
    const operation = heightOperations.get(panelsElement);
    operation?.cleanup();
    const outgoing = previous === null ? undefined : find(previous);
    const active = outgoing ? activeElementNear(outgoing.panel) : null;
    if (active && outgoing && isShadowIncludingAncestor(outgoing.panel, active)) {
      (next === null ? root : (find(next)?.button ?? root)).focus();
    }
    selection = next;
    applyState();
    const target = next === null ? 0 : panelMarginBox(find(next)!.panel);
    animateHeight(panelsElement, start, target, Boolean(operation));
    if (!notify || notifying) return;
    notifying = true;
    try {
      options.onSelectionChange?.(selection, previous);
    } finally {
      notifying = false;
    }
  };

  const ElementConstructor = ownerDocument.defaultView?.Element ?? Element;
  const onPublicClick = (event: Event): void => {
    if (!(event.target instanceof ElementConstructor)) return;
    const button = event.target.closest("button");
    const tab = mountedTabs.find((candidate) => candidate.button === button);
    if (!tab?.available) return;
    commit(tab.id === selection ? null : tab.id, true);
  };
  tabList.addEventListener("click", onPublicClick);

  const initial = options.selection ?? null;
  selection = initial !== null && find(initial) ? initial : null;
  applyState();
  const focusedTab = mountedTabs.find((tab) => tab.panel === focusedSpec?.panel);
  if (focusedTab && focusedElement) {
    (selection === focusedTab.id ? (focusedElement as HTMLElement) : focusedTab.button).focus();
  }

  const controller: TabsController = {
    get selection(): string | null {
      return selection;
    },
    setSelection(id: string | null): void {
      if (destroyed) return;
      if (id === null) {
        commit(null, false);
        return;
      }
      const tab = find(id);
      if (tab?.available) commit(id, false);
    },
    setAvailable(id: string, available: boolean): void {
      if (destroyed) return;
      const tab = find(id);
      if (!tab || tab.available === available) return;
      tab.available = available;
      if (available) {
        tab.button.hidden = false;
        return;
      }
      if (activeElementNear(tab.button) === tab.button) {
        const index = mountedTabs.indexOf(tab);
        const next =
          mountedTabs.find(
            (candidate, candidateIndex) => candidateIndex > index && candidate.available,
          ) ??
          mountedTabs.find(
            (candidate, candidateIndex) => candidateIndex < index && candidate.available,
          );
        (next?.button ?? root).focus();
      }
      if (selection === id) commit(null, true);
      else applyState();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      heightOperations.get(panelsElement)?.cleanup();
      tabList.removeEventListener("click", onPublicClick);
      mountedTabs.forEach((tab) => {
        mountedPanels.delete(tab.panel);
        tab.restore.forEach((value, name) => {
          if (value === null) tab.panel.removeAttribute(name);
          else tab.panel.setAttribute(name, value);
        });
        if (!tab.hadPanelClass) tab.panel.classList.remove("tabsdown__panel");
        container.append(tab.panel);
      });
      root.remove();
      publicControllers.delete(controller);
    },
  };
  publicControllers.add(controller);
  return controller;
}

window.tabsdown = { mountTabs };

function select(root: HTMLElement, index: number, focus: boolean, animate = true): void {
  const tabs = tabsOf(root);
  const panels = panelsOf(root);
  const current = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  if (current === index) {
    if (focus) {
      tabs[index]?.focus();
      tabs[index]?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }
    return;
  }

  const wrapper = root.querySelector<HTMLElement>(":scope > .tabsdown__panels");
  const start = wrapper?.getBoundingClientRect().height ?? 0;
  const previous = wrapper ? heightOperations.get(wrapper) : undefined;
  previous?.cleanup();

  tabs.forEach((tab, position) => {
    const selected = position === index;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  });
  panels.forEach((panel, position) => {
    panel.hidden = position !== index;
  });

  if (focus) {
    tabs[index]?.focus();
    tabs[index]?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }

  const target = panels[index];
  if (animate && wrapper && target) {
    animateHeight(wrapper, start, panelMarginBox(target), Boolean(previous));
  }
}

function setup(root: HTMLElement): void {
  const tablist = root.querySelector<HTMLElement>(":scope > .tabsdown__tablist");
  const tabs = tabsOf(root);
  const panels = panelsOf(root);
  if (!tablist || tabs.length === 0 || tabs.length !== panels.length) {
    return;
  }

  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("aria-label", "Tabbed content");
  tabs.forEach((tab, index) => {
    const panel = panels[index];
    if (!panel) return;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panel.id);
    panel.setAttribute("role", "tabpanel");
    panel.tabIndex = 0;
  });

  root.dataset.tabsdown = "interactive";
  select(root, 0, false, false);
}

function rootFor(target: EventTarget | null): { root: HTMLElement; index: number } | undefined {
  const tab = (target as Element | null)?.closest?.<HTMLButtonElement>(".tabsdown__tab");
  const root = tab?.closest<HTMLElement>(".tabsdown");
  if (
    !tab ||
    !root ||
    root.classList.contains("tabsdown--mounted") ||
    root.dataset.tabsdown !== "interactive"
  ) {
    return undefined;
  }
  const index = tabsOf(root).indexOf(tab);
  return index === -1 ? undefined : { root, index };
}

function onClick(event: Event): void {
  const hit = rootFor(event.target);
  if (hit) {
    select(hit.root, hit.index, true);
  }
}

function onKeyDown(event: KeyboardEvent): void {
  const hit = rootFor(event.target);
  if (!hit) {
    return;
  }

  const count = tabsOf(hit.root).length;
  let next: number;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      next = (hit.index + 1) % count;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      next = (hit.index - 1 + count) % count;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = count - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  select(hit.root, next, true);
}

document.addEventListener("nav", () => {
  document.querySelectorAll<HTMLElement>(".tabsdown").forEach((root) => {
    if (root.dataset.tabsdown !== "interactive") {
      setup(root);
    }
  });

  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeyDown);
  window.addCleanup(() => {
    Array.from(publicControllers).forEach((controller) => controller.destroy());
    Array.from(heightOperations.values()).forEach((operation) => operation.cleanup());
    heightOperations.clear();
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeyDown);
  });
});

export {};
