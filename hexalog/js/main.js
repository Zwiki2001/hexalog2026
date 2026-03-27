/* ═══════════════════════════════════════
   HexaLog — Main JS (Canvas + UI)
═══════════════════════════════════════ */

/* ── HEXAGONAL CANVAS BACKGROUND ── */
(function () {
  const canvas = document.getElementById('hexCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, hexes = [];
  const HEX_SIZE = 40;
  const HEX_COLS = [];

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    buildGrid();
  }

  function hexPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    return pts;
  }

  function buildGrid() {
    hexes = [];
    const rw = HEX_SIZE * Math.sqrt(3);
    const rh = HEX_SIZE * 1.5;
    const cols = Math.ceil(W / rw) + 2;
    const rows = Math.ceil(H / rh) + 2;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * rw + (row % 2 === 0 ? 0 : rw / 2);
        const y = row * rh;
        hexes.push({
          x, y,
          alpha: Math.random() * 0.12 + 0.02,
          speed: Math.random() * 0.3 + 0.1,
          phase: Math.random() * Math.PI * 2,
          hue: Math.random() > 0.5 ? 220 : 38,
        });
      }
    }
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.008;
    hexes.forEach(hex => {
      const alpha = hex.alpha * (0.6 + 0.4 * Math.sin(t * hex.speed + hex.phase));
      const pts = hexPoints(hex.x, hex.y, HEX_SIZE - 2);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.strokeStyle = `hsla(${hex.hue}, 80%, 70%, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (alpha > 0.08) {
        const gradient = ctx.createRadialGradient(hex.x, hex.y, 0, hex.x, hex.y, HEX_SIZE);
        gradient.addColorStop(0, `hsla(${hex.hue}, 80%, 60%, ${alpha * 0.4})`);
        gradient.addColorStop(1, `hsla(${hex.hue}, 80%, 60%, 0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

/* ── NAVBAR SCROLL ── */
(function () {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  });
})();

/* ── HAMBURGER ── */
(function () {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    menu.classList.toggle('open');
  });
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      btn.classList.remove('open');
      menu.classList.remove('open');
    });
  });
})();

/* ── COUNTER ANIMATION ── */
(function () {
  let done = false;
  function animateCounters() {
    if (done) return;
    done = true;
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count);
      let current = 0;
      const duration = 1800;
      const steps = 60;
      const increment = target / steps;
      const interval = duration / steps;
      const timer = setInterval(() => {
        current = Math.min(current + increment, target);
        el.textContent = Math.round(current).toLocaleString();
        if (current >= target) clearInterval(timer);
      }, interval);
    });
  }

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) animateCounters();
    }, { threshold: 0.3 });
    obs.observe(heroStats);
  } else {
    setTimeout(animateCounters, 500);
  }
})();

/* ── AOS (Animate On Scroll) ── */
(function () {
  const elements = document.querySelectorAll('[data-aos]');
  const delays = {};
  elements.forEach(el => {
    const delay = parseFloat(el.dataset.aosDelay || 0);
    delays.set ? null : null;
  });

  function checkAOS() {
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.88) {
        const delay = parseFloat(el.dataset.aosDelay || 0);
        setTimeout(() => el.classList.add('aos-animate'), delay * 1000);
      }
    });
  }

  window.addEventListener('scroll', checkAOS, { passive: true });
  window.addEventListener('resize', checkAOS, { passive: true });
  setTimeout(checkAOS, 100);
})();

/* ── HEX MAP COUNTRY PULSE ── */
(function () {
  const countries = ['mapBE', 'mapNL', 'mapLU', 'mapFR'];
  let idx = 0;
  function pulseNext() {
    countries.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.transform = 'scale(1)';
    });
    const el = document.getElementById(countries[idx]);
    if (el) {
      el.style.transform = 'scale(1.06)';
      el.style.transition = 'transform 0.4s ease';
    }
    idx = (idx + 1) % countries.length;
  }
  setInterval(pulseNext, 1400);
})();

/* ── SMOOTH SCROLL ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ── CONTACT FORM ── */
(function () {
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.querySelector('span').textContent = '...';
    setTimeout(() => {
      success.style.display = 'flex';
      form.reset();
      btn.disabled = false;
      btn.querySelector('span').textContent = document.querySelector('[data-i18n="contact.send"]')?.textContent || 'Send Message';
    }, 900);
  });
})();

/* ── TICKER PAUSE ON HOVER ── */
(function () {
  const ticker = document.querySelector('.ticker');
  if (!ticker) return;
  ticker.addEventListener('mouseenter', () => ticker.style.animationPlayState = 'paused');
  ticker.addEventListener('mouseleave', () => ticker.style.animationPlayState = 'running');
})();

/* ── ACTIVE NAV LINK ON SCROLL ── */
(function () {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    navLinks.forEach(a => {
      a.classList.toggle('active-link', a.getAttribute('href') === '#' + current);
    });
  }, { passive: true });
})();
