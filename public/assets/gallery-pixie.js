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

  /* ─── DEDICATED SLIDESHOW OVERLAY ─── */
  let ssOverlay = null;
  let ssCurrentIndex = 0;
  let ssIsPaused = false;
  let ssInterval = null;
  let ssHideBarTimer = null;
  let ssCurrentImgEl = null;
  let ssNextImgEl = null;

  function initSlideshowButton() {
    const slideBtn = document.querySelector('.pixie-slideshow-btn');
    if (!slideBtn) return;

    slideBtn.addEventListener('click', () => {
      if (!galleryItems.length) return;
      openSlideshow();
    });
  }

  function openSlideshow() {
    if (ssOverlay) return;
    ssCurrentIndex = 0;
    ssIsPaused = false;

    ssOverlay = document.createElement('div');
    ssOverlay.className = 'pixie-slideshow-overlay';
    ssOverlay.setAttribute('role', 'dialog');
    ssOverlay.setAttribute('aria-modal', 'true');
    ssOverlay.setAttribute('aria-label', 'Slideshow');

    const stage = document.createElement('div');
    stage.className = 'pixie-ss-stage';

    ssCurrentImgEl = document.createElement('img');
    ssCurrentImgEl.className = 'pixie-ss-slide active';
    ssNextImgEl = document.createElement('img');
    ssNextImgEl.className = 'pixie-ss-slide';

    stage.appendChild(ssCurrentImgEl);
    stage.appendChild(ssNextImgEl);
    ssOverlay.appendChild(stage);

    // Controls bar
    const bar = document.createElement('div');
    bar.className = 'pixie-ss-bar';
    bar.innerHTML = `
      <button type="button" class="pixie-ss-btn pixie-ss-prev" title="Previous (Left arrow)" aria-label="Previous slide">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <button type="button" class="pixie-ss-btn pixie-ss-playpause" title="Pause/Play (Space)" aria-label="Pause slideshow">
        <svg class="ss-icon-pause" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        <svg class="ss-icon-play" viewBox="0 0 24 24" style="display:none;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      </button>
      <button type="button" class="pixie-ss-btn pixie-ss-next" title="Next (Right arrow)" aria-label="Next slide">
        <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
      <span class="pixie-ss-counter"></span>
      <button type="button" class="pixie-ss-btn pixie-ss-close" title="Close (Esc)" aria-label="Close slideshow">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    ssOverlay.appendChild(bar);
    document.body.appendChild(ssOverlay);
    document.body.style.overflow = 'hidden';

    // Enter fullscreen if allowed
    try {
      if (ssOverlay.requestFullscreen) {
        ssOverlay.requestFullscreen().catch(() => {});
      } else if (ssOverlay.webkitRequestFullscreen) {
        ssOverlay.webkitRequestFullscreen().catch(() => {});
      }
    } catch (err) {
      // Fallback: regular fixed overlay
    }

    // Set first slide
    setSlideImage(ssCurrentImgEl, galleryItems[0]);
    updateSsCounter();
    preloadImage((1) % galleryItems.length);

    // Event listeners on controls
    bar.querySelector('.pixie-ss-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      goToPrevSlide();
      resetSsTimer();
    });
    bar.querySelector('.pixie-ss-next').addEventListener('click', (e) => {
      e.stopPropagation();
      goToNextSlide();
      resetSsTimer();
    });
    bar.querySelector('.pixie-ss-playpause').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSsPause();
    });
    bar.querySelector('.pixie-ss-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeSlideshow();
    });

    // Auto-hide controls bar on inactivity
    function pingControls() {
      bar.classList.remove('hidden');
      clearTimeout(ssHideBarTimer);
      ssHideBarTimer = setTimeout(() => {
        bar.classList.add('hidden');
      }, 3000);
    }
    ssOverlay.addEventListener('mousemove', pingControls);
    ssOverlay.addEventListener('click', pingControls);
    pingControls();

    // Keyboard controls
    document.addEventListener('keydown', onSsKeyDown);

    // Touch swipe support
    let ssTouchX = 0;
    ssOverlay.addEventListener('touchstart', (e) => {
      ssTouchX = e.changedTouches[0].screenX;
      pingControls();
    }, { passive: true });

    ssOverlay.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].screenX - ssTouchX;
      if (Math.abs(diff) > 40) {
        if (diff < 0) goToNextSlide();
        else goToPrevSlide();
        resetSsTimer();
      }
    }, { passive: true });

    // Listen for fullscreen change
    document.addEventListener('fullscreenchange', onSsFsChange);
    document.addEventListener('webkitfullscreenchange', onSsFsChange);

    startSsTimer();
  }

  function onSsFsChange() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (ssOverlay) {
        closeSlideshow();
      }
    }
  }

  function onSsKeyDown(e) {
    if (!ssOverlay) return;
    if (e.key === 'Escape') {
      closeSlideshow();
    } else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      toggleSsPause();
    } else if (e.key === 'ArrowRight') {
      goToNextSlide();
      resetSsTimer();
    } else if (e.key === 'ArrowLeft') {
      goToPrevSlide();
      resetSsTimer();
    }
  }

  function setSlideImage(imgEl, item) {
    if (!item) return;
    imgEl.src = item.src;
    imgEl.alt = item.alt || item.title || 'Macro Vipin Photography';
  }

  function crossfadeTo(newIndex) {
    if (!ssOverlay || !galleryItems.length) return;
    ssCurrentIndex = (newIndex + galleryItems.length) % galleryItems.length;

    const item = galleryItems[ssCurrentIndex];
    setSlideImage(ssNextImgEl, item);

    ssNextImgEl.classList.add('active');
    ssCurrentImgEl.classList.remove('active');

    // Swap references
    const temp = ssCurrentImgEl;
    ssCurrentImgEl = ssNextImgEl;
    ssNextImgEl = temp;

    updateSsCounter();
    preloadImage((ssCurrentIndex + 1) % galleryItems.length);
  }

  function goToNextSlide() {
    crossfadeTo(ssCurrentIndex + 1);
  }

  function goToPrevSlide() {
    crossfadeTo(ssCurrentIndex - 1);
  }

  function preloadImage(index) {
    if (galleryItems[index]) {
      const p = new Image();
      p.src = galleryItems[index].src;
    }
  }

  function updateSsCounter() {
    if (!ssOverlay) return;
    const counter = ssOverlay.querySelector('.pixie-ss-counter');
    if (counter) {
      counter.textContent = `${ssCurrentIndex + 1} / ${galleryItems.length}`;
    }
  }

  function toggleSsPause() {
    ssIsPaused = !ssIsPaused;
    if (!ssOverlay) return;
    const pauseIcon = ssOverlay.querySelector('.ss-icon-pause');
    const playIcon = ssOverlay.querySelector('.ss-icon-play');
    if (ssIsPaused) {
      stopSsTimer();
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (playIcon) playIcon.style.display = 'block';
    } else {
      if (pauseIcon) pauseIcon.style.display = 'block';
      if (playIcon) playIcon.style.display = 'none';
      startSsTimer();
    }
  }

  function startSsTimer() {
    stopSsTimer();
    if (ssIsPaused) return;
    ssInterval = setInterval(() => {
      goToNextSlide();
    }, 4000);
  }

  function stopSsTimer() {
    if (ssInterval) {
      clearInterval(ssInterval);
      ssInterval = null;
    }
  }

  function resetSsTimer() {
    if (!ssIsPaused) {
      startSsTimer();
    }
  }

  function closeSlideshow() {
    stopSsTimer();
    clearTimeout(ssHideBarTimer);
    document.removeEventListener('keydown', onSsKeyDown);
    document.removeEventListener('fullscreenchange', onSsFsChange);
    document.removeEventListener('webkitfullscreenchange', onSsFsChange);

    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
      }
    } catch (e) {}

    if (ssOverlay && ssOverlay.parentNode) {
      ssOverlay.parentNode.removeChild(ssOverlay);
    }
    ssOverlay = null;
    document.body.style.overflow = '';
  }

})();
