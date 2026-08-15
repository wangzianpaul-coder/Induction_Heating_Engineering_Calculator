import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { releaseManifestPlugin } from "./src/build/release-manifest-plugin.js";

const uiRoot = fileURLToPath(new URL("./src/ui", import.meta.url));
const outDir = fileURLToPath(
  new URL("./dist/phase5-ui-standard-static", import.meta.url),
);

export default defineConfig({
  root: uiRoot,
  base: "./",
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [
    releaseManifestPlugin("phase5-ui-standard-static", {
      scope: "phase_5b_runnable_mvp_ui",
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
