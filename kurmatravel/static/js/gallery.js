(() => {
    if (typeof window.ktGalleryCleanup === "function") {
        window.ktGalleryCleanup();
    }

    const grid = document.getElementById("gallery");
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightbox-img");
    if (!grid || !lightbox || !lightboxImage) return;

    const images = [];
    const listeners = [];
    let activeIndex = 0;
    let previousOverflow = "";

    function listen(target, eventName, handler) {
        target.addEventListener(eventName, handler);
        listeners.push(() => target.removeEventListener(eventName, handler));
    }

    function showImage(index) {
        if (!images.length) return;
        activeIndex = (index + images.length) % images.length;
        const image = images[activeIndex];
        if (lightbox.style.display !== "flex") {
            previousOverflow = document.body.style.overflow;
        }
        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;
        lightbox.style.display = "flex";
        lightbox.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
        lightbox.style.display = "none";
        lightbox.setAttribute("aria-hidden", "true");
        lightboxImage.removeAttribute("src");
        document.body.style.overflow = previousOverflow;
    }

    for (let number = 1; number <= 224; number += 1) {
        const image = document.createElement("img");
        image.src = `static/images/gallery/gallery${number}.jpg`;
        image.alt = `Dokumentasi perjalanan Kurma Travel ${number}`;
        image.loading = "lazy";
        image.decoding = "async";
        image.tabIndex = 0;
        image.addEventListener("click", () => showImage(images.indexOf(image)));
        image.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                showImage(images.indexOf(image));
            }
        });
        image.addEventListener("error", () => {
            const index = images.indexOf(image);
            if (index >= 0) images.splice(index, 1);
            image.remove();
        });
        images.push(image);
        grid.appendChild(image);
    }

    const closeButton = lightbox.querySelector(".lightbox-close");
    const previousButton = lightbox.querySelector(".lightbox-prev");
    const nextButton = lightbox.querySelector(".lightbox-next");
    if (closeButton) listen(closeButton, "click", closeLightbox);
    if (previousButton) {
        listen(previousButton, "click", () => showImage(activeIndex - 1));
    }
    if (nextButton) {
        listen(nextButton, "click", () => showImage(activeIndex + 1));
    }
    listen(lightbox, "click", (event) => {
        if (event.target === lightbox) closeLightbox();
    });
    const keydownHandler = (event) => {
        if (lightbox.style.display !== "flex") return;
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft") showImage(activeIndex - 1);
        if (event.key === "ArrowRight") showImage(activeIndex + 1);
    };
    listen(document, "keydown", keydownHandler);
    window.ktGalleryCleanup = () => {
        closeLightbox();
        listeners.forEach((removeListener) => removeListener());
        delete window.ktGalleryCleanup;
    };
})();
