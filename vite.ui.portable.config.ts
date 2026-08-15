import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { portableIndexPlugin } from "./src/build/portable-index-plugin.js";
import { releaseManifestPlugin } from "./src/build/release-manifest-plugin.js";

const portableEntry = fileURLToPath(
  new URL("./src/ui/portable-entry.tsx", import.meta.url),
);

export default defineConfig({
  base: "./",
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [
    portableIndexPlugin({
      scriptFileName: "ih-ec-ui.js",
      stylesheetFileName: "ih-ec-ui.css",
    }),
    releaseManifestPlugin("phase5-ui-portable-offline", {
      scope: "phase_5b_runnable_mvp_ui",
    }),
  ],
  build: {
    target: ["chrome120", "edge120"],
    outDir: "dist/phase5-ui-portable-offline",
    emptyOutDir: true,
    sourcemap: false,
    minify: "oxc",
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    lib: {
      entry: portableEntry,
      name: "IHEngineeringCalculatorUI",
      formats: ["iife"],
      fileName: () => "ih-ec-ui.js",
      cssFileName: "ih-ec-ui",
    },
  },
});
