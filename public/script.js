/* ─── Mobile nav ───────────────────────────────────────────────── */
const menuToggle = document.querySelector(".menu-toggle");
const siteNav    = document.querySelector(".site-nav");

menuToggle?.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav?.addEventListener("click", (e) => {
  if (e.target instanceof HTMLAnchorElement) {
    siteNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }
});

/* ─── Contact form ─────────────────────────────────────────────── */
const form       = document.querySelector(".contact-form");
const formStatus = document.querySelector(".form-status");

form?.addEventListener("submit", (e) => {
  e.preventDefault();
  formStatus.textContent = "Thanks. Your enquiry is ready.";
  form.reset();
});

/* ─── Gallery ──────────────────────────────────────────────────── */
const gallery = document.querySelector("[data-gallery]");

if (gallery) {
  /* ── Build lightbox DOM ─────────────────────────────────────── */
  const lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Image viewer");
  lightbox.innerHTML = `
    <button class="lightbox-close"  type="button" aria-label="Close image">&#215;</button>
    <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous image">&#10094;</button>
    <button class="lightbox-nav lightbox-next" type="button" aria-label="Next image">&#10095;</button>
    <img class="lightbox-image" alt="" />
    <div class="lightbox-counter" aria-live="polite"></div>
  `;
  document.body.append(lightbox);

  const lightboxImage   = lightbox.querySelector(".lightbox-image");
  const lightboxCounter = lightbox.querySelector(".lightbox-counter");
  const prevBtn         = lightbox.querySelector(".lightbox-prev");
  const nextBtn         = lightbox.querySelector(".lightbox-next");

  let galleryImages = [];   // [{src, thumb, placeholder, alt}]
  let currentIndex  = 0;

  /* ── Lightbox controls ──────────────────────────────────────── */
  function updateLightbox() {
    const item = galleryImages[currentIndex];
    if (!item) return;

    // Show full-res original in lightbox (not the grid thumb)
    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt || "Photography";
    lightboxCounter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;

    const many = galleryImages.length > 1;
    prevBtn.style.display = many ? "flex" : "none";
    nextBtn.style.display = many ? "flex" : "none";
    lightboxCounter.style.display = many ? "block" : "none";
  }

  function openLightbox(index) {
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightboxImage.removeAttribute("src");
    document.body.style.overflow = "";
  }

  function showNext() {
    if (galleryImages.length <= 1) return;
    currentIndex = (currentIndex + 1) % galleryImages.length;
    updateLightbox();
  }

  function showPrev() {
    if (galleryImages.length <= 1) return;
    currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    updateLightbox();
  }

  prevBtn.addEventListener("click",  (e) => { e.stopPropagation(); showPrev(); });
  nextBtn.addEventListener("click",  (e) => { e.stopPropagation(); showNext(); });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.closest(".lightbox-close")) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if      (e.key === "Escape")                          closeLightbox();
    else if (e.key === "ArrowRight" || e.key === "ArrowDown")  { e.preventDefault(); showNext(); }
    else if (e.key === "ArrowLeft"  || e.key === "ArrowUp")    { e.preventDefault(); showPrev(); }
  });

  /* Touch swipe */
  let touchX = 0;
  lightbox.addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].screenX; }, { passive: true });
  lightbox.addEventListener("touchend",   (e) => {
    const d = e.changedTouches[0].screenX - touchX;
    if (Math.abs(d) > 45) d < 0 ? showNext() : showPrev();
  }, { passive: true });

  /* ── Blur-up lazy loader ────────────────────────────────────── */
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const img = entry.target;
      if (!img.dataset.src) continue;

      const full = new Image();
      full.onload = () => {
        img.src = img.dataset.src;
        img.classList.add("loaded");
        delete img.dataset.src;
      };
      full.src = img.dataset.src;
      observer.unobserve(img);
    }
  }, { rootMargin: "200px" });   // start loading 200px before entering viewport

  /* ── Build gallery tiles ────────────────────────────────────── */
  function buildTile(item, index) {
    const btn = document.createElement("button");
    btn.className = "gallery-thumb";
    btn.type = "button";
    btn.setAttribute("aria-label", `View ${item.alt}`);

    const img = document.createElement("img");
    img.className = "gallery-image";
    img.alt = item.alt;

    if (item.placeholder) {
      // Show blurry placeholder immediately, swap to WebP thumb lazily
      img.src = item.placeholder;
      img.dataset.src = item.thumb || item.src;
      img.classList.add("blurred");
      observer.observe(img);
    } else {
      // No placeholder — use native lazy loading
      img.src = item.thumb || item.src;
      img.loading = "lazy";
      img.decoding = "async";
    }

    btn.append(img);
    btn.addEventListener("click", () => openLightbox(index));
    return btn;
  }

  /* ── Fetch gallery data ─────────────────────────────────────── */
  fetch(`/api/gallery/${gallery.dataset.gallery}`)
    .then((r) => {
      if (!r.ok) throw new Error("Could not load gallery");
      return r.json();
    })
    .then(({ images }) => {
      galleryImages = images;

      // Eagerly load the first 6 images (above the fold)
      const tiles = images.map((item, i) => {
        const btn = buildTile(item, i);
        if (i < 6) {
          const img = btn.querySelector("img");
          // Override lazy loading for first 6 — load immediately
          const src = item.thumb || item.src;
          img.src = src;
          img.classList.add("loaded");
          delete img.dataset.src;
          img.classList.remove("blurred");
          observer.unobserve(img);
        }
        return btn;
      });

      gallery.replaceChildren(...tiles);
    })
    .catch(() => {
      gallery.innerHTML = '<p class="gallery-error">Start the portfolio server to load this gallery.</p>';
    });
}
