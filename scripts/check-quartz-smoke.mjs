import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { JSDOM } from "jsdom";

const htmlPath = resolve(process.argv[2]);
const html = readFileSync(htmlPath, "utf8");
const document = new JSDOM(html).window.document;
const blocks = [...document.querySelectorAll(".tabsdown")];
const own = (block, selector) =>
  [...block.querySelectorAll(selector)].filter((node) => node.closest(".tabsdown") === block);
const blockWithLabel = (label) => {
  const matches = blocks.filter((block) =>
    own(block, ".tabsdown__tab-label").some((node) => node.textContent === label),
  );
  assert.equal(matches.length, 1, `one block with label ${label}`);
  return matches[0];
};
function check(name, action) {
  action();
  console.log(`  ok    ${name}`);
}
function panelFeatures(block, prefix, callout) {
  const panel = own(block, ".tabsdown__panel")[0];
  assert.ok(panel, `${prefix} panel`);
  assert.ok(
    [...panel.querySelectorAll("a.internal-link")].some(
      (link) =>
        link.textContent === `${prefix} wikilink` && link.getAttribute("href").includes("target"),
    ),
    `${prefix} wikilink resolved within panel`,
  );
  assert.ok(
    [...panel.querySelectorAll(".text-highlight")].some(
      (node) => node.textContent === `${prefix} highlight`,
    ),
    `${prefix} highlight within panel`,
  );
  assert.ok(panel.querySelector(`[data-callout="${callout}"]`), `${prefix} callout within panel`);
  assert.ok(
    [...panel.querySelectorAll("a")].some(
      (link) =>
        link.textContent === `${prefix[0].toUpperCase()}${prefix.slice(1)} reference` &&
        link.getAttribute("href") === "https://example.test/shared",
    ),
    `${prefix} document reference within panel`,
  );
}

