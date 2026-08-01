// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import type { MountTabsOptions, TabSpec, TabsController, TabsdownRuntime } from "../src/types";
import { render } from "./helpers";

const markdown = [
  "````tabsdown",
  "tab: First",
  "",
  "alpha",
  "",
  "tab: Second",
  "",
  "beta",
  "",
  "tab: Third",
  "````",
  "",
].join("\n");

const tabs = () => Array.from(document.querySelectorAll<HTMLButtonElement>(".tabsdown__tab"));
const panels = () => Array.from(document.querySelectorAll<HTMLElement>(".tabsdown__panel"));
const wrapper = () => document.querySelector<HTMLElement>(".tabsdown__panels")!;

const navigate = () => document.dispatchEvent(new CustomEvent("nav", { detail: { url: "/" } }));
const cleanups: Array<() => void> = [];

function runCleanups(): void {
  cleanups.splice(0).forEach((cleanup) => cleanup());
}

function rectangle(height: number): DOMRect {
  return {
    bottom: height,
    height,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
}

function animationControls(options?: {
  duration?: string;
  wrapperHeights?: Map<HTMLElement, () => number>;
  panelBoxes?: Map<HTMLElement, { height: number; start?: string; end?: string }>;
}) {
  const frames = new Map<number, FrameRequestCallback>();
  const wrapperHeights = options?.wrapperHeights ?? new Map([[wrapper(), () => 80]]);
  const panelBoxes =
    options?.panelBoxes ??
    new Map([
      [panels()[0]!, { height: 80 }],
      [panels()[1]!, { height: 220, start: "8px", end: "12px" }],
      [panels()[2]!, { height: 120 }],
    ]);
  let frameId = 0;

  wrapperHeights.forEach((height, element) => {
    vi.spyOn(element, "getBoundingClientRect").mockImplementation(() => rectangle(height()));
  });
  panelBoxes.forEach((box, element) => {
    vi.spyOn(element, "getBoundingClientRect").mockImplementation(() => rectangle(box.height));
  });

  const computedStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const style = computedStyle(element);
    const box = panelBoxes.get(element as HTMLElement);
    if (wrapperHeights.has(element as HTMLElement)) {
      return {
        ...style,
        transitionDelay: "0ms",
        transitionDuration: options?.duration ?? "160ms",
        transitionProperty: "height",
      } as CSSStyleDeclaration;
    }
    if (box) {
      return {
        ...style,
        marginBlockEnd: box.end ?? "0px",
        marginBlockStart: box.start ?? "0px",
      } as CSSStyleDeclaration;
    }
    return style;
  });
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });

  return {
    frames,
    flushFrame: () => {
      const queued = Array.from(frames.entries());
      frames.clear();
      queued.forEach(([, callback]) => callback(0));
    },
  };
}

function heightTransition(type: "transitionend" | "transitioncancel"): Event {
  const event = new Event(type);
  Object.defineProperty(event, "propertyName", { value: "height" });
  return event;
}

function callerTabs(options?: {
  selection?: string | null;
  onSelectionChange?: MountTabsOptions["onSelectionChange"];
}) {
  const container = document.createElement("div");
  const first = document.createElement("section");
  first.textContent = "First panel";
  const second = document.createElement("section");
  second.textContent = "Second panel";
  container.append(first, second);
  document.body.append(container);
  const specs: readonly TabSpec[] = [
    { id: "first", label: "First", panel: first },
    { id: "second", label: "Second", panel: second },
  ];
  const mountOptions: MountTabsOptions = {
    tabs: specs,
    label: "Caller panels",
    selection: options?.selection,
    onSelectionChange: options?.onSelectionChange,
  };
  const runtime: TabsdownRuntime | undefined = window.tabsdown;
  const controller: TabsController = runtime!.mountTabs(container, mountOptions);
  const root = container.querySelector<HTMLElement>(":scope > .tabsdown--mounted")!;
  const buttons = Array.from(
    root.querySelectorAll<HTMLButtonElement>(":scope > .tabsdown__tablist > .tabsdown__tab"),
  );
  const panelsElement = root.querySelector<HTMLElement>(":scope > .tabsdown__panels")!;
  return { buttons, container, controller, first, panelsElement, root, second };
}

beforeAll(async () => {
  window.addCleanup = (cleanup) => cleanups.push(cleanup);
  await import("../src/scripts/tabsdown.inline");
});

beforeEach(async () => {
  runCleanups();
  vi.useFakeTimers();
  document.body.innerHTML = await render(markdown);
  navigate();
});

