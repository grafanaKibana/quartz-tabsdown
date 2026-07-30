// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

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

const navigate = () => document.dispatchEvent(new CustomEvent("nav", { detail: { url: "/" } }));

beforeAll(async () => {
  window.addCleanup = () => {};
  await import("../src/scripts/tabsdown.inline");
});

beforeEach(async () => {
  document.body.innerHTML = await render(markdown);
  navigate();
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
});
