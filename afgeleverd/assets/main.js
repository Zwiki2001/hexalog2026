// =============================================
//  NAVBAR SCROLL
// =============================================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// =============================================
//  HAMBURGER
// =============================================
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(l => l.addEventListener('click', () => mobileMenu.classList.remove('open')));

// =============================================
//  SMOOTH SCROLL
// =============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    }
  });
});

// =============================================
//  SCROLL-TRIGGERED SECTION ANIMATIONS
// =============================================
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const idx = Array.from(el.parentElement.children).indexOf(el);
      setTimeout(() => el.classList.add('visible'), idx * 90);
      observer.unobserve(el);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('[data-aos], .service-card, .why-item, .coverage-region, .rate-card, .testimonial-card').forEach(el => observer.observe(el));

// =============================================
//  COUNTER ANIMATION
// =============================================
function animateCounter(el, target, suffix) {
  let start = null;
  const step = ts => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / 1800, 1);
    el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-num').forEach(num => {
        const m = num.textContent.match(/^(\d+)(.*)$/);
        if (m) animateCounter(num, parseInt(m[1]), m[2]);
      });
    }
  });
}, { threshold: 0.5 }).observe(document.querySelector('.hero-stats'));

// =============================================
//  CONTACT FORM
// =============================================
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    form.style.display = 'none';
    formSuccess.classList.add('visible');
  });
}

// =============================================
//  MOUSE PARALLAX
// =============================================
const heroContent = document.getElementById('heroContent');
let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;

document.addEventListener('mousemove', e => {
  targetMouseX = (e.clientX - window.innerWidth  / 2) / window.innerWidth;
  targetMouseY = (e.clientY - window.innerHeight / 2) / window.innerHeight;
});

let scrollY = 0;
window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

function parallaxLoop() {
  mouseX += (targetMouseX - mouseX) * 0.05;
  mouseY += (targetMouseY - mouseY) * 0.05;
  if (heroContent) {
    heroContent.style.transform =
      `translate(${mouseX * -10}px, ${mouseY * -6 + scrollY * 0.12}px)`;
  }
  requestAnimationFrame(parallaxLoop);
}
requestAnimationFrame(parallaxLoop);

