import { describe, expect, test } from "vitest";

import { parseConfigToken, serializeConfig } from "../src/config";

test.each(["constructor=value", "__proto__=value"])("rejects inherited-looking key %s", (token) =>
  expect(parseConfigToken(token)).toEqual({ kind: "invalid" }),
);

test.each(["top", "left", "right", "bottom", "one", "multi"])("rejects bare token %s", (token) =>
  expect(parseConfigToken(token)).toEqual({ kind: "invalid" }),
);

describe("serializeConfig", () => {
  test("uses canonical option order", () => {
    expect(
      serializeConfig({
        alignment: "center",
        palette: "secondary",
        personality: "rail",
        density: "compact",
        layout: "multi",
        position: "left",
      }),
    ).toBe(
      "config: position=left, layout=multi, density=compact, personality=rail, palette=secondary, alignment=center",
    );
  });

  test("serializes no marker when all overrides inherit", () => {
    expect(serializeConfig({})).toBe("");
  });
});
