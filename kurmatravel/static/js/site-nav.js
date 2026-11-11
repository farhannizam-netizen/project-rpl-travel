(() => {
    if (typeof window.ktSiteNavCleanup === "function") {
        window.ktSiteNavCleanup();
    }

    let placeholder = document.getElementById("siteNavigation");
    if (!placeholder) {
        const legacyPage = document.querySelector(".legacy-page");
        if (!legacyPage) return;
        placeholder = document.createElement("div");
        placeholder.id = "siteNavigation";
        legacyPage.prepend(placeholder);
    }

    const links = [
        ["index.html", "Home", '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'],
        ["paket.html", "Paket Umrah & Haji", '<path d="M4 5h16v15H4z"/><path d="M8 3v4m8-4v4M7 11h10M7 15h6"/>'],
        ["galeri.html", "Galeri", '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>'],
        ["staf.html", "Staf", '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1zm12-11a3 3 0 1 0 0-6m2 9a5 5 0 0 1 4 5v2"/>'],
        ["kontak.html", "Kontak", '<path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/>']
    ];
    const currentRoute = location.pathname.split("/").pop() || "index";
    const currentPage = currentRoute.endsWith(".html")
        ? currentRoute
        : `${currentRoute}.html`;
    const linkMarkup = links.map(([href, label, icon]) => {
        const active = href === currentPage;
        return `<a href="${href}"${active ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${label}</span></a>`;
    }).join("");

    placeholder.outerHTML = `
        <header class="kt-site-header">
            <div class="kt-nav-inner">
                <button class="kt-nav-toggle" id="ktNavToggle" type="button" aria-label="Buka menu navigasi" aria-controls="ktNavDrawer" aria-expanded="false">
                    <span></span><span></span><span></span>
                </button>
                <a class="kt-brand kt-brand--desktop" href="index.html" aria-label="Beranda Kurma Travel">
                    <img src="static/images/web_logo.png" alt="Kurma Travel">
                </a>
                <a class="kt-brand kt-brand--mobile" href="index.html" aria-label="Beranda Kurma Travel">
                    <img src="static/images/web_logo.png" alt="Kurma Travel">
                </a>
                <nav class="kt-primary-nav" aria-label="Menu utama">
                    ${links.map(([href, label]) => `<a href="${href}"${href === currentPage ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
                </nav>
                <a class="kt-admin-link" href="/admin/login" aria-label="Login admin Kurma Travel">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4zm0 2c-3.86 0-7 2.76-7 6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1c0-3.24-3.14-6-7-6z"/></svg>
                    <span>Login Admin</span>
                </a>
            </div>
        </header>
        <button class="kt-nav-backdrop" id="ktNavBackdrop" type="button" aria-label="Tutup menu" aria-hidden="true" tabindex="-1"></button>
        <aside class="kt-nav-drawer" id="ktNavDrawer" aria-label="Navigasi seluler" aria-hidden="true" inert>
            <div class="kt-drawer-header">
                <a class="kt-drawer-brand" href="index.html">
                    <img src="static/images/logo.png" alt="">
                    <span>KURMA TRAVEL<small>Berhidmat untuk umat</small></span>
                </a>
                <button class="kt-drawer-close" id="ktNavClose" type="button" aria-label="Tutup menu">×</button>
            </div>
            <nav class="kt-drawer-nav" aria-label="Menu seluler">${linkMarkup}</nav>
            <div class="kt-drawer-help">
                <span>Butuh Bantuan?</span>
                <a class="kt-drawer-whatsapp" href="https://wa.me/6281280803429?text=Halo%20Kurma%20Travel%2C%20saya%20mau%20konsultasi" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.1A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8.5 8.5c.3 2.2 2.8 4.7 5 5l1.2-1.2 2 .8c-.2 1.4-1.2 2.3-2.7 2.2-3.5-.3-7.5-4.3-7.8-7.8-.1-1.5.8-2.5 2.2-2.7l.8 2z"/></svg>
                    <span>Konsultasi via WhatsApp</span>
                </a>
            </div>
        </aside>`;

    const header = document.querySelector(".kt-site-header");
    const toggle = document.getElementById("ktNavToggle");
    const drawer = document.getElementById("ktNavDrawer");
    const backdrop = document.getElementById("ktNavBackdrop");
    const closeButton = document.getElementById("ktNavClose");
    const listeners = [];
    let previousOverflow = "";
    let returnFocus = null;

    function setOpen(open, restoreFocus = true) {
        document.body.classList.toggle("kt-nav-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
        drawer.setAttribute("aria-hidden", String(!open));
        backdrop.setAttribute("aria-hidden", String(!open));
        drawer.toggleAttribute("inert", !open);
        if (open) {
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            returnFocus = document.activeElement;
            closeButton.focus();
        } else {
            document.body.style.overflow = previousOverflow;
            if (restoreFocus && returnFocus && typeof returnFocus.focus === "function") {
                returnFocus.focus();
            }
        }
    }

    function listen(target, eventName, handler) {
        target.addEventListener(eventName, handler);
        listeners.push(() => target.removeEventListener(eventName, handler));
    }

    function closeDrawerOnNavigation() {
        setOpen(false);
    }

    listen(toggle, "click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    listen(closeButton, "click", () => setOpen(false));
    listen(backdrop, "click", () => setOpen(false));
    header.querySelectorAll("a[href]").forEach((link) => {
        listen(link, "click", closeDrawerOnNavigation);
    });
    drawer.querySelectorAll("a[href]").forEach((link) => {
        listen(link, "click", closeDrawerOnNavigation);
    });
    const whatsappLink = drawer.querySelector(".kt-drawer-whatsapp");
    listen(whatsappLink, "click", () => setOpen(false));

    const keydownHandler = (event) => {
        if (toggle.getAttribute("aria-expanded") !== "true") return;
        if (event.key === "Escape") {
            setOpen(false);
            return;
        }
        if (event.key === "Tab") {
            const focusable = [...drawer.querySelectorAll("a[href], button:not([disabled])")];
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    };
    listen(document, "keydown", keydownHandler);

    const resizeHandler = () => {
        if (window.innerWidth >= 1024 && toggle.getAttribute("aria-expanded") === "true") setOpen(false);
    };
    listen(window, "resize", resizeHandler);

    window.ktSiteNavCleanup = () => {
        setOpen(false, false);
        listeners.forEach((removeListener) => removeListener());
        header.remove();
        backdrop.remove();
        drawer.remove();
        delete window.ktSiteNavCleanup;
    };
})();
