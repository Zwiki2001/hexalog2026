/* ═══════════════════════════════════════
   HexaLog — Live Rate Calculator Engine
═══════════════════════════════════════ */

const RATES = {
  BASE: {
    BE_BE: 28,  NL_NL: 28,  LU_LU: 30,  FR_FR: 32,
    BE_NL: 38,  NL_BE: 38,
    BE_LU: 35,  LU_BE: 35,
    BE_FR: 52,  FR_BE: 52,
    NL_LU: 48,  LU_NL: 48,
    NL_FR: 58,  FR_NL: 58,
    LU_FR: 44,  FR_LU: 44,
  },
  WEIGHT_BASE_KG: 500,
  WEIGHT_SURCHARGE_PER_100KG: 3.5,
  HEIGHT_SURCHARGE_THRESHOLD: 150,
  HEIGHT_SURCHARGE: 12,
  AREA_FACTOR: {
    euro: 1.0,
    block: 1.15,
    half: 0.65,
    quarter: 0.45,
    industry: 1.2,
    custom: 1.0,
  },
  DELIVERY: {
    BE_BE: "same-day", NL_NL: "same-day", LU_LU: "same-day", FR_FR: "same-day",
    BE_NL: "24h",  NL_BE: "24h",
    BE_LU: "24h",  LU_BE: "24h",
    LU_FR: "24h",  FR_LU: "24h",
    BE_FR: "24-48h", FR_BE: "24-48h",
    NL_LU: "24-48h", LU_NL: "24-48h",
    NL_FR: "24-48h", FR_NL: "24-48h",
  },
  EXTRAS: {
    taillift: 25,
    insurance: 15,
    express: 40,
    weekend: 35,
    notify: 5,
    ftl: 0,
  }
};

const COUNTRY_NAMES = { BE: "🇧🇪 Belgium", NL: "🇳🇱 Netherlands", LU: "🇱🇺 Luxembourg", FR: "🇫🇷 France" };
const COUNTRY_SHORT = { BE: "Belgium", NL: "Netherlands", LU: "Luxembourg", FR: "France" };

let selectedPallet = null;
let calcDebounce = null;

function initCalculator() {
  /* ── Pallet card selection ── */
  document.querySelectorAll('.pallet-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.pallet-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPallet = {
        type: card.dataset.type,
        w: parseFloat(card.dataset.w) || 0,
        d: parseFloat(card.dataset.d) || 0,
        maxH: parseFloat(card.dataset.maxh) || 300,
        maxKg: parseFloat(card.dataset.maxkg) || 3000,
        label: card.querySelector('.pallet-name').textContent,
      };
      const customDims = document.getElementById('customDims');
      customDims.style.display = card.dataset.type === 'custom' ? 'block' : 'none';
      if (card.dataset.type === 'custom') { selectedPallet.w = 0; selectedPallet.d = 0; }
      updateHints();
      triggerLiveCalc();
    });
  });

  /* ── All live-trigger inputs ── */
  ['fromCountry','toCountry','palletHeight','palletWeight','palletQty',
   'customW','customD','serviceType',
   'optTailLift','optInsurance','optExpress','optWeekend','optNotify'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      if (id === 'customW' && selectedPallet) selectedPallet.w = parseFloat(el.value) || 0;
      if (id === 'customD' && selectedPallet) selectedPallet.d = parseFloat(el.value) || 0;
      updateHints();
      triggerLiveCalc();
    });
  });

  /* ── Qty +/- buttons ── */
  document.getElementById('qtyMinus').addEventListener('click', () => {
    const inp = document.getElementById('palletQty');
    if (parseInt(inp.value) > 1) { inp.value = parseInt(inp.value) - 1; triggerLiveCalc(); }
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    const inp = document.getElementById('palletQty');
    if (parseInt(inp.value) < 99) { inp.value = parseInt(inp.value) + 1; triggerLiveCalc(); }
  });

  /* ── Service type toggle (LTL/FTL) ── */
  document.querySelectorAll('.service-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.service-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('serviceType').value = btn.dataset.service;
      triggerLiveCalc();
    });
  });

  /* ── Book / email buttons ── */
  document.getElementById('bookBtn').addEventListener('click', () => {
    const modal = document.getElementById('bookModal');
    const from = document.getElementById('fromCountry').value;
    const to = document.getElementById('toCountry').value;
    const qty = document.getElementById('palletQty').value;
    const price = document.getElementById('priceDisplay').textContent;
    document.getElementById('modalSummary').textContent =
      `${qty} pallet(s) from ${COUNTRY_SHORT[from] || from} to ${COUNTRY_SHORT[to] || to} — ${price}`;
    modal.classList.add('open');
  });
  document.getElementById('modalClose').addEventListener('click', () =>
    document.getElementById('bookModal').classList.remove('open'));
  document.getElementById('bookModal').addEventListener('click', e => {
    if (e.target === document.getElementById('bookModal'))
      document.getElementById('bookModal').classList.remove('open');
  });
  document.getElementById('quoteEmailBtn').addEventListener('click', () => {
    const from = document.getElementById('fromCountry').value;
    const to = document.getElementById('toCountry').value;
    const price = document.getElementById('priceDisplay').textContent;
    const qty = document.getElementById('palletQty').value;
    window.location.href = `mailto:info@hexalog.eu?subject=Quote Request - HexaLog&body=Hello HexaLog,%0A%0AI would like a quote for ${qty} pallet(s) from ${COUNTRY_SHORT[from]||from} to ${COUNTRY_SHORT[to]||to}.%0ACalculated price: ${price}%0A%0APlease contact me.`;
  });
}

