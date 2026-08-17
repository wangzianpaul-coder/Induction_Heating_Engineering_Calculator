import { describe, expect, it } from "vitest";

import {
  PORTABLE_DEFAULT_TITLE,
  PORTABLE_NOSCRIPT_TEXT,
  renderPortableIndexHtml,
} from "../../src/build/portable-index-plugin.js";
import {
  V0_9_ACCEPTANCE_BOUNDARY,
  V0_9_KNOWN_LIMITATIONS_FILE,
  V0_9_KNOWN_LIMITATIONS_TEXT,
  V0_9_RELEASE_PROFILE,
} from "../../src/build/release-manifest-plugin.js";

describe("version 0.9 test-release packaging", () => {
  it("renders a Chinese-first portable entry with exact relative classic assets", () => {
    const html = renderPortableIndexHtml();

    expect(html).toContain('<html lang="zh-Hans">');
    expect(html).toContain(`<title>${PORTABLE_DEFAULT_TITLE}</title>`);
    expect(html).toContain(`<noscript>${PORTABLE_NOSCRIPT_TEXT}</noscript>`);
    expect(html).toContain('<link rel="stylesheet" href="./ih-ec-ui.css" />');
    expect(html).toContain('<script defer src="./ih-ec-ui.js"></script>');
    expect(html).not.toMatch(/<script[^>]+type=["']module["']/iu);
    expect(html).not.toMatch(/(?:src|href)=["'](?:https?:|\/)/iu);
  });

  it("escapes a supplied title and rejects unsafe portable asset paths", () => {
    expect(renderPortableIndexHtml({ title: '<测试 & "Test">' })).toContain(
      "<title>&lt;测试 &amp; &quot;Test&quot;&gt;</title>",
    );
    expect(() =>
      renderPortableIndexHtml({ scriptFileName: "../outside.js" }),
    ).toThrow(/safe top-level relative file name/u);
  });

  it("pins public 0.9 acceptance metadata and Chinese known limitations", () => {
    expect(V0_9_RELEASE_PROFILE).toBe("v0.9-test");
    expect(V0_9_ACCEPTANCE_BOUNDARY).toBe(
      "automated_release_gate_with_manual_clean_pc_acceptance_pending",
    );
    expect(V0_9_KNOWN_LIMITATIONS_FILE).toBe("V0_9_KNOWN_LIMITATIONS.md");
    expect(V0_9_KNOWN_LIMITATIONS_TEXT).toMatch(/^# 0\.9 测试版已知限制/u);
    expect(V0_9_KNOWN_LIMITATIONS_TEXT).toMatch(/[一-鿿]/u);
    expect(V0_9_KNOWN_LIMITATIONS_TEXT).not.toMatch(
      /\b(?:ADR|GEO|DER|ID)(?:[-_:]|\b)|\b[A-J]-\d{2}\b|phase_/iu,
    );
  });
});
