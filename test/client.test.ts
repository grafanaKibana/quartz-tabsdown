// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

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
