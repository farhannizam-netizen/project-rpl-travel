import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (file) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("shared navigation and responsive regressions", () => {
  it("uses the same page destinations and labels in the header and footer", () => {
    const navigation = readProjectFile("kurmatravel/static/js/site-nav.js");
    const components = readProjectFile("kurmatravel/static/js/site-components.js");
    const sharedLinks = navigation.match(
      /const links = \[([\s\S]*?)\];\s*window\.ktPrimaryPageLinks = links\.map/
    );

    expect(sharedLinks).not.toBeNull();
    expect(sharedLinks[1]).toMatch(/\["\/index\.html", "Home"/);
    expect(sharedLinks[1]).toMatch(/\["\/paket\.html", "Paket Umrah & Haji"/);
    expect(sharedLinks[1]).toMatch(/\["\/galeri\.html", "Galeri"/);
    expect(sharedLinks[1]).toMatch(/\["\/staf\.html", "Staf"/);
    expect(sharedLinks[1]).toMatch(/\["\/kontak\.html", "Kontak"/);
    expect(navigation).toMatch(/kt-primary-nav[\s\S]*?links\.map/);
    expect(components).toMatch(/const pageLinks = window\.ktPrimaryPageLinks;/);

    const app = readProjectFile("frontend/src/main.jsx");
    const pageMap = app.match(/const pageMap = \{([\s\S]*?)\};/);

    expect(pageMap).not.toBeNull();
    expect(pageMap[1]).toMatch(/"\/index\.html": "index\.html"/);
    expect(pageMap[1]).toMatch(/"\/paket\.html": "paket\.html"/);
    expect(pageMap[1]).toMatch(/"\/galeri\.html": "galeri\.html"/);
    expect(pageMap[1]).toMatch(/"\/staf\.html": "staf\.html"/);
    expect(pageMap[1]).toMatch(/"\/kontak\.html": "kontak\.html"/);
  });

  it("lets footer links load their target HTML document like header navigation", () => {
    const components = readProjectFile("kurmatravel/static/js/site-components.js");
    const pages = ["index", "paket", "galeri", "staf", "kontak"];

    expect(components).not.toMatch(/function handleInternalLink/);
    expect(components).not.toMatch(/addEventListener\("click", handleInternalLink\)/);
    pages.forEach((page) => {
      const html = readProjectFile(`kurmatravel/${page}.html`);
      expect(html).toMatch(/id="siteFooter"/);
    });
  });

  it("resets scroll position when navigating between legacy application pages", () => {
    const app = readProjectFile("frontend/src/main.jsx");

    expect(app).toMatch(
      /useEffect\(\(\) => \{\s*window\.scrollTo\(0, 0\);\s*\}, \[location\.pathname\]\);/
    );
  });

  it("uses document navigation for shared navbar links so React cannot unmount the navbar mid-route", () => {
    const script = readProjectFile("kurmatravel/static/js/site-nav.js");
    const navigationHandler = script.match(
      /function closeDrawerOnNavigation\(\)\s*\{([^}]*)\}/
    );

    expect(navigationHandler).not.toBeNull();
    expect(navigationHandler[1]).toMatch(/setOpen\(false\)/);
    expect(navigationHandler[1]).not.toMatch(/preventDefault|ktLegacyNavigate/);
  });

  it("creates the shared navbar mount point when hydrating a legacy page without one", () => {
    const app = readProjectFile("frontend/src/main.jsx");

    expect(app).toMatch(
      /if \(!body\.querySelector\("#siteNavigation"\)\) \{\s*window\.ktSiteNavCleanup\?\.\(\);\s*const placeholder = window\.document\.createElement\("div"\);\s*placeholder\.id = "siteNavigation";\s*body\.prepend\(placeholder\);\s*\}/
    );
  });

  it("recreates the navbar mount point when cleanup removed it before script initialization", () => {
    const script = readProjectFile("kurmatravel/static/js/site-nav.js");

    expect(script).toMatch(
      /let placeholder = document\.getElementById\("siteNavigation"\);[\s\S]*?if \(!placeholder\) \{\s*const legacyPage = document\.querySelector\("\.legacy-page"\);\s*if \(!legacyPage\) return;\s*placeholder = document\.createElement\("div"\);\s*placeholder\.id = "siteNavigation";\s*legacyPage\.prepend\(placeholder\);\s*\}/
    );
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
