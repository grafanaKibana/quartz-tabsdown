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

function select(root: HTMLElement, index: number, focus: boolean, animate = true): void {
  const tabs = tabsOf(root);
  const panels = panelsOf(root);
  const current = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  if (current === index) return;

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
  if (!tab || !root || root.dataset.tabsdown !== "interactive") {
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
    Array.from(heightOperations.values()).forEach((operation) => operation.cleanup());
    heightOperations.clear();
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeyDown);
  });
});

export {};
