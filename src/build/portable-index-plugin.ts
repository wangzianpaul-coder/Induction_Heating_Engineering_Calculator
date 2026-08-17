import type { Plugin } from "vite";

export interface PortableIndexPluginOptions {
  readonly scriptFileName?: string;
  readonly stylesheetFileName?: string;
  readonly title?: string;
}

export const PORTABLE_DEFAULT_TITLE =
  "感应加热工程计算器 | Induction Heating Engineering Calculator" as const;
export const PORTABLE_NOSCRIPT_TEXT =
  "此计算器需要启用 JavaScript 才能运行。" as const;

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

/** Renders the deterministic Chinese-first classic-script entry. */
export function renderPortableIndexHtml(
  options: PortableIndexPluginOptions = {},
): string {
  const scriptFileName = controlledFileName(
    options.scriptFileName ?? "ih-ec-ui.js",
    "Portable script file name",
  );
  const stylesheetFileName = controlledFileName(
    options.stylesheetFileName ?? "ih-ec-ui.css",
    "Portable stylesheet file name",
  );
  const title = escapeHtml(options.title ?? PORTABLE_DEFAULT_TITLE);
  return `<!doctype html>
<html lang="zh-Hans">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="ih-ec-build-scope" content="v0_9_test_release_ui" />
    <title>${title}</title>
    <link rel="stylesheet" href="./${stylesheetFileName}" />
    <script defer src="./${scriptFileName}"></script>
  </head>
  <body>
    <div id="root"></div>
    <noscript>${PORTABLE_NOSCRIPT_TEXT}</noscript>
  </body>
</html>
`;
}

/** Emits the classic-script entry required for direct file:// use. */
export function portableIndexPlugin(
  options: PortableIndexPluginOptions = {},
): Plugin {
  const source = renderPortableIndexHtml(options);

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
