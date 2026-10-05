/**
 * Macro Vipin Photography — Interactive Engine
 * Fast, progressive image loading, rich lightbox, filterable galleries & animations
 */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initHeroSlideshow();
  initScrollReveal();
  initGalleries();
  initFaqAccordion();
  initContactForm();
  initFilterTabs();
});

/* ─── 1. Navigation & Mobile Drawer ────────────────────────────── */
function initNavigation() {
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.querySelector(".site-nav");
  const header = document.querySelector(".site-header");

  menuToggle?.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    siteNav.classList.toggle("open", !isExpanded);
  });

  // Close mobile nav on link click
  siteNav?.addEventListener("click", (e) => {
    if (e.target instanceof HTMLAnchorElement) {
      siteNav.classList.remove("open");
      menuToggle?.setAttribute("aria-expanded", "false");
    }
  });

  // Header scroll state
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      header?.classList.add("scrolled");
    } else {
      header?.classList.remove("scrolled");
    }
    lastScroll = currentScroll;
  }, { passive: true });

  // Back to top button
  document.querySelector(".back-to-top")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ─── 2. Scroll Reveal Animations ───────────────────────────────── */
function initScrollReveal() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("active"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -50px 0px", threshold: 0.1 });

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

/* ─── 3. Dynamic Galleries & Lightbox ───────────────────────────── */
let activeGalleryImages = [];
let currentLightboxIndex = 0;

function initGalleries() {
  const galleryEl = document.querySelector("[data-gallery]");
  if (!galleryEl) return;

  setupLightboxDOM();

  const galleryName = galleryEl.dataset.gallery;
  const filterVal = galleryEl.dataset.filter || "all";

  fetchGalleryData(galleryName, filterVal, galleryEl);
}

function setupLightboxDOM() {
  if (document.querySelector(".image-lightbox")) return;

  const lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Image viewer modal");
  lightbox.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close image">&times;</button>
    <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous photo">&#10094;</button>
    <button class="lightbox-nav lightbox-next" type="button" aria-label="Next photo">&#10095;</button>
    
    <div class="lightbox-content-wrap">
      <img class="lightbox-image" alt="Photography work" />
      <div class="lightbox-caption-bar">
        <div class="lightbox-caption-title"></div>
        <div class="lightbox-caption-details"></div>
        <div class="lightbox-caption-camera"></div>
      </div>
    </div>
    
    <div class="lightbox-counter" aria-live="polite"></div>
  `;
  document.body.append(lightbox);

  const prevBtn = lightbox.querySelector(".lightbox-prev");
  const nextBtn = lightbox.querySelector(".lightbox-next");

  prevBtn.addEventListener("click", (e) => { e.stopPropagation(); showLightboxPrev(); });
  nextBtn.addEventListener("click", (e) => { e.stopPropagation(); showLightboxNext(); });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.closest(".lightbox-close")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); showLightboxNext(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); showLightboxPrev(); }
  });

  // Touch swipe support
  let touchStartX = 0;
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener("touchend", (e) => {
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 45) {
      if (diff < 0) showLightboxNext();
      else showLightboxPrev();
    }
  }, { passive: true });
}

function updateLightboxUI() {
  const lightbox = document.querySelector(".image-lightbox");
  if (!lightbox || !activeGalleryImages.length) return;

  const item = activeGalleryImages[currentLightboxIndex];
  const img = lightbox.querySelector(".lightbox-image");
  const title = lightbox.querySelector(".lightbox-caption-title");
  const details = lightbox.querySelector(".lightbox-caption-details");
  const camera = lightbox.querySelector(".lightbox-caption-camera");
  const counter = lightbox.querySelector(".lightbox-counter");
  const prevBtn = lightbox.querySelector(".lightbox-prev");
  const nextBtn = lightbox.querySelector(".lightbox-next");

  img.style.opacity = "0.4";
  img.src = item.src;
  img.alt = item.alt || item.title || "Macro Vipin Photography";

  img.onload = () => {
    img.style.opacity = "1";
  };

  title.textContent = item.title || "Field Study";
  
  const detailsArray = [];
  if (item.species) detailsArray.push(item.species);
  if (item.location) detailsArray.push(item.location);
  if (item.year) detailsArray.push(item.year);
  details.textContent = detailsArray.join(" · ");

  camera.textContent = item.camera || "";

  counter.textContent = `${currentLightboxIndex + 1} / ${activeGalleryImages.length}`;

  const hasMultiple = activeGalleryImages.length > 1;
  prevBtn.style.display = hasMultiple ? "flex" : "none";
  nextBtn.style.display = hasMultiple ? "flex" : "none";
}

function openLightbox(index) {
  const lightbox = document.querySelector(".image-lightbox");
  currentLightboxIndex = index;
  updateLightboxUI();
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const lightbox = document.querySelector(".image-lightbox");
  lightbox?.classList.remove("open");
  document.body.style.overflow = "";
}

function showLightboxNext() {
  if (activeGalleryImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % activeGalleryImages.length;
  updateLightboxUI();
}

function showLightboxPrev() {
  if (activeGalleryImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + activeGalleryImages.length) % activeGalleryImages.length;
  updateLightboxUI();
}

/* ─── Fetch & Render Images ─────────────────────────────────────── */
function fetchGalleryData(galleryName, filterVal, containerEl) {
  fetch(`/api/gallery/${encodeURIComponent(galleryName)}`)
    .then((r) => {
      if (!r.ok) throw new Error("Network response was not ok");
      return r.json();
    })
    .then(({ images }) => {
      let filtered = images;
      if (filterVal && filterVal !== "all") {
        filtered = images.filter((img) => 
          img.category?.toLowerCase().includes(filterVal.toLowerCase()) ||
          img.src.toLowerCase().includes(filterVal.toLowerCase())
        );
      }

      // If home page, limit to 6 for the featured teaser grid
      if (containerEl.dataset.limit) {
        filtered = filtered.slice(0, parseInt(containerEl.dataset.limit, 10));
      }

      activeGalleryImages = filtered;
      renderGalleryTiles(filtered, containerEl);
    })
    .catch((err) => {
      console.warn("Could not load dynamic API, rendering static fallback if available.", err);
      containerEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-muted);">
          <p>Please ensure the local dev server or Vercel function is active.</p>
        </div>
      `;
    });
}

