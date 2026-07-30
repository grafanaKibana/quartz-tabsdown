import { describe, expect, test } from "vitest";

import { Tabsdown } from "../src/transformer";
import { createCtx, render } from "./helpers";

const fence = (body: string, ticks = "```") => `${ticks}tabsdown\n${body}\n${ticks}\n`;

describe("Tabsdown transformer", () => {
  test("renders a tab list and one panel per tab", async () => {
    const html = await render(
      fence(["tab: First", "", "Hello **world**", "", "tab: Second"].join("\n")),
    );

    expect(html).toContain('<div id="tabsdown-1" class="tabsdown tabsdown--top tabsdown--one">');
    expect(html).toContain('<div class="tabsdown__tablist">');
    expect(html).toContain('<button type="button" id="tabsdown-1-tab-0"');
    expect(html).toContain('<span class="tabsdown__tab-label">First</span>');
    expect(html).toContain('<div id="tabsdown-1-panel-0" class="tabsdown__panel"');
    expect(html).toContain("Hello <strong>world</strong>");
  });

  test("renders each tab body as Markdown, not as escaped source", async () => {
    const html = await render(
      fence(["tab: List", "", "- one", "- two", "", "tab: Other"].join("\n")),
    );

    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).not.toContain("- one");
  });

  test("emits no ARIA roles or hidden panels, so panels stay readable without the script", async () => {
    const html = await render(
      fence(["tab: First", "", "alpha", "", "tab: Second", "", "beta"].join("\n")),
    );

    expect(html).not.toContain('role="tab');
    expect(html).not.toContain("hidden");
    expect(html).toContain('<div class="tabsdown__panel-label">First</div>');
    expect(html).toContain("alpha");
    expect(html).toContain("beta");
  });

  test("takes position and layout from the block's config marker", async () => {
    const html = await render(fence(["config: left, multi", "", "tab: A", "tab: B"].join("\n")));

    expect(html).toContain("tabsdown--left");
    expect(html).toContain("tabsdown--multi");
    expect(html).not.toContain("tabsdown--top");
  });

  test("lets a later config value win over an earlier one", async () => {
    const html = await render(
      fence(["config: left", "config: bottom, multi", "", "tab: A", "tab: B"].join("\n")),
    );

    expect(html).toContain("tabsdown--bottom");
    expect(html).not.toContain("tabsdown--left");
  });

  test("falls back to top and one without a config marker", async () => {
    const html = await render(fence(["tab: A", "tab: B"].join("\n")));

    expect(html).toContain("tabsdown tabsdown--top tabsdown--one");
  });

  test("inlines a Lucide icon and skips an unknown name", async () => {
    const html = await render(
      fence(["tab: icon:file-text Notes", "tab: icon:nope Other"].join("\n")),
    );

    expect(html).toContain('<span class="tabsdown__tab-icon" aria-hidden="true"><svg');
    expect(html).toContain('<span class="tabsdown__tab-label">Notes</span>');
    expect(html.match(/tabsdown__tab-icon/g)).toHaveLength(1);
  });

  test("renders a nested block inside a panel", async () => {
    const html = await render(
      fence(
        [
          "tab: Outer",
          "",
          "```tabsdown",
          "tab: Inner A",
          "tab: Inner B",
          "```",
          "",
          "tab: Sibling",
        ].join("\n"),
        "````",
      ),
    );

    expect(html).toContain('id="tabsdown-2"');
    expect(html).toContain('<span class="tabsdown__tab-label">Inner A</span>');
    expect(html.match(/class="tabsdown tabsdown--top tabsdown--one"/g)).toHaveLength(2);
  });

  test("renders a diagnostic with the original source for malformed input", async () => {
    const html = await render(fence("tab: Only one"));

    expect(html).toContain('class="tabsdown tabsdown__diagnostic" role="alert"');
    expect(html).toContain("at least two tabs");
    expect(html).toContain('<pre class="tabsdown__diagnostic-source">tab: Only one</pre>');
  });

  test("leaves other code blocks alone", async () => {
    const html = await render("```js\nconst a = 1;\n```\n");

    expect(html).toContain('<code class="language-js">');
    expect(html).not.toContain("tabsdown");
  });

  test("ships its styles and client script as inline resources", () => {
    const resources = Tabsdown().externalResources?.(createCtx());

    expect(resources?.css?.[0]).toMatchObject({ inline: true });
    expect(resources?.css?.[0]?.content).toContain(".tabsdown__tablist");
    // The Obsidian Style Settings defaults, which site CSS overrides.
    expect(resources?.css?.[0]?.content).toContain("--tabsdown-gap: 4px");
    expect(resources?.css?.[0]?.content).toContain("--tabsdown-radius: 4px");
    expect(resources?.css?.[0]?.content).toContain("--tabsdown-content-spacing: 12px");
    expect(resources?.css?.[0]?.content).toContain("--tabsdown-animation-speed: 160ms");
    expect(resources?.css?.[0]?.content).toContain("--tabsdown-tab-min-size: 44px");
    expect(resources?.js?.[0]).toMatchObject({
      contentType: "inline",
      loadTime: "afterDOMReady",
    });
    const js = resources?.js?.[0];
    expect(js && "script" in js ? js.script : "").toContain("tabsdown__tablist");
  });
});
