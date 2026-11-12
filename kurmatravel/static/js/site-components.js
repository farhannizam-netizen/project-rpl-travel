(() => {
    if (typeof window.ktSiteComponentsCleanup === "function") {
        window.ktSiteComponentsCleanup();
    }

    const numbers = ["6281280803429", "6283875613645", "6287776042572"];
    const phoneLabels = ["0812-8080-3429", "0838-7561-3645", "0877-7604-2572"];
    const openingMessage =
        "Assalamu'alaikum, saya ingin mendapatkan informasi mengenai paket perjalanan Kurma Travel.";
    const encodedOpeningMessage = encodeURIComponent(openingMessage);
    const pageLinks = window.ktPrimaryPageLinks;
    const socialLinks = [
        ["YouTube", "https://youtube.com/@kurmatravel?si=Sw9kC5tV5JWmj6k6"],
        ["Facebook", "https://www.facebook.com/share/1ZYG4z8kMq/"],
        ["Instagram", "https://www.instagram.com/kurma_travel"],
        ["TikTok", "https://www.tiktok.com/@kurmatravelpusat"]
    ];
    const cleanup = [];
    const previousOpenWA = window.openWA;
    const previousCloseWA = window.closeWA;
    let previousOverflow = "";
    let returnFocus = null;
    if (!Array.isArray(pageLinks)) {
        console.error("Navigasi utama Kurma Travel belum dimuat.");
    }

    const footerPlaceholder = document.getElementById("siteFooter");
    if (footerPlaceholder && Array.isArray(pageLinks)) {
        const navigation = pageLinks.map(({ href, label }) =>
            `<li><a href="${href}">${label}</a></li>`
        ).join("");
        const social = socialLinks.map(([label, href]) =>
            `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
        ).join("");
        footerPlaceholder.outerHTML = `
            <footer class="kt-site-footer">
                <div class="kt-footer-main">
                    <section class="kt-footer-brand" aria-label="Tentang Kurma Travel">
                        <img src="static/images/web_logo.png" alt="Kurma Travel">
                        <p>Mitra perjalanan Umrah, Haji, dan Muslim Trip yang mendampingi persiapan perjalanan ibadah dengan informasi yang jelas dan pelayanan yang amanah.</p>
                    </section>
                    <nav class="kt-footer-column" aria-label="Navigasi footer">
                        <h2>Navigasi</h2>
                        <ul>${navigation}</ul>
                    </nav>
                    <section class="kt-footer-column" aria-label="Kontak Kurma Travel">
                        <h2>Kontak</h2>
                        <ul>
                            <li><address>Ruko Plaza Kautsar, Jl. Kelapa Dua Raya No. 6, Kelapa Dua, Kabupaten Tangerang, Banten 15810</address></li>
                            <li><a href="https://wa.me/${numbers[0]}" target="_blank" rel="noopener noreferrer">${phoneLabels[0]}</a></li>
                            <li><a href="https://wa.me/${numbers[1]}" target="_blank" rel="noopener noreferrer">${phoneLabels[1]}</a></li>
                            <li><a href="https://wa.me/${numbers[2]}" target="_blank" rel="noopener noreferrer">${phoneLabels[2]}</a></li>
                            <li><a href="mailto:kadi.tourpusat@gmail.com">kadi.tourpusat@gmail.com</a></li>
                        </ul>
                    </section>
                    <section class="kt-footer-column" aria-label="Media sosial Kurma Travel">
                        <h2>Ikuti Kami</h2>
                        <div class="kt-footer-socials">${social}</div>
                    </section>
                </div>
                <div class="kt-footer-bottom">
                    <span>© <time class="kt-copyright-year"></time> Kurma Travel. Hak cipta dilindungi.</span>
                    <span>Umrah · Haji · Muslim Trip</span>
                </div>
            </footer>`;

        const footer = document.querySelector(".kt-site-footer");
        footer.querySelector(".kt-copyright-year").textContent =
            String(new Date().getFullYear());
    }

    document.querySelectorAll(".wa-float").forEach((element) => element.remove());
    let floatingLink = document.getElementById("waFloat");
    if (floatingLink && floatingLink.tagName !== "A") {
        floatingLink.remove();
        floatingLink = null;
    }
    if (!floatingLink) {
        document.body.insertAdjacentHTML("beforeend", `
            <a class="kt-whatsapp-float" id="waFloat"
               href="https://wa.me/${numbers[0]}?text=${encodedOpeningMessage}"
               target="_blank" rel="noopener noreferrer"
               aria-label="Hubungi Kurma Travel melalui WhatsApp">
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M16 2.9c-7.2 0-13.1 5.9-13.1 13.1 0 2.3.6 4.6 1.8 6.6L3 29l6.5-1.7c2 1.1 4.2 1.7 6.5 1.7 7.2 0 13.1-5.9 13.1-13.1S23.2 2.9 16 2.9zm0 23.8c-2.1 0-4.1-.6-5.9-1.7l-.4-.2-3.9 1 1-3.8-.2-.4c-1.1-1.8-1.7-3.8-1.7-5.9 0-6.1 5-11.1 11.1-11.1 6.1 0 11.1 5 11.1 11.1 0 6.1-5 11.1-11.1 11.1zm6.1-8.4c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.6-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.4.1-.1.2-.3.3-.5.1-.2 0-.4-.1-.6-.1-.1-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8 0 1.7 1.2 3.3 1.4 3.5.2.2 2.4 3.7 5.8 5 .8.3 1.4.5 1.9.6.8.1 1.5.1 2.1 0 .6-.1 1.8-.7 2-1.4.2-.7.2-1.3.1-1.4-.1-.1-.3-.2-.6-.3z"/>
                </svg>
            </a>`);
        floatingLink = document.getElementById("waFloat");
    }
    floatingLink.classList.add("kt-whatsapp-float");
    floatingLink.href = `https://wa.me/${numbers[0]}?text=${encodedOpeningMessage}`;
    floatingLink.target = "_blank";
    floatingLink.rel = "noopener noreferrer";
    floatingLink.setAttribute("aria-label", "Hubungi Kurma Travel melalui WhatsApp");
    const updateFloatingLink = () => {
        const isVisible = window.scrollY > 300;
        floatingLink.classList.toggle("show", isVisible);
        floatingLink.setAttribute("aria-hidden", String(!isVisible));
        if (isVisible) floatingLink.removeAttribute("tabindex");
        else floatingLink.tabIndex = -1;
    };
    window.addEventListener("scroll", updateFloatingLink, { passive: true });
    updateFloatingLink();
    cleanup.push(() => window.removeEventListener("scroll", updateFloatingLink));

    function openWA(message) {
        const modal = document.getElementById("waModal");
        if (!modal) {
            console.error("Elemen modal WhatsApp #waModal tidak ditemukan.");
            return;
        }

        const encodedMessage = encodeURIComponent(
            message || "Halo Kurma Travel, saya ingin mendapatkan informasi."
        );
        numbers.forEach((number, index) => {
            const link = modal.querySelector(`#wa${index + 1}`);
            if (!link) {
                console.error(`Tautan admin WhatsApp #wa${index + 1} tidak ditemukan.`);
                return;
            }
            link.href = `https://wa.me/${number}?text=${encodedMessage}`;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        });

        previousOverflow = document.body.style.overflow;
        returnFocus = document.activeElement;
        modal.classList.add("show", "active");
        modal.setAttribute("aria-hidden", "false");
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
        modal.querySelector("a[href]")?.focus();
    }

    function closeWA() {
        const modal = document.getElementById("waModal");
        if (!modal) return;
        modal.classList.remove("show", "active");
        modal.setAttribute("aria-hidden", "true");
        modal.style.display = "none";
        document.body.style.overflow = previousOverflow;
        if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
    }

    const modal = document.getElementById("waModal");
    if (modal) {
        const removeModalOnCleanup = modal.parentElement !== document.body;
        document.body.appendChild(modal);
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-hidden", "true");
        const outsideClick = (event) => {
            if (event.target === modal) closeWA();
        };
        modal.addEventListener("click", outsideClick);
        cleanup.push(() => modal.removeEventListener("click", outsideClick));
        if (removeModalOnCleanup) {
            cleanup.push(() => modal.remove());
        }

        const floatingClick = (event) => {
            event.preventDefault();
            openWA();
        };
        floatingLink.addEventListener("click", floatingClick);
        cleanup.push(() => floatingLink.removeEventListener("click", floatingClick));
    }

    const escapeHandler = (event) => {
        if (event.key === "Escape" &&
            document.getElementById("waModal")?.getAttribute("aria-hidden") === "false") {
            closeWA();
        }
    };
    document.addEventListener("keydown", escapeHandler);
    cleanup.push(() => document.removeEventListener("keydown", escapeHandler));

    if (modal) {
        window.openWA = openWA;
        window.closeWA = closeWA;
        cleanup.push(() => {
            if (window.openWA === openWA) {
                if (previousOpenWA) window.openWA = previousOpenWA;
                else delete window.openWA;
            }
            if (window.closeWA === closeWA) {
                if (previousCloseWA) window.closeWA = previousCloseWA;
                else delete window.closeWA;
            }
        });
    }

    window.ktSiteComponentsCleanup = () => {
        const openModal = document.getElementById("waModal");
        if (openModal?.getAttribute("aria-hidden") === "false") {
            openModal.classList.remove("show", "active");
            openModal.setAttribute("aria-hidden", "true");
            openModal.style.display = "none";
            document.body.style.overflow = previousOverflow;
        }
        cleanup.forEach((removeListener) => removeListener());
        document.querySelector(".kt-site-footer")?.remove();
        document.getElementById("waFloat")?.remove();
        if (window.ktSiteComponentsCleanup) {
            delete window.ktSiteComponentsCleanup;
        }
    };
})();