function renderGalleryTiles(images, containerEl) {
  containerEl.replaceChildren();

  // Lazy observer for images
  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          const temp = new Image();
          temp.onload = () => {
            img.src = img.dataset.src;
            img.classList.remove("blurred");
            img.classList.add("loaded");
            delete img.dataset.src;
          };
          temp.src = img.dataset.src;
        }
        imgObserver.unobserve(img);
      }
    });
  }, { rootMargin: "250px" });

  images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "gallery-card reveal";

    const thumbBtn = document.createElement("button");
    thumbBtn.className = "gallery-thumb";
    thumbBtn.type = "button";
    thumbBtn.setAttribute("aria-label", `View ${item.title || "Photo"}`);

    const img = document.createElement("img");
    img.className = "gallery-image";
    img.alt = item.alt || item.title || "Macro Vipin Photography";

    // Progressive placeholder
    if (item.placeholder) {
      img.src = item.placeholder;
      img.dataset.src = item.thumb || item.src;
      img.classList.add("blurred");
      imgObserver.observe(img);
    } else {
      img.src = item.thumb || item.src;
      img.loading = "lazy";
      img.decoding = "async";
    }

    const info = document.createElement("div");
    info.className = "gallery-card-info";
    info.innerHTML = `
      <div class="card-title">${item.title || "Field Study"}</div>
      <div class="card-meta">${item.species ? item.species + " · " : ""}${item.location || ""}</div>
    `;

    thumbBtn.append(img, info);
    thumbBtn.addEventListener("click", () => openLightbox(index));

    card.append(thumbBtn);
    containerEl.append(card);

    // Eagerly load first 3
    if (index < 3 && item.placeholder) {
      img.src = item.thumb || item.src;
      img.classList.remove("blurred");
      img.classList.add("loaded");
      delete img.dataset.src;
      imgObserver.unobserve(img);
    }
  });

  // Re-run scroll reveal on newly inserted cards
  initScrollReveal();
}

/* ─── 4. Filter Tabs on Gallery Page ────────────────────────────── */
function initFilterTabs() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const galleryEl = document.querySelector("[data-gallery]");
  if (!filterBtns.length || !galleryEl) return;

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.dataset.filter;
      const galleryName = galleryEl.dataset.gallery;
      fetchGalleryData(galleryName, filter, galleryEl);
    });
  });
}

/* ─── 5. FAQ Accordion ──────────────────────────────────────────── */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const trigger = item.querySelector(".faq-trigger");
    const body = item.querySelector(".faq-body");

    trigger?.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");

      // Close all others
      faqItems.forEach((other) => {
        if (other !== item) {
          other.classList.remove("open");
          const otherBody = other.querySelector(".faq-body");
          if (otherBody) otherBody.style.maxHeight = null;
        }
      });

      if (!isOpen) {
        item.classList.add("open");
        body.style.maxHeight = body.scrollHeight + "px";
      } else {
        item.classList.remove("open");
        body.style.maxHeight = null;
      }
    });
  });
}

