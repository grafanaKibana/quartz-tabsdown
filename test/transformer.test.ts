import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

import { Tabsdown } from "../src/transformer";
import { createCtx, render } from "./helpers";

const fence = (body: string, ticks = "```") => `${ticks}tabsdown\n${body}\n${ticks}\n`;

describe("Tabsdown transformer", () => {
  test("renders a tab list and one panel per tab", async () => {
    const html = await render(
      fence(["tab: First", "", "Hello **world**", "", "tab: Second"].join("\n")),
    );

    expect(html).toContain('<div id="tabsdown-1" class="tabsdown tabsdown-density-default');
    expect(html).toContain("tabsdown--top tabsdown--one");
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
    expect(html).toContain("tabsdown--inline-overflow");
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

    expect(html).toContain("tabsdown--top tabsdown--one");
    expect(html).not.toContain("tabsdown--inline-overflow");
  });

  test("inlines a Lucide icon and skips an unknown name", async () => {
    const html = await render(
      fence(["tab: icon:file-text Notes", "tab: icon:nope Other"].join("\n")),
    );

    expect(html).toContain('<span class="tabsdown__tab-icon" aria-hidden="true"><svg');
    expect(html).toContain('<span class="tabsdown__tab-label">Notes</span>');
    expect(html.match(/tabsdown__tab-icon/g)).toHaveLength(1);
  });

  test("formats the bounded inline label subset in buttons and no-JS panel labels", async () => {
    const html = await render(
      fence(
        [
          "tab: icon:code **Strong** *Em* ~~Gone~~ `Code`",
          "tab: Unsafe [link](https://example.test) <img src=x> ****",
        ].join("\n"),
      ),
    );

    expect(html).toContain(
      '<span class="tabsdown__tab-label"><strong>Strong</strong> <em>Em</em> <del>Gone</del> <code>Code</code></span>',
    );
    expect(html).toContain(
      '<div class="tabsdown__panel-label"><strong>Strong</strong> <em>Em</em> <del>Gone</del> <code>Code</code></div>',
    );
    expect(html).toContain("[link](https://example.test) &#x3C;img src=x> ****");
    expect(html).not.toContain('<a href="https://example.test"');
    expect(html).not.toContain("<img src=x>");
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
    expect(html.match(/tabsdown--top/g)).toHaveLength(2);
    expect(html).toContain("tabsdown--nested-odd");
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

  test("applies validated global and position style modifiers without changing block config", async () => {
    const html = await render(fence(["config: left, multi", "", "tab: A", "tab: B"].join("\n")), {
      styles: {
        size: "compact",
        personality: "underline",
        palette: "secondary",
        positions: { left: { personality: "button", alignment: "center" } },
        motion: { disabled: true },
      },
    });

    expect(html).toContain("tabsdown-density-compact");
    expect(html).toContain("tabsdown-personality-underline");
    expect(html).toContain("tabsdown-palette-secondary");
    expect(html).toContain("tabsdown-left-personality-button");
    expect(html).toContain("tabsdown-left-alignment-center");
    expect(html).toContain("tabsdown-animations-disabled");
    expect(html).toContain("tabsdown--left");
    expect(html).toContain("tabsdown--multi");
  });

  test("keeps styled panels readable without JavaScript", async () => {
    const html = await render(
      fence(["tab: First", "", "alpha", "", "tab: Second", "", "beta"].join("\n")),
      {
        styles: { personality: "underline", nestedStyle: "flat" },
      },
    );

    expect(html).not.toContain('role="tab');
    expect(html).not.toContain("hidden");
    expect(html).toContain("tabsdown-personality-underline");
    expect(html).toContain('<div class="tabsdown__panel-label">First</div>');
    expect(html).toContain("alpha");
    expect(html).toContain("beta");
  });

  test("rejects invalid and misplaced appearance options at the factory boundary", () => {
    expect(() => Tabsdown({ styles: { gap: 49 } })).toThrow("options.styles.gap");
    expect(() => Tabsdown({ personality: "underline" } as never)).toThrow("options.personality");
  });

  test("declares an order that runs before Obsidian Flavored Markdown", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")).quartz;

    // OFM defaults to 30. Running after it leaves wikilinks, highlights, and
    // callouts unprocessed inside tab bodies, which nothing else here catches.
    expect(manifest.defaultOrder).toBeLessThan(30);
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
    expect(resources?.css?.[0]?.content).toContain("--tabsdown-horizontal-padding: 36px");
    expect(resources?.css?.[0]?.content).toContain("--tabsdown-side-width: 192px");
    expect(resources?.css?.[0]?.content).toContain("tabsdown-personality-underline");
    expect(resources?.css?.[0]?.content).toContain("tabsdown-personality-separator");
    expect(resources?.css?.[0]?.content).toContain("tabsdown-personality-rail");
    expect(resources?.css?.[0]?.content).toContain("tabsdown-#{$position}-personality-underline");
    expect(resources?.css?.[0]?.content).toContain("tabsdown-#{$position}-personality-separator");
    expect(resources?.css?.[0]?.content).toContain("tabsdown-#{$position}-personality-rail");
    expect(resources?.css?.[0]?.content).toContain("tabsdown-underline-placement-top");
    expect(resources?.css?.[0]?.content).toContain(
      ".tabsdown--left.tabsdown-underline-placement-auto",
    );
    expect(resources?.css?.[0]?.content).toContain(
      ".tabsdown--right.tabsdown-underline-placement-auto",
    );
    expect(resources?.css?.[0]?.content).toContain('.tabsdown__separator[data-axis="inline"]');
    expect(resources?.css?.[0]?.content).toContain(
      ".tabsdown--#{$position}.tabsdown-#{$position}-palette-secondary",
    );
    expect(resources?.css?.[0]?.content).not.toContain(
      ".tabsdown.tabsdown--#{$position}.tabsdown-#{$position}-palette-secondary",
    );
    expect(resources?.css?.[0]?.content.indexOf(".tabsdown--nested-odd.tabsdown")).toBeGreaterThan(
      resources?.css?.[0]?.content.indexOf(
        ".tabsdown--#{$position}.tabsdown-#{$position}-palette-secondary",
      ) ?? -1,
    );
    expect(resources?.css?.[0]?.content).not.toContain("--interactive-accent");
    expect(resources?.css?.[0]?.content).toContain(
      "transition: height var(--tabsdown-animation-duration) ease",
    );
    expect(resources?.css?.[0]?.content).toContain(".tabsdown__panels--animating {");
    expect(resources?.css?.[0]?.content).toContain("overflow: clip");
    expect(resources?.css?.[0]?.content).toContain("transition: none");
    expect(resources?.css?.[0]?.content).toContain('.tabsdown__tab[aria-expanded="true"]');
    expect(resources?.css?.[0]?.content).toContain(".tabsdown.tabsdown--mounted {");
    expect(resources?.css?.[0]?.content).toContain("container-type: normal");
    expect(resources?.css?.[0]?.content).toContain(".tabsdown--collapsed > .tabsdown__tablist {");
    expect(resources?.css?.[0]?.content).toContain("margin-block-end: 0");
    expect(resources?.js?.[0]).toMatchObject({
      contentType: "inline",
      loadTime: "afterDOMReady",
    });
    const js = resources?.js?.[0];
    const script = js && "script" in js ? js.script : "";
    expect(script).toContain("tabsdown__tablist");
    expect(script).toContain("mountTabs");
    expect(script).toContain("window.tabsdown");
    expect(script).toContain("tabsdown--mounted");
    expect(script).toContain("tabsdown-density-default");
    expect(script).not.toContain("__TABSDOWN_STYLE_CLASSES__");
  });

  test("serializes numeric and accent overrides into the plugin-owned stylesheet", () => {
    const resources = Tabsdown({
      styles: {
        accent: "#09f",
        underlineThickness: 3,
        gap: 8,
        radius: 0,
        horizontalPadding: 24,
        contentSpacing: 16,
        sideWidth: 240,
        iconSize: 20,
        iconSpacing: 4,
        motion: { speed: 320 },
      },
    }).externalResources?.(createCtx());
    const css = resources?.css?.[0]?.content ?? "";

    expect(css).toContain("--tabsdown-accent-override: #09f");
    expect(css).toContain("--tabsdown-underline-thickness: 3px");
    expect(css).toContain("--tabsdown-gap: 8px");
    expect(css).toContain("--tabsdown-radius: 0px");
    expect(css).toContain("--tabsdown-horizontal-padding: 24px");
    expect(css).toContain("--tabsdown-content-spacing: 16px");
    expect(css).toContain("--tabsdown-side-width: 240px");
    expect(css).toContain("--tabsdown-icon-size: 20px");
    expect(css).toContain("--tabsdown-icon-spacing: 4px");
    expect(css).toContain("--tabsdown-animation-speed: 320ms");
  });

  test("keeps position overrides out of the mounted runtime", () => {
    const resources = Tabsdown({
      styles: { positions: { left: { personality: "underline" } } },
    }).externalResources?.(createCtx());
    const js = resources?.js?.[0];
    const configuredScript = js && "script" in js ? js.script : "";

    expect(configuredScript).toContain("tabsdown-personality-default");
    expect(configuredScript).not.toContain("tabsdown-left-personality-underline");
  });
});
