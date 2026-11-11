import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (file) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("responsive gallery and WhatsApp modal regressions", () => {
  it("uses document navigation for shared navbar links so React cannot unmount the navbar mid-route", () => {
    const script = readProjectFile("kurmatravel/static/js/site-nav.js");
    const navigationHandler = script.match(
      /function closeDrawerOnNavigation\(\)\s*\{([^}]*)\}/
    );

    expect(navigationHandler).not.toBeNull();
    expect(navigationHandler[1]).toMatch(/setOpen\(false\)/);
    expect(navigationHandler[1]).not.toMatch(/preventDefault|ktLegacyNavigate/);
  });

  it("keeps the gallery in two masonry columns on mobile without fixed image heights", () => {
    const css = readProjectFile("kurmatravel/static/css/style.css");
    const galleryRules = css.slice(css.indexOf("/* GALERI PINTEREST DAN LIGHTBOX */"));
    const mobileGrid = galleryRules.match(
      /@media \(max-width: 760px\)\s*\{\s*\.gallery-grid\s*\{([^}]*)\}/
    );

    expect(mobileGrid).not.toBeNull();
    expect(mobileGrid[1]).toMatch(/column-count:\s*2/);
    expect(mobileGrid[1]).toMatch(/column-width:\s*auto/);
    expect(galleryRules).toMatch(/\.gallery-grid img\s*\{[^}]*height:\s*auto !important/s);
  });

  it("keeps the WhatsApp chooser hidden until opened as a fixed overlay", () => {
    const css = readProjectFile("kurmatravel/static/css/site-theme.css");
    const script = readProjectFile("kurmatravel/static/js/site-components.js");
    const modalRule = css.match(/\.wa-modal\s*\{([^}]*)\}/);

    expect(modalRule).not.toBeNull();
    expect(modalRule[1]).toMatch(/position:\s*fixed/);
    expect(modalRule[1]).toMatch(/z-index:\s*1200/);
    expect(modalRule[1]).toMatch(/display:\s*none/);
    expect(css).toMatch(/\.wa-modal\.show\s*\{\s*display:\s*flex/);
    expect(script).toMatch(/document\.body\.appendChild\(modal\)/);
    expect(script).toMatch(/const outsideClick = \(event\) => \{\s*if \(event\.target === modal\) closeWA\(\)/);
    expect(script).toMatch(/floatingLink\.addEventListener\("click", floatingClick\)/);
  });
});
