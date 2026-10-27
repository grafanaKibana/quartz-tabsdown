# Capture fixture

This fixture publishes the current local Quartz Tabsdown source into a dedicated Quartz site. It does not fetch the plugin from remote `main` and does not modify source notes or the existing smoke test.

```sh
npm ci
node scripts/prepare-product-captures.mjs
```

Serve `.product-captures-cache/quartz/public` with the portable capture toolkit's static server. The homepage route is `/`; wait for `.tabsdown .tabsdown__tab` before capturing. The script verifies generated HTML has rendered tabs and no plugin diagnostics.

The Quartz engine is pinned to `97a2d05f80c4c50534959b1d0d41cc4b3895625e`. Existing caches at another revision are rejected. The plugin's build inputs and lockfile are copied to `.product-captures-cache/plugin` so the Quartz plugin installer only writes inside the fixture cache.

The sample workspace is authored demonstration content. It contains no personal vault material.

The fixture uses a bundled Geist font and fixed sample dates so a capture does not depend on installed system fonts or checkout timestamps. The font is copied from the same Next.js-bundled asset used by the portable toolkit; its supplied license accompanies it.