afterEach(() => {
  runCleanups();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("client script", () => {
  test("marks the block interactive and adds the tab ARIA wiring", () => {
    const root = document.querySelector<HTMLElement>(".tabsdown");

    expect(root?.dataset.tabsdown).toBe("interactive");
    expect(document.querySelector(".tabsdown__tablist")?.getAttribute("role")).toBe("tablist");
    expect(tabs().map((tab) => tab.getAttribute("aria-controls"))).toEqual(
      panels().map((panel) => panel.id),
    );
    expect(panels().every((panel) => panel.getAttribute("role") === "tabpanel")).toBe(true);
  });

  test("shows only the first panel", () => {
    expect(panels().map((panel) => panel.hidden)).toEqual([false, true, true]);
    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
      "false",
    ]);
  });

  test("activates the clicked tab", () => {
    tabs()[1]?.click();

    expect(panels().map((panel) => panel.hidden)).toEqual([true, false, true]);
    expect(tabs()[1]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
  });

  test("moves through the tabs with the arrow keys and wraps around", () => {
    const press = (key: string) =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );

    tabs()[0]?.focus();
    press("ArrowLeft");
    expect(tabs()[2]?.getAttribute("aria-selected")).toBe("true");

    press("ArrowRight");
    expect(tabs()[0]?.getAttribute("aria-selected")).toBe("true");

    press("End");
    expect(panels().map((panel) => panel.hidden)).toEqual([true, true, false]);

    press("Home");
    expect(panels().map((panel) => panel.hidden)).toEqual([false, true, true]);
  });

  test("ignores keys it does not handle", () => {
    tabs()[0]?.focus();
    const event = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    tabs()[0]?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(tabs()[0]?.getAttribute("aria-selected")).toBe("true");
  });

  test("does not animate initial setup", async () => {
    runCleanups();
    document.body.innerHTML = await render(markdown);
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");

    navigate();

    expect(requestFrame).not.toHaveBeenCalled();
    expect(wrapper().style.height).toBe("");
    expect(wrapper().classList.contains("tabsdown__panels--animating")).toBe(false);
  });

  test("animates grow and shrink to the selected panel margin box", () => {
    let renderedHeight = 80;
    const controls = animationControls({
      wrapperHeights: new Map([[wrapper(), () => renderedHeight]]),
    });

    tabs()[1]?.click();
    expect(wrapper().style.height).toBe("80px");
    expect(wrapper().classList.contains("tabsdown__panels--animating")).toBe(true);
    controls.flushFrame();
    expect(wrapper().style.height).toBe("240px");
    wrapper().dispatchEvent(heightTransition("transitionend"));
    expect(wrapper().style.height).toBe("");
    expect(wrapper().classList.contains("tabsdown__panels--animating")).toBe(false);

    renderedHeight = 240;
    tabs()[0]?.click();
    expect(wrapper().style.height).toBe("240px");
    controls.flushFrame();
    expect(wrapper().style.height).toBe("80px");
    wrapper().dispatchEvent(heightTransition("transitionend"));
    expect(wrapper().style.height).toBe("");
  });

  test("leaves an active operation alone when its selected tab is reactivated", () => {
    const controls = animationControls();
    tabs()[1]?.click();
    controls.flushFrame();
    const pendingFrames = controls.frames.size;
    const selected = tabs()[1]!;
    const scrollIntoView = vi.fn();
    selected.scrollIntoView = scrollIntoView;
    tabs()[0]?.focus();

    selected.click();

    expect(document.activeElement).toBe(selected);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(wrapper().style.height).toBe("240px");
    expect(wrapper().classList.contains("tabsdown__panels--animating")).toBe(true);
    expect(controls.frames.size).toBe(pendingFrames);
  });

  test("remeasures the target margin box in the scheduled target frame", () => {
    const target = { height: 220, start: "8px", end: "12px" };
    const controls = animationControls({
      panelBoxes: new Map<HTMLElement, { height: number; start?: string; end?: string }>([
        [panels()[0]!, { height: 80 }],
        [panels()[1]!, target],
        [panels()[2]!, { height: 120 }],
      ]),
    });

    tabs()[1]?.click();
    expect(wrapper().style.height).toBe("80px");
    target.height = 320;
    controls.flushFrame();

    expect(wrapper().style.height).toBe("340px");
  });

  test("uses the current interpolated height when a switch replaces an operation", () => {
    let renderedHeight = 80;
    const heightReads: string[] = [];
    const controls = animationControls({
      wrapperHeights: new Map([[wrapper(), () => renderedHeight]]),
    });
    vi.mocked(wrapper().getBoundingClientRect).mockImplementation(() => {
      heightReads.push(wrapper().style.height);
      return rectangle(renderedHeight);
    });
    tabs()[1]?.click();
    const staleFrame = Array.from(controls.frames.values())[0]!;
    expect(heightReads.slice(-2)).toEqual(["", "80px"]);

    renderedHeight = 150;
    tabs()[2]?.click();
    expect(wrapper().style.height).toBe("150px");
    expect(heightReads.slice(-2)).toEqual(["80px", "150px"]);
    wrapper().dispatchEvent(heightTransition("transitioncancel"));
    expect(wrapper().classList.contains("tabsdown__panels--animating")).toBe(true);
    staleFrame(0);
    expect(wrapper().style.height).toBe("150px");

    controls.flushFrame();
    expect(wrapper().style.height).toBe("120px");
    wrapper().dispatchEvent(heightTransition("transitionend"));
    expect(panels().map((panel) => panel.hidden)).toEqual([true, true, false]);
    expect(wrapper().style.height).toBe("");
  });

  test("cleans up on cancellation or the bounded fallback", () => {
    let renderedHeight = 80;
    const controls = animationControls({
      wrapperHeights: new Map([[wrapper(), () => renderedHeight]]),
    });
    tabs()[1]?.click();
    controls.flushFrame();
    wrapper().dispatchEvent(heightTransition("transitioncancel"));
    expect(wrapper().style.height).toBe("");
    expect(wrapper().classList.contains("tabsdown__panels--animating")).toBe(false);

    renderedHeight = 240;
    tabs()[0]?.click();
    controls.flushFrame();
    vi.advanceTimersByTime(209);
    expect(wrapper().style.height).not.toBe("");
    vi.advanceTimersByTime(1);
    expect(wrapper().style.height).toBe("");
    expect(controls.frames.size).toBe(0);
  });

  test("retargets late panel growth and ignores only its replacement cancellation", () => {
    let notify: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          notify = callback;
        }
        observe() {}
        disconnect() {
          disconnect();
        }
      },
    );
    const target = { height: 220, start: "8px", end: "12px" };
    const controls = animationControls({
      panelBoxes: new Map<HTMLElement, { height: number; start?: string; end?: string }>([
        [panels()[0]!, { height: 80 }],
        [panels()[1]!, target],
        [panels()[2]!, { height: 120 }],
      ]),
    });
    tabs()[1]?.click();
    controls.flushFrame();
    expect(wrapper().style.height).toBe("240px");

    target.height = 320;
    notify?.([], {} as ResizeObserver);
    expect(wrapper().style.height).toBe("340px");
    wrapper().dispatchEvent(heightTransition("transitioncancel"));
    expect(wrapper().classList.contains("tabsdown__panels--animating")).toBe(true);

    controls.flushFrame();
    wrapper().dispatchEvent(heightTransition("transitionend"));
    expect(wrapper().style.height).toBe("");
    expect(disconnect).toHaveBeenCalledOnce();
  });

  test("skips height animation when motion duration is zero", () => {
    const controls = animationControls({ duration: "0ms" });

    tabs()[1]?.click();

    expect(panels().map((panel) => panel.hidden)).toEqual([true, false, true]);
    expect(wrapper().style.height).toBe("");
    expect(wrapper().classList.contains("tabsdown__panels--animating")).toBe(false);
    expect(controls.frames.size).toBe(0);
  });

  test("settles an interrupted nested operation and starts a fresh one after reopen", async () => {
    runCleanups();
    document.body.innerHTML = await render(
      [
        "````tabsdown",
        "tab: Outer A",
        "",
        "```tabsdown",
        "tab: Inner A",
        "tab: Inner B",
        "```",
        "",
        "tab: Outer B",
        "outer sibling",
        "````",
      ].join("\n"),
    );
    navigate();
    const roots = Array.from(document.querySelectorAll<HTMLElement>(".tabsdown"));
    const outer = roots[0]!;
    const inner = roots[1]!;
    const outerWrapper = outer.querySelector<HTMLElement>(":scope > .tabsdown__panels")!;
    const innerWrapper = inner.querySelector<HTMLElement>(":scope > .tabsdown__panels")!;
    const outerTabs = Array.from(
      outer.querySelectorAll<HTMLButtonElement>(":scope > .tabsdown__tablist > .tabsdown__tab"),
    );
    const innerTabs = Array.from(
      inner.querySelectorAll<HTMLButtonElement>(":scope > .tabsdown__tablist > .tabsdown__tab"),
    );
    const allPanels = Array.from(document.querySelectorAll<HTMLElement>(".tabsdown__panel"));
    const controls = animationControls({
      wrapperHeights: new Map([
        [outerWrapper, () => 200],
        [innerWrapper, () => 60],
      ]),
      panelBoxes: new Map(allPanels.map((panel, index) => [panel, { height: 80 + index * 20 }])),
    });

    innerTabs[1]?.click();
    controls.flushFrame();
    expect(innerWrapper.classList.contains("tabsdown__panels--animating")).toBe(true);
    expect(outerWrapper.style.height).toBe("");

    outerTabs[1]?.click();
    controls.flushFrame();
    vi.advanceTimersByTime(210);
    expect(innerWrapper.style.height).toBe("");
    expect(innerWrapper.classList.contains("tabsdown__panels--animating")).toBe(false);

    outerTabs[0]?.click();
    controls.flushFrame();
    outerWrapper.dispatchEvent(heightTransition("transitionend"));
    innerTabs[0]?.click();
    expect(innerWrapper.classList.contains("tabsdown__panels--animating")).toBe(true);
  });

  test("navigation cleanup rejects stale work before replacement setup", async () => {
    const controls = animationControls();
    tabs()[1]?.click();
    const staleFrame = Array.from(controls.frames.values())[0]!;
    const oldWrapper = wrapper();

    runCleanups();
    expect(oldWrapper.style.height).toBe("");
    document.body.innerHTML = await render(markdown);
    staleFrame(0);
    expect(oldWrapper.style.height).toBe("");

    navigate();
    tabs()[1]?.click();
    expect(panels().map((panel) => panel.hidden)).toEqual([true, false, true]);
  });
});

