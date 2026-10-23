// @vitest-environment jsdom
import { expect, test } from "vitest";
import { render } from "./helpers";

const layout = (a = "Alpha", b = "Beta") =>
  `%% tabs %%\n%% tab: **First** %%\n${a}\n%% tab: Second %%\n${b}\n%% endtabs %%`;
const count = (html: string) => (html.match(/class="tabsdown__tablist"/g) ?? []).length;

test("renders adjacent marker controls, formatted labels, icons and configuration", async () => {
  const html = await render(
    layout()
      .replace("%% tabs %%", "%% tabs %%\n%% config: position=left, layout=multi %%")
      .replace("tab: **First**", "tab: icon:book **First**"),
  );
  expect(count(html)).toBe(1);
  expect(html).toContain("tabsdown--left tabsdown--multi");
  expect(html).toContain("<strong>First</strong>");
  expect(html).toContain("tabsdown__tab-icon");
  expect(html).not.toContain("%%");
});

test.each(["> ", "- "])("renders marker layouts in %s containers", async (prefix) => {
  const source = layout()
    .split("\n")
    .map((line, i) => (prefix === "- " && i > 0 ? "  " : prefix) + line)
    .join("\n");
  expect(count(await render(source))).toBe(1);
});

test("renders nested markers and both mixed fence directions", async () => {
  const fence = (body: string, ticks = "```") => `${ticks}tabsdown\n${body}\n${ticks}`;
  expect(count(await render(layout(layout())))).toBe(2);
  expect(count(await render(layout(fence("tab: One\nbody\ntab: Two"))))).toBe(2);
  expect(count(await render(fence(`tab: One\n${layout()}\ntab: Two`)))).toBe(2);
});

test("keeps document-wide reference definitions available in marker and fenced panels", async () => {
  const html = await render(
    `${layout("[link][ref]")}\n\n\`\`\`tabsdown\ntab: One\n[link][ref]\ntab: Two\n\`\`\`\n\n[ref]: https://example.com`,
  );
  expect((html.match(/href="https:\/\/example.com"/g) ?? []).length).toBe(2);
});

test("rejects pre-tab prose with authored source and line", async () => {
  const html = await render(
    `Heading\n\n%% tabs %%\nprose\n%% tab: A %%\n%% tab: B %%\n%% endtabs %%`,
  );
  expect(html).toContain("Content before the first tab marker is not allowed.");
  expect(html).toContain("Line 4");
  expect(html).toContain("%% tabs %%");
  expect(html).not.toContain("quartz-tabsdown-marker");
});

test("retains configuration after the first tab as body content", async () => {
  const html = await render(layout("%% config: position=left %%"));
  expect(html).toContain("%% config: position=left %%");
  expect(html).toContain("tabsdown--top");
});

test.each([
  "%% tab: %%\n%% tab: B %%",
  "%% tab: A %%\n%% tab: A %%",
  "%% tab: A %%",
  "%% config: nonsense %%\n%% tab: A %%\n%% tab: B %%",
])("diagnoses malformed markers: %s", async (body) => {
  const html = await render(`%% tabs %%\n${body}\n%% endtabs %%`);
  expect(html).toContain("tabsdown__diagnostic");
  expect(html).not.toContain("quartz-tabsdown-marker");
});

test("unclosed markers retain trailing content and isolated controls stay readable", async () => {
  const html = await render(
    "%% tabs %%\n%% tab: A %%\n\nUnrelated trailing content.\n\n%% endtabs %%\n%% endtabs %%",
  );
  expect(html).toContain("Unrelated trailing content.");
  expect(html).toContain("%% endtabs %%");
  const unclosed = await render("%% tabs %%\n\nTrailing content.");
  expect(unclosed).toContain("Trailing content.");
  expect(unclosed).not.toContain("quartz-tabsdown-marker");
});

test.each([
  (s: string) => `\`\`\`text\n${s}\n\`\`\``,
  (s: string) =>
    s
      .split("\n")
      .map((l) => `    ${l}`)
      .join("\n"),
  (s: string) => `<pre>\n${s}\n</pre>`,
  (s: string) => `<div>\n${s}\n</div>`,
  (s: string) => `<!--\n${s}\n-->`,
  (s: string) => `%% ordinary comment\n${s}\n%%`,
  (s: string) => `$$\n${s}\n$$`,
  (s: string) => `\`start\n${s}\nend\``,
])("does not transform markers in literal contexts", async (wrap) => {
  expect(count(await render(wrap(layout())))).toBe(0);
});

test.each(["> ", "- "])("keeps nested %s containers and following siblings", async (prefix) => {
  const nested = layout()
    .split("\n")
    .map((line, i) => (prefix === "- " && i > 0 ? "  " : prefix) + line)
    .join("\n");
  const html = await render(`${layout(nested)}\n\n- following item\n- second item`);
  expect(count(html)).toBe(2);
  expect(html).toContain("<li>following item</li>");
  expect(html).toContain("<li>second item</li>");
});

