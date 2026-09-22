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
  lightbox.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close image">&times;</button>
    <img class="lightbox-image" alt="" />
  `;
  document.body.append(lightbox);

  const lightboxImage = lightbox.querySelector(".lightbox-image");
  const closeLightbox = () => {
    lightbox.classList.remove("open");
    lightboxImage.removeAttribute("src");
  };

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox || event.target.closest(".lightbox-close")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });

  fetch(`/api/gallery/${gallery.dataset.gallery}`)
    .then((response) => {
      if (!response.ok) throw new Error("Could not load gallery");
      return response.json();
    })
    .then(({ images }) => {
      gallery.replaceChildren(
        ...images.map(({ src, alt }) => {
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
            lightboxImage.src = src;
            lightboxImage.alt = alt;
            lightbox.classList.add("open");
          });
          return button;
        }),
      );
    })
    .catch(() => {
      gallery.innerHTML = "<p class=\"gallery-error\">Start the portfolio server to load this gallery.</p>";
    });
}
