import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { releaseManifestPlugin } from "./src/build/release-manifest-plugin.js";

const publicApi = fileURLToPath(new URL("./src/public-api.ts", import.meta.url));

export default defineConfig({
  plugins: [releaseManifestPlugin("standard-static")],
  build: {
    target: ["chrome120", "edge120"],
    outDir: "dist/standard-static",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: publicApi,
      formats: ["es"],
      fileName: () => "ih-ec-core.js",
    },
  },
});
