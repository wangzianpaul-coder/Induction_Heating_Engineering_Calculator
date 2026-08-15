import type { Plugin } from "vite";

export interface PortableIndexPluginOptions {
  readonly scriptFileName?: string;
  readonly stylesheetFileName?: string;
  readonly title?: string;
}

const SAFE_TOP_LEVEL_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

function controlledFileName(value: string, label: string): string {
  if (!SAFE_TOP_LEVEL_FILE_NAME.test(value)) {
    throw new TypeError(`${label} must be a safe top-level relative file name.`);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Emits the classic-script entry required for direct file:// use. */
export function portableIndexPlugin(
  options: PortableIndexPluginOptions = {},
): Plugin {
  const scriptFileName = controlledFileName(
    options.scriptFileName ?? "ih-ec-ui.js",
    "Portable script file name",
  );
  const stylesheetFileName = controlledFileName(
    options.stylesheetFileName ?? "ih-ec-ui.css",
    "Portable stylesheet file name",
  );
  const title = escapeHtml(
    options.title ?? "Induction Heating Engineering Calculator",
  );
  const source = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="ih-ec-build-scope" content="phase_5b_runnable_mvp_ui" />
    <title>${title}</title>
    <link rel="stylesheet" href="./${stylesheetFileName}" />
    <script defer src="./${scriptFileName}"></script>
  </head>
  <body>
    <div id="root"></div>
    <noscript>This application requires JavaScript.</noscript>
  </body>
</html>
`;

  return {
    name: "ih-ec-portable-classic-index",
    apply: "build",
    buildStart() {
      this.emitFile({
        type: "asset",
        fileName: "index.html",
        source,
      });
    },
  };
}