// =============================================
//  SCROLL ENTRANCE ANIMATION FOR HERO ELEMENTS
// =============================================
window.addEventListener('load', () => {
  const items = document.querySelectorAll('.hero-eyebrow, .hero-title, .hero-subtitle, .hero-actions, .hero-stats');
  items.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.8s ease ${i * 0.12}s, transform 0.8s ease ${i * 0.12}s`;
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 100 + i * 120);
  });
});

// =============================================
//  ANIMATED SCROLL TRUCK
// =============================================
(function () {
  const wheels      = document.querySelectorAll('.wheel');
  const truck       = document.getElementById('scrollTruck');
  let   lastScroll  = 0;
  let   wheelAngle  = 0;
  let   speed       = 1;        // base rotations/sec
  let   targetSpeed = 1;

  window.addEventListener('scroll', () => {
    const delta = Math.abs(window.scrollY - lastScroll);
    lastScroll  = window.scrollY;
    // More scroll delta = faster wheels, clamp between 1 and 10
    targetSpeed = Math.min(10, 1 + delta * 0.3);

    // Hide truck once user scrolls past the hero
    if (truck) {
      truck.style.opacity = window.scrollY > window.innerHeight * 0.6 ? '0' : '1';
    }
  }, { passive: true });

  let lastTs = 0;
  function animateTruck(ts) {
    const dt    = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs      = ts;

    // Ease speed back to 1 when not scrolling
    speed      += (targetSpeed - speed) * 0.08;
    targetSpeed += (1 - targetSpeed)    * 0.05;

    wheelAngle += speed * 360 * dt;

    wheels.forEach(w => {
      w.style.animation = 'none';
      w.style.transform = `rotate(${wheelAngle}deg)`;
    });

    requestAnimationFrame(animateTruck);
  }
  requestAnimationFrame(animateTruck);
})();

// =============================================
//  PALLET RATE CALCULATOR
// =============================================
const ZONE_MAP = {
  NL: { BE:1, DE:1, FR:2, LU:1, GB:2, ES:3, PT:3, IT:3, SE:2, DK:2, NO:3, FI:3, PL:2, CZ:2, AT:2, CH:2, HU:3, RO:4, GR:4 },
  BE: { NL:1, DE:1, FR:1, LU:1, GB:2, ES:2, PT:3, IT:2, SE:3, DK:2, NO:3, FI:4, PL:3, CZ:2, AT:2, CH:1, HU:3, RO:4, GR:4 },
  DE: { NL:1, BE:1, FR:1, LU:1, AT:1, CH:1, CZ:1, PL:1, DK:1, SE:2, NO:2, FI:3, IT:2, ES:3, PT:3, HU:2, RO:3, GR:4 },
  FR: { NL:2, BE:1, DE:1, LU:1, ES:1, PT:2, IT:1, CH:1, AT:2, GB:2, SE:3, DK:2, NO:3, FI:4, PL:3, CZ:3, HU:3, RO:4, GR:4 },
  ES: { FR:1, PT:1, NL:3, BE:2, DE:3, IT:2, CH:3, AT:3, PL:4, CZ:4, SE:4, DK:3, NO:4, FI:4, HU:4, RO:4, GR:4 },
  IT: { FR:1, AT:1, CH:1, DE:2, BE:2, NL:3, ES:2, PT:3, SE:3, DK:3, NO:4, FI:4, PL:3, CZ:2, HU:2, RO:3, GR:2 },
  PL: { DE:1, CZ:1, HU:2, AT:2, BE:3, NL:2, FR:3, SE:2, DK:2, NO:3, FI:2, RO:2, IT:3, ES:4, PT:4, CH:3, GR:3 },
  SE: { NO:1, DK:1, FI:1, DE:2, NL:2, BE:2, PL:2, FR:3, CZ:2, AT:3, IT:3, CH:3, ES:4, PT:4, HU:3, RO:4, GR:4 },
};
const ZONE_BASE = { 1:85, 2:145, 3:220, 4:310 };
const WEIGHT_SURCHARGE_PER_KG = 0.18;
const SIZE_MULTIPLIER = { euro:1.0, industrial:1.25, half:0.65, custom:null };
const EURO_AREA = 120 * 80;
const COUNTRY_NAMES = {
  NL:'Netherlands', BE:'Belgium', DE:'Germany', FR:'France', ES:'Spain',
  IT:'Italy', PL:'Poland', SE:'Sweden', PT:'Portugal', AT:'Austria',
  CH:'Switzerland', CZ:'Czech Republic', HU:'Hungary', RO:'Romania',
  GR:'Greece', DK:'Denmark', NO:'Norway', FI:'Finland', LU:'Luxembourg', GB:'United Kingdom'
};

function getZone(o, d) {
  if (o === d) return 0;
  return (ZONE_MAP[o] && ZONE_MAP[o][d]) ? ZONE_MAP[o][d] : 3;
}
function fmt(n) { return '€\u202F' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

const weightInput  = document.getElementById('calc-weight');
const weightSlider = document.getElementById('weightSlider');
const sliderVal    = document.getElementById('sliderVal');
if (weightSlider) {
  weightSlider.addEventListener('input', () => {
    weightInput.value = weightSlider.value;
    sliderVal.textContent = Number(weightSlider.value).toLocaleString();
  });
  weightInput.addEventListener('input', () => {
    const v = Math.min(2000, Math.max(1, parseInt(weightInput.value) || 1));
    weightSlider.value = v;
    sliderVal.textContent = v.toLocaleString();
  });
}

document.querySelectorAll('input[name="palletType"]').forEach(r => {
  r.addEventListener('change', () => {
    document.getElementById('customDims').classList.toggle('visible', r.value === 'custom' && r.checked);
  });
});

document.getElementById('calcBtn').addEventListener('click', () => {
  const origin = document.getElementById('calc-origin').value;
  const dest   = document.getElementById('calc-dest').value;
  const pType  = document.querySelector('input[name="palletType"]:checked').value;
  const weight = parseFloat(weightInput.value) || 400;
  const qty    = Math.max(1, parseInt(document.getElementById('calc-qty').value) || 1);

  if (origin === dest) { alert('Origin and destination cannot be the same.'); return; }

  let sizeMult = SIZE_MULTIPLIER[pType];
  let dimLabel = { euro:'120 × 80 cm', industrial:'120 × 100 cm', half:'80 × 60 cm' }[pType] || '';
  if (pType === 'custom') {
    const L = parseFloat(document.getElementById('calc-length').value) || 120;
    const W = parseFloat(document.getElementById('calc-width').value) || 80;
    dimLabel = `${L} × ${W} cm`;
    sizeMult = Math.max(0.5, (L * W) / EURO_AREA);
  }

  const zone              = getZone(origin, dest);
  const base              = ZONE_BASE[zone] * sizeMult;
  const excess            = Math.max(0, weight - 300);
  const weightSurch       = excess * WEIGHT_SURCHARGE_PER_KG;
  const sub               = base + weightSurch;
  const fuel              = sub * 0.085;
  const ratePerPallet     = sub + fuel;
  const total             = ratePerPallet * qty;
  const palletLabels      = { euro:'Euro Pallet', industrial:'Industrial Pallet', half:'Half Pallet', custom:'Custom Pallet' };

  document.getElementById('resultRoute').innerHTML =
    `<strong>${COUNTRY_NAMES[origin]||origin}</strong> &rarr; <strong>${COUNTRY_NAMES[dest]||dest}</strong><br>
     <span style="font-size:0.8rem;color:var(--text);font-family:Inter,sans-serif;font-weight:400">
       ${palletLabels[pType]} &bull; ${dimLabel} &bull; ${weight.toLocaleString()} kg/pallet &bull; ${qty} pallet${qty>1?'s':''}
     </span>`;

  document.getElementById('resultBreakdown').innerHTML = `
    <div class="breakdown-row"><span class="label">Base rate / pallet (Zone ${zone})</span><span class="value">${fmt(base)}</span></div>
    <div class="breakdown-row"><span class="label">Weight surcharge (${excess>0?excess.toLocaleString()+' kg excess':'none'})</span><span class="value">${fmt(weightSurch)}</span></div>
    <div class="breakdown-row"><span class="label">Fuel surcharge (8.5%)</span><span class="value">${fmt(fuel)}</span></div>
    <div class="breakdown-row"><span class="label">Rate per pallet</span><span class="value gold">${fmt(ratePerPallet)}</span></div>
    <div class="breakdown-row"><span class="label">Number of pallets</span><span class="value">${qty}</span></div>`;

  document.getElementById('resultTotal').innerHTML = `
    <div><div class="total-label">Total Estimate</div><div class="total-per">${fmt(ratePerPallet)} × ${qty}</div></div>
    <div class="total-value">${fmt(total)}</div>`;

  document.getElementById('resultPlaceholder').style.display = 'none';
  document.getElementById('resultContent').style.display = 'flex';
});