const fence = blockWithLabel("Outer");
const marker = blockWithLabel("First");
check("fenced configuration, labels, icon, and fallback labels", () => {
  for (const value of [
    "tabsdown--top",
    "tabsdown--multi",
    "tabsdown-density-compact",
    "tabsdown-personality-separator",
    "tabsdown-palette-secondary",
    "tabsdown-alignment-center",
  ]) {
    assert.ok(fence.classList.contains(value), value);
  }
  assert.equal(own(fence, ".tabsdown__tab-label strong")[0]?.textContent, "Outer");
  assert.equal(own(fence, ".tabsdown__tab-icon").length, 1);
  assert.equal(own(fence, ".tabsdown__panel-label").length, 2);
  assert.equal(
    own(fence, ".tabsdown__tab-label")[1]?.textContent,
    "[Second](https://example.test) <img src=x>",
  );
});
check("adjacent marker configuration, formatted label, and icon", () => {
  assert.ok(marker.classList.contains("tabsdown--left"));
  assert.ok(marker.classList.contains("tabsdown--multi"));
  assert.equal(own(marker, ".tabsdown__tab-label strong")[0]?.textContent, "First");
  assert.equal(own(marker, ".tabsdown__tab-icon").length, 1);
  assert.equal(own(marker, ".tabsdown__panel").length, 2);
});
check("fenced panels preserve Quartz Markdown and document references", () =>
  panelFeatures(fence, "fenced", "note"),
);
check("marker panels preserve Quartz Markdown and document references", () =>
  panelFeatures(marker, "marker", "tip"),
);
check("nested fences, nested markers, and both mixed directions", () => {
  for (const [label, parent] of [
    ["Inner A", fence],
    ["Marker in fence A", fence],
    ["Fence in marker A", marker],
    ["Nested marker A", marker],
  ]) {
    const nested = blockWithLabel(label);
    assert.equal(nested.parentElement.closest(".tabsdown"), parent, label);
    assert.equal(own(nested, ".tabsdown__panel").length, 2, label);
    assert.ok(nested.classList.contains("tabsdown--nested-odd"), label);
  }
});
check("marker layouts retain list and quote containers", () => {
  const list = blockWithLabel("List A");
  const quote = blockWithLabel("Quote A");
  assert.ok(list.closest("li"));
  assert.ok(quote.closest("blockquote"));
  assert.match(own(list, ".tabsdown__panel")[0].textContent, /List panel body/);
  assert.match(own(quote, ".tabsdown__panel")[0].textContent, /Quote panel body/);
  const listSibling = blockWithLabel("List sibling A");
  const quoteSibling = blockWithLabel("Quote sibling A");
  assert.equal(listSibling.closest("li"), list.closest("li"));
  assert.equal(quoteSibling.closest("blockquote"), quote.closest("blockquote"));
  assert.match(own(listSibling, ".tabsdown__panel")[0].textContent, /List sibling body/);
  assert.match(own(quoteSibling, ".tabsdown__panel")[0].textContent, /Quote sibling body/);
  const ordered = blockWithLabel("Ordered A");
  assert.equal(ordered.closest("li").parentElement.tagName, "OL");
  assert.match(own(ordered, ".tabsdown__panel")[0].textContent, /Ordered panel body/);
});
check("nested fenced references inherit the enclosing panel scope", () => {
  for (const label of ["Inner A", "Deep inherited A"]) {
    const block = blockWithLabel(label);
    assert.ok(
      own(block, ".tabsdown__panel")[0].querySelector('a[href="https://example.test/outer"]'),
      label,
    );
  }
});
check("metadata and math stay literal before later layouts", () => {
  assert.match(
    document.querySelector('meta[name="description"]').getAttribute("content"),
    /%% tab: Metadata literal A %%/,
  );
  const math = document.querySelectorAll(".katex-display");
  assert.equal(math.length, 1, "one block of math instead of a marker layout");
  assert.match(math[0].textContent, /x/);
});
check("literal markers survive while ordinary comments disappear", () => {
  const literal = [...document.querySelectorAll("pre code")].find((node) =>
    node.textContent.includes("%% tab: Literal A %%"),
  );
  assert.ok(literal);
  assert.match(literal.textContent, /%% tabs %%/);
  assert.match(literal.textContent, /%% tab: Literal A %%/);
  assert.match(literal.textContent, /%% endtabs %%/);
  const quotedLiteral = [...document.querySelectorAll("blockquote pre code")].find((node) =>
    node.textContent.includes("%% tab: Quoted literal A %%"),
  );
  assert.ok(quotedLiteral);
  assert.match(quotedLiteral.textContent, /%% tabs %%/);
  assert.match(quotedLiteral.textContent, /%% endtabs %%/);
  assert.ok(!html.includes("ordinary-comment-must-disappear"));
});
check("malformed label delimiters remain literal without hiding the next tab", () => {
  const block = blockWithLabel("Label `");
  assert.deepEqual(
    own(block, ".tabsdown__tab-label").map((node) => node.textContent),
    ["Label `", "Other label"],
  );
  assert.equal(own(block, ".tabsdown__panel").length, 2);
});
check("marker controls inside reference titles do not open layouts", () => {
  // OFM applies its own comment rules to titles; Tabsdown must not promote
  // their marker-shaped text to structural controls.
  const labels = [...document.querySelectorAll(".tabsdown__tab-label")].map(
    (node) => node.textContent,
  );
  assert.ok(!labels.includes("Title literal A"));
  assert.ok(!labels.includes("Title literal B"));
});

check("all layouts render with styles and no internal transport leaks", () => {
  assert.equal(blocks.length, 13);
  assert.equal(document.querySelectorAll(".tabsdown__diagnostic").length, 0);
  assert.doesNotMatch(html, /language-tabsdown/);
  const styles = [...document.querySelectorAll("style")].map((node) => node.textContent);
  for (const link of document.querySelectorAll('link[rel="stylesheet"][href]')) {
    const href = link.getAttribute("href");
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    const cssPath = decodeURIComponent(href.split(/[?#]/)[0]).replace(/^\//, "");
    styles.push(readFileSync(resolve(dirname(htmlPath), cssPath), "utf8"));
  }
  assert.match(styles.join("\n"), /\.tabsdown__tablist\b/);
  assert.doesNotMatch(html, /<!--\s*(?:quartz-)?tabsdown[:\s-]/i);
});
