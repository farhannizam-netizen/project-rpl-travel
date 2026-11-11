import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import "./admin.css";

const PUBLIC_CONTENT_CACHE_KEY = "kurma-travel:public-content:v1";
const PAGE_CACHE_PREFIX = "kurma-travel:page:v1:";
const ARCHIVABLE_SECTIONS = new Set(["packages", "gallery", "articles", "information", "staff"]);
const VISIBILITY_SECTIONS = new Set(["packages", "gallery", "staff", "contacts"]);

function readLocalCache(key) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeLocalCache(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The network response remains usable if browser storage is unavailable or full.
  }
}

function removeLocalCache(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // The page can still render the network response if browser storage is unavailable.
  }
}

function writePublicContentCache(content) {
  const publicContent = { ...content };
  delete publicContent.archives;
  delete publicContent.gallery_trash;
  writeLocalCache(PUBLIC_CONTENT_CACHE_KEY, publicContent);
}

function sameContent(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const pageMap = {
  "/": "index.html",
  "/index.html": "index.html",
  "/paket": "paket.html",
  "/paket.html": "paket.html",
  "/galeri": "galeri.html",
  "/galeri.html": "galeri.html",
  "/staf": "staf.html",
  "/staf.html": "staf.html",
  "/kontak": "kontak.html",
  "/kontak.html": "kontak.html",
  "/tentang": "tentang.html",
  "/tentang.html": "tentang.html",
  "/keunggulan": "keunggulan.html",
  "/keunggulan.html": "keunggulan.html",
  "/syarat": "syarat.html",
  "/syarat.html": "syarat.html",
  "/perlengkapan": "perlengkapan.html",
  "/perlengkapan.html": "perlengkapan.html",
  "/artikel": "artikel.html",
  "/artikel.html": "artikel.html",
  "/artikel-haji": "artikel-haji.html",
  "/artikel-haji.html": "artikel-haji.html",
  "/artikel-manfaat": "artikel-manfaat.html",
  "/artikel-manfaat.html": "artikel-manfaat.html",
  "/artikel-tips": "artikel-tips.html",
  "/artikel-tips.html": "artikel-tips.html",
};

function LegacyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [html, setHtml] = useState("");
  const [isHydrating, setIsHydrating] = useState(true);
  const [pageStyles, setPageStyles] = useState([]);
  const [error, setError] = useState("");
  const skipNextContentFetchRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    const pathName = location.pathname.replace(/\/+$/, "") || "/";
    const page = pageMap[pathName] || `${pathName.replace(/^\/+/, "") || "index"}.html`;
    setError("");
    const pageCacheKey = `${PAGE_CACHE_PREFIX}${page}`;
    const cachedPage = readLocalCache(pageCacheKey);
    const cachedContent = readLocalCache(PUBLIC_CONTENT_CACHE_KEY);
    if (cachedPage?.html) {
      setPageStyles(cachedPage.styles || []);
      if (cachedPage.title) window.document.title = cachedPage.title;
      setHtml(cachedPage.html);
      setIsHydrating(true);
    } else {
      setIsHydrating(true);
      setHtml("");
    }

    fetch(`/api/page/${encodeURIComponent(page)}`)
      .then((response) => {
        if (response.status === 404) {
          removeLocalCache(pageCacheKey);
          if (active) {
            setPageStyles([]);
            setHtml("");
          }
          const error = new Error("Halaman tidak ditemukan");
          error.code = "PAGE_NOT_FOUND";
          throw error;
        }
        if (!response.ok) throw new Error("Halaman tidak ditemukan");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        const document = new DOMParser().parseFromString(data.html, "text/html");
        const freshPage = {
          html: document.body.innerHTML,
          styles: Array.from(document.querySelectorAll("style")).map((style) => style.textContent),
          title: document.title,
        };
        writeLocalCache(pageCacheKey, freshPage);
        if (!cachedPage || !sameContent(cachedPage, freshPage)) {
          setPageStyles(freshPage.styles);
          if (freshPage.title) window.document.title = freshPage.title;
          setHtml(freshPage.html);
        }
      })
      .catch(async (reason) => {
        if (!active) return;
        if (cachedPage?.html && reason.code !== "PAGE_NOT_FOUND") return;
        try {
          const currentRoute = location.pathname.replace(/\/+$/, "").replace(/\.html$/, "");
          const contentResponse = await fetch("/api/content", { cache: "no-store" });
          if (!contentResponse.ok) throw reason;
          const content = await contentResponse.json();
          let detailSection = "";
          let detailItem = null;
          const articleItems = Array.isArray(content.articles) ? content.articles : [];
          const informationItems = Array.isArray(content.information) ? content.information : [];
          detailItem = articleItems.find((item) => {
            const itemRoute = String(item.url || "")
              .replace(/\/+$/, "")
              .replace(/\.html$/, "");
            return itemRoute === currentRoute;
          });
          if (detailItem) detailSection = "articles";
          if (!detailItem) {
            detailItem = informationItems.find((item) => {
              const itemRoute = String(item.url || "")
                .replace(/\/+$/, "")
                .replace(/\.html$/, "");
              return itemRoute === currentRoute;
            });
            if (detailItem) detailSection = "information";
          }
          if (!detailItem) throw reason;

          window.document.title = detailItem.title || "Artikel & Informasi";
          const returnButtonStyles = `
            body .cms-detail-back{display:flex;justify-content:center;margin-top:38px;padding-top:26px;border-top:1px solid var(--border)}
            body .cms-detail-back a{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:13px 27px;color:var(--white);background:linear-gradient(135deg,#f58a3d,var(--primary));border:1px solid transparent;border-radius:50px;font-size:14px;font-weight:700;text-decoration:none;box-shadow:0 7px 18px rgba(237,107,35,.2);transition:transform .25s ease,box-shadow .25s ease,background .25s ease}
            body .cms-detail-back a:hover{background:linear-gradient(135deg,var(--primary),var(--primary-dark));transform:translateY(-3px);box-shadow:0 11px 24px rgba(237,107,35,.28)}
            body .cms-detail-back a:focus-visible{outline:3px solid rgba(237,107,35,.4);outline-offset:4px}
          `;
          const templateName = detailSection === "information" ? "tentang.html" : "artikel-tips.html";
          const templateResponse = await fetch(`/api/page/${templateName}`);
          if (!active) return;
          if (templateResponse.ok) {
            const templateData = await templateResponse.json();
            const templateDocument = new DOMParser().parseFromString(templateData.html, "text/html");
            const templateHeroTitle = templateDocument.querySelector(".hero h1");
            const templateContent = templateDocument.querySelector(".content");
            const templateBackButton = createArticleBackButton(
              templateDocument,
              templateContent?.querySelector(".back"),
            );
            if (templateHeroTitle) templateHeroTitle.textContent = detailItem.title || "";
            if (templateContent) {
              templateContent.innerHTML = detailItem.description || "<p>Konten belum tersedia.</p>";
              removeArticleBackLinks(templateContent);
              templateContent.appendChild(templateBackButton);
            }
            setPageStyles([
              ...Array.from(templateDocument.querySelectorAll("style")).map((style) => style.textContent),
              returnButtonStyles,
            ]);
            setHtml(templateDocument.body.innerHTML);
          } else {
            setPageStyles([returnButtonStyles]);
            setHtml(`
              <main class="cms-detail-page legacy-page">
                <h1>${escapeHtml(detailItem.title || "")}</h1>
                <div class="content">
                  ${detailItem.description || "<p>Konten belum tersedia.</p>"}
                </div>
              </main>
            `);
          }
        } catch {
          if (active) {
            setError(reason.message);
            setIsHydrating(false);
          }
        }
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    const revalidateContent = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 5000) return;
      lastRefreshAtRef.current = now;

      fetch("/api/content", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((content) => {
          if (!content) return;
          const cachedContent = readLocalCache(PUBLIC_CONTENT_CACHE_KEY);
          writeLocalCache(PUBLIC_CONTENT_CACHE_KEY, content);
          if (cachedContent && !sameContent(cachedContent, content)) {
            skipNextContentFetchRef.current = true;
            setIsHydrating(true);
            setHtml((current) => `${current} `);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("pageshow", revalidateContent);
    window.addEventListener("focus", revalidateContent);
    document.addEventListener("visibilitychange", revalidateContent);
    const refreshInterval = window.setInterval(revalidateContent, 30000);
    return () => {
      window.removeEventListener("pageshow", revalidateContent);
      window.removeEventListener("focus", revalidateContent);
      document.removeEventListener("visibilitychange", revalidateContent);
      window.clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (!html) return;
    let active = true;

    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html");
    const title = document.querySelector("title")?.textContent;
    if (title) window.document.title = title;

    window.document.querySelectorAll("style[data-legacy-page-style]").forEach((style) => style.remove());
    const styleCleanup = pageStyles.map((styleText) => {
      const style = window.document.createElement("style");
      style.dataset.legacyPageStyle = "true";
      style.textContent = styleText;
      window.document.head.appendChild(style);
      return () => style.remove();
    });

    const isHome = location.pathname === "/" || location.pathname === "/index.html";
    let cssPath = isHome ? "/static/css/home.css" : "/static/css/style.css";
    let cssLink = document.querySelector("#legacy-react-css");
    if (!cssLink) {
      cssLink = window.document.createElement("link");
      cssLink.id = "legacy-react-css";
      cssLink.rel = "stylesheet";
      window.document.head.appendChild(cssLink);
    }
    const cssHref = new URL(cssPath, window.location.href).href;
    const baseStylesReady = cssLink.href === cssHref && cssLink.sheet
      ? Promise.resolve()
      : new Promise((resolve) => {
          cssLink.addEventListener("load", resolve, { once: true });
          cssLink.addEventListener("error", resolve, { once: true });
        });
    cssLink.href = cssPath;
    const sharedStylesReady = [
      ["/static/css/site-nav.css", "legacy-site-nav-css"],
      ["/static/css/site-theme.css", "legacy-site-theme-css"],
    ].map(([href, id]) => {
      let link = window.document.getElementById(id);
      if (!link) {
        link = window.document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        window.document.head.appendChild(link);
      }
      const target = new URL(href, window.location.href).href;
      if (link.href === target && link.sheet) return Promise.resolve();
      const ready = new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
        link.addEventListener("error", resolve, { once: true });
      });
      link.href = href;
      return ready;
    });
    const stylesheetReady = Promise.all([baseStylesReady, ...sharedStylesReady]);

    const body = window.document.querySelector(".legacy-page");
    if (body) {
      if (!body.querySelector("#siteNavigation")) {
        window.ktSiteNavCleanup?.();
        const placeholder = window.document.createElement("div");
        placeholder.id = "siteNavigation";
        body.prepend(placeholder);
      }

      const cleanup = [];
      let renderHomeGalleryItems;
      const legacyNavigate = (path) => navigate(path);
      window.ktLegacyNavigate = legacyNavigate;
      cleanup.push(() => {
        if (window.ktLegacyNavigate === legacyNavigate) {
          delete window.ktLegacyNavigate;
        }
      });
      const posterModal = body.querySelector("#posterModal");
      const posterImage = body.querySelector("#posterModalImage");
      if (posterModal && posterImage) {
        const originalBodyOverflow = window.document.body.style.overflow;
        const closePoster = () => {
          posterModal.classList.remove("show");
          posterModal.setAttribute("aria-hidden", "true");
          window.document.body.style.overflow = originalBodyOverflow;
        };
        const openPoster = (imagePath) => {
          const imageUrl = String(imagePath || "").trim().replace(/^\.\//, "");
          if (!imageUrl) return;
          const resolvedImageUrl = /^(?:https?:|data:|blob:|\/)/i.test(imageUrl)
            ? imageUrl
            : `/${imageUrl}`;
          posterImage.onerror = () => {
            posterImage.alt = "Poster paket tidak dapat dimuat";
          };
          posterImage.src = resolvedImageUrl;
          posterImage.alt = "Poster paket Umrah dan Haji";
          posterModal.classList.add("show");
          posterModal.setAttribute("aria-hidden", "false");
          window.document.body.style.overflow = "hidden";
        };
        const closePosterOutside = (event) => {
          if (event.target === posterModal) closePoster();
        };
        const escapeHandler = (event) => {
          if (event.key === "Escape") closePoster();
        };

        window.openPoster = openPoster;
        window.closePoster = closePoster;
        window.closePosterOutside = closePosterOutside;
        window.document.addEventListener("keydown", escapeHandler);
        cleanup.push(() => {
          window.document.removeEventListener("keydown", escapeHandler);
          posterImage.onerror = null;
          window.document.body.style.overflow = originalBodyOverflow;
          if (window.openPoster === openPoster) delete window.openPoster;
          if (window.closePoster === closePoster) delete window.closePoster;
          if (window.closePosterOutside === closePosterOutside) delete window.closePosterOutside;
        });
      }

      const homePosterModal = body.querySelector("#homePosterModal");
      const homePosterImage = body.querySelector("#homePosterImage");
      if (homePosterModal && homePosterImage) {
        const originalBodyOverflow = window.document.body.style.overflow;
        const closeHomePoster = () => {
          homePosterModal.classList.remove("is-visible");
          homePosterModal.setAttribute("aria-hidden", "true");
          window.document.body.style.overflow = originalBodyOverflow;
        };
        const openHomePoster = (imagePath) => {
          const imageUrl = String(imagePath || "").trim().replace(/^\.\//, "");
          if (!imageUrl) return;
          const resolvedImageUrl = /^(?:https?:|data:|blob:|\/)/i.test(imageUrl)
            ? imageUrl
            : `/${imageUrl}`;
          homePosterImage.onerror = () => {
            homePosterImage.alt = "Poster paket tidak dapat dimuat";
          };
          homePosterImage.src = resolvedImageUrl;
          homePosterImage.alt = "Poster paket Kurma Travel";
          homePosterModal.classList.add("is-visible");
          homePosterModal.setAttribute("aria-hidden", "false");
          window.document.body.style.overflow = "hidden";
        };
        const closeHomePosterOutside = (event) => {
          if (event.target === homePosterModal) closeHomePoster();
        };
        const escapeHandler = (event) => {
          if (event.key === "Escape" && homePosterModal.classList.contains("is-visible")) {
            closeHomePoster();
          }
        };

        window.openHomePoster = openHomePoster;
        window.closeHomePoster = closeHomePoster;
        window.closeHomePosterOutside = closeHomePosterOutside;
        window.document.addEventListener("keydown", escapeHandler);
        cleanup.push(() => {
          window.document.removeEventListener("keydown", escapeHandler);
          homePosterImage.onerror = null;
          window.document.body.style.overflow = originalBodyOverflow;
          if (window.openHomePoster === openHomePoster) delete window.openHomePoster;
          if (window.closeHomePoster === closeHomePoster) delete window.closeHomePoster;
          if (window.closeHomePosterOutside === closeHomePosterOutside) delete window.closeHomePosterOutside;
        });
      }

      const packageDetailModal = body.querySelector("#packageDetailModal");
      if (packageDetailModal) {
        const closePackageDetail = () => {
          packageDetailModal.classList.remove("show");
          window.document.body.style.overflow = "";
        };
        window.closePackageDetail = closePackageDetail;
        cleanup.push(() => {
          if (window.closePackageDetail === closePackageDetail) delete window.closePackageDetail;
        });
      }

      body.querySelectorAll("a[href], [onclick]").forEach((node) => {
        if (node.matches("a[href]")) {
          const href = node.getAttribute("href");
          if (href && !href.startsWith("http") && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("javascript:")) {
            const cleanHref = href.replace(/^\.\//, "");
            const route = cleanHref.endsWith(".html")
              ? "/" + cleanHref
              : "/" + cleanHref;
            const handler = (event) => {
              event.preventDefault();
              navigate(route);
            };
            node.addEventListener("click", handler);
            cleanup.push(() => node.removeEventListener("click", handler));
          }
        }

        const inlineClick = node.getAttribute("onclick");
        if (inlineClick?.includes("openWA")) {
          const messageMatch = inlineClick.match(/openWA\(['"`](.*?)['"`]\)/);
          const message = messageMatch?.[1] || "Halo Kurma Travel, saya mau konsultasi";
          const handler = (event) => {
            event.preventDefault();
            window.openWA?.(message);
          };
          node.addEventListener("click", handler);
          node.removeAttribute("onclick");
          cleanup.push(() => node.removeEventListener("click", handler));
        }
        if (inlineClick?.includes("closeWA")) {
          const handler = (event) => {
            if (
              (node.id === "waModal" || node.classList.contains("wa-modal")) &&
              event.target !== node
            ) {
              return;
            }
            window.closeWA?.();
          };
          node.addEventListener("click", handler);
          node.removeAttribute("onclick");
          cleanup.push(() => node.removeEventListener("click", handler));
        }
      });

      const hamburger = body.querySelector("#hamburger");
      const navMenu = body.querySelector("#navMenu");
      if (hamburger && navMenu) {
        const handler = () => {
          const isExpanded = navMenu.classList.toggle("show");
          hamburger.setAttribute("aria-expanded", String(isExpanded));
        };
        hamburger.setAttribute("role", "button");
        hamburger.setAttribute("tabindex", "0");
        hamburger.setAttribute("aria-controls", "navMenu");
        hamburger.setAttribute("aria-expanded", "false");
        hamburger.addEventListener("click", handler);
        cleanup.push(() => hamburger.removeEventListener("click", handler));

        const keyHandler = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handler();
          }
        };
        hamburger.addEventListener("keydown", keyHandler);
        cleanup.push(() => hamburger.removeEventListener("keydown", keyHandler));
      }

      body.querySelectorAll(".btn-wa").forEach((button) => {
        button.textContent = "Login Admin";
        button.removeAttribute("onclick");
        button.setAttribute("href", "/admin/login");
        const handler = (event) => {
          event.preventDefault();
          navigate("/admin/login");
        };
        button.addEventListener("click", handler);
        cleanup.push(() => button.removeEventListener("click", handler));
      });

      const isHomePage = location.pathname === "/" || location.pathname === "/index.html";
      const homeGallerySlides = isHomePage ? body.querySelector(".slider .slides") : null;
      const homeGallerySlider = isHomePage ? body.querySelector(".slider") : null;
      if (homeGallerySlides && homeGallerySlider) {
        let slideIndex = 0;
        const getGalleryItems = () => Array.from(homeGallerySlides.querySelectorAll("img"));
        const updateGalleryPosition = () => {
          const images = getGalleryItems();
          const firstImage = images[0];
          if (!firstImage) {
            homeGallerySlides.style.transform = "";
            return;
          }
          const itemWidth = firstImage.getBoundingClientRect().width + 15;
          const visibleWidth = homeGallerySlider.clientWidth || window.innerWidth;
          const maxIndex = Math.max(0, Math.ceil(
            (homeGallerySlides.scrollWidth - visibleWidth) / itemWidth
          ));
          slideIndex = Math.min(slideIndex, maxIndex);
          homeGallerySlides.style.transform = `translateX(-${slideIndex * itemWidth}px)`;
        };
        const moveGallery = (direction) => {
          const images = getGalleryItems();
          if (images.length < 2) return;
          const itemWidth = images[0].getBoundingClientRect().width + 15;
          const visibleWidth = homeGallerySlider.clientWidth || window.innerWidth;
          const maxIndex = Math.max(0, Math.ceil(
            (homeGallerySlides.scrollWidth - visibleWidth) / itemWidth
          ));
          slideIndex = direction > 0
            ? (slideIndex >= maxIndex ? 0 : slideIndex + 1)
            : (slideIndex <= 0 ? maxIndex : slideIndex - 1);
          updateGalleryPosition();
        };
        renderHomeGalleryItems = (items) => {
          const fragment = window.document.createDocumentFragment();
          items.forEach((item) => {
            if (!item.image) return;
            const image = window.document.createElement("img");
            image.src = item.image;
            image.alt = item.title || "Dokumentasi Kurma Travel";
            image.loading = "lazy";
            image.decoding = "async";
            image.addEventListener("click", () => window.openLightbox?.(image.src));
            image.addEventListener("error", () => {
              image.remove();
              requestAnimationFrame(updateGalleryPosition);
            });
            fragment.appendChild(image);
          });
          homeGallerySlides.replaceChildren(fragment);
          window.galleryImages = items.filter((item) => item.image).map((item) => item.image);
          slideIndex = 0;
          requestAnimationFrame(updateGalleryPosition);
        };
        const fallbackGallery = Array.from({ length: 224 }, (_, index) => ({
          title: `Dokumentasi Kurma Travel ${index + 1}`,
          image: `/static/images/gallery/gallery${index + 1}.jpg`,
        }));
        const previousButton = body.querySelector(".slider .prev");
        const nextButton = body.querySelector(".slider .next");
        const previousHandler = () => moveGallery(-1);
        const nextHandler = () => moveGallery(1);
        previousButton?.addEventListener("click", previousHandler);
        nextButton?.addEventListener("click", nextHandler);
        window.addEventListener("resize", updateGalleryPosition);
        renderHomeGalleryItems(fallbackGallery);
        const galleryInterval = window.setInterval(() => moveGallery(1), 4000);
        cleanup.push(() => {
          previousButton?.removeEventListener("click", previousHandler);
          nextButton?.removeEventListener("click", nextHandler);
          window.removeEventListener("resize", updateGalleryPosition);
          window.clearInterval(galleryInterval);
        });
      }

      if (location.pathname === "/galeri" || location.pathname === "/galeri.html") {
        const grid = body.querySelector(".gallery-grid");
        if (grid) {
          grid.querySelectorAll("img").forEach((img) => img.remove());
          const fragment = window.document.createDocumentFragment();
          const localGallery = Array.from({ length: 224 }, (_, index) => ({
            title: `Dokumentasi Kurma Travel ${index + 1}`,
            image: `/static/images/gallery/gallery${index + 1}.jpg`,
          }));
          localGallery.forEach((item) => {
            const img = window.document.createElement("img");
            img.src = item.image;
            img.alt = item.title;
            img.loading = "lazy";
            img.decoding = "async";
            img.tabIndex = 0;
            img.setAttribute("role", "button");
            img.addEventListener("click", () => window.openLightbox?.(img.src));
            img.addEventListener("keydown", (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                window.openLightbox?.(img.src);
              }
            });
            img.addEventListener("error", () => img.remove());
            fragment.appendChild(img);
          });
          grid.replaceChildren(fragment);
          window.galleryImages = localGallery.map((item) => item.image);

          const delegatedGalleryClick = (event) => {
            const target = event.target.closest?.(".gallery-grid img");
            if (target) window.openLightbox?.(target.src);
          };
          grid.addEventListener("click", delegatedGalleryClick);
          cleanup.push(() => grid.removeEventListener("click", delegatedGalleryClick));
        }
      }

      const cachedContent = readLocalCache(PUBLIC_CONTENT_CACHE_KEY);
      const skipContentFetch = skipNextContentFetchRef.current;
      skipNextContentFetchRef.current = false;
      const initialContentRequest = cachedContent
        ? Promise.resolve(cachedContent)
        : skipContentFetch
          ? Promise.resolve(null)
          : fetch("/api/content", { cache: "no-store" })
            .then((response) => response.ok ? response.json() : null);

      initialContentRequest
        .then((content) => {
          if (!content || !active) return;
          writeLocalCache(PUBLIC_CONTENT_CACHE_KEY, content);
          const theme = content.theme || {};
          const themeVariables = {
            "--primary": theme.primary,
            "--primary-dark": theme.primary_dark,
            "--navbar-color": theme.navbar,
            "--green": theme.green,
            "--green-dark": theme.green_dark,
            "--bg": theme.background,
          };
          Object.entries(themeVariables).forEach(([name, value]) => {
            if (value) window.document.documentElement.style.setProperty(name, value);
          });
          body.querySelectorAll(".navbar").forEach((navbar) => {
            if (theme.navbar) navbar.style.backgroundColor = theme.navbar;
          });

          if (isHomePage && Array.isArray(content.gallery)) {
            const galleryItems = content.gallery.filter(
              (item) => item.image && !item.hidden && !item.deleted_at
            );
            const hasGalleryRecords = content.gallery.some(
              (item) => item.image && !item.deleted_at
            ) || content.visibility?.gallery?.active > 0;
            if (galleryItems.length > 0) {
              renderHomeGalleryItems?.(galleryItems);
            } else if (hasGalleryRecords) {
              renderHomeGalleryItems?.([]);
            }
          }

          if (
            location.pathname === "/paket" ||
            location.pathname === "/paket.html" ||
            location.pathname === "/" ||
            location.pathname === "/index.html"
          ) {
            const grid = location.pathname === "/" || location.pathname === "/index.html"
              ? body.querySelector(".home-package-grid")
              : body.querySelector(".package-grid");
            const isHome = location.pathname === "/" || location.pathname === "/index.html";
            if (grid) grid.replaceChildren();
            content.packages.filter((item) => !item.hidden && !item.deleted_at).forEach((item) => {
              const card = window.document.createElement("article");
              card.className = isHome ? "home-package-card" : "travel-card";
              if (!isHome && (item.badge || "").toUpperCase().includes("RAMADHAN")) {
                card.classList.add("featured");
              }
              if (item.image) {
                const poster = window.document.createElement("div");
                poster.className = isHome ? "home-package-image" : "travel-poster";
                const image = window.document.createElement("img");
                image.src = item.image;
                image.alt = item.title || "";
                poster.appendChild(image);
                if (!isHome) {
                  const badge = window.document.createElement("span");
                  badge.className = "travel-badge" + ((item.badge || "").toUpperCase().includes("RAMADHAN") ? " ramadhan-badge" : "");
                  badge.textContent = item.badge || "PAKET UMRAH";
                  poster.prepend(badge);
                }
                card.appendChild(poster);
              }
              const cardContent = window.document.createElement("div");
              cardContent.className = isHome ? "home-package-body" : "travel-content";
              const category = window.document.createElement("span");
              category.className = isHome ? "home-package-category" : "travel-category";
              category.textContent = item.category || "PAKET PERJALANAN";
              const title = window.document.createElement("h3");
              title.textContent = item.title || "Paket perjalanan";
              const description = window.document.createElement("p");
              description.className = isHome ? "home-package-description" : "travel-description";
              description.textContent = item.description || "";
              cardContent.append(category, title, description);
              if (isHome) {
                const info = window.document.createElement("ul");
                info.className = "home-package-info";
                [
                  `📅 ${item.period || "Periode keberangkatan"}`,
                  `🕌 ${item.duration || "Durasi perjalanan"}`,
                  `🕋 ${item.program || "Perjalanan ibadah Umrah"}`,
                ].forEach((text) => {
                  const entry = window.document.createElement("li");
                  entry.textContent = text;
                  info.appendChild(entry);
                });

                const price = window.document.createElement("div");
                price.className = "home-package-price";
                const priceLabel = window.document.createElement("span");
                priceLabel.textContent = item.price || "Informasi harga";
                const priceDetails = window.document.createElement("strong");
                priceDetails.textContent = item.detail || item.price || "Lihat Detail / Hubungi Kami";
                price.append(priceLabel, priceDetails);

                const actions = window.document.createElement("div");
                actions.className = "home-package-actions";
                if (item.image) {
                  const detail = window.document.createElement("button");
                  detail.type = "button";
                  detail.className = "home-detail-btn";
                  detail.innerHTML = "Lihat Detail <span>↗</span>";
                  detail.addEventListener("click", () => window.openHomePoster?.(item.image));
                  actions.appendChild(detail);
                }
                const ask = window.document.createElement("button");
                ask.type = "button";
                ask.className = "home-register-btn";
                ask.innerHTML = "Tanya Paket <span>↗</span>";
                ask.addEventListener("click", () =>
                  window.openWA?.(`Saya ingin bertanya tentang Paket ${item.title || ""}`.trim())
                );
                actions.appendChild(ask);
                cardContent.append(info, price, actions);
              } else {
                const info = window.document.createElement("div");
                info.className = "travel-info";
                [
                  ["🕋", item.program || "Perjalanan ibadah Umrah"],
                  ["📅", item.period || "Periode keberangkatan"],
                  ["⏱️", item.duration || "Durasi perjalanan"],
                ].forEach(([icon, text]) => {
                  const span = window.document.createElement("span");
                  span.textContent = `${icon} ${text}`;
                  info.appendChild(span);
                });
                cardContent.appendChild(info);

                const footer = window.document.createElement("div");
                footer.className = "travel-footer";
                const price = window.document.createElement("div");
                price.className = "travel-price";
                const priceLabel = window.document.createElement("small");
                priceLabel.textContent = item.price || "Informasi harga";
                const priceValue = window.document.createElement("strong");
                priceValue.textContent = item.detail || item.price || "Lihat Detail / Hubungi Kami";
                price.append(priceLabel, priceValue);

                const actions = window.document.createElement("div");
                actions.className = "package-actions";
                const detail = window.document.createElement("button");
                detail.type = "button";
                detail.className = "detail-btn";
                detail.textContent = "Lihat Detail Poster ↗";
                detail.addEventListener("click", () => window.openPoster?.(item.image));
                const ask = window.document.createElement("button");
                ask.type = "button";
                ask.className = "travel-button";
                ask.textContent = "Tanya Paket ↗";
                ask.addEventListener("click", () => window.openWA?.(item.title || "Halo Kurma Travel, saya mau tanya paket"));
                actions.append(detail, ask);
                footer.append(price, actions);
                cardContent.appendChild(footer);
              }
              card.appendChild(cardContent);
              grid?.appendChild(card);
            });
          }

          if (location.pathname === "/galeri" || location.pathname === "/galeri.html") {
            const grid = body.querySelector(".gallery-grid");
            if (grid) grid.replaceChildren();
            const visibleGallery = content.gallery.filter((item) => item.image && !item.hidden && !item.deleted_at);
            const hasGalleryRecords = content.gallery.some((item) => item.image && !item.deleted_at)
              || content.visibility?.gallery?.active > 0;
            const galleryItems = hasGalleryRecords
              ? visibleGallery
              : Array.from({ length: 224 }, (_, index) => ({
                  title: `Dokumentasi Kurma Travel ${index + 1}`,
                  image: `/static/images/gallery/gallery${index + 1}.jpg`,
                }));
            const galleryImages = galleryItems.map((item) => item.image);
            const fragment = window.document.createDocumentFragment();
            galleryItems.forEach((item) => {
              const img = window.document.createElement("img");
              img.src = item.image || "";
              img.alt = item.title || "Dokumentasi Kurma Travel";
              img.loading = "lazy";
              img.decoding = "async";
              img.tabIndex = 0;
              img.setAttribute("role", "button");
              img.addEventListener("click", () => window.openLightbox?.(img.src));
              img.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  window.openLightbox?.(img.src);
                }
              });
              img.addEventListener("error", () => img.remove());
              if (item.image) fragment.appendChild(img);
            });
            window.galleryImages = galleryImages;
            grid?.replaceChildren(fragment);
          }

          if (location.pathname === "/perlengkapan" || location.pathname === "/perlengkapan.html") {
            const grid = body.querySelector("#perlengkapan");
            const lightbox = body.querySelector("#lightbox");
            const lightboxImage = body.querySelector("#lightbox-img");
            if (grid) {
              grid.replaceChildren();
              const equipmentItem = content.information?.find((item) =>
                !item.hidden && !item.deleted_at &&
                String(item.url || "").replace(/\/+$/, "").replace(/\.html$/, "") === "/perlengkapan"
              );
              const existingFeatureGrid = body.querySelector("#equipment-feature-grid");
              if (existingFeatureGrid) existingFeatureGrid.remove();
              const equipmentFeatures = Array.isArray(equipmentItem?.equipment_features)
                ? equipmentItem.equipment_features.filter((feature) => feature && String(feature.title || "").trim())
                : [];
              if (equipmentFeatures.length) {
                const featureGrid = window.document.createElement("div");
                featureGrid.id = "equipment-feature-grid";
                featureGrid.className = "equipment-feature-grid";
                const featureStyle = window.document.createElement("style");
                featureStyle.textContent = `
                  .equipment-feature-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:0 0 28px}
                  .equipment-feature-card{min-width:0;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:22px 14px;text-align:center;color:#392a22;background:linear-gradient(135deg,#fff,#fffaf5);border:1px solid #f0e2d5;border-radius:16px;box-shadow:0 7px 20px rgba(55,35,22,.08)}
                  .equipment-feature-card strong{display:block;font-size:15px;line-height:1.45}
                  .equipment-feature-icon{min-width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#ed7028;background:#fff7ef;border:1px solid #f0e2d5;border-radius:50%;font-size:24px;font-weight:800;line-height:1}
                  .equipment-feature-image{width:58px;height:58px;object-fit:contain}
                  @media(max-width:900px){.equipment-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
                  @media(max-width:420px){.equipment-feature-grid{grid-template-columns:1fr}}
                  .content>h2,.content>h3{margin:34px 0 14px;color:#392a22;line-height:1.35}
                  .content>h2{font-size:25px}.content>h3{font-size:20px}
                  .content>ul,.content>ol{margin:20px 0;padding:18px 22px 18px 44px;color:#76675d;background:#fff9f3;border:1px solid #f0e2d5;border-radius:13px;font-size:15px;line-height:1.85}
                  .content>ul li,.content>ol li{margin:6px 0;padding-left:4px}.content>ul{list-style-type:disc}
                `;
                body.appendChild(featureStyle);
                cleanup.push(() => featureStyle.remove());
                equipmentFeatures.forEach((feature, featureIndex) => {
                  const card = window.document.createElement("div");
                  card.className = "equipment-feature-card";
                  const icon = window.document.createElement("div");
                  icon.className = "equipment-feature-icon";
                  const rawIcon = String(feature.icon || "◆");
                  const featureTitle = String(feature.title || "");
                  icon.textContent = rawIcon.includes(featureTitle)
                    ? (rawIcon.replace(featureTitle, "").trim() || "◆")
                    : rawIcon;
                  const title = window.document.createElement("strong");
                  title.textContent = String(feature.title || "");
                  card.appendChild(icon);
                  card.appendChild(title);
                  if (feature.image) {
                    const image = window.document.createElement("img");
                    image.className = "equipment-feature-image";
                    image.src = feature.image;
                    image.alt = String(feature.title || `Fitur ${featureIndex + 1}`);
                    card.insertBefore(image, title);
                    icon.remove();
                  }
                  featureGrid.appendChild(card);
                });
                grid.before(featureGrid);
              }

              // Render from the CMS API directly so newly added cards and icon changes
              // never depend on a delayed React content-state refresh.
              const equipmentTextBlocks = getEquipmentTextBlocks(equipmentItem);
              const contentElement = body.querySelector(".content");
              if (contentElement) {
                Array.from(contentElement.querySelectorAll(":scope > p")).forEach((paragraph) => paragraph.remove());
                const backElement = contentElement.querySelector(":scope > .back");
                equipmentTextBlocks.forEach((block) => {
                  if (!block || !String(block.text || "").trim()) return;
                  const element = window.document.createElement(block.type === "heading"
                    ? (block.level === "h3" ? "h3" : "h2")
                    : block.type === "list" ? (block.ordered ? "ol" : "ul") : "p");
                  if (block.type === "list") {
                    (block.items || [])
                      .map((text) => String(text || "").trim())
                      .filter(Boolean)
                      .forEach((text) => {
                      const item = window.document.createElement("li");
                      item.textContent = String(text);
                      element.appendChild(item);
                    });
                  } else {
                    element.textContent = String(block.text || "");
                  }
                  if (element.tagName === "P" || element.tagName === "UL" || element.tagName === "OL") {
                    element.style.marginTop = "40px";
                  }
                  contentElement.insertBefore(element, backElement || null);
                });
              }
              const equipmentImages = Array.isArray(equipmentItem?.equipment_images)
                ? equipmentItem.equipment_images.filter(Boolean)
                : Array.from({ length: 11 }, (_, index) => `/static/images/perlengkapan/perlengkapan${index + 1}.jpg`);
              window.galleryImages = equipmentImages;
              equipmentImages.forEach((imageUrl, index) => {
                const image = window.document.createElement("img");
                image.src = imageUrl;
                image.alt = `Perlengkapan Umrah & Haji ${index}`;
                image.loading = "lazy";
                image.decoding = "async";
                image.tabIndex = 0;
                image.setAttribute("role", "button");
                const openEquipmentLightbox = () => {
                  if (!lightbox || !lightboxImage) return;
                  lightboxImage.src = image.src;
                  lightbox.style.display = "flex";
                };
                image.addEventListener("click", openEquipmentLightbox);
                image.addEventListener("keydown", (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openEquipmentLightbox();
                  }
                });
                image.addEventListener("error", () => image.remove());
                grid.appendChild(image);
              });
            }
            if (lightbox) {
              const closeEquipmentLightbox = () => {
                lightbox.style.display = "none";
              };
              lightbox.addEventListener("click", closeEquipmentLightbox);
              cleanup.push(() => lightbox.removeEventListener("click", closeEquipmentLightbox));
              const escapeEquipmentLightbox = (event) => {
                if (event.key === "Escape") closeEquipmentLightbox();
              };
              window.document.addEventListener("keydown", escapeEquipmentLightbox);
              cleanup.push(() => window.document.removeEventListener("keydown", escapeEquipmentLightbox));
            }
          }

          if (location.pathname === "/staf" || location.pathname === "/staf.html") {
            const grid = body.querySelector(".staff-grid-4");
            if (grid) grid.replaceChildren();
            const directorCard = body.querySelector(".staff-center .staff-card");
            const visibleStaff = content.staff.filter((item) => !item.hidden && !item.deleted_at);
            const director = visibleStaff.find((item) =>
              /direktur/i.test(`${item.category || ""} ${item.title || ""}`)
            );
            if (!director && content.visibility?.staff?.active > 0) directorCard?.remove();
            if (directorCard && director) {
              const directorImage = directorCard.querySelector("img");
              const directorLabel = directorCard.querySelector(".staff-label");
              if (directorImage) {
                directorImage.src = director.image || "";
                directorImage.alt = director.title || "Direktur Kurma Travel";
              }
              if (directorLabel) {
                directorLabel.replaceChildren(window.document.createTextNode(director.title || ""));
                const directorRole = window.document.createElement("span");
                directorRole.textContent = director.category || "";
                directorLabel.appendChild(directorRole);
              }
            }
            const staffMembers = orderedStaff(visibleStaff).filter((item) =>
              !/direktur/i.test(`${item.category || ""} ${item.title || ""}`)
            );
            staffMembers.forEach((item) => {
              const card = window.document.createElement("div");
              card.className = "staff-card";
              const image = window.document.createElement("img");
              image.src = item.image || "";
              image.alt = item.title || "Staf Kurma Travel";
              const label = window.document.createElement("div");
              label.className = "staff-label";
              label.append(window.document.createTextNode(item.title || ""));
              const role = window.document.createElement("span");
              role.textContent = item.category || "";
              label.appendChild(role);
              card.append(image, label);
              grid?.appendChild(card);
            });
          }

          if (location.pathname === "/kontak" || location.pathname === "/kontak.html") {
            const grid = body.querySelector(".contact-grid");
            if (grid) grid.replaceChildren();
            const visibleContacts = content.contacts.filter((item) => !item.hidden && !item.deleted_at);

            const createContactCard = (category, icon, items, actionLabel) => {
              const card = window.document.createElement("div");
              card.className = "card";
              if (category === "Email") card.classList.add("email-card");
              const heading = window.document.createElement("h3");
              heading.textContent = `${icon} ${category}`;
              const bodyElement = window.document.createElement("div");
              bodyElement.className = "contact-card-body";
              items.forEach((item, index) => {
                const link = window.document.createElement("a");
                link.className = "contact-row";
                let href = item.url || "";
                if (category === "Email") {
                  const emailAddress = (item.url || item.title || item.description || "")
                    .replace(/^mailto:/i, "")
                    .trim();
                  href = emailAddress.includes("@") ? `mailto:${emailAddress}` : "#";
                  link.setAttribute("aria-label", `Kirim email ke ${item.title || item.description || emailAddress}`);
                } else if (category === "Alamat Kantor Pusat") {
                  href = item.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.description || item.title || "")}`;
                } else {
                  href = item.url || "#";
                }
                link.href = href;
                link.target = category === "Email" ? "_self" : "_blank";
                link.rel = "noopener";
                link.textContent = category === "Alamat Kantor Pusat"
                  ? (item.description || item.title || "")
                  : (item.title || item.description || "");
                bodyElement.appendChild(link);
              });
              card.append(heading, bodyElement);
              if (actionLabel && items[0]) {
                const action = window.document.createElement("a");
                action.className = category === "Email" ? "map-btn email-btn" : "map-btn";
                if (category === "Email") {
                  const emailAddress = (items[0].url || items[0].title || items[0].description || "")
                    .replace(/^mailto:/i, "")
                    .trim();
                  action.href = emailAddress.includes("@") ? `mailto:${emailAddress}` : "#";
                  action.setAttribute("aria-label", "Kirim email ke Kurma Travel");
                } else {
                  action.href = items[0].url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(items[0].description || items[0].title || "")}`;
                }
                action.target = category === "Email" ? "_self" : "_blank";
                action.rel = "noopener";
                action.textContent = actionLabel;
                card.appendChild(action);
              }
              grid?.appendChild(card);
            };

            const contactGroups = [];
            visibleContacts.forEach((item) => {
              const label = item.category || "Kontak";
              const normalizedLabel = label.toLowerCase();
              const isWhatsapp = normalizedLabel.includes("whatsapp");
              const isAddress = normalizedLabel.includes("alamat") || normalizedLabel.includes("address");
              const isEmail = normalizedLabel.includes("email");
              const groupKey = isWhatsapp
                ? "whatsapp"
                : isAddress
                  ? "address"
                  : isEmail
                    ? "email"
                    : `contact:${item.id}`;
              let group = contactGroups.find((candidate) => candidate.key === groupKey);
              if (!group) {
                group = {
                  key: groupKey,
                  category: isWhatsapp ? "WhatsApp" : isAddress ? "Alamat Kantor Pusat" : label,
                  icon: isWhatsapp ? "📱" : isAddress ? "📍" : isEmail ? "✉️" : "📞",
                  actionLabel: isAddress ? "📍 Buka Maps" : isEmail ? "✉️ Kirim Email" : undefined,
                  items: [],
                };
                contactGroups.push(group);
              }
              group.items.push(item);
            });
            contactGroups.forEach((group) =>
              createContactCard(group.category, group.icon, group.items, group.actionLabel)
            );
          }

          if (location.pathname === "/artikel" || location.pathname === "/artikel.html") {
            const articleList = body.querySelectorAll(".artikel-list")[0];
            const infoList = body.querySelectorAll(".artikel-list")[1];
            articleList?.querySelectorAll(":scope > a").forEach((link) => link.remove());
            infoList?.querySelectorAll(":scope > a").forEach((link) => link.remove());
            content.articles.filter((item) => !item.hidden && !item.deleted_at).forEach((item) => {
              const link = window.document.createElement("a");
              link.href = item.url || "#";
              link.textContent = item.title || "Artikel baru";
              link.className = "artikel-link";
              link.addEventListener("click", (event) => {
                if (!item.url?.startsWith("http")) {
                  event.preventDefault();
                  navigate(item.url?.replace(/^\//, "/"));
                }
              });
              if (item.description) link.title = item.description;
              articleList?.appendChild(link);
            });
            content.information.filter((item) => !item.hidden && !item.deleted_at).forEach((item) => {
              const link = window.document.createElement("a");
              link.href = item.url || "#";
              link.textContent = item.title || "Informasi baru";
              link.className = "artikel-link";
              link.addEventListener("click", (event) => {
                if (!item.url?.startsWith("http")) {
                  event.preventDefault();
                  navigate(item.url?.replace(/^\//, "/"));
                }
              });
              if (item.description) link.title = item.description;
              infoList?.appendChild(link);
            });
          }

          const detailItems = [...content.articles, ...content.information]
            .filter((item) => !item.hidden && !item.deleted_at);
          const detailItem = detailItems.find((item) => {
            const itemRoute = (item.url || "").replace(/\/$/, "").replace(/\.html$/, "").replace(/^\/+/, "/");
            const currentRoute = location.pathname.replace(/\/$/, "").replace(/\.html$/, "");
            return itemRoute === currentRoute || itemRoute === location.pathname;
          });
          const articleInformationRoutes = new Set([
            "/artikel-haji", "/artikel-manfaat", "/artikel-tips",
            "/tentang", "/syarat", "/keunggulan", "/perlengkapan",
            "/artikel-haji.html", "/artikel-manfaat.html", "/artikel-tips.html",
            "/tentang.html", "/syarat.html", "/keunggulan.html", "/perlengkapan.html",
          ]);
          if (
            articleInformationRoutes.has(location.pathname) &&
            !detailItem &&
            location.pathname !== "/perlengkapan" &&
            !location.pathname.endsWith("perlengkapan.html")
          ) {
            navigate("/artikel", { replace: true });
            return;
          }
          if (detailItem?.description) {
            const contentCard = body.querySelector(".content");
            const heroTitle = body.querySelector(".hero h1");
            if (heroTitle && detailItem.title) heroTitle.textContent = detailItem.title;
            if (contentCard) {
              const backButton = createArticleBackButton(
                window.document,
                contentCard.querySelector(".back"),
              );
              const originalGallery = contentCard.querySelector(".gallery-grid")?.cloneNode(true);
              contentCard.innerHTML = detailItem.description;
              removeArticleBackLinks(contentCard);

              if (originalGallery && !contentCard.querySelector(".gallery-grid")) {
                contentCard.prepend(originalGallery);
              }
              contentCard.appendChild(backButton);

              backButton.addEventListener("click", (event) => {
                event.preventDefault();
                navigate("/artikel");
              });
            }
          }
        })
        .catch(() => {})
        .finally(async () => {
          await stylesheetReady;
          if (active) setIsHydrating(false);
        });

      if (cachedContent && !skipContentFetch) {
        fetch("/api/content", { cache: "no-store" })
          .then((response) => response.ok ? response.json() : null)
          .then((content) => {
            if (!content || !active) return;
            const previousContent = readLocalCache(PUBLIC_CONTENT_CACHE_KEY);
            writeLocalCache(PUBLIC_CONTENT_CACHE_KEY, content);
            if (previousContent && !sameContent(previousContent, content)) {
              skipNextContentFetchRef.current = true;
              setIsHydrating(true);
              setHtml((current) => `${current} `);
            }
          })
          .catch(() => {});
      }

      body.querySelectorAll("script").forEach((originalScript) => {
        originalScript.remove();
      });
      const sharedScripts = [
        "/static/js/site-nav.js",
        "/static/js/site-components.js",
      ];
      const sharedScriptElements = sharedScripts.map((src) => {
        const script = window.document.createElement("script");
        script.src = src;
        script.async = false;
        script.addEventListener("error", () => {
          console.error(`Shared page script failed to load: ${src}`);
        }, { once: true });
        window.document.body.appendChild(script);
        return script;
      });
      cleanup.push(() => {
        window.ktSiteNavCleanup?.();
        window.ktSiteComponentsCleanup?.();
        window.ktGalleryCleanup?.();
        sharedScriptElements.forEach((script) => script.remove());
      });

      return () => {
        active = false;
        cleanup.forEach((fn) => fn());
        styleCleanup.forEach((fn) => fn());
      };
    }
  }, [html, pageStyles, location.pathname, navigate]);

  if (error) return <main className="legacy-error">{error}</main>;
  return (
    <div
      className={`legacy-page ${isHydrating ? "cms-hydrating" : "cms-ready"}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

let waPreviousOverflow = "";
let waReturnFocus = null;
window.openWA = function (message) {
  const modal = document.querySelector("#waModal");
  if (!modal) {
    console.error("Elemen modal WhatsApp #waModal tidak ditemukan.");
    return;
  }

  const numbers = ["6281280803429", "6283875613645", "6287776042572"];
  const encoded = encodeURIComponent(
    message || "Halo Kurma Travel, saya ingin mendapatkan informasi."
  );
  ["wa1", "wa2", "wa3"].forEach((id, index) => {
    const link = modal.querySelector(`#${id}`);
    if (!link) {
      console.error(`Tautan admin WhatsApp #${id} tidak ditemukan.`);
      return;
    }
    link.href = `https://wa.me/${numbers[index]}?text=${encoded}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
  waPreviousOverflow = document.body.style.overflow;
  waReturnFocus = document.activeElement;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("active");
  modal.classList.add("show");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  modal.querySelector("a[href]")?.focus();
};

window.closeWA = function () {
  const modal = document.querySelector("#waModal");
  if (!modal) return;
  modal?.classList.remove("active");
  modal?.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  modal.style.display = "none";
  document.body.style.overflow = waPreviousOverflow;
  if (waReturnFocus && typeof waReturnFocus.focus === "function") {
    waReturnFocus.focus();
  }
};

window.openLightbox = function (source) {
  let lightbox = document.querySelector("#lightbox");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "lightbox";
    lightbox.className = "lightbox";
    lightbox.innerHTML = '<button type="button" class="lightbox-close" aria-label="Tutup foto">&times;</button><button type="button" class="lightbox-nav lightbox-prev" aria-label="Foto sebelumnya">&#10094;</button><img id="lightbox-img" src="" alt="Foto dokumentasi Kurma Travel"><button type="button" class="lightbox-nav lightbox-next" aria-label="Foto berikutnya">&#10095;</button>';
    document.body.appendChild(lightbox);
  }

  let close = lightbox.querySelector(".lightbox-close");
  if (!close) {
    close = document.createElement("button");
    close.type = "button";
    close.className = "lightbox-close";
    close.setAttribute("aria-label", "Tutup foto");
    close.textContent = "×";
    lightbox.prepend(close);
  }

  let previous = lightbox.querySelector(".lightbox-prev");
  let next = lightbox.querySelector(".lightbox-next");
  if (!previous) {
    previous = document.createElement("button");
    previous.type = "button";
    previous.className = "lightbox-nav lightbox-prev";
    previous.innerHTML = "&#10094;";
    lightbox.appendChild(previous);
  }
  if (!next) {
    next = document.createElement("button");
    next.type = "button";
    next.className = "lightbox-nav lightbox-next";
    next.innerHTML = "&#10095;";
    lightbox.appendChild(next);
  }

  const images = window.galleryImages?.length
    ? window.galleryImages
    : Array.from(document.querySelectorAll(".gallery-grid img")).map((image) => image.src).filter(Boolean);
  const normalizedSource = (() => {
    try {
      return new URL(source, window.location.origin).pathname;
    } catch {
      return String(source || "");
    }
  })();
  let currentIndex = images.findIndex((imageSource) => {
    try {
      return new URL(imageSource, window.location.origin).pathname === normalizedSource;
    } catch {
      return imageSource === source;
    }
  });
  currentIndex = currentIndex >= 0 ? currentIndex : 0;

  const showImage = () => {
    const image = lightbox.querySelector("#lightbox-img");
    if (image && images[currentIndex]) image.src = images[currentIndex];
    lightbox.style.display = "flex";
    lightbox.classList.add("show");
    document.body.style.overflow = "hidden";
  };
  const closeLightbox = () => {
    lightbox.style.display = "none";
    lightbox.classList.remove("show");
    document.body.style.overflow = "";
    if (lightbox._escapeHandler) {
      document.removeEventListener("keydown", lightbox._escapeHandler);
      lightbox._escapeHandler = null;
    }
  };

  previous.onclick = (event) => {
    event.stopPropagation();
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    showImage();
  };
  next.onclick = (event) => {
    event.stopPropagation();
    currentIndex = (currentIndex + 1) % images.length;
    showImage();
  };
  lightbox.querySelector(".lightbox-close").onclick = (event) => {
    event.stopPropagation();
    closeLightbox();
  };
  lightbox.onclick = (event) => {
    if (event.target === lightbox) closeLightbox();
  };
  const escapeHandler = (event) => {
    if (event.key === "Escape") closeLightbox();
  };
  document.removeEventListener("keydown", lightbox._escapeHandler);
  lightbox._escapeHandler = escapeHandler;
  document.addEventListener("keydown", escapeHandler);
  showImage();
};

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session")
      .then((response) => {
        if (response.ok) navigate("/admin", { replace: true });
      })
      .catch(() => {
        if (active) {
          setError("Tidak dapat memeriksa sesi admin. Periksa koneksi backend.");
        }
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Login gagal");
        return;
      }
      navigate("/admin");
    } catch {
      setError("Tidak dapat menghubungi server autentikasi. Periksa koneksi backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-login-brand">
          <img src="/static/images/logo.png" alt="Kurma Travel" />
          <span>KURMA TRAVEL</span>
        </div>
        <h1>Login Admin</h1>
        <p>Kelola paket, galeri, artikel, dan informasi website.</p>
        <label>Email atau username
          <input type="text" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck="false" required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error && <div className="admin-error">{error}</div>}
        <button className="admin-primary-button" type="submit" disabled={loading}>
          {loading ? "Memproses..." : "Masuk"}
        </button>
        <button className="admin-back-button" type="button" onClick={() => navigate("/")}>
          Kembali ke website
        </button>
      </form>
    </main>
  );
}

const contentLabels = {
  packages: "Paket",
  gallery: "Galeri",
  articles: "Artikel",
  information: "Informasi",
  staff: "Staf",
  contacts: "Kontak",
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("packages");
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [content, setContent] = useState(defaultContent());
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [archiveView, setArchiveView] = useState("active");
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const editorPanelRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);

  function defaultContent() {
    return { packages: [], gallery: [], articles: [], information: [], staff: [], contacts: [], theme: {} };
  }

  async function loadContent() {
    try {
      const sessionResponse = await fetch("/api/admin/session");
      if (sessionResponse.status === 401) {
        navigate("/admin/login", { replace: true });
        return false;
      }
      if (!sessionResponse.ok) {
        setMessage(`Sesi admin gagal diperiksa (HTTP ${sessionResponse.status}).`);
        return false;
      }
      const contentResponse = await fetch("/api/admin/content");
      if (!contentResponse.ok) {
        const data = await contentResponse.json().catch(() => ({}));
        setMessage(
          `${data.error || "Data dashboard gagal dimuat"} (HTTP ${contentResponse.status}). Periksa log backend.`,
        );
        return false;
      }
      const loadedContent = await contentResponse.json();
      writePublicContentCache(loadedContent);
      setContent(loadedContent);
      setOrderDirty(false);
      setMessage("");
      return true;
    } catch (error) {
      setMessage(`Data dashboard gagal dimuat: ${error.message || "periksa koneksi backend."}`);
      return false;
    }
  }

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    if (editing === null) return;
    window.requestAnimationFrame(() => {
      editorPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [editing, activeSection]);

  useEffect(() => {
    if (!isNavigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setIsNavigationOpen(false);
      mobileMenuButtonRef.current?.focus();
    };
    const closeOnDesktopResize = () => {
      if (window.innerWidth > 900) setIsNavigationOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktopResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktopResize);
    };
  }, [isNavigationOpen]);

  function closeMobileNavigation() {
    setIsNavigationOpen(false);
    if (window.innerWidth <= 900) mobileMenuButtonRef.current?.focus();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    navigate("/admin/login", { replace: true });
  }

  async function uploadImage(event, setImage) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Upload foto gagal");
        return;
      }
      setImage(data.url);
      setMessage("Foto berhasil diunggah. Simpan perubahan staf untuk menerapkannya.");
    } catch (error) {
      setMessage(error.message || "Upload foto gagal. Periksa koneksi lalu coba lagi.");
    } finally {
      input.value = "";
    }
  }

  async function saveItem(item) {
    if (orderDirty && !(await saveContentOrder())) return;
    const normalizedItem = { ...item };
    if (activeSection === "staff" && normalizedItem.display_order == null) {
      normalizedItem.display_order = Math.max(
        -1,
        ...orderedStaff(content.staff).map((staffMember, index) =>
          Number.isFinite(Number(staffMember.display_order))
            ? Number(staffMember.display_order)
            : index
        )
      ) + 1;
    }
    if (activeSection === "articles" || activeSection === "information") {
      if (!normalizedItem.url?.trim()) {
        const slugBase = (normalizedItem.title || (activeSection === "articles" ? "artikel-baru" : "informasi-baru"))
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        normalizedItem.url = `/${slugBase || (activeSection === "articles" ? "artikel-baru" : "informasi-baru")}`;
      } else {
        normalizedItem.url = normalizedItem.url.trim().replace(/\.html$/, "");
        if (!normalizedItem.url.startsWith("/") && !/^https?:\/\//i.test(normalizedItem.url)) {
          normalizedItem.url = "/" + normalizedItem.url;
        }
      }
    }
    const method = item.id ? "PUT" : "POST";
    const url = item.id
      ? `/api/admin/content/${activeSection}/${item.id}`
      : `/api/admin/content/${activeSection}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedItem),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "Gagal menyimpan konten");
      return;
    }
    setEditing(null);
    setMessage("Konten berhasil disimpan.");
    await loadContent();
  }

  function moveContentItem(itemId, offset, scopedItems) {
    if (savingOrder) return;
    const allItems = activeSection === "staff"
      ? orderedStaff(content.staff)
      : [...(content[activeSection] || [])];
    const scopedIds = scopedItems ? new Set(scopedItems.map((item) => item.id)) : null;
    const movableIndexes = allItems.reduce((indexes, item, index) => {
      const isDirector = activeSection === "staff"
        && /direktur/i.test(`${item.category || ""} ${item.title || ""}`);
      if (!isDirector && (!scopedIds || scopedIds.has(item.id))) indexes.push(index);
      return indexes;
    }, []);
    const movableItems = movableIndexes.map((index) => allItems[index]);
    const sourceIndex = movableItems.findIndex((item) => item.id === itemId);
    const targetIndex = sourceIndex + offset;
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= movableItems.length) return;
    [movableItems[sourceIndex], movableItems[targetIndex]] = [
      movableItems[targetIndex],
      movableItems[sourceIndex],
    ];
    const reorderedItems = [...allItems];
    movableIndexes.forEach((index, orderIndex) => {
      reorderedItems[index] = movableItems[orderIndex];
    });
    if (activeSection === "staff") {
      reorderedItems.forEach((item, index) => {
        item.display_order = index;
      });
    }
    setContent((current) => ({ ...current, [activeSection]: reorderedItems }));
    setOrderDirty(true);
  }

  function moveContentItemTo(sourceId, targetId) {
    if (savingOrder) return;
    const allItems = activeSection === "staff"
      ? orderedStaff(content.staff)
      : [...(content[activeSection] || [])];
    const directors = activeSection === "staff"
      ? allItems.filter((item) => /direktur/i.test(`${item.category || ""} ${item.title || ""}`))
      : [];
    const movableItems = activeSection === "staff"
      ? allItems.filter((item) => !/direktur/i.test(`${item.category || ""} ${item.title || ""}`))
      : allItems;
    const sourceIndex = movableItems.findIndex((item) => item.id === sourceId);
    const targetIndex = movableItems.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const [draggedItem] = movableItems.splice(sourceIndex, 1);
    movableItems.splice(targetIndex, 0, draggedItem);
    const reorderedItems = activeSection === "staff"
      ? [...directors, ...movableItems].map((item, index) => ({ ...item, display_order: index }))
      : movableItems;
    setContent((current) => ({ ...current, [activeSection]: reorderedItems }));
    setOrderDirty(true);
  }

  async function saveContentOrder(section = activeSection) {
    if (!orderDirty || savingOrder) return !orderDirty;
    setSavingOrder(true);
    setMessage("");
    try {
      const items = section === "staff"
        ? orderedStaff(content.staff)
        : (content[section] || []);
      const response = await fetch(`/api/admin/content/${section}/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: items.map((item) => item.id) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Urutan konten gagal disimpan.");
      if (!(await loadContent())) return false;
      setMessage(`Urutan ${contentLabels[section].toLowerCase()} berhasil disimpan.`);
      return true;
    } catch (error) {
      setMessage(error.message || "Urutan konten gagal disimpan.");
      return false;
    } finally {
      setSavingOrder(false);
    }
  }

  async function changeSection(section) {
    if (orderDirty && !(await saveContentOrder())) return;
    setActiveSection(section);
    setArchiveView("active");
    setEditing(null);
    setMessage("");
    return true;
  }

  async function changeArchiveView(view) {
    if (orderDirty && !(await saveContentOrder())) return;
    setArchiveView(view);
    setEditing(null);
  }

  async function deleteItem(itemId) {
    if (!window.confirm("Hapus pengaturan kontak ini secara permanen?")) return;
    if (orderDirty && !(await saveContentOrder())) return;
    const response = await fetch(`/api/admin/content/${activeSection}/${itemId}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "Pengaturan kontak gagal dihapus.");
      return;
    }
    await loadContent();
    setMessage("Pengaturan kontak berhasil dihapus.");
  }

  async function archiveItem(itemId) {
    if (orderDirty && !(await saveContentOrder())) return;
    try {
      const response = await fetch(`/api/admin/content/${activeSection}/${itemId}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Konten gagal diarsipkan.");
      if (await loadContent()) setMessage("Konten berhasil dipindahkan ke arsip.");
    } catch (error) {
      setMessage(error.message || "Konten gagal diarsipkan.");
    }
  }

  async function toggleItemVisibility(item) {
    if (orderDirty && !(await saveContentOrder())) return;
    const hidden = !item.hidden;
    try {
      const response = await fetch(`/api/admin/content/${activeSection}/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, hidden }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Visibilitas konten gagal diperbarui.");
      if (await loadContent()) {
        setMessage(hidden ? "Konten berhasil disembunyikan." : "Konten kembali ditampilkan.");
      }
    } catch (error) {
      setMessage(error.message || "Visibilitas konten gagal diperbarui.");
    }
  }

  async function restoreArchivedItem(itemId) {
    try {
      const response = await fetch(`/api/admin/content/${activeSection}/${itemId}/restore`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Konten gagal dipulihkan.");
      if (await loadContent()) setMessage("Konten berhasil dipulihkan.");
    } catch (error) {
      setMessage(error.message || "Konten gagal dipulihkan.");
    }
  }

  async function permanentlyDeleteArchivedItem(itemId) {
    if (!window.confirm("Hapus konten ini secara permanen? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      const response = await fetch(`/api/admin/content/${activeSection}/${itemId}/permanent`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Konten gagal dihapus permanen.");
      if (await loadContent()) setMessage("Konten berhasil dihapus permanen.");
    } catch (error) {
      setMessage(error.message || "Konten gagal dihapus permanen.");
    }
  }

  async function saveTheme(theme) {
    const response = await fetch("/api/admin/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theme),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(
        [data.error || "Gagal menyimpan warna", data.detail].filter(Boolean).join(": "),
      );
      return;
    }
    const savedTheme = await response.json();
    setContent((current) => {
      const updatedContent = { ...current, theme: savedTheme };
      writePublicContentCache(updatedContent);
      return updatedContent;
    });
    setMessage("Tema warna berhasil disimpan.");
  }

  const currentItems = activeSection === "staff"
    ? orderedStaff(content.staff)
    : (content[activeSection] || []);
  const whatsappItems = activeSection === "contacts"
    ? currentItems.filter((item) => (item.category || "").toLowerCase().includes("whatsapp"))
    : [];
  const regularItems = activeSection === "contacts"
    ? currentItems.filter((item) => !(item.category || "").toLowerCase().includes("whatsapp"))
    : currentItems;
  const archivedItems = content.archives?.[activeSection] || [];
  const supportsArchive = ARCHIVABLE_SECTIONS.has(activeSection);
  const supportsVisibility = VISIBILITY_SECTIONS.has(activeSection);

  return (
    <main className="admin-dashboard">
      <header className="admin-mobile-header">
        <div className="admin-mobile-brand">
          <img src="/static/images/logo.png" alt="" />
          <span><strong>KURMA TRAVEL</strong><small>Admin Panel</small></span>
        </div>
        <button
          ref={mobileMenuButtonRef}
          className="admin-mobile-menu-button"
          type="button"
          aria-label={isNavigationOpen ? "Tutup navigasi admin" : "Buka navigasi admin"}
          aria-controls="adminNavigationDrawer"
          aria-expanded={isNavigationOpen}
          onClick={() => setIsNavigationOpen((open) => !open)}
        >
          <span></span><span></span><span></span>
        </button>
      </header>

      <aside
        className={`admin-sidebar ${isNavigationOpen ? "is-open" : ""}`}
        id="adminNavigationDrawer"
        aria-label="Navigasi Admin Panel"
      >
        <div className="admin-sidebar-brand">
          <img src="/static/images/logo.png" alt="Kurma Travel" />
          <strong>KURMA TRAVEL</strong>
          <button
            className="admin-drawer-close"
            type="button"
            aria-label="Tutup navigasi admin"
            onClick={closeMobileNavigation}
          >
            ×
          </button>
        </div>
        <nav aria-label="Bagian admin">
          {Object.entries(contentLabels).map(([section, label]) => (
            <button
              type="button"
              key={section}
              className={activeSection === section ? "active" : ""}
              onClick={async () => {
                if (await changeSection(section)) closeMobileNavigation();
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={activeSection === "theme" ? "active" : ""}
            onClick={async () => {
              if (await changeSection("theme")) closeMobileNavigation();
            }}
          >
            Warna Situs
          </button>
        </nav>
        <button className="admin-logout" type="button" onClick={logout}>Keluar</button>
      </aside>
      <button
        className={`admin-nav-backdrop ${isNavigationOpen ? "is-visible" : ""}`}
        type="button"
        aria-label="Tutup navigasi admin"
        aria-hidden={!isNavigationOpen}
        tabIndex={isNavigationOpen ? 0 : -1}
        onClick={closeMobileNavigation}
      />

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <span>Admin Panel</span>
            <h1>{activeSection === "theme" ? "Pengaturan Warna Situs" : `Kelola ${contentLabels[activeSection]}`}</h1>
          </div>
          <div className="admin-header-actions">
            <a className="admin-view-button" href="/">Lihat Website</a>
            {activeSection !== "theme" && !(supportsArchive && archiveView === "archive") && (
              <button className="admin-primary-button" onClick={() => setEditing({})}>
                {activeSection === "contacts" ? "Tambah Kontak Lain" : `Tambah ${contentLabels[activeSection]}`}
              </button>
            )}
          </div>
        </header>
        {message && <div className="admin-message">{message}</div>}

        {supportsArchive && (
          <div className="admin-archive-toolbar">
            <button
              type="button"
              className={archiveView === "active" ? "active" : ""}
              onClick={() => changeArchiveView("active")}
            >
              Data Aktif ({currentItems.length})
            </button>
            <button
              type="button"
              className={archiveView === "archive" ? "active" : ""}
              onClick={() => changeArchiveView("archive")}
            >
              Arsip ({archivedItems.length})
            </button>
          </div>
        )}

        {activeSection === "theme" && (
          <ThemeEditor theme={content.theme || {}} onSave={saveTheme} />
        )}

        {editing !== null && (
          <div className="admin-editor-panel" ref={editorPanelRef}>
            <ContentEditor
              key={`${activeSection}-${editing.id || "new"}`}
              section={activeSection}
              item={editing}
              onSave={saveItem}
              onCancel={() => setEditing(null)}
              onUpload={uploadImage}
            />
          </div>
        )}

        {activeSection !== "theme" && archiveView === "active" && (
          <div className="admin-order-toolbar">
            <p className="admin-order-hint">
              {activeSection === "staff"
                ? "Seret kartu staf atau gunakan tombol panah untuk mengatur urutan. Direktur tetap berada di bagian utama."
                : activeSection === "contacts"
                  ? "Gunakan tombol panah untuk mengatur urutan kontak yang tampil di website."
                  : "Seret kartu atau gunakan tombol panah untuk mengatur urutan konten yang tampil di website."}
            </p>
            {orderDirty && (
              <button
                type="button"
                className="admin-primary-button"
                disabled={savingOrder}
                onClick={() => saveContentOrder()}
              >
                {savingOrder ? "Menyimpan..." : "Simpan Urutan"}
              </button>
            )}
          </div>
        )}

        {supportsArchive && archiveView === "archive" && (
          <div className={`admin-list admin-list-${activeSection} admin-list-archive`}>
            {archivedItems.length === 0 && <div className="admin-empty">Arsip {contentLabels[activeSection].toLowerCase()} kosong.</div>}
            {archivedItems.map((item) => (
              <article className="admin-list-item" key={item.id}>
                {item.image && <img className="admin-list-image" src={item.image} alt="" />}
                <div>
                  <strong>{item.title || "Tanpa judul"}</strong>
                  {(item.category || item.description) && (
                    <p>{item.category ? `${item.category} - ` : ""}{
                      activeSection === "articles" || activeSection === "information"
                        ? stripHtml(item.description).slice(0, 180)
                        : item.description || ""
                    }</p>
                  )}
                  <small>
                    Diarsipkan {item.archived_at ? item.archived_at.replace("T", " ") : "—"}
                    {item.archived_by ? ` oleh ${item.archived_by}` : ""}
                  </small>
                </div>
                <div className="admin-item-actions">
                  <button type="button" onClick={() => restoreArchivedItem(item.id)}>Pulihkan</button>
                  <button type="button" className="danger" onClick={() => permanentlyDeleteArchivedItem(item.id)}>Hapus Permanen</button>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeSection === "contacts" && whatsappItems.length > 0 && (
          <section className="admin-contact-group">
            <header>
              <div>
                <h2>WhatsApp</h2>
                <p>{whatsappItems.length} nomor, dikelola dalam satu daftar seperti tampilan publik.</p>
              </div>
              <button type="button" className="admin-primary-button" onClick={() => setEditing({ category: "WhatsApp" })}>
                Tambah Nomor
              </button>
            </header>
            <div className="admin-contact-table-wrap">
              <table className="admin-contact-table">
                <thead>
                  <tr><th>Nama / Nomor</th><th>Link WhatsApp</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {whatsappItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.title || "Nomor WhatsApp"}
                        <br />
                        {supportsVisibility && (
                          <span className={`content-status ${item.hidden ? "hidden" : ""}`}>
                            {item.hidden ? "Tersembunyi" : "Ditampilkan"}
                          </span>
                        )}
                      </td>
                      <td><a href={item.url} target="_blank" rel="noopener noreferrer">{item.url || "Belum ada link"}</a></td>
                      <td>
                        <div className="admin-item-actions">
                          <ContentOrderControls
                            item={item}
                            index={whatsappItems.findIndex((currentItem) => currentItem.id === item.id)}
                            count={whatsappItems.length}
                            onMove={(id, offset) => moveContentItem(id, offset, whatsappItems)}
                            saving={savingOrder}
                          />
                          {supportsVisibility && (
                            <button type="button" onClick={() => toggleItemVisibility(item)}>
                              {item.hidden ? "Tampilkan" : "Sembunyikan"}
                            </button>
                          )}
                          <button type="button" onClick={() => setEditing(item)}>Edit</button>
                          <button type="button" className="danger" onClick={() => deleteItem(item.id)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection !== "theme" && !(supportsArchive && archiveView === "archive") && <div className={`admin-list admin-list-${activeSection}`}>
          {regularItems.length === 0 && !(activeSection === "contacts" && whatsappItems.length > 0) && <div className="admin-empty">Belum ada data.</div>}
          {regularItems.map((item) => {
            const isDirector = /direktur/i.test(`${item.category || ""} ${item.title || ""}`);
            const supportsDragOrdering = activeSection !== "contacts";
            const staffMembers = currentItems.filter((staffMember) =>
              !/direktur/i.test(`${staffMember.category || ""} ${staffMember.title || ""}`)
            );
            const staffOrderIndex = activeSection === "staff" && !isDirector
              ? staffMembers.findIndex((staffMember) => staffMember.id === item.id)
              : -1;
            const orderIndex = activeSection === "staff"
              ? staffOrderIndex
              : activeSection === "contacts"
                ? regularItems.findIndex((currentItem) => currentItem.id === item.id)
                : currentItems.findIndex((currentItem) => currentItem.id === item.id);
            const orderCount = activeSection === "staff"
              ? staffMembers.length
              : activeSection === "contacts" ? regularItems.length : currentItems.length;
            return (
            <article
              className={`admin-list-item ${supportsDragOrdering && !(activeSection === "staff" && isDirector) ? "admin-sortable" : ""}`}
              key={item.id}
              draggable={supportsDragOrdering && !(activeSection === "staff" && isDirector)}
              onDragStart={(event) => {
                if (!supportsDragOrdering || (activeSection === "staff" && isDirector)) return;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", item.id);
              }}
              onDragOver={(event) => {
                if (supportsDragOrdering && !(activeSection === "staff" && isDirector)) event.preventDefault();
              }}
              onDrop={(event) => {
                if (!supportsDragOrdering || (activeSection === "staff" && isDirector)) return;
                event.preventDefault();
                moveContentItemTo(event.dataTransfer.getData("text/plain"), item.id);
              }}
            >
              {item.image && <img className="admin-list-image" src={item.image} alt="" />}
              <div>
                <strong>{item.title || "Tanpa judul"}</strong>
                {supportsVisibility && (
                  <p><span className={`content-status ${item.hidden ? "hidden" : ""}`}>{item.hidden ? "Tersembunyi" : "Ditampilkan"}</span></p>
                )}
                {(item.category || item.description) && (
                  <p>{item.category ? `${item.category} - ` : ""}{
                    activeSection === "articles" || activeSection === "information"
                      ? stripHtml(item.description).slice(0, 180) || "Belum ada isi konten."
                      : item.description || ""
                  }</p>
                )}
                {item.url && <small>{item.url}</small>}
              </div>
              <div className="admin-item-actions">
                {!(activeSection === "staff" && isDirector) && (
                  <ContentOrderControls
                    item={item}
                    index={orderIndex}
                    count={orderCount}
                    onMove={(id, offset) => moveContentItem(
                      id,
                      offset,
                      activeSection === "contacts" ? regularItems : undefined,
                    )}
                    saving={savingOrder}
                  />
                )}
                {supportsVisibility && (
                  <button type="button" onClick={() => toggleItemVisibility(item)}>
                    {item.hidden ? "Tampilkan" : "Sembunyikan"}
                  </button>
                )}
                <button onClick={() => setEditing(item)}>Edit</button>
                {supportsArchive
                  ? <button type="button" onClick={() => archiveItem(item.id)}>Arsipkan</button>
                  : <button type="button" className="danger" onClick={() => deleteItem(item.id)}>Hapus</button>}
              </div>
            </article>
          ); })}
        </div>}
      </section>
    </main>
  );
}

function createArticleBackButton(document, templateButton) {
  const backButton = templateButton?.cloneNode(true) || document.createElement("div");
  backButton.classList.add("back");
  backButton.classList.add("cms-detail-back");
  let link = backButton.matches("a") ? backButton : backButton.querySelector("a");
  if (!link) {
    link = document.createElement("a");
    backButton.appendChild(link);
  }
  link.href = "/artikel";
  link.textContent = "⬅ Kembali ke Artikel";
  return backButton;
}

function removeArticleBackLinks(container) {
  container.querySelectorAll(".back, .cms-detail-back").forEach((element) => element.remove());
  container.querySelectorAll("a[href]").forEach((link) => {
    const label = link.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    try {
      const path = new URL(link.getAttribute("href"), window.location.origin).pathname
        .replace(/\/+$/, "")
        .replace(/\.html$/, "");
      if (path === "/artikel" || label.includes("kembali ke artikel")) link.remove();
    } catch {
      if (label.includes("kembali ke artikel")) link.remove();
    }
  });
}

function stripHtml(value) {
  if (!value) return "";
  const document = new DOMParser().parseFromString(String(value), "text/html");
  return (document.body.textContent || "").replace(/\s+/g, " ").trim();
}

function orderedStaff(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = Number.isFinite(Number(left.item.display_order))
        ? Number(left.item.display_order)
        : left.index;
      const rightOrder = Number.isFinite(Number(right.item.display_order))
        ? Number(right.item.display_order)
        : right.index;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ item }) => item);
}

function ContentOrderControls({ item, index, count, onMove, saving }) {
  return (
    <div className="admin-item-order">
      <span>Urutan {index + 1}</span>
      <button
        type="button"
        aria-label={`Naikkan ${item.title || "konten"}`}
        disabled={saving || index <= 0}
        onClick={() => onMove(item.id, -1)}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={`Turunkan ${item.title || "konten"}`}
        disabled={saving || index >= count - 1}
        onClick={() => onMove(item.id, 1)}
      >
        ↓
      </button>
    </div>
  );
}

function escapeHtml(value) {
  const element = window.document.createElement("span");
  element.textContent = String(value || "");
  return element.innerHTML;
}

function descriptionToBlocks(description) {
  if (!description) return [{ type: "paragraph", text: "" }];
  const document = new DOMParser().parseFromString(description, "text/html");
  const blocks = [];
  Array.from(document.body.children).forEach((element) => {
    const tag = element.tagName.toLowerCase();
    if (tag === "h2" || tag === "h3") {
      blocks.push({ type: "heading", level: tag, text: element.textContent.trim() });
    } else if (tag === "p") {
      blocks.push({ type: "paragraph", text: element.textContent.trim() });
    } else if (tag === "ul" || tag === "ol") {
      blocks.push({
        type: "list",
        ordered: tag === "ol",
        className: element.className || "",
        items: Array.from(element.children).map((item) => {
          const clone = item.cloneNode(true);
          clone.querySelectorAll("br").forEach((br) => br.replaceWith(window.document.createTextNode("\n")));
          clone.querySelectorAll("strong, b").forEach((strong) => {
            strong.replaceWith(window.document.createTextNode(`${strong.textContent.trim()}\n`));
          });
          return (clone.textContent || "").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{2,}/g, "\n").trim();
        }).filter(Boolean),
      });
    } else if (tag === "div" && element.classList.contains("gallery-grid")) {
      // Perlengkapan photos remain controlled by the original page layout.
    }
  });
  return blocks.length ? blocks : [{ type: "paragraph", text: stripHtml(description) }];
}

function blocksToHtml(blocks) {
  return blocks.map((block) => {
    if (block.type === "heading") {
      const tag = block.level === "h3" ? "h3" : "h2";
      return `<${tag}>${escapeHtml(block.text)}</${tag}>`;
    }
    if (block.type === "list") {
      const tag = block.ordered ? "ol" : "ul";
      const className = block.className ? ` class="${escapeHtml(block.className).replace(/&quot;/g, "")}"` : "";
      const items = (block.items || []).map((item) => {
        const normalized = String(item || "").replace(/\r\n?/g, "\n").trim();
        if (!normalized) return "";
        const newlineIndex = normalized.indexOf("\n");
        if (newlineIndex >= 0) {
          const title = normalized.slice(0, newlineIndex).trim();
          const description = normalized.slice(newlineIndex + 1).trim();
          return `<li><strong>${escapeHtml(title)}</strong>${description ? `<br>${escapeHtml(description)}` : ""}</li>`;
        }
        return `<li>${escapeHtml(normalized)}</li>`;
      }).join("");
      return `<${tag}${className}>${items}</${tag}>`;
    }
    return block.text ? `<p>${escapeHtml(block.text)}</p>` : "";
  }).join("\n");
}

const LEGACY_EQUIPMENT_TEXT = "Dengan perlengkapan eksklusif dari Kurma Travel, setiap jamaah mendapatkan fasilitas yang dirancang untuk menunjang kenyamanan dan kekhusyukan selama menjalankan ibadah Umroh maupun Haji. Mulai dari koper berkualitas, tas serbaguna, kain ihram, hingga perlengkapan pendukung lainnya, semuanya dipersiapkan dengan standar terbaik agar perjalanan ibadah Anda lebih praktis, aman, dan terorganisir dengan baik.";

function getEquipmentTextBlocks(item) {
  if (Array.isArray(item?.equipment_text_blocks) && item.equipment_text_blocks.length) {
    return item.equipment_text_blocks.map((block) => ({ ...block }));
  }
  const parsed = descriptionToBlocks(item?.description);
  const usable = parsed.filter((block) =>
    block.type === "list"
      ? (block.items || []).some((text) => String(text || "").trim())
      : String(block.text || "").trim()
  );
  return usable.length ? usable.map((block) => ({ ...block })) : [
    { type: "paragraph", text: LEGACY_EQUIPMENT_TEXT },
  ];
}

function ThemeEditor({ theme, onSave }) {
  const [form, setForm] = useState({
    primary: theme.primary || "#e87824",
    primary_dark: theme.primary_dark || "#bd5416",
    navbar: theme.navbar || "#f18b3c",
    green: theme.green || "#244b3a",
    green_dark: theme.green_dark || "#173528",
    background: theme.background || "#fffdf9",
  });

  useEffect(() => {
    setForm({
      primary: theme.primary || "#e87824",
      primary_dark: theme.primary_dark || "#bd5416",
      navbar: theme.navbar || "#f18b3c",
      green: theme.green || "#244b3a",
      green_dark: theme.green_dark || "#173528",
      background: theme.background || "#fffdf9",
    });
  }, [theme]);

  const fields = [
    ["primary", "Warna Utama"],
    ["primary_dark", "Warna Utama Gelap"],
    ["navbar", "Warna Navbar/Header"],
    ["green", "Warna Hijau"],
    ["green_dark", "Warna Hijau Gelap"],
    ["background", "Warna Latar"],
  ];

  return (
    <form className="admin-editor theme-editor" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
      <h2>Atur Warna Tampilan Website</h2>
      <div className="theme-color-grid">
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <span className="theme-color-control">
              <input
                type="color"
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              />
              <input
                type="text"
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              />
            </span>
          </label>
        ))}
      </div>
      <div className="admin-editor-actions">
        <button className="admin-primary-button" type="submit">Simpan Warna</button>
      </div>
    </form>
  );
}

function ContentEditor({ section, item, onSave, onCancel, onUpload }) {
  const isEquipmentInformation = section === "information" &&
    (String(item.url || "").replace(/\/+$/, "").replace(/\.html$/, "") === "/perlengkapan" ||
      /perlengkapan/i.test(item.title || ""));
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    image: "",
    url: "",
    badge: "",
    program: "",
    period: "",
    duration: "",
    price: "",
    detail: "",
    ...item,
  });
  const [contentBlocks, setContentBlocks] = useState(
    section === "articles" || section === "information"
      ? (isEquipmentInformation
        ? getEquipmentTextBlocks(item)
        : descriptionToBlocks(item.description))
      : []
  );
  const [equipmentImages, setEquipmentImages] = useState(
    isEquipmentInformation
      ? (Array.isArray(item.equipment_images) && item.equipment_images.length
        ? [...item.equipment_images]
        : Array.from({ length: 11 }, (_, index) => `/static/images/perlengkapan/perlengkapan${index + 1}.jpg`))
      : []
  );
  const [equipmentFeatures, setEquipmentFeatures] = useState(
    isEquipmentInformation && Array.isArray(item.equipment_features)
      ? item.equipment_features.map((feature) => ({ ...feature }))
      : []
  );
  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateBlock(index, patch) {
    setContentBlocks((current) => current.map((block, blockIndex) =>
      blockIndex === index ? { ...block, ...patch } : block
    ));
  }

  function addBlock(type) {
    const block = type === "heading"
      ? { type, level: "h2", text: "" }
      : type === "list"
      ? { type, ordered: false, items: [""], className: "" }
      : { type: "paragraph", text: "" };
    setContentBlocks((current) => [...current, block]);
  }

  return (
    <form className="admin-editor" onSubmit={(event) => {
      event.preventDefault();
      onSave({
        ...form,
        ...(section === "articles" || section === "information"
          ? { description: blocksToHtml(contentBlocks) }
          : {}),
        ...(isEquipmentInformation ? {
          equipment_images: equipmentImages.filter(Boolean),
          equipment_features: equipmentFeatures.filter((feature) => String(feature.title || "").trim()),
          equipment_text_blocks: contentBlocks.filter((block) =>
            block.type === "list"
              ? (block.items || []).some((text) => String(text || "").trim())
              : String(block.text || "").trim()
          ),
        } : {}),
      });
    }}>
      <h2>{item.id ? "Edit konten" : "Tambah konten"}</h2>
      <div className="admin-form-grid">
        <label>Judul
          <input value={form.title} onChange={(event) => update("title", event.target.value)} required />
        </label>
        {(section === "packages" || section === "gallery" || section === "staff" || section === "contacts") && (
          <label>{section === "packages" ? "Kategori" : section === "contacts" ? "Jenis Kontak" : "Gambar / Foto"}
            {section === "packages"
              ? <input value={form.category} onChange={(event) => update("category", event.target.value)} />
              : section === "contacts"
              ? <input value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="WhatsApp, Alamat, atau Email" />
              : section === "staff"
              ? (
                <div className="admin-staff-photo-field">
                  {form.image && <img className="admin-staff-photo-preview" src={form.image} alt={`Pratinjau foto ${form.title || "staf"}`} />}
                  <input value={form.image} onChange={(event) => update("image", event.target.value)} placeholder="/static/uploads/..." />
                  <span className="admin-field-hint">Unggah foto baru, lalu klik Simpan untuk memperbarui foto staf.</span>
                  <input
                    className="admin-file-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => onUpload(event, (url) => update("image", url))}
                  />
                </div>
              )
              : (
                <>
                  <input value={form.image} onChange={(event) => update("image", event.target.value)} placeholder="/static/uploads/..." />
                  <input className="admin-file-input" type="file" accept="image/*" onChange={(event) => onUpload(event, (url) => update("image", url))} />
                </>
              )}
          </label>
        )}
        {(section === "packages" || section === "articles" || section === "information" || section === "contacts") && (
          section === "articles" || section === "information"
            ? (
              <div className="admin-full-field admin-content-blocks">
                <div className="admin-content-blocks-header">
                  <strong>{section === "articles" ? "Isi Artikel" : isEquipmentInformation ? "Isi Paragraf Perlengkapan" : "Isi Informasi"}</strong>
                  <span>Gunakan blok seperti tampilan website, tanpa menulis HTML.</span>
                </div>
                {contentBlocks.map((block, index) => (
                  <div className="admin-content-block" key={`${block.type}-${index}`}>
                    <div className="admin-block-head">
                      <span>{block.type === "heading" ? "Judul Bagian" : block.type === "list" ? "Daftar Poin" : "Paragraf"}</span>
                      <div className="admin-block-head-actions">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => setContentBlocks((current) => {
                            const next = [...current];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            return next;
                          })}
                        >
                          Naik
                        </button>
                        <button
                          type="button"
                          disabled={index === contentBlocks.length - 1}
                          onClick={() => setContentBlocks((current) => {
                            const next = [...current];
                            [next[index + 1], next[index]] = [next[index], next[index + 1]];
                            return next;
                          })}
                        >
                          Turun
                        </button>
                        <button type="button" className="danger" onClick={() => setContentBlocks((current) => current.filter((_, i) => i !== index))}>Hapus Blok</button>
                      </div>
                    </div>
                    {block.type === "heading" && (
                      <>
                        <select value={block.level} onChange={(event) => updateBlock(index, { level: event.target.value })}>
                          <option value="h2">Judul utama bagian (H2)</option>
                          <option value="h3">Judul kecil (H3)</option>
                        </select>
                        <input value={block.text} onChange={(event) => updateBlock(index, { text: event.target.value })} placeholder="Judul bagian" />
                      </>
                    )}
                    {block.type === "paragraph" && (
                      <textarea rows="4" value={block.text} onChange={(event) => updateBlock(index, { text: event.target.value })} placeholder="Tulis isi paragraf..." />
                    )}
                    {block.type === "list" && (
                      <textarea
                        rows="7"
                        value={(block.items || []).join("\n")}
                        onChange={(event) => updateBlock(index, { items: event.target.value.split("\n") })}
                        placeholder={"Tulis satu poin setiap baris:\nPoin pertama\nPoin kedua"}
                      />
                    )}
                  </div>
                ))}
                <div className="admin-block-actions">
                  <button type="button" onClick={() => addBlock("heading")}>+ Judul</button>
                  <button type="button" onClick={() => addBlock("paragraph")}>+ Paragraf</button>
                  <button type="button" onClick={() => addBlock("list")}>+ Daftar Poin</button>
                </div>
              </div>
            )
            : (
              <label>{section === "contacts" ? "Deskripsi" : "Deskripsi"}
                <textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows="5" />
              </label>
            )
        )}
        {section === "staff" && (
          <label>Jabatan
            <input value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="Direktur Utama, Staf Admin, Marketing" />
          </label>
        )}
        {isEquipmentInformation && (
          <div className="admin-full-field admin-equipment-manager">
            <div className="admin-equipment-header">
              <strong>Kartu & Fitur Perlengkapan</strong>
              <span>Kelola judul, ikon, dan urutan kartu yang ditampilkan di atas foto perlengkapan.</span>
            </div>
            <div className="admin-equipment-feature-list">
              {equipmentFeatures.map((feature, index) => (
                <div className="admin-equipment-feature-item" key={`feature-${index}`}>
                  <div className="admin-feature-preview" aria-label="Pratinjau kartu">
                    {feature.image
                      ? <img src={feature.image} alt="" />
                      : <span>{feature.icon || "◆"}</span>}
                    <strong>{feature.title || "Judul kartu baru"}</strong>
                  </div>
                  <label>
                    Judul kartu
                    <input
                      value={feature.title || ""}
                      onChange={(event) => setEquipmentFeatures((current) => current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title: event.target.value } : item
                      ))}
                      placeholder="Contoh: Tali Lanyard Premium"
                    />
                  </label>
                  <label>
                    Ikon
                    <input
                      value={feature.icon || ""}
                      onChange={(event) => setEquipmentFeatures((current) => current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, icon: event.target.value } : item
                      ))}
                      placeholder="Contoh: ✓, ◆, atau emoji"
                    />
                  </label>
                  <label>
                    Gambar ikon (opsional)
                    <input
                      value={feature.image || ""}
                      onChange={(event) => setEquipmentFeatures((current) => current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, image: event.target.value } : item
                      ))}
                      placeholder="/static/uploads/..."
                    />
                    <input
                      className="admin-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => onUpload(event, (url) => setEquipmentFeatures((current) =>
                        current.map((item, itemIndex) => itemIndex === index ? { ...item, image: url } : item
                      )))}
                    />
                  </label>
                  <div className="admin-equipment-actions">
                    <button type="button" disabled={index === 0} onClick={() => setEquipmentFeatures((current) => {
                      const next = [...current];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      return next;
                    })}>Naik</button>
                    <button type="button" disabled={index === equipmentFeatures.length - 1} onClick={() => setEquipmentFeatures((current) => {
                      const next = [...current];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      return next;
                    })}>Turun</button>
                    <button type="button" className="danger" onClick={() => setEquipmentFeatures((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )}>Hapus</button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-equipment-add-feature"
              onClick={() => setEquipmentFeatures((current) => [...current, { title: "", icon: "◆", image: "" }])}
            >
              + Tambah Kartu/Fitur
            </button>

            <div className="admin-equipment-header">
              <strong>Foto Perlengkapan</strong>
              <span>Tambah, ganti urutan, atau hapus foto yang ditampilkan pada halaman Perlengkapan.</span>
            </div>
            <div className="admin-equipment-grid">
              {equipmentImages.map((imageUrl, index) => (
                <div className="admin-equipment-item" key={`${imageUrl}-${index}`}>
                  <img src={imageUrl} alt={`Perlengkapan ${index + 1}`} />
                  <div className="admin-equipment-actions">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => setEquipmentImages((current) => {
                        const next = [...current];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        return next;
                      })}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={index === equipmentImages.length - 1}
                      onClick={() => setEquipmentImages((current) => {
                        const next = [...current];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        return next;
                      })}
                    >
                      →
                    </button>
                    <button type="button" className="danger" onClick={() =>
                      setEquipmentImages((current) => current.filter((_, currentIndex) => currentIndex !== index))
                    }>
                      Hapus
                    </button>
                  </div>
                  <label className="admin-equipment-upload">
                    Ganti foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => onUpload(event, (url) => {
                        setEquipmentImages((current) => current.map((itemUrl, itemIndex) =>
                          itemIndex === index ? url : itemUrl
                        ));
                      })}
                    />
                  </label>
                </div>
              ))}
            </div>
            <label className="admin-equipment-add">
              Tambah Foto Perlengkapan
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onUpload(event, (url) => {
                  setEquipmentImages((current) => [...current, url]);
                })}
              />
            </label>
          </div>
        )}
        {(section === "articles" || section === "information" || section === "contacts") && (
          <label className="admin-full-field">Link / URL
            <input value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="artikel.html atau https://..." />
          </label>
        )}
        {section === "packages" && (
          <>
            <label>Tag poster
              <input value={form.badge} onChange={(event) => update("badge", event.target.value)} placeholder="RAMADHAN, UMRAH, atau BEST SELLER" />
            </label>
            <label>Program perjalanan
              <input value={form.program} onChange={(event) => update("program", event.target.value)} placeholder="Perjalanan ibadah Umrah" />
            </label>
            <label>Periode
              <input value={form.period} onChange={(event) => update("period", event.target.value)} placeholder="Periode Ramadhan" />
            </label>
            <label>Durasi
              <input value={form.duration} onChange={(event) => update("duration", event.target.value)} placeholder="Durasi 9 hari" />
            </label>
            <label>Judul informasi harga
              <input value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="Informasi harga" />
            </label>
            <label>Keterangan harga
              <input value={form.detail} onChange={(event) => update("detail", event.target.value)} placeholder="Lihat Detail / Hubungi Kami" />
            </label>
            <label>Poster Paket
              <input value={form.image} onChange={(event) => update("image", event.target.value)} placeholder="/static/uploads/..." />
              <input className="admin-file-input" type="file" accept="image/*,.pdf" onChange={(event) => onUpload(event, (url) => update("image", url))} />
            </label>
          </>
        )}
      </div>
      <div className="admin-editor-actions">
        <button type="button" className="admin-secondary-button" onClick={onCancel}>Batal</button>
        <button type="submit" className="admin-primary-button">Simpan</button>
      </div>
    </form>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<LegacyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
