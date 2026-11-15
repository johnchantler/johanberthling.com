import type { Site } from "@venuecms/sdk-next";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSite = vi.fn();

vi.mock("@venuecms/sdk-next", () => ({ getSite: () => getSite() }));

// next-themes only contributes the <html> class, which lives above the
// subtree rendered here.
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));

const { ThemedBody } = await import("./index");

const siteWithConfig = (config: Record<string, unknown>) =>
  ({
    id: "site-id",
    settings: { publicSite: { template: { config } } },
  }) as unknown as Site;

const render = async () => {
  const stream = await renderToReadableStream(<ThemedBody>{null}</ThemedBody>);
  await stream.allReady;

  return new Response(stream).text();
};

const renderWithConfig = async (config: Record<string, unknown>) => {
  getSite.mockResolvedValue({ data: siteWithConfig(config) });

  return render();
};

describe("ThemedBody", () => {
  beforeEach(() => {
    getSite.mockReset();
  });

  it("emits the site's color overrides as a stylesheet", async () => {
    const html = await renderWithConfig({
      themeId: "space",
      colorBackground: "#ffffff",
      colorPrimary: "#000000",
    });

    expect(html).toContain("--background: 0, 0%, 100%, 1;");
    expect(html).toContain("--primary: 0, 0%, 0%, 1;");
  });

  it("overrides the theme rather than replacing it", async () => {
    // Only the chosen variable is emitted, so every other color the theme
    // sets keeps applying.
    const html = await renderWithConfig({
      themeId: "space",
      colorNav: "#ff0000",
    });

    expect(html).toContain("--nav: 0, 100%, 50%, 1;");
    expect(html).not.toContain("--background");
    expect(html).not.toContain("--secondary");
  });

  it("pins the default theme's remaining colors to its light palette", async () => {
    // The default theme is the one that flips with the OS, so a lone override
    // would pair the site's background with the dark palette's text.
    const html = await renderWithConfig({
      themeId: "default",
      colorBackground: "#ffffff",
    });

    expect(html).toContain("--background: 0, 0%, 100%, 1;");
    expect(html).toContain("--primary: 50, 1%, 10%, 1;");
  });

  it("renders no stylesheet when the site chose no colors", async () => {
    // An empty rule is still a rule; with nothing overridden the theme has to
    // be the only source of color.
    const html = await renderWithConfig({ themeId: "space" });

    expect(html).not.toContain("venue-theme-colors");
    expect(html).not.toContain(":root:root");
  });

  it("renders when the site has no template config at all", async () => {
    getSite.mockResolvedValue({ data: undefined });

    expect(await render()).not.toContain("venue-theme-colors");
  });
});

describe("ThemedBody fonts", () => {
  const read = (path: string) =>
    readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
  const declared = new Set(
    [...read("./fonts/fonts.css").matchAll(/font-family: ["'](.+?)["']/g)].map(
      ([, family]) => family,
    ),
  );
  const offered: string[] = JSON.parse(
    read("../../../public/_venue/config.schema.json"),
  ).properties.fontName.enum;

  const familyFor = async (fontName: string) => {
    const html = await renderWithConfig({ fontName });

    return html.match(/font-family:\s*(?:'|&#x27;)([^'&]+)/)?.[1];
  };

  it.each(offered.filter((name) => name !== "custom"))(
    "renders %s with a self-hosted font",
    async (fontName) => {
      // Every font the CMS offers has to map to a family fonts.css declares,
      // or the site silently falls back to a system font.
      const family = await familyFor(fontName);

      expect(family).toBeDefined();
      expect(declared).toContain(family);
    },
  );

  it("sets the font on <body> too, for content portalled outside the wrapper", async () => {
    // The mobile nav dialog portals to document.body, so the wrapper div's
    // inline font never reaches it.
    const html = await renderWithConfig({ fontName: "Inter" });

    expect(html).toMatch(
      /<style[^>]*venue-theme-font[^>]*>body \{ font-family: 'Inter', /,
    );
  });

  it("renders a font the CMS no longer offers in the default font", async () => {
    expect(await familyFor("Gothic_A1")).toBe(await familyFor("default"));
  });
});
