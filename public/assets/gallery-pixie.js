/**
 * Pixieset-Style Gallery Shared JavaScript
 * Reused by gallery.html and all 4 collection pages.
 */

(function () {
  'use strict';

  // 1. Synchronous theme initialization (avoids flash)
  const savedTheme = localStorage.getItem('mv-theme') || 
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Global state
  let galleryItems = [];
  let renderedCount = 0;
  const BATCH_SIZE = 18;
  let currentLbIndex = 0;
  let slideshowTimer = null;

  document.addEventListener('DOMContentLoaded', () => {
    initThemeButtons();
    initMenuDropdown();
    initShareButton();
    initCoverScroll();
    initGalleryGrid();
    initLightbox();
    initSlideshowButton();
  });

  /* ─── THEME TOGGLE ─── */
  function initThemeButtons() {
    const btns = document.querySelectorAll('.pixie-theme-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('mv-theme', next);
      });
    });
  }

  /* ─── MENU DROPDOWN ─── */
  function initMenuDropdown() {
    const menuBtn = document.querySelector('.pixie-menu-btn');
    const dropdown = document.querySelector('.pixie-menu-dropdown');
    if (!menuBtn || !dropdown) return;

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.pixie-menu-wrapper')) {
        dropdown.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ─── SHARE BUTTON ─── */
  function initShareButton() {
    const shareBtn = document.querySelector('.pixie-share-btn');
    const toast = document.getElementById('pixie-toast');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(window.location.href);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = window.location.href;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        showToast('Link copied to clipboard');
      } catch (err) {
        showToast('Unable to copy link');
      }
    });

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2500);
    }
  }

  /* ─── COVER SMOOTH SCROLL ─── */
  function initCoverScroll() {
    const viewBtn = document.querySelector('.pixie-cover-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById('gallery-grid') || document.querySelector('.pixie-grid-wrap');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  /* ─── GALLERY GRID & LOAD MORE ─── */
  async function initGalleryGrid() {
    const gridEl = document.querySelector('.pixie-grid');
    if (!gridEl) return;

    const galleryName = gridEl.dataset.gallery || 'nature-macro';
    const loadMoreBtn = document.querySelector('.pixie-load-more-btn');

    // Load data from API with fallback to static manifest
    let images = [];
    try {
      const res = await fetch(`/api/gallery/${encodeURIComponent(galleryName)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.images && json.images.length) {
          images = json.images;
        }
      }
    } catch (e) {
      // API not available, will use fallback
    }

    if (!images.length && window.__GALLERY_DATA__ && window.__GALLERY_DATA__[galleryName]) {
      images = window.__GALLERY_DATA__[galleryName];
    }

    galleryItems = images;

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        renderBatch(gridEl);
      });
    }

    renderBatch(gridEl);
  }

  function renderBatch(gridEl) {
    const loadMoreBtn = document.querySelector('.pixie-load-more-btn');
    const nextBatch = galleryItems.slice(renderedCount, renderedCount + BATCH_SIZE);

    nextBatch.forEach((item, idx) => {
      const overallIndex = renderedCount + idx;
      const el = document.createElement('div');
      el.className = 'pixie-item';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', item.title || 'View photo');

      const img = document.createElement('img');
      img.src = item.thumb || item.src;
      img.alt = item.alt || item.title || 'Macro Vipin Photography';
      img.loading = 'lazy';
      img.decoding = 'async';

      el.appendChild(img);

      el.addEventListener('click', () => openLightbox(overallIndex));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(overallIndex);
        }
      });

      gridEl.appendChild(el);
    });

    renderedCount += nextBatch.length;

    if (loadMoreBtn) {
      if (renderedCount < galleryItems.length) {
        loadMoreBtn.style.display = 'inline-block';
      } else {
        loadMoreBtn.style.display = 'none';
      }
    }
  }

  /* ─── LIGHTBOX & SLIDESHOW ─── */
  function initLightbox() {
    const lb = document.querySelector('.pixie-lightbox');
    if (!lb) return;

    const closeBtn = lb.querySelector('.pixie-lb-close');
    const prevBtn = lb.querySelector('.pixie-lb-prev');
    const nextBtn = lb.querySelector('.pixie-lb-next');

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', showPrev);
    if (nextBtn) nextBtn.addEventListener('click', showNext);

    // Close on background click
    lb.addEventListener('click', (e) => {
      if (e.target === lb) closeLightbox();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') showNext();
      else if (e.key === 'ArrowLeft') showPrev();
    });

    // Touch swipe support
    let touchStartX = 0;
    lb.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lb.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 45) {
        if (diff < 0) showNext();
        else showPrev();
      }
    }, { passive: true });
  }

  function openLightbox(index) {
    if (!galleryItems.length) return;
    const lb = document.querySelector('.pixie-lightbox');
    if (!lb) return;

    currentLbIndex = (index + galleryItems.length) % galleryItems.length;
    updateLightboxContent();
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lb = document.querySelector('.pixie-lightbox');
    if (!lb) return;
    lb.classList.remove('open');
    document.body.style.overflow = '';
    stopSlideshow();
  }

  function showNext() {
    if (galleryItems.length <= 1) return;
    currentLbIndex = (currentLbIndex + 1) % galleryItems.length;
    updateLightboxContent();
  }

  function showPrev() {
    if (galleryItems.length <= 1) return;
    currentLbIndex = (currentLbIndex - 1 + galleryItems.length) % galleryItems.length;
    updateLightboxContent();
  }

  function updateLightboxContent() {
    const lb = document.querySelector('.pixie-lightbox');
    if (!lb || !galleryItems[currentLbIndex]) return;

    const img = lb.querySelector('.pixie-lightbox-img');
    const counter = lb.querySelector('.pixie-lb-counter');
    const item = galleryItems[currentLbIndex];

    img.style.opacity = '0.3';
    img.src = item.src;
    img.alt = item.alt || item.title || 'Macro Vipin Photography';
    img.onload = () => {
      img.style.opacity = '1';
    };

    if (counter) {
      counter.textContent = `${currentLbIndex + 1} / ${galleryItems.length}`;
    }
  }

  /* ─── SLIDESHOW ─── */
  function initSlideshowButton() {
    const slideBtn = document.querySelector('.pixie-slideshow-btn');
    if (!slideBtn) return;

    slideBtn.addEventListener('click', () => {
      if (!galleryItems.length) return;
      openLightbox(0);
      startSlideshow();
    });
  }

  function startSlideshow() {
    stopSlideshow();
    slideshowTimer = setInterval(() => {
      showNext();
    }, 4000);
  }

  function stopSlideshow() {
    if (slideshowTimer) {
      clearInterval(slideshowTimer);
      slideshowTimer = null;
    }
  }

})();