function triggerLiveCalc() {
  clearTimeout(calcDebounce);
  calcDebounce = setTimeout(calculate, 80);
}

function updateHints() {
  if (!selectedPallet) return;
  const h = parseFloat(document.getElementById('palletHeight').value) || 0;
  const w = parseFloat(document.getElementById('palletWeight').value) || 0;
  document.getElementById('heightHint').textContent = h > selectedPallet.maxH ? `Max ${selectedPallet.maxH} cm` : '';
  document.getElementById('weightHint').textContent = w > selectedPallet.maxKg ? `Max ${selectedPallet.maxKg} kg` : '';
}

function calculate() {
  const from      = document.getElementById('fromCountry').value;
  const to        = document.getElementById('toCountry').value;
  const height    = parseFloat(document.getElementById('palletHeight').value) || 0;
  const weight    = parseFloat(document.getElementById('palletWeight').value) || 0;
  const qty       = parseInt(document.getElementById('palletQty').value) || 1;
  const service   = document.getElementById('serviceType')?.value || 'ltl';

  const resultData  = document.getElementById('resultData');
  const resultIdle  = document.getElementById('resultIdle');
  const resultError = document.getElementById('resultError');

  const showIdle  = () => { resultIdle.style.display='flex'; resultData.style.display='none'; resultError.style.display='none'; };
  const showError = (msg) => { resultIdle.style.display='none'; resultData.style.display='none'; resultError.style.display='flex'; document.getElementById('errorMsg').textContent=msg; };
  const showData  = () => { resultIdle.style.display='none'; resultData.style.display='flex'; resultError.style.display='none'; };

  /* Show idle until enough info is entered */
  if (!from || !to || !selectedPallet || height <= 0 || weight <= 0) {
    showIdle();
    /* Update progress indicator */
    updateProgress(from, to, selectedPallet, height, weight);
    return;
  }

  if (selectedPallet.type === 'custom' && (selectedPallet.w <= 0 || selectedPallet.d <= 0)) {
    showError('Please enter custom pallet dimensions (width & depth).');
    return;
  }

  const routeKey = `${from}_${to}`;
  const baseRate = RATES.BASE[routeKey];
  if (!baseRate) { showError('Route not available. Contact us for a custom quote.'); return; }

  /* ── Price calculation ── */
  const areaFactor = RATES.AREA_FACTOR[selectedPallet.type] || 1.0;
  let pricePerPallet = baseRate * areaFactor;

  /* FTL gets a volume discount */
  let serviceSurcharge = 0;
  let serviceLabel = 'LTL';
  if (service === 'ftl') {
    pricePerPallet *= 0.82;
    serviceLabel = 'FTL (−18% discount)';
  }

  const weightSurcharge = Math.max(0, Math.floor((weight - RATES.WEIGHT_BASE_KG) / 100)) * RATES.WEIGHT_SURCHARGE_PER_100KG;
  pricePerPallet += weightSurcharge;
  const heightSurcharge = height > RATES.HEIGHT_SURCHARGE_THRESHOLD ? RATES.HEIGHT_SURCHARGE : 0;
  pricePerPallet += heightSurcharge;

  const optTailLift  = document.getElementById('optTailLift').checked  ? RATES.EXTRAS.taillift  : 0;
  const optInsurance = document.getElementById('optInsurance').checked ? RATES.EXTRAS.insurance : 0;
  const optExpress   = document.getElementById('optExpress').checked   ? RATES.EXTRAS.express   : 0;
  const optWeekend   = document.getElementById('optWeekend').checked   ? RATES.EXTRAS.weekend   : 0;
  const optNotify    = document.getElementById('optNotify').checked    ? RATES.EXTRAS.notify    : 0;

  const extraPerPallet   = optTailLift + optInsurance + optExpress + optWeekend;
  const extraPerShipment = optNotify;
  const totalPerPallet   = pricePerPallet + extraPerPallet;
  const total            = (totalPerPallet * qty) + extraPerShipment;

  showData();

  /* Route label */
  document.getElementById('resultRoute').textContent =
    `${COUNTRY_SHORT[from]} → ${COUNTRY_SHORT[to]}`;

  /* Animate price */
  animatePrice(total);
  document.getElementById('pricePerPallet').textContent =
    qty > 1 ? `€${totalPerPallet.toFixed(2)} / pallet × ${qty}` : `€${totalPerPallet.toFixed(2)} / pallet`;

  /* Breakdown */
  const bd = document.getElementById('priceBreakdown');
  let html = '';
  html += row(`Base rate (${selectedPallet.label} · ${serviceLabel})`, `€${(baseRate * areaFactor * (service==='ftl'?0.82:1)).toFixed(2)}`);
  if (weightSurcharge > 0) html += row(`Weight surcharge (>${RATES.WEIGHT_BASE_KG} kg)`, `+€${weightSurcharge.toFixed(2)}`);
  if (heightSurcharge > 0) html += row(`Height surcharge (>${RATES.HEIGHT_SURCHARGE_THRESHOLD} cm)`, `+€${heightSurcharge.toFixed(2)}`);
  if (optExpress)   html += row('Express 24h',        `+€${optExpress.toFixed(2)}`);
  if (optWeekend)   html += row('Weekend delivery',   `+€${optWeekend.toFixed(2)}`);
  if (optTailLift)  html += row('Tail lift',           `+€${optTailLift.toFixed(2)}`);
  if (optInsurance) html += row('Insurance',           `+€${optInsurance.toFixed(2)}`);
  if (optNotify)    html += row('SMS notification',    `+€${optNotify.toFixed(2)}/shipment`);
  if (qty > 1 || optNotify > 0) {
    html += `<div class="breakdown-line total"><span>Total (${qty} pallet${qty>1?'s':''})</span><span>€${total.toFixed(2)}</span></div>`;
  }
  bd.innerHTML = html;

  /* Delivery time */
  let delivStr = RATES.DELIVERY[routeKey] || '24-48h';
  let delivIcon = '🕐', delivText = `Estimated delivery: ${delivStr}`;
  if (optExpress)   { delivText = 'Express: within 24h'; delivIcon = '⚡'; }
  else if (optWeekend) { delivText += ' — Weekend delivery included'; delivIcon = '📅'; }
  else if (delivStr === 'same-day') { delivText = 'Same-day delivery possible'; delivIcon = '✅'; }
  document.getElementById('deliveryTime').innerHTML = `<span>${delivIcon}</span><span>${delivText}</span>`;

  /* VAT note */
  document.getElementById('vatNote').textContent = `All prices excl. VAT · Min. charge applies`;
}