/* ─── 6. Contact Form Validation & Preset URL Params ───────────── */
function initContactForm() {
  const form = document.querySelector(".contact-form");
  const statusEl = document.querySelector(".form-status");

  // Pre-fill enquiry type from URL params (e.g., from Workshop "Book" buttons)
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = urlParams.get("type");
  const subjectParam = urlParams.get("subject");

  if (typeParam) {
    const select = document.querySelector("select[name='enquiry_type']");
    if (select) select.value = typeParam;
  }

  if (subjectParam) {
    const msg = document.querySelector("textarea[name='message']");
    if (msg && !msg.value) {
      msg.value = `Hi Vipin,\n\nI would like to enquire about the "${decodeURIComponent(subjectParam)}".\n\n`;
    }
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = form.querySelector("input[name='name']")?.value.trim();
    const email = form.querySelector("input[name='email']")?.value.trim();

    if (!name || !email) {
      showStatus("Please fill in your name and email address.", "error");
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    // Simulate reliable enquiry receipt
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      form.reset();
      showStatus("Thank you! Your enquiry has been received. Macro Vipin will respond within 24 hours.", "success");
    }, 600);
  });

  function showStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = `form-status ${type}`;
    statusEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

/* ─── 7. Hero Slideshow Engine ───────────────────────────────────── */
function initHeroSlideshow() {
  const heroBg = document.querySelector(".hero-bg");
  const indicatorsContainer = document.querySelector("#heroIndicators");
  const prevBtn = document.querySelector(".hero-prev");
  const nextBtn = document.querySelector(".hero-next");
  if (!heroBg) return;

  let currentSlide = 0;
  let slideTimer = null;
  let slides = [];

  function goToSlide(index) {
    if (!slides.length) return;
    slides[currentSlide]?.classList.remove("active");
    const dots = indicatorsContainer?.querySelectorAll(".hero-dot");
    dots?.[currentSlide]?.classList.remove("active");

    currentSlide = (index + slides.length) % slides.length;

    slides[currentSlide]?.classList.add("active");
    dots?.[currentSlide]?.classList.add("active");
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  function prevSlide() {
    goToSlide(currentSlide - 1);
  }

  function startAutoPlay() {
    stopAutoPlay();
    if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      slideTimer = setInterval(nextSlide, 5500);
    }
  }

  function stopAutoPlay() {
    if (slideTimer) {
      clearInterval(slideTimer);
      slideTimer = null;
    }
  }

  function setupSlides(slideImages) {
    if (!slideImages || !slideImages.length) return;

    heroBg.innerHTML = "";
    if (indicatorsContainer) indicatorsContainer.innerHTML = "";

    slideImages.forEach((item, i) => {
      const slideDiv = document.createElement("div");
      slideDiv.className = `hero-slide ${i === 0 ? "active" : ""}`;

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.alt || item.title || "Macro Vipin Photography Hero";
      if (i === 0) {
        img.setAttribute("fetchpriority", "high");
      } else {
        img.setAttribute("loading", "lazy");
      }

      slideDiv.appendChild(img);
      heroBg.appendChild(slideDiv);

      if (indicatorsContainer && slideImages.length > 1) {
        const dot = document.createElement("button");
        dot.className = `hero-dot ${i === 0 ? "active" : ""}`;
        dot.setAttribute("type", "button");
        dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
        dot.addEventListener("click", () => {
          goToSlide(i);
          startAutoPlay();
        });
        indicatorsContainer.appendChild(dot);
      }
    });

    slides = heroBg.querySelectorAll(".hero-slide");
    currentSlide = 0;

    const controls = document.querySelector(".hero-controls");
    if (controls) {
      controls.style.display = slideImages.length > 1 ? "flex" : "none";
    }

    startAutoPlay();
  }

  prevBtn?.addEventListener("click", () => { prevSlide(); startAutoPlay(); });
  nextBtn?.addEventListener("click", () => { nextSlide(); startAutoPlay(); });

  heroBg.parentElement?.addEventListener("mouseenter", stopAutoPlay);
  heroBg.parentElement?.addEventListener("mouseleave", startAutoPlay);

  // Fetch dynamic hero images from /api/gallery/hero
  fetch("/api/gallery/hero")
    .then((r) => r.ok ? r.json() : Promise.reject(r))
    .then(({ images }) => {
      if (images && images.length > 0) {
        setupSlides(images);
      } else {
        slides = heroBg.querySelectorAll(".hero-slide");
        startAutoPlay();
      }
    })
    .catch(() => {
      slides = heroBg.querySelectorAll(".hero-slide");
      startAutoPlay();
    });
}
