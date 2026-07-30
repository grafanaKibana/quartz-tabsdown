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

function select(root: HTMLElement, index: number, focus: boolean): void {
  const tabs = tabsOf(root);
  const panels = panelsOf(root);

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
  select(root, 0, false);
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
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeyDown);
  });
});

export {};
