// Shared markup + behavior reused across index.html, listing.html, and
// locate.html — the client-side equivalent of the render_header()/
// render_footer()/render_contact()/chat_widget() functions in
// build_site_generator_reference.py, ported to build/insert DOM instead of
// generating static files.
const Stratum = (function () {
  const TYPE_LABEL = { residential: 'Residential', land: 'Land', business: 'Business Opportunity' };
  const PHONE = '4355907106';
  const PHONE_DISPLAY = '(435) 590-7106';
  const EMAIL = 'scott@stratumrealestate.com';

  // Property text comes from the admin form (only Scott can write it, via
  // authenticated RLS) rather than being baked in at generate-time like
  // before, so — unlike the old string-building generator — this now
  // renders live user-entered text into innerHTML. Escaping it here is the
  // client-side-rendering equivalent of what used to be inherently safe by
  // construction.
  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
<path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.615z"/>
<path fill="#34A853" d="M9 18c2.43 0 4.4673-.8055 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.3441 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"/>
<path fill="#FBBC05" d="M3.9641 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1022-1.17.2822-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z"/>
<path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z"/>
</svg>`;

  const FACEBOOK_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
</svg>`;

  const AVATAR_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="#FBEDEA"/>
  <path d="M50 96c-15 0-27.5-5-34-11 3-14 16-20 34-20s31 6 34 20c-6.5 6-19 11-34 11z" fill="#363636"/>
  <path d="M50 65c-9 0-14 3-14 3l3 10c3 1.5 7 2.5 11 2.5s8-1 11-2.5l3-10s-5-3-14-3z" fill="#FFFFFF"/>
  <rect x="46.5" y="70" width="7" height="9" rx="2" fill="#7A1B10"/>
  <circle cx="50" cy="40" r="19" fill="#3B2A22"/>
  <circle cx="50" cy="42" r="15.5" fill="#E7B694"/>
  <path d="M31 40c0-13 8.5-21 19-21s19 8 19 21c0-3-2-6-5-6-1-6-6-10-14-10s-13 4-14 10c-3 0-5 3-5 6z" fill="#3B2A22"/>
  <circle cx="43" cy="43" r="1.6" fill="#3B2A22"/>
  <circle cx="57" cy="43" r="1.6" fill="#3B2A22"/>
  <path d="M45 50c1.5 1.6 3.2 2.4 5 2.4s3.5-.8 5-2.4" stroke="#3B2A22" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <circle cx="63" cy="76" r="6.5" fill="#FFFFFF" stroke="#7A1B10" stroke-width="1.3"/>
  <text x="63" y="79.3" font-family="Baloo 2, sans-serif" font-weight="700" font-size="7.5" fill="#7A1B10" text-anchor="middle">S</text>
</svg>`;

  function renderHeader() {
    return `<header class="site-header">
  <div class="header-inner">
    <div class="header-left">
      <button class="hamburger-btn" id="hamburgerBtn" type="button" aria-label="Menu" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <a href="index.html" class="brand">
        <img class="logo" src="assets/logo.jpg" alt="Stratum Real Estate Group">
        <div class="brand-text">
          <span class="agent-name">Scott Bird</span>
          <span class="agent-tag">Realtor &middot; Southern Utah</span>
        </div>
      </a>
      <div class="hamburger-dropdown" id="hamburgerDropdown">
        <a href="index.html">Home</a>
        <a href="scott.html">Meet Scott</a>
        <a href="https://scottbird.buyutahrealestate.com/listing" target="_blank" rel="noopener">Search all MLS listings</a>
      </div>
    </div>
    <nav class="site-nav">
      <a class="nav-link" href="index.html">Listings</a>
      <a class="nav-link" href="index.html#contact">Contact</a>
      <a class="nav-cta" href="tel:${PHONE}">${PHONE_DISPLAY}</a>
    </nav>
  </div>
</header>`;
  }

  function wireHeader() {
    const btn = document.getElementById('hamburgerBtn');
    const menu = document.getElementById('hamburgerDropdown');
    if (!btn || !menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  function renderFooter() {
    return `<footer class="site-footer">
  <span>&copy; ${new Date().getFullYear()} Stratum Real Estate Group. Information deemed reliable but not guaranteed.</span>
  <span>License #5460118-BB00</span>
</footer>`;
  }

  function renderContact() {
    return `<section class="contact-section" id="contact">
    <div class="contact-copy">
      <h2>Let's talk about Real Estate!</h2>
      <p>Whatever the property, whatever the goal, I'll bring the experience, insight, and numbers you need to make a confident decision&mdash;on your terms.</p>
      <div class="hero-actions">
        <a href="tel:${PHONE}" class="btn btn-primary">Call ${PHONE_DISPLAY}</a>
        <a href="sms:${PHONE}" class="btn btn-ghost">Text Scott</a>
        <a href="mailto:${EMAIL}" class="btn btn-ghost">Email Scott</a>
      </div>
    </div>
    <div class="contact-card">
      <img src="assets/headshot.jpg" alt="Scott Bird">
      <div>
        <h3>Scott Bird</h3>
        <div class="role">Stratum Real Estate Group</div>
        <div class="contact-line">365 S Main St, Cedar City, UT 84720</div>
        <div class="contact-line"><a href="tel:${PHONE}">${PHONE_DISPLAY}</a></div>
        <div class="contact-line"><a href="mailto:${EMAIL}">${EMAIL}</a></div>
        <div class="contact-line"><a href="http://utahrealestate4sale.com" target="_blank" rel="noopener">utahrealestate4sale.com</a></div>
        <div class="contact-line"><a href="https://www.google.com/search?q=Scott+Bird+Stratum+Real+Estate+reviews" target="_blank" rel="noopener">Read reviews &rarr;</a></div>
        <div class="social-row">
          <a class="social-btn" href="https://maps.app.goo.gl/HP66seiRawJU5GgZ7" target="_blank" rel="noopener" aria-label="Connect with Google">${GOOGLE_SVG}<span>Connect with Google</span></a>
          <a class="social-btn" href="https://www.facebook.com/profile.php?id=100054256340210" target="_blank" rel="noopener" aria-label="Connect with Facebook">${FACEBOOK_SVG}<span>Connect with Facebook</span></a>
        </div>
      </div>
    </div>
  </section>`;
  }

  function chatWidgetHtml(contextFullAddr) {
    const intro = contextFullAddr
      ? `Hi, I'm Ava &mdash; Scott's assistant. Do you have a specific question about <strong>${esc(contextFullAddr)}</strong>, or would you like me to connect you directly with Scott?`
      : `Hi, I'm Ava &mdash; Scott's assistant. Do you have a specific question about one of Scott's listings, or would you like me to connect you directly with Scott?`;
    return `<button class="chat-launcher" id="chatLauncher" type="button">
  <span class="avatar-mini">${AVATAR_SVG}</span>
  I'm Interested
</button>

<div class="chat-panel" id="chatPanel">
  <div class="chat-head">
    <div class="avatar">${AVATAR_SVG}</div>
    <div class="chat-head-text">
      <div class="name">Ava</div>
      <div class="role">AI Assistant &middot; Stratum</div>
    </div>
    <button class="chat-close" id="chatClose" type="button" aria-label="Close chat">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  </div>
  <div class="chat-body">
    <div class="bubble">${intro}</div>
    <div class="chat-choices" id="chatChoices">
      <button class="chat-choice-btn" id="askQuestionBtn" type="button">I have a question</button>
      <button class="chat-choice-btn" id="connectScottBtn" type="button">Connect me with Scott</button>
    </div>

    <div class="hidden-block" id="questionBlock">
      <div class="bubble">Great &mdash; type your question below and I'll draft an email to Scott for you.</div>
      <textarea class="chat-textarea" id="questionText" placeholder="e.g. Is the basement included in the listed square footage?"></textarea>
      <div style="margin-top:8px;"><a href="#" id="sendQuestionBtn" class="btn btn-primary chat-send">Send to Scott</a></div>
    </div>

    <div class="hidden-block" id="connectBlock">
      <div class="bubble">Best way to reach Scott directly:</div>
      <div class="contact-options">
        <a href="tel:${PHONE}">Call ${PHONE_DISPLAY}</a>
        <a href="sms:${PHONE}">Text Scott</a>
        <a href="mailto:${EMAIL}">Email Scott</a>
      </div>
    </div>
  </div>
</div>`;
  }

  function wireChatWidget(contextAddr) {
    const launcher = document.getElementById('chatLauncher');
    const panel = document.getElementById('chatPanel');
    const closeBtn = document.getElementById('chatClose');
    const askBtn = document.getElementById('askQuestionBtn');
    const connectBtn = document.getElementById('connectScottBtn');
    const choices = document.getElementById('chatChoices');
    const questionBlock = document.getElementById('questionBlock');
    const connectBlock = document.getElementById('connectBlock');
    const sendQuestionBtn = document.getElementById('sendQuestionBtn');
    const questionText = document.getElementById('questionText');
    if (!launcher) return;

    launcher.addEventListener('click', () => panel.classList.add('open'));
    closeBtn.addEventListener('click', () => panel.classList.remove('open'));

    askBtn.addEventListener('click', () => {
      choices.classList.add('hidden-block');
      questionBlock.classList.remove('hidden-block');
    });
    connectBtn.addEventListener('click', () => {
      choices.classList.add('hidden-block');
      connectBlock.classList.remove('hidden-block');
    });

    sendQuestionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const q = questionText.value.trim() || 'I have a question about this property.';
      const subject = contextAddr ? ('Question about ' + contextAddr) : 'Question for Scott';
      const body = q + '\n\n(sent from the Stratum listings site)';
      window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  // Homepage welcome video: click-to-play (no autoplay attempt — the
  // current site's own generator never calls play() on load for this one,
  // unlike the per-property video below, so the play overlay is the only
  // way it starts). Shrinks to a fixed top-right box 5s after starting, or
  // immediately on click-to-skip/pause.
  function initHomeVideo() {
    const wrap = document.getElementById('heroVideoWrap');
    const video = document.getElementById('welcomeVideo');
    const overlay = document.getElementById('playOverlay');
    if (!wrap || !video) return;
    let minimizeTimer = null;

    function setPaused(isPaused) { wrap.classList.toggle('is-paused', isPaused); }
    function floatMinimized() { wrap.classList.add('small', 'floating'); clearTimeout(minimizeTimer); }
    function expand() { wrap.classList.remove('small', 'floating'); }
    function playFull() {
      expand();
      overlay.classList.add('hidden');
      setPaused(false);
      video.currentTime = 0;
      const p = video.play();
      if (p && p.catch) p.catch(() => { overlay.classList.remove('hidden'); setPaused(true); });
      clearTimeout(minimizeTimer);
      minimizeTimer = setTimeout(floatMinimized, 5000);
    }

    video.addEventListener('playing', () => { overlay.classList.add('hidden'); setPaused(false); });
    video.addEventListener('pause', () => setPaused(true));
    video.addEventListener('ended', () => { floatMinimized(); setPaused(true); overlay.classList.remove('hidden'); });

    wrap.addEventListener('click', () => {
      if (wrap.classList.contains('small')) { playFull(); return; }
      if (video.paused) { playFull(); return; }
      clearTimeout(minimizeTimer);
      video.pause();
      floatMinimized();
    });
  }

  // /scott page video: same play/pause interaction as the homepage one,
  // but deliberately never shrinks into the small floating box -- stays at
  // full size both while playing and after it ends.
  function initScottVideo() {
    const wrap = document.getElementById('heroVideoWrap');
    const video = document.getElementById('welcomeVideo');
    const overlay = document.getElementById('playOverlay');
    if (!wrap || !video) return;

    function setPaused(isPaused) { wrap.classList.toggle('is-paused', isPaused); }
    function playFull() {
      overlay.classList.add('hidden');
      setPaused(false);
      video.currentTime = 0;
      const p = video.play();
      if (p && p.catch) p.catch(() => { overlay.classList.remove('hidden'); setPaused(true); });
    }

    video.addEventListener('playing', () => { overlay.classList.add('hidden'); setPaused(false); });
    video.addEventListener('pause', () => setPaused(true));
    video.addEventListener('ended', () => { setPaused(true); overlay.classList.remove('hidden'); });

    wrap.addEventListener('click', () => {
      if (video.paused) { playFull(); return; }
      video.pause();
    });
  }

  // Per-property "message from Scott" video: autoplays in full only the
  // first time a given browser visits this specific property (localStorage
  // flag keyed by property id), otherwise starts already docked small.
  function initPropertyVideo(propertyId) {
    const KEY = 'stratum_video_seen_' + propertyId;
    const overlay = document.getElementById('heroVideoOverlay');
    const video = document.getElementById('propVideo');
    if (!overlay || !video) return;
    let minimizeTimer = null;

    function setPaused(isPaused) { overlay.classList.toggle('is-paused', isPaused); }
    function floatMinimized() { overlay.classList.add('small', 'floating'); clearTimeout(minimizeTimer); }
    function expand() { overlay.classList.remove('small', 'floating'); }

    function playFull() {
      expand();
      overlay.classList.remove('needs-tap');
      setPaused(false);
      video.currentTime = 0;
      const p = video.play();
      if (p && p.catch) p.catch(() => { overlay.classList.add('needs-tap'); setPaused(true); });
      clearTimeout(minimizeTimer);
      minimizeTimer = setTimeout(() => { floatMinimized(); }, 5000);
    }

    video.addEventListener('playing', () => { overlay.classList.remove('needs-tap'); setPaused(false); });
    video.addEventListener('pause', () => setPaused(true));
    video.addEventListener('ended', () => { floatMinimized(); setPaused(true); });

    overlay.addEventListener('click', () => {
      if (overlay.classList.contains('needs-tap')) { playFull(); return; }
      if (overlay.classList.contains('small')) { playFull(); return; }
      clearTimeout(minimizeTimer);
      video.pause();
      floatMinimized();
    });

    let seen = false;
    try { seen = !!localStorage.getItem(KEY); } catch (e) {}
    if (!seen) {
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      playFull();
    } else {
      floatMinimized();
      setPaused(true);
    }
  }

  function initMatterport() {
    const card = document.getElementById('matterportCard');
    const toggle = document.getElementById('matterportToggle');
    if (!card || !toggle) return;
    const iconExpand = document.getElementById('matterportIconExpand');
    const iconCollapse = document.getElementById('matterportIconCollapse');
    const label = document.getElementById('matterportToggleLabel');
    function setMaximized(on) {
      card.classList.toggle('maximized', on);
      iconExpand.style.display = on ? 'none' : '';
      iconCollapse.style.display = on ? '' : 'none';
      label.textContent = on ? 'Minimize' : 'Full screen';
      document.body.style.overflow = on ? 'hidden' : '';
    }
    toggle.addEventListener('click', () => setMaximized(!card.classList.contains('maximized')));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && card.classList.contains('maximized')) setMaximized(false);
    });
  }

  function initGallery(photos) {
    const img = document.getElementById('pdHeroImg');
    const counter = document.getElementById('pdHeroCounter');
    const strip = document.getElementById('pdGalleryStrip');
    if (!img || photos.length < 2) return;
    let idx = 0;
    function show(i) {
      idx = (i + photos.length) % photos.length;
      img.src = photos[idx];
      if (counter) counter.textContent = (idx + 1) + ' / ' + photos.length;
      if (strip) strip.querySelectorAll('.pd-gallery-thumb').forEach((el, i2) => el.classList.toggle('active', i2 === idx));
    }
    const prevBtn = document.getElementById('pdHeroPrev');
    const nextBtn = document.getElementById('pdHeroNext');
    if (prevBtn) prevBtn.addEventListener('click', () => show(idx - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => show(idx + 1));
    if (strip) strip.querySelectorAll('.pd-gallery-thumb').forEach(btn => {
      btn.addEventListener('click', () => show(parseInt(btn.dataset.index, 10)));
    });
  }

  function renderFacts(facts) {
    return (facts || []).map(([k, v]) => `<div class="fact"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('\n');
  }

  function renderRooms(rooms) {
    if (!rooms || !rooms.length) return '';
    const chips = rooms.map(r => `<span class="room-chip">${esc(r)}</span>`).join('\n');
    return `<div class="pd-section">
      <h3>Room list</h3>
      <div class="room-list">${chips}</div>
    </div>`;
  }

  function renderOtherListings(properties, excludeId) {
    const items = properties
      .filter(p => p.id !== excludeId && p.status !== 'Sold')
      .map(p => `<a class="ol-card" href="listing.html?id=${encodeURIComponent(p.id)}">
          <div class="ol-thumb"><img src="${esc(p.hero_photo_url || '')}" alt="${esc(p.full_addr)}"></div>
          <div class="ol-body">
            <div class="ol-addr">${esc(p.addr)}</div>
            <div class="ol-price">${esc(p.price)}</div>
          </div>
        </a>`).join('');
    if (!items) return '';
    return `<div class="other-listings">
      <h3>Other listings</h3>
      <div class="ol-row">${items}</div>
    </div>`;
  }

  function renderTestimonialCard(t) {
    return `<div class="t-card">
      <div class="quote">&ldquo;${esc(t.quote)}&rdquo;</div>
      <div class="who">&mdash; ${esc(t.client_name)}</div>
    </div>`;
  }

  return {
    esc, TYPE_LABEL, PHONE, PHONE_DISPLAY, EMAIL,
    renderHeader, wireHeader, renderFooter, renderContact,
    chatWidgetHtml, wireChatWidget,
    initHomeVideo, initScottVideo, initPropertyVideo, initMatterport, initGallery,
    renderFacts, renderRooms, renderOtherListings, renderTestimonialCard,
  };
})();
