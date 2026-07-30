import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// The build injects .scss and .inline.ts as strings via esbuild loaders, so the
// tests need the same string shape. The virtual id keeps a `.mjs` extension so
// Vite's own SCSS and TypeScript handling does not claim these modules first.
const PREFIX = "\0tabsdown-text:";
const SUFFIX = ".mjs";

const textLoader = {
  name: "tabsdown-text-loader",
  enforce: "pre" as const,
  resolveId(source: string, importer: string | undefined) {
    if (!importer || !/\.scss$|\.inline\.ts$/.test(source)) {
      return null;
    }
    return `${PREFIX}${resolve(dirname(importer), source)}${SUFFIX}`;
  },
  load(id: string) {
    if (!id.startsWith(PREFIX)) {
      return null;
    }
    const file = id.slice(PREFIX.length, -SUFFIX.length);
    return `export default ${JSON.stringify(readFileSync(file, "utf8"))}`;
  },
};

export default defineConfig({
  plugins: [textLoader],
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    reporters: ["default"],
  },
});