test("preserves CRLF layouts", async () => {
  const html = await render(layout().replaceAll("\n", "\r\n"));
  expect(count(html)).toBe(1);
  expect(html).not.toContain("quartz-tabsdown-marker");
});

test("diagnostics in fenced marker panels report original source and authored lines", async () => {
  const html = await render(
    "Introduction\n\n```tabsdown\ntab: Outer\n%% tabs %%\n%% tab: A %%\n%% tab: A %%\n%% endtabs %%\ntab: Other\n```",
  );
  expect(html).toContain('Duplicate tab label "A".');
  expect(html).toContain("Line 7");
  expect(html).toContain("%% tabs %%");
  expect(html).not.toContain("quartz-tabsdown-marker");
});

test("inherited references do not leak into an unclosed literal fenced panel", async () => {
  const html = await render(
    "````tabsdown\ntab: One\nfirst\ntab: Two\n```text\nlast\n````\n\n[ref]: https://example.com",
  );
  expect(html).toContain("last");
  expect(html).not.toContain("[ref]");
  expect(html).not.toContain("https://example.com");
});

test("fenced local definitions override inherited definitions", async () => {
  const html = await render(
    "```tabsdown\ntab: One\n[link][ref]\n\n[ref]: https://local.example\ntab: Two\n```\n\n[ref]: https://global.example",
  );
  expect(html).toContain('href="https://local.example"');
  expect(html).not.toContain('href="https://global.example"');
});

test("inherits definitions from quote containers without their authored prefixes", async () => {
  const html = await render(
    '```tabsdown\ntab: One\n[link][ref]\ntab: Two\n```\n\n> [ref]: https://example.com "A title"',
  );
  expect(html).toContain('href="https://example.com" title="A title"');
});

test("fenced escaped tab text preserves nested marker diagnostic lines", async () => {
  const html = await render(
    "```tabsdown\ntab: Outer\n\\tab: literal\n\n%% tabs %%\n%% tab: A %%\n%% tab: A %%\n%% endtabs %%\ntab: Other\n```",
  );
  expect(html).toContain("Line 7");
  expect(html).not.toContain("quartz-tabsdown-marker");
});

test.each([
  (s: string) =>
    `> \`\`\`text\n${s
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")}\n> \`\`\``,
  (s: string) =>
    `> \`start\n${s
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")}\n> end\``,
])("quoted literals cannot become layouts or leak encoded transport", async (wrap) => {
  const html = await render(wrap(layout()));
  expect(count(html)).toBe(0);
  expect(html).not.toContain("quartz-tabsdown-marker");
});

test.each(["> ", "  "])("renders repeated layouts in continuous container %s", async (prefix) => {
  const contents = `${layout()}\n\n${layout()}`
    .split("\n")
    .map((l) => prefix + l)
    .join("\n");
  const html = await render(prefix === "  " ? `- Intro\n\n${contents}` : contents);
  expect(count(html)).toBe(2);
  expect(html).not.toContain("quartz-tabsdown-marker");
});

test.each(["- Parent\n  - Intro\n\n", "100. Intro\n\n"])(
  "discovers layouts after list prose: %s",
  async (start) => {
    const indent = start.startsWith("100") ? "     " : "    ";
    const html = await render(
      start +
        layout()
          .split("\n")
          .map((l) => indent + l)
          .join("\n"),
    );
    expect(count(html)).toBe(1);
  },
);

test.each([true, false])(
  "panel-local link and image references override globals regardless of order: %s",
  async (before) => {
    const global = '[ref]: https://global.example "Global"\n\n';
    const fence =
      '```tabsdown\ntab: One\n[link][ref] ![image][ref]\n\n[ref]: https://local.example "Local"\ntab: Two\n```';
    const html = await render(before ? global + fence : fence + "\n\n" + global);
    expect(html).toContain('href="https://local.example" title="Local"');
    expect(html).toContain('src="https://local.example"');
    expect(html).not.toContain("global.example");
  },
);

test.each([
  (s: string) => `%% ordinary comment\n${s}\n%%`,
  (s: string) => `$$\n${s}\n$$`,
  (s: string) => `<!--\n${s}\n-->`,
])("container projection preserves enclosing literal contexts", async (wrap) => {
  const quoted = layout()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const html = await render(wrap(quoted));
  expect(count(html)).toBe(0);
  expect(html).not.toContain("quartz-tabsdown-marker");
});

test("continuous list layouts preserve isolated trailing controls", async () => {
  const source = `- Intro\n\n${`${layout()}\n\n${layout()}\n\n%% endtabs %%`
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")}`;
  const html = await render(source);
  expect(count(html)).toBe(2);
  expect(html).toContain("%% endtabs %%");
  expect(html).not.toContain("quartz-tabsdown-marker");
});