describe("public mountTabs bridge", () => {
  test("mounts caller panels as an initially collapsed disclosure group", () => {
    const { buttons, controller, first, root, second } = callerTabs();

    expect(window.tabsdown?.mountTabs).toBeTypeOf("function");
    expect(controller.selection).toBeNull();
    expect(root.dataset.tabsdown).toBe("interactive");
    expect(root.classList.contains("tabsdown--collapsed")).toBe(true);
    expect(root.querySelector(".tabsdown__tablist")?.getAttribute("role")).toBe("group");
    expect(root.querySelector(".tabsdown__tablist")?.getAttribute("aria-label")).toBe(
      "Caller panels",
    );
    expect(buttons.map((button) => [button.type, button.getAttribute("aria-expanded")])).toEqual([
      ["button", "false"],
      ["button", "false"],
    ]);
    expect(buttons.some((button) => button.hasAttribute("role"))).toBe(false);
    expect([first.hidden, second.hidden]).toEqual([true, true]);
    expect(root.contains(first) && root.contains(second)).toBe(true);
  });

  test("keeps nullable exclusive state and only notifies for user intent", () => {
    const changes = vi.fn();
    const mounted = callerTabs({ onSelectionChange: changes });

    mounted.buttons[0]!.click();
    expect(mounted.controller.selection).toBe("first");
    expect([mounted.first.hidden, mounted.second.hidden]).toEqual([false, true]);
    expect(changes).toHaveBeenLastCalledWith("first", null);

    mounted.controller.setSelection("second");
    mounted.controller.setSelection("missing");
    expect(mounted.controller.selection).toBe("second");
    expect(changes).toHaveBeenCalledOnce();

    mounted.buttons[1]!.click();
    expect(mounted.controller.selection).toBeNull();
    expect(changes).toHaveBeenLastCalledWith(null, "second");
  });

  test("commits before a reentrant callback and does not intercept disclosure navigation keys", () => {
    const state: { controller?: TabsController } = {};
    const changes = vi.fn((selection: string | null) => {
      expect(state.controller?.selection).toBe(selection);
      state.controller?.setSelection("second");
    });
    const mounted = callerTabs({ onSelectionChange: changes });
    state.controller = mounted.controller;

    mounted.buttons[0]!.click();
    expect(changes).toHaveBeenCalledOnce();
    expect(state.controller.selection).toBe("second");

    for (const keyName of ["ArrowRight", "Home", "End"]) {
      const key = new KeyboardEvent("keydown", {
        key: keyName,
        bubbles: true,
        cancelable: true,
      });
      mounted.buttons[1]!.dispatchEvent(key);
      expect(key.defaultPrevented).toBe(false);
    }
    expect(state.controller.selection).toBe("second");
  });

  test("queues a reentrant collapse notification when the callback disables the selection", () => {
    const state: { controller?: TabsController } = {};
    const changes = vi.fn((selection: string | null) => {
      if (selection === "first") state.controller?.setAvailable("first", false);
    });
    const mounted = callerTabs({ onSelectionChange: changes });
    state.controller = mounted.controller;

    mounted.buttons[0]!.click();

    expect(state.controller.selection).toBeNull();
    expect(changes.mock.calls).toEqual([
      ["first", null],
      [null, "first"],
    ]);
  });

  test("preserves initial focus and relocates focus before hiding controls or panels", () => {
    const container = document.createElement("div");
    const first = document.createElement("div");
    const input = document.createElement("input");
    first.append(input);
    const second = document.createElement("div");
    container.append(first, second);
    document.body.append(container);
    input.focus();

    const changes = vi.fn();
    const controller = window.tabsdown!.mountTabs(container, {
      label: "Focus",
      selection: "first",
      onSelectionChange: changes,
      tabs: [
        { id: "first", label: "First", panel: first },
        { id: "second", label: "Second", panel: second },
      ],
    });
    const root = container.querySelector<HTMLElement>(".tabsdown--mounted")!;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(".tabsdown__tab"));

    expect(document.activeElement).toBe(input);
    controller.setSelection("second");
    expect(document.activeElement).toBe(buttons[1]);
    buttons[1]!.focus();
    controller.setAvailable("second", false);
    expect(document.activeElement).toBe(buttons[0]);
    expect(controller.selection).toBeNull();
    expect(buttons[1]!.hidden).toBe(true);
    expect(changes).toHaveBeenCalledOnce();
    expect(changes).toHaveBeenCalledWith(null, "second");

    buttons[0]!.focus();
    controller.setAvailable("first", false);
    expect(document.activeElement).toBe(root);
  });

  test("does not select a destination disabled by its focus handler", () => {
    const mounted = callerTabs({ selection: "first" });
    mounted.first.append(document.createElement("input"));
    mounted.first.querySelector("input")!.focus();
    mounted.buttons[1]!.onfocus = () => mounted.controller.setAvailable("second", false);

    mounted.controller.setSelection("second");

    expect(mounted.controller.selection).toBe("first");
    expect(mounted.buttons[1]!.hidden).toBe(true);
    expect([mounted.first.hidden, mounted.second.hidden]).toEqual([false, true]);
  });

  test("does not mutate restored panels when destination focus destroys the controller", () => {
    const container = document.createElement("div");
    const first = document.createElement("section");
    const second = document.createElement("section");
    const input = document.createElement("input");
    first.append(input);
    second.hidden = true;
    container.append(first, second);
    document.body.append(container);
    const originals = [first, second].map((panel) => panel.outerHTML);
    const controller = window.tabsdown!.mountTabs(container, {
      label: "Destroy on focus",
      selection: "first",
      tabs: [
        { id: "first", label: "First", panel: first },
        { id: "second", label: "Second", panel: second },
      ],
    });
    const root = container.querySelector<HTMLElement>(".tabsdown--mounted")!;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(".tabsdown__tab"));
    input.focus();
    buttons[1]!.onfocus = () => controller.destroy();

    controller.setSelection("second");

    expect(root.isConnected).toBe(false);
    expect(controller.selection).toBe("first");
    expect([first.outerHTML, second.outerHTML]).toEqual(originals);
  });

  test("focuses the matching generated control when a focused panel starts collapsed", () => {
    const container = document.createElement("div");
    const panel = document.createElement("div");
    const input = document.createElement("input");
    panel.append(input);
    container.append(panel);
    document.body.append(container);
    input.focus();

    window.tabsdown!.mountTabs(container, {
      label: "Collapsed focus",
      tabs: [{ id: "only", label: "Only", panel }],
    });

    expect(document.activeElement).toBe(container.querySelector(".tabsdown__tab"));
  });

  test("animates opening and collapsing through the shared measured-height operation", () => {
    const mounted = callerTabs();
    let height = 0;
    const controls = animationControls({
      wrapperHeights: new Map([[mounted.panelsElement, () => height]]),
      panelBoxes: new Map([
        [mounted.first, { height: 100 }],
        [mounted.second, { height: 180 }],
      ]),
    });

    mounted.buttons[0]!.click();
    expect(mounted.panelsElement.style.height).toBe("0px");
    controls.flushFrame();
    expect(mounted.panelsElement.style.height).toBe("100px");
    mounted.panelsElement.dispatchEvent(heightTransition("transitionend"));

    height = 100;
    mounted.buttons[0]!.click();
    expect(mounted.panelsElement.style.height).toBe("100px");
    controls.flushFrame();
    expect(mounted.panelsElement.style.height).toBe("0px");
    mounted.panelsElement.dispatchEvent(heightTransition("transitionend"));
    expect(mounted.panelsElement.style.height).toBe("");
  });

  test("isolates rapid replacement, late growth, and stale work for public mounts", () => {
    let notify: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          notify = callback;
        }
        observe() {}
        disconnect() {
          disconnect();
        }
      },
    );
    const mounted = callerTabs();
    let renderedHeight = 0;
    const secondBox = { height: 180 };
    const controls = animationControls({
      wrapperHeights: new Map([[mounted.panelsElement, () => renderedHeight]]),
      panelBoxes: new Map([
        [mounted.first, { height: 100 }],
        [mounted.second, secondBox],
      ]),
    });

    mounted.buttons[0]!.click();
    const staleFrame = Array.from(controls.frames.values())[0]!;
    renderedHeight = 40;
    mounted.buttons[1]!.click();
    expect(mounted.panelsElement.style.height).toBe("40px");
    staleFrame(0);
    expect(mounted.panelsElement.style.height).toBe("40px");
    controls.flushFrame();
    expect(mounted.panelsElement.style.height).toBe("180px");

    secondBox.height = 260;
    notify?.([], {} as ResizeObserver);
    expect(mounted.panelsElement.style.height).toBe("260px");
    const lateFrame = Array.from(controls.frames.values())[0]!;
    mounted.controller.destroy();
    expect(mounted.panelsElement.style.height).toBe("");
    expect(disconnect).toHaveBeenCalled();
    lateFrame(0);
    expect(mounted.panelsElement.style.height).toBe("");
  });

  test("skips public height animation for reduced motion", () => {
    const mounted = callerTabs();
    const controls = animationControls({
      duration: "0ms",
      wrapperHeights: new Map([[mounted.panelsElement, () => 0]]),
      panelBoxes: new Map([
        [mounted.first, { height: 100 }],
        [mounted.second, { height: 180 }],
      ]),
    });

    mounted.buttons[0]!.click();

    expect(mounted.controller.selection).toBe("first");
    expect(mounted.panelsElement.style.height).toBe("");
    expect(mounted.panelsElement.classList.contains("tabsdown__panels--animating")).toBe(false);
    expect(controls.frames.size).toBe(0);
  });

  test("keeps nested authored tabs on their own delegated tab contract", async () => {
    runCleanups();
    document.body.innerHTML = "";
    const container = document.createElement("div");
    const first = document.createElement("div");
    first.innerHTML = await render(
      ["```tabsdown", "tab: Inner A", "alpha", "tab: Inner B", "beta", "```"].join("\n"),
    );
    const second = document.createElement("div");
    container.append(first, second);
    document.body.append(container);
    navigate();
    window.tabsdown!.mountTabs(container, {
      label: "Outer disclosure",
      selection: "first",
      tabs: [
        { id: "first", label: "First", panel: first },
        { id: "second", label: "Second", panel: second },
      ],
    });
    const authored = first.querySelector<HTMLElement>(".tabsdown:not(.tabsdown--mounted)")!;
    const innerButtons = Array.from(
      authored.querySelectorAll<HTMLButtonElement>(":scope > .tabsdown__tablist > .tabsdown__tab"),
    );

    innerButtons[1]!.click();
    expect(innerButtons[1]!.getAttribute("aria-selected")).toBe("true");
    innerButtons[1]!.focus();
    const key = new KeyboardEvent("keydown", {
      key: "Home",
      bubbles: true,
      cancelable: true,
    });
    innerButtons[1]!.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(true);
    expect(innerButtons[0]!.getAttribute("aria-selected")).toBe("true");
  });

  test("validates every ownership constraint before mutating caller panels", () => {
    const cases: Array<
      (container: HTMLElement, first: HTMLElement, second: HTMLElement) => MountTabsOptions
    > = [
      () => ({ label: "Group", tabs: [] }),
      (_container, first) => ({ label: " ", tabs: [{ id: "a", label: "A", panel: first }] }),
      (_container, first) => ({ label: "Group", tabs: [{ id: "a", label: " ", panel: first }] }),
      (_container, first, second) => ({
        label: "Group",
        tabs: [
          { id: "same", label: "A", panel: first },
          { id: "same", label: "B", panel: second },
        ],
      }),
      (_container, first) => ({
        label: "Group",
        tabs: [
          { id: "a", label: "A", panel: first },
          { id: "b", label: "B", panel: first },
        ],
      }),
    ];

    cases.forEach((makeOptions) => {
      const container = document.createElement("div");
      const first = document.createElement("div");
      const second = document.createElement("div");
      first.className = "caller-first";
      container.append(first, second);
      document.body.append(container);
      const before = container.innerHTML;

      expect(() =>
        window.tabsdown!.mountTabs(container, makeOptions(container, first, second)),
      ).toThrow("Tabsdown:");
      expect(container.innerHTML).toBe(before);
    });

    const container = document.createElement("div");
    const parent = document.createElement("div");
    const child = document.createElement("div");
    parent.append(child);
    container.append(parent);
    document.body.append(container);
    const before = container.innerHTML;
    expect(() =>
      window.tabsdown!.mountTabs(container, {
        label: "Nested",
        tabs: [
          { id: "parent", label: "Parent", panel: parent },
          { id: "child", label: "Child", panel: child },
        ],
      }),
    ).toThrow("must not contain each other");
    expect(container.innerHTML).toBe(before);
  });

  test("rejects tree, id, shadow, and live-mount conflicts before mutation", () => {
    const duplicate = document.createElement("div");
    duplicate.id = "duplicate-panel";
    document.body.append(duplicate);
    const idContainer = document.createElement("div");
    const idPanel = document.createElement("div");
    idPanel.id = "duplicate-panel";
    idContainer.append(idPanel);
    document.body.append(idContainer);
    const idBefore = idContainer.innerHTML;
    expect(() =>
      window.tabsdown!.mountTabs(idContainer, {
        label: "Duplicate id",
        tabs: [{ id: "one", label: "One", panel: idPanel }],
      }),
    ).toThrow("already used in the target tree");
    expect(idContainer.innerHTML).toBe(idBefore);

    const containingPanel = document.createElement("div");
    const nestedContainer = document.createElement("div");
    containingPanel.append(nestedContainer);
    document.body.append(containingPanel);
    const containingBefore = containingPanel.innerHTML;
    expect(() =>
      window.tabsdown!.mountTabs(nestedContainer, {
        label: "Containing",
        tabs: [{ id: "one", label: "One", panel: containingPanel }],
      }),
    ).toThrow("cannot contain its container");
    expect(containingPanel.innerHTML).toBe(containingBefore);

    const shadowContainer = document.createElement("div");
    const shadowHost = document.createElement("div");
    const shadowChild = document.createElement("div");
    shadowHost.attachShadow({ mode: "open" }).append(shadowChild);
    shadowContainer.append(shadowHost);
    document.body.append(shadowContainer);
    expect(() =>
      window.tabsdown!.mountTabs(shadowContainer, {
        label: "Shadow nesting",
        tabs: [
          { id: "host", label: "Host", panel: shadowHost },
          { id: "child", label: "Child", panel: shadowChild },
        ],
      }),
    ).toThrow("must not contain each other");
    expect(shadowHost.shadowRoot?.firstElementChild).toBe(shadowChild);

    const idShadowHost = document.createElement("div");
    const idShadowRoot = idShadowHost.attachShadow({ mode: "open" });
    const shadowDuplicate = document.createElement("div");
    shadowDuplicate.id = "shadow-duplicate";
    const shadowIdContainer = document.createElement("div");
    const shadowIdPanel = document.createElement("div");
    shadowIdPanel.id = "shadow-duplicate";
    shadowIdContainer.append(shadowIdPanel);
    idShadowRoot.append(shadowDuplicate, shadowIdContainer);
    document.body.append(idShadowHost);
    const shadowIdBefore = shadowIdContainer.innerHTML;
    expect(() =>
      window.tabsdown!.mountTabs(shadowIdContainer, {
        label: "Shadow duplicate id",
        tabs: [{ id: "one", label: "One", panel: shadowIdPanel }],
      }),
    ).toThrow("already used in the target tree");
    expect(shadowIdContainer.innerHTML).toBe(shadowIdBefore);

    const mounted = callerTabs();
    const extra = document.createElement("div");
    mounted.container.append(extra);
    const mountedBefore = mounted.container.innerHTML;
    expect(() =>
      window.tabsdown!.mountTabs(mounted.container, {
        label: "Second mount",
        tabs: [{ id: "extra", label: "Extra", panel: extra }],
      }),
    ).toThrow("already has mounted tabs");
    expect(mounted.container.innerHTML).toBe(mountedBefore);

    const otherContainer = document.createElement("div");
    document.body.append(otherContainer);
    expect(() =>
      window.tabsdown!.mountTabs(otherContainer, {
        label: "Reused live panel",
        tabs: [{ id: "first", label: "First", panel: mounted.first }],
      }),
    ).toThrow("already mounted");
    expect(mounted.root.contains(mounted.first)).toBe(true);
  });

  test("rejects descendant id collisions before moving any caller panel", () => {
    const destinationDuplicate = document.createElement("div");
    destinationDuplicate.id = "destination-duplicate";
    document.body.append(destinationDuplicate);

    const cases = [
      ["shared-descendant", "shared-descendant"],
      ["destination-duplicate", "unique-descendant"],
    ] as const;
    cases.forEach(([firstId, secondId]) => {
      const container = document.createElement("div");
      const firstOrigin = document.createElement("div");
      const secondOrigin = document.createElement("div");
      const first = document.createElement("section");
      const second = document.createElement("section");
      const firstChild = document.createElement("span");
      const secondChild = document.createElement("span");
      firstChild.id = firstId;
      secondChild.id = secondId;
      first.append(firstChild);
      second.append(secondChild);
      firstOrigin.append(first);
      secondOrigin.append(second);
      document.body.append(container, firstOrigin, secondOrigin);
      const before = container.innerHTML;

      expect(() =>
        window.tabsdown!.mountTabs(container, {
          label: "Descendant ids",
          tabs: [
            { id: "first", label: "First", panel: first },
            { id: "second", label: "Second", panel: second },
          ],
        }),
      ).toThrow("Tabsdown:");
      expect(container.innerHTML).toBe(before);
      expect(first.parentElement).toBe(firstOrigin);
      expect(second.parentElement).toBe(secondOrigin);
    });
  });

  test("allows an explicit empty descendant id while generating valid panel ids", () => {
    const container = document.createElement("div");
    const first = document.createElement("section");
    const second = document.createElement("section");
    const descendant = document.createElement("span");
    descendant.setAttribute("id", "");
    first.append(descendant);
    container.append(first, second);
    document.body.append(container);

    window.tabsdown!.mountTabs(container, {
      label: "Empty descendant id",
      tabs: [
        { id: "first", label: "First", panel: first },
        { id: "second", label: "Second", panel: second },
      ],
    });
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>(".tabsdown__tab"));

    expect(descendant.getAttribute("id")).toBe("");
    expect([first.id, second.id].every(Boolean)).toBe(true);
    expect(buttons.map((button) => button.getAttribute("aria-controls"))).toEqual([
      first.id,
      second.id,
    ]);
  });

  test("preserves caller naming and focus stops and adds only missing semantics", () => {
    const container = document.createElement("div");
    const named = document.createElement("div");
    named.setAttribute("role", "region");
    named.setAttribute("aria-label", "Caller name");
    const callerButton = document.createElement("button");
    named.append(callerButton);
    const unnamed = document.createElement("div");
    container.append(named, unnamed);
    document.body.append(container);

    window.tabsdown!.mountTabs(container, {
      label: "Accessibility",
      tabs: [
        { id: "named", label: "Named", panel: named },
        { id: "unnamed", label: "Unnamed", panel: unnamed },
      ],
    });
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>(".tabsdown__tab"));

    expect(named.getAttribute("role")).toBe("region");
    expect(named.getAttribute("aria-label")).toBe("Caller name");
    expect(named.hasAttribute("aria-labelledby")).toBe(false);
    expect(named.hasAttribute("tabindex")).toBe(false);
    expect(unnamed.getAttribute("role")).toBe("group");
    expect(unnamed.getAttribute("aria-labelledby")).toBe(buttons[1]!.id);
    expect(unnamed.tabIndex).toBe(0);
  });

  test("restores exact managed state and makes destroy and setters idempotent", () => {
    const container = document.createElement("div");
    const first = document.createElement("div");
    const second = document.createElement("article");
    first.className = "caller tabsdown__panel";
    first.setAttribute("id", "kept-id");
    first.setAttribute("role", "region");
    first.setAttribute("tabindex", "3");
    first.setAttribute("aria-labelledby", "caller-label");
    first.hidden = true;
    second.className = "caller-second";
    container.append(first, second);
    document.body.append(container);
    const originals = [first, second].map((panel) => panel.outerHTML);

    const controller = window.tabsdown!.mountTabs(container, {
      label: "Restore",
      selection: "second",
      tabs: [
        { id: "first", label: "First", panel: first },
        { id: "second", label: "Second", panel: second },
      ],
    });
    controller.destroy();
    controller.destroy();
    controller.setSelection("first");
    controller.setAvailable("second", false);

    expect(container.querySelector(".tabsdown--mounted")).toBeNull();
    expect(Array.from(container.children)).toEqual([first, second]);
    expect([first.outerHTML, second.outerHTML]).toEqual(originals);
  });

  test("preserves a focused panel descendant when destroy returns caller panels", () => {
    const mounted = callerTabs({ selection: "first" });
    const input = document.createElement("input");
    mounted.first.append(input);
    input.focus();

    mounted.controller.destroy();

    expect(document.activeElement).toBe(input);
    expect(mounted.container.contains(input)).toBe(true);
  });

  test("destroys all mounts during Quartz cleanup and keeps the bridge reusable", () => {
    const first = callerTabs({ selection: "first" });
    const second = callerTabs({ selection: "second" });
    const bridge = window.tabsdown;

    runCleanups();

    expect(first.container.querySelector(".tabsdown--mounted")).toBeNull();
    expect(second.container.querySelector(".tabsdown--mounted")).toBeNull();
    expect(window.tabsdown).toBe(bridge);
    const remounted = callerTabs();
    expect(remounted.controller.selection).toBeNull();
  });
});