function row(label, val) {
  return `<div class="breakdown-line"><span>${label}</span><span>${val}</span></div>`;
}

let priceAnim = null;
function animatePrice(target) {
  const el = document.getElementById('priceDisplay');
  clearInterval(priceAnim);
  const start = parseFloat(el.dataset.current || '0');
  el.dataset.current = target;
  const diff = target - start;
  const steps = 20;
  let i = 0;
  priceAnim = setInterval(() => {
    i++;
    const val = start + diff * (i / steps);
    el.textContent = `€${val.toFixed(2)}`;
    if (i >= steps) { el.textContent = `€${target.toFixed(2)}`; clearInterval(priceAnim); }
  }, 16);
}

function updateProgress(from, to, pallet, height, weight) {
  const steps = [!!from, !!to, !!pallet, height > 0, weight > 0];
  const done = steps.filter(Boolean).length;
  const pct = Math.round((done / steps.length) * 100);
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('progressLabel');
  if (bar) bar.style.width = pct + '%';
  if (label) {
    const missing = [];
    if (!from || !to) missing.push('select route');
    if (!pallet) missing.push('choose pallet type');
    if (height <= 0) missing.push('enter height');
    if (weight <= 0) missing.push('enter weight');
    label.textContent = missing.length ? `Next: ${missing[0]}` : 'Ready to calculate!';
  }
}

document.addEventListener('DOMContentLoaded', initCalculator);
