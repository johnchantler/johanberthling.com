import { getSite } from "@venuecms/sdk-next";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";

import { buildThemeColorOverrideCss } from "./colors";
import "./fonts/fonts.css";

// Self-hosted (see scripts/fetch-google-fonts.mjs) rather than next/font/google,
// so builds never depend on reaching Google, and a page downloads only the one
// font its site actually uses.
const font = (family: string, fallback: string) => ({
  fontFamily: `'${family}', ${fallback}`,
});

const sans = "ui-sans-serif, system-ui, sans-serif";
const serif = "ui-serif, Georgia, serif";
const mono = "ui-monospace, Menlo, monospace";

const ThemeFonts = {
  Work_Sans: font("Work Sans", sans),
  Courier: font("Courier Prime", mono),
  Special_Elite: font("Special Elite", mono),
  Inter: font("Inter", sans),
  Karla: font("Karla", sans),
  EB_Garamond: font("EB Garamond", serif),
  abel: font("Abel", sans),
  outfit: font("Outfit", sans),
  Schibsted_Grotesk: font("Schibsted Grotesk", sans),
  Hanken_Grotesk: font("Hanken Grotesk", sans),
  Young_Serif: font("Young Serif", serif),
  jost: font("Jost", sans),
  IBM_Plex_Mono: font("IBM Plex Mono", mono),
  Open_Sans: font("Open Sans", sans),
  default: font("Schibsted Grotesk", sans),
  custom: { fontFamily: "custom" },
};

export const ThemedBody = async ({ children }: { children: ReactNode }) => {
  const { data: site } = await getSite();

  const templateConfig = site?.settings?.publicSite?.template?.config ?? {};

  const themeId =
    typeof templateConfig.themeId === "string"
      ? templateConfig.themeId
      : "default";
  const fontName =
    typeof templateConfig.fontName === "string"
      ? templateConfig.fontName
      : "default";
  const colorOverrideCss = buildThemeColorOverrideCss(templateConfig, themeId);

  return (
    <ThemeProvider attribute="class" forcedTheme={themeId}>
      {/* Hoisted into <head> by React so the site's colors land with the rest
          of the stylesheets rather than flashing in mid-body. */}
      {colorOverrideCss && (
        <style href="venue-theme-colors" precedence="high">
          {colorOverrideCss}
        </style>
      )}
      <div
        className="flex min-h-screen flex-col"
        style={
          ThemeFonts[fontName as keyof typeof ThemeFonts] ?? ThemeFonts.default
        }
      >
        {fontName === "custom" && site && (
          <style>
            {`
              @font-face {
                font-family: 'custom';
                src: url('/media/sites/${site.id}/fonts/custom.woff2') format('woff2');
                font-weight: normal;
                font-style: normal;
                font-display: swap;
              }
            `}
          </style>
        )}
        {children}
      </div>
    </ThemeProvider>
  );
};
