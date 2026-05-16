(() => {
  const slides = document.querySelectorAll('.slide');
  const chars = document.querySelectorAll('#characters .character');
  const charDescs = document.querySelectorAll('#characters .char-desc');
  let current = 0;
  const total = slides.length;

  function updateCharDescs() {
    const slide = slides[current];
    const descData = slide.dataset.charDesc;
    const descs = descData ? JSON.parse(descData) : [];

    chars.forEach((c, i) => {
      const descEl = c.querySelector('.char-desc');
      if (descs[i]) {
        descEl.textContent = descs[i];
        // Small delay so the text is set before class triggers animation
        requestAnimationFrame(() => c.classList.add('has-desc'));
      } else {
        c.classList.remove('has-desc');
        // Clear text after transition
        setTimeout(() => { if (!c.classList.contains('has-desc')) descEl.textContent = ''; }, 500);
      }
    });
  }

  const ripleyEl = document.querySelector('.character[data-char="0"]');
  const davisEl = document.querySelector('.character[data-char="1"]');
  const morganEl = document.querySelector('.character[data-char="2"]');

  if (ripleyEl) {
    ripleyEl.addEventListener('mouseenter', () => {
      if (ripleyEl.classList.contains('mode-hover')) {
        const hv = ripleyEl.querySelector('.v-hover');
        if (hv && hv.paused) { hv.currentTime = 0; hv.play(); }
      }
    });
  }

  if (davisEl) {
    davisEl.addEventListener('mouseenter', () => {
      if (davisEl.classList.contains('mode-hover')) {
        const hv = davisEl.querySelector('.v-hover');
        if (hv && hv.paused) { hv.currentTime = 0; hv.play(); }
      }
    });
  }

  if (morganEl) {
    morganEl.addEventListener('mouseenter', () => {
      if (morganEl.classList.contains('mode-hover')) {
        const hv = morganEl.querySelector('.v-hover');
        if (hv && hv.paused) { hv.currentTime = 0; hv.play(); }
      }
    });
  }

  function updateVideos(index) {
    const slide = slides[index];
    const isSolo = slide && (slide.classList.contains('slide--davis-solo') || slide.classList.contains('slide--ripley-solo') || slide.classList.contains('slide--morgan-solo'));
    if (index === 0) {
      ripleyEl && ripleyEl.classList.remove('mode-hover');
      davisEl && davisEl.classList.remove('mode-hover');
      morganEl && morganEl.classList.remove('mode-hover');
      const re = ripleyEl && ripleyEl.querySelector('.v-entry');
      const de = davisEl && davisEl.querySelector('.v-entry');
      const me = morganEl && morganEl.querySelector('.v-entry');
      if (re) { re.currentTime = 0; re.play().catch(() => {}); }
      if (de) { de.currentTime = 0; de.play().catch(() => {}); }
      if (me) { me.currentTime = 0; me.play().catch(() => {}); }
    } else if (index === 1 || isSolo) {
      ripleyEl && ripleyEl.classList.add('mode-hover');
      davisEl && davisEl.classList.add('mode-hover');
      morganEl && morganEl.classList.add('mode-hover');
      // Auto-play entry video once on first slide of each agent pair
      const isFirstSolo = index === 3 || index === 5 || index === 7;
      if (isFirstSolo) {
        let soloChar = index === 3 ? davisEl : index === 5 ? ripleyEl : morganEl;
        if (soloChar) {
          soloChar.classList.remove('mode-hover');
          const ev = soloChar.querySelector('.v-entry');
          if (ev) {
            ev.currentTime = 0;
            ev.play().catch(() => {});
            ev.onended = () => { soloChar.classList.add('mode-hover'); ev.onended = null; };
          }
        }
      }
    }
  }

  function goTo(index) {
    if (index < 0 || index >= total) return;
    slides[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    document.body.classList.toggle('canvas-slide', slides[current].classList.contains('slide--canvas'));
    document.body.classList.toggle('feature-slide', slides[current].classList.contains('slide--feature'));
    const isDavisSolo  = slides[current].classList.contains('slide--davis-solo');
    const isRipleySolo = slides[current].classList.contains('slide--ripley-solo');
    const isMorganSolo = slides[current].classList.contains('slide--morgan-solo');
    const noChars      = slides[current].classList.contains('slide--no-chars');
    const anySolo = isDavisSolo || isRipleySolo || isMorganSolo;
    document.body.classList.toggle('davis-solo-slide', isDavisSolo);
    document.body.classList.toggle('ripley-solo-slide', isRipleySolo);
    document.body.classList.toggle('morgan-solo-slide', isMorganSolo);
    if (ripleyEl) ripleyEl.style.display = (isDavisSolo || isMorganSolo || noChars) ? 'none' : '';
    if (davisEl)  davisEl.style.display  = (isRipleySolo || isMorganSolo || noChars) ? 'none' : '';
    if (morganEl) morganEl.style.display = (isDavisSolo || isRipleySolo || noChars) ? 'none' : '';
    const charsEl = document.getElementById('characters');
    if (charsEl) { charsEl.style.left = anySolo ? '0' : ''; charsEl.style.transform = anySolo ? 'none' : ''; }
    updateCharDescs();
    updateGrid();
    updateVideos(index);
  }

  // Initial state
  updateCharDescs();

  // Slide grid overview
  const slideGrid = document.getElementById('slideGrid');
  const snapshots = {};
  function buildGrid() {
    if (!slideGrid) return;
    slideGrid.innerHTML = '';
    // Read actual slide dimensions from DOM
    const docW = slides[0].offsetWidth;
    const docH = slides[0].offsetHeight;
    const gearEl = document.querySelector('.gear');
    const gearRect = gearEl ? getComputedStyle(gearEl) : null;
    const panelNav = document.querySelector('.pull-panel__nav');
    const navH = panelNav.offsetHeight;
    const logoW = document.querySelector('.top-logo').offsetWidth;

    slides.forEach((slide, i) => {
      const item = document.createElement('div');
      item.className = 'slide-grid__item' + (i === current ? ' active' : '');

      const preview = document.createElement('div');
      preview.className = 'slide-grid__preview';
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:absolute;top:0;left:0;width:' + docW + 'px;height:' + docH + 'px;transform-origin:0 0;pointer-events:none;background:#F6F8F9;';

      // Clone gear with px sizes
      if (gearEl) {
        const gearClone = gearEl.cloneNode(true);
        const gW = gearEl.offsetWidth;
        gearClone.style.cssText = 'position:absolute;top:-112px;left:-112px;width:' + gW + 'px;height:' + gW + 'px;opacity:0.04;pointer-events:none;';
        wrapper.appendChild(gearClone);
      }

      // Panel tab with px sizes
      const navClone = panelNav.cloneNode(true);
      const tabW = logoW + 16;
      const tabLeft = (docW - tabW) / 2;
      const miniPanel = document.createElement('div');
      miniPanel.style.cssText = 'position:absolute;top:0;left:0;width:' + docW + 'px;height:' + navH + 'px;background:linear-gradient(135deg,#2398B2,#2DB1A1 72%);clip-path:inset(0 ' + (docW - tabLeft - tabW) + 'px ' + (navH * 0.01) + 'px ' + tabLeft + 'px round 0 0 28px 28px);';
      navClone.style.cssText = 'display:flex;align-items:center;justify-content:center;height:' + navH + 'px;';
      const logoClone = navClone.querySelector('.top-logo');
      if (logoClone) logoClone.style.width = logoW + 'px';
      miniPanel.appendChild(navClone);
      wrapper.appendChild(miniPanel);

      // Clone slide content with px padding
      const slideClone = slide.cloneNode(true);
      const slideCS = getComputedStyle(slide);
      slideClone.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-top:' + slideCS.paddingTop + ';padding-bottom:' + slideCS.paddingBottom + ';background:transparent;opacity:1;visibility:visible;transform:none;';
      slideClone.classList.add('no-bar', 'active');
      wrapper.appendChild(slideClone);

      // Three.js canvas snapshot for slide--canvas
      if (slide.classList.contains('slide--canvas') && window.__officeSceneSnapshot) {
        const sceneImg = document.createElement('img');
        sceneImg.src = window.__officeSceneSnapshot;
        sceneImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
        wrapper.insertBefore(sceneImg, slideClone);
      }

      // Clone characters with px sizes
      const charsEl = document.getElementById('characters');
      const charsClone = charsEl.cloneNode(true);
      charsClone.style.cssText = 'position:absolute;bottom:9px;left:50%;transform:translateX(-50%);display:flex;justify-content:center;gap:2.5rem;';
      const liveChars = charsEl.querySelectorAll('.character');
      const cloneChars = charsClone.querySelectorAll('.character');
      liveChars.forEach((lc, ci) => {
        const cc = cloneChars[ci];
        const placeholder = lc.querySelector('.char-video-placeholder');
        const clonePlaceholder = cc.querySelector('.char-video-placeholder');
        if (!placeholder || !clonePlaceholder) return;
        const pw = placeholder.offsetWidth;
        const ph = placeholder.offsetHeight;
        clonePlaceholder.style.width = pw + 'px';
        clonePlaceholder.style.height = ph + 'px';
        clonePlaceholder.querySelectorAll('video').forEach(v => v.remove());
      });
      const descData = slide.dataset.charDesc;
      const descs = descData ? JSON.parse(descData) : [];
      cloneChars.forEach((c, ci) => {
        const descEl = c.querySelector('.char-desc');
        if (descs[ci]) {
          descEl.textContent = descs[ci];
          descEl.style.cssText = 'position:absolute;bottom:calc(100% + 63px);left:50%;transform:translateX(-50%);opacity:1;transition:none;width:315px;text-align:center;font-size:0.75rem;color:#6b7280;line-height:1.4;padding-bottom:0.5rem;';
          c.querySelector('.char-name').style.cssText = 'transform:translateY(-166px);transition:none;';
          c.querySelector('.char-role').style.cssText = 'opacity:0;transform:translateY(-166px);transition:none;';
        }
      });

      // Hide/show characters per slide type in miniatures
      const isDSolo = slide.classList.contains('slide--davis-solo');
      const isRSolo = slide.classList.contains('slide--ripley-solo');
      const isMSolo = slide.classList.contains('slide--morgan-solo');
      const noChars = slide.classList.contains('slide--no-chars') || slide.classList.contains('slide--canvas');
      if (noChars) {
        charsClone.style.display = 'none';
      } else if (isDSolo || isRSolo || isMSolo) {
        charsClone.style.left = '40px';
        charsClone.style.transform = 'none';
        charsClone.style.justifyContent = 'flex-start';
        cloneChars.forEach((c, ci) => {
          if (isDSolo && ci !== 1) c.style.display = 'none';
          if (isRSolo && ci !== 0) c.style.display = 'none';
          if (isMSolo && ci !== 2) c.style.display = 'none';
          // Hide name/role/desc on solo slides
          const nm = c.querySelector('.char-name');
          const rl = c.querySelector('.char-role');
          const ds = c.querySelector('.char-desc');
          if (nm) nm.style.display = 'none';
          if (rl) rl.style.display = 'none';
          if (ds) ds.style.display = 'none';
          // Enlarge solo character placeholder
          const cp = c.querySelector('.char-video-placeholder');
          if (cp && c.style.display !== 'none') {
            cp.style.width = '620px';
            cp.style.height = '750px';
            if (isMSolo) cp.style.transform = 'scaleX(-1)';
          }
        });
      }
      wrapper.appendChild(charsClone);

      // Bottom bar
      const bar = document.createElement('div');
      bar.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:9px;background:linear-gradient(90deg,#2398B2,#2DB1A1 72%);';
      wrapper.appendChild(bar);

      preview.appendChild(wrapper);
      requestAnimationFrame(() => {
        const scale = preview.offsetWidth / docW;
        wrapper.style.transform = 'scale(' + scale + ')';
        preview.style.height = (docH * scale) + 'px';
      });

      item.appendChild(preview);
      item.addEventListener('click', () => {
        goTo(i);
        if (pullPanel) pullPanel.classList.remove('open');
      });
      slideGrid.appendChild(item);
    });
  }
  function updateGrid() {
    if (!slideGrid) return;
    slideGrid.querySelectorAll('.slide-grid__item').forEach((item, i) => {
      item.classList.toggle('active', i === current);
    });
  }
  buildGrid();

  // Capture frames from live video elements already on the page
  function grabLiveFrame(video, pw, ph) {
    try {
      if (!video || !video.videoWidth) return null;
      const c = document.createElement('canvas');
      c.width = pw; c.height = ph;
      const ctx = c.getContext('2d');
      const vw = video.videoWidth, vh = video.videoHeight;
      const scale = Math.max(pw / vw, ph / vh);
      ctx.drawImage(video, (pw - vw * scale) / 2, (ph - vh * scale) / 2, vw * scale, vh * scale);
      return c.toDataURL();
    } catch(e) { return null; }
  }

  function captureAllLive() {
    let captured = 0;
    document.querySelectorAll('#characters .character').forEach((lc, ci) => {
      const ph = lc.querySelector('.char-video-placeholder');
      if (!ph) return;
      const pw = ph.offsetWidth, pph = ph.offsetHeight;
      // Try hover video first (standing pose), then entry
      const hv = lc.querySelector('.v-hover');
      const ev = lc.querySelector('.v-entry');
      const hSnap = grabLiveFrame(hv, pw, pph);
      const eSnap = grabLiveFrame(ev, pw, pph);
      if (hSnap) { snapshots['hover-' + ci] = hSnap; captured++; }
      if (eSnap) { snapshots['entry-' + ci] = eSnap; captured++; }
    });
    if (captured > 0) { buildGrid(); updateGrid(); }
  }

  // Retry capture until videos are loaded (check every 2s, up to 15s)
  let captureAttempts = 0;
  const captureInterval = setInterval(() => {
    captureAttempts++;
    captureAllLive();
    if (captureAttempts >= 8 || Object.keys(snapshots).length >= 6) clearInterval(captureInterval);
  }, 2000);

  // Rebuild grid when Three.js scene finishes loading (adds canvas snapshot)
  window.addEventListener('officeSceneReady', () => { buildGrid(); updateGrid(); }, { once: true });

  // Pull panel (logo tab)
  const pullTab = document.getElementById('pullTab');
  const pullPanel = document.getElementById('pullPanel');
  if (pullTab && pullPanel) {
    pullTab.addEventListener('click', () => pullPanel.classList.toggle('open'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && pullPanel.classList.contains('open')) {
        pullPanel.classList.remove('open');
      }
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      goTo(current - 1);
    } else if ((e.key === 'w' || e.key === 'W') && pullPanel) {
      e.preventDefault();
      pullPanel.classList.toggle('open');
    }
  });

  // Mobile character carousel
  let carouselIdx = 1;
  let autoTimer = null;

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function showChar(i) {
    chars.forEach(c => c.classList.remove('carousel-active'));
    chars[i].classList.add('carousel-active');
    carouselIdx = i;
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => {
      if (!isMobile()) return;
      showChar((carouselIdx + 1) % chars.length);
    }, 3500);
  }

  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
  }

  function initCarousel() {
    if (isMobile()) {
      showChar(carouselIdx);
      startAuto();
    } else {
      chars.forEach(c => c.classList.remove('carousel-active'));
      stopAuto();
    }
  }

  // Swipe on characters area
  let swipeStartX = 0;
  const charsContainer = document.getElementById('characters');

  if (charsContainer) {
    charsContainer.addEventListener('touchstart', (e) => {
      swipeStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    charsContainer.addEventListener('touchend', (e) => {
      if (!isMobile()) return;
      const dx = e.changedTouches[0].screenX - swipeStartX;
      if (Math.abs(dx) > 40) {
        stopAuto();
        if (dx < 0) {
          showChar((carouselIdx + 1) % chars.length);
        } else {
          showChar((carouselIdx - 1 + chars.length) % chars.length);
        }
        startAuto();
      }
    }, { passive: true });
  }

  initCarousel();
  window.addEventListener('resize', initCarousel);

  /* ── Expandable deal-term cards ────────────────── */
  document.querySelectorAll('.deal-term--expandable').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = card.classList.contains('expanded');
      if (isExpanded) {
        card.classList.remove('expanded');
      } else {
        card.classList.add('expanded');
      }
    });
  });
})();
