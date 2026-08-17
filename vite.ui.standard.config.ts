import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { releaseManifestPlugin } from "./src/build/release-manifest-plugin.js";

const uiRoot = fileURLToPath(new URL("./src/ui", import.meta.url));
const outDir = fileURLToPath(
  new URL("./dist/v0.9-ui-standard-static", import.meta.url),
);

export default defineConfig({
  root: uiRoot,
  base: "./",
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [
    releaseManifestPlugin("v0.9-ui-standard-static", {
      scope: "v0_9_test_release_ui",
    }),
  ],
  build: {
    target: ["chrome120", "edge120"],
    outDir,
    emptyOutDir: true,
    modulePreload: false,
    sourcemap: true,
    minify: "oxc",
  },
});
