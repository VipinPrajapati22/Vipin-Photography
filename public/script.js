const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const form = document.querySelector(".contact-form");
const formStatus = document.querySelector(".form-status");

menuToggle?.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    siteNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  formStatus.textContent = "Thanks. Your enquiry is ready.";
  form.reset();
});

const gallery = document.querySelector("[data-gallery]");

if (gallery) {
  const lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Image viewer");
  lightbox.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close image">&times;</button>
    <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous image">&#10094;</button>
    <button class="lightbox-nav lightbox-next" type="button" aria-label="Next image">&#10095;</button>
    <img class="lightbox-image" alt="" />
    <div class="lightbox-counter" aria-live="polite"></div>
  `;
  document.body.append(lightbox);

  const lightboxImage = lightbox.querySelector(".lightbox-image");
  const lightboxCounter = lightbox.querySelector(".lightbox-counter");
  const prevBtn = lightbox.querySelector(".lightbox-prev");
  const nextBtn = lightbox.querySelector(".lightbox-next");

  let galleryImages = [];
  let currentIndex = 0;

  const updateLightbox = () => {
    if (!galleryImages.length) return;
    const current = galleryImages[currentIndex];
    lightboxImage.src = current.src;
    lightboxImage.alt = current.alt || "Photography image";
    lightboxCounter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;

    if (galleryImages.length <= 1) {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      lightboxCounter.style.display = "none";
    } else {
      prevBtn.style.display = "flex";
      nextBtn.style.display = "flex";
      lightboxCounter.style.display = "block";
    }
  };

  const openLightbox = (index) => {
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    lightbox.classList.remove("open");
    lightboxImage.removeAttribute("src");
    document.body.style.overflow = "";
  };

  const showNext = () => {
    if (galleryImages.length <= 1) return;
    currentIndex = (currentIndex + 1) % galleryImages.length;
    updateLightbox();
  };

  const showPrev = () => {
    if (galleryImages.length <= 1) return;
    currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    updateLightbox();
  };

  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showPrev();
  });

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showNext();
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox || event.target.closest(".lightbox-close")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("open")) return;
    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      showNext();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      showPrev();
    }
  });

  let touchStartX = 0;
  let touchEndX = 0;

  lightbox.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true },
  );

  lightbox.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchEndX - touchStartX;
      if (Math.abs(swipeDistance) > 45) {
        if (swipeDistance < 0) {
          showNext();
        } else {
          showPrev();
        }
      }
    },
    { passive: true },
  );

  fetch(`/api/gallery/${gallery.dataset.gallery}`)
    .then((response) => {
      if (!response.ok) throw new Error("Could not load gallery");
      return response.json();
    })
    .then(({ images }) => {
      galleryImages = images;
      gallery.replaceChildren(
        ...images.map(({ src, alt }, index) => {
          const button = document.createElement("button");
          const image = document.createElement("img");
          button.className = "gallery-thumb";
          button.type = "button";
          button.setAttribute("aria-label", `View ${alt}`);
          image.className = "gallery-image";
          image.src = src;
          image.alt = alt;
          image.loading = "lazy";
          button.append(image);
          button.addEventListener("click", () => {
            openLightbox(index);
          });
          return button;
        }),
      );
    })
    .catch(() => {
      gallery.innerHTML = '<p class="gallery-error">Start the portfolio server to load this gallery.</p>';
    });
}
