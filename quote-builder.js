const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.textContent = open ? '✕' : '☰';
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
  if (menuButton) menuButton.textContent = '☰';
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const form = document.getElementById('quoteForm');
const status = document.getElementById('quoteStatus');
const submitButton = document.getElementById('quoteSubmit');
const totalEl = document.getElementById('liveQuoteTotal');
const retainerEl = document.getElementById('liveRetainer');
const breakdownEl = document.getElementById('liveBreakdown');
const travelResultEl = document.getElementById('demoTravelResult');
const guestSlider = document.getElementById('guestSlider');
const guestNumber = document.getElementById('guestNumber');
const guestDisplay = document.getElementById('guestDisplay');
const guestAdjustmentText = document.getElementById('guestAdjustmentText');
const hoursSlider = document.getElementById('hoursSlider');
const hoursNumber = document.getElementById('hoursNumber');
const hoursDisplay = document.getElementById('hoursDisplay');
const hoursAdjustmentText = document.getElementById('hoursAdjustmentText');
const addressInput = form?.querySelector('[name="venue_address"]');
const dateInput = form?.querySelector('[name="event_date"]');

const packageBase = { basic: 45000, deluxe: 70000, premium: 95000 };
const includedBartenders = { basic: 2, deluxe: 2, premium: 3 };
const includedByPackage = {
  basic: [],
  deluxe: ['THEMED_STYLING', 'ELEVATED_GARNISH', 'LED_LIGHTING', 'SHOT_OCLOCK'],
  premium: ['THEMED_STYLING', 'ELEVATED_GARNISH', 'LED_LIGHTING', 'COCKTAIL_SERVER', 'SHOT_OCLOCK']
};
const optionPrices = {
  THEMED_STYLING: { name: 'Themed styling & décor', add: 12500 },
  ELEVATED_GARNISH: { name: 'Elevated garnish presentation', add: 10000 },
  LED_LIGHTING: { name: 'LED bar lighting', add: 5000 },
  COCKTAIL_SERVER: { name: 'Dedicated cocktail server', add: 25000 },
  SHOT_OCLOCK: { name: "Shot O'Clock experience", add: 10000 }
};

const ADDRESS_API = 'https://ozjctdmdwoutsebkjcpn.supabase.co/functions/v1/demo-address-autocomplete';
const addressSuggestionsEl = document.getElementById('demoAddressSuggestions');
let addressSuggestions = [];
let selectedAddress = null;
let travelState = {
  miles: null,
  fee: 0,
  label: 'Start typing your house number and street, then choose an address from the suggestions.'
};

function money(cents) {
  const amount = cents / 100;
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: amount % 1 ? 2 : 0 });
}

function selectedPackage() {
  return form?.querySelector('input[name="package"]:checked')?.value || 'basic';
}

function guestAdjustment(guests) {
  // Modest supply/service adjustment: $75 per additional 50 guests, prorated.
  // Staffing is priced separately so large events are not double-charged.
  return Math.round(Math.max(0, guests - 50) * 150);
}

function requiredBartenders(guests) {
  if (guests <= 50) return 1;
  if (guests <= 100) return 2;
  if (guests <= 150) return 3;
  return 3 + Math.ceil((guests - 150) / 50);
}

function serviceHoursAdjustment(hours) {
  if (hours < 5) return Math.round((hours - 5) * 5000);
  if (hours > 5) return Math.round((hours - 5) * 7500);
  return 0;
}

function serviceAreaFee(miles) {
  if (miles <= 20) return 0;
  if (miles <= 35) return 5000;
  if (miles <= 50) return 10000;
  if (miles <= 75) return 17500;
  if (miles <= 100) return 27500;
  if (miles <= 125) return 40000;
  if (miles <= 150) return 55000;
  return 55000 + Math.ceil((miles - 150) / 25) * 15000;
}

function rushAdjustment(dateValue) {
  if (!dateValue) return 0;
  const parts = dateValue.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
  const eventDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const days = Math.floor((eventDate - today) / 86400000);
  return days >= 0 && days < 7 ? 15000 : 0;
}

function syncPackageOptions() {
  const pkg = selectedPackage();
  const included = new Set(includedByPackage[pkg] || []);
  document.querySelectorAll('#demoUpgradeList [data-code]').forEach(row => {
    const code = row.dataset.code;
    const input = row.querySelector('input');
    const price = row.querySelector('[data-option-price]');
    if (!input) return;
    if (included.has(code)) {
      input.checked = true;
      input.disabled = true;
      row.style.opacity = '0.72';
      if (price) price.textContent = 'Included';
    } else {
      if (input.disabled) input.checked = false;
      input.disabled = false;
      row.style.opacity = '1';
      if (price) price.textContent = optionPrices[code] ? '+' + money(optionPrices[code].add) : '';
    }
  });
}

function getState() {
  const guests = Math.max(1, Number(guestNumber?.value || 50));
  const hours = Math.max(3, Number(hoursNumber?.value || 5));
  const pkg = selectedPackage();
  const travel = travelState;
  const included = new Set(includedByPackage[pkg] || []);
  const selected = new Set([...form.querySelectorAll('input[name="options"]:checked')].map(el => el.value));

  const items = [];
  let total = packageBase[pkg] || 0;
  items.push({ description: pkg[0].toUpperCase() + pkg.slice(1) + ' Package', amount: total });

  const guestFee = guestAdjustment(guests);
  if (guestFee) {
    total += guestFee;
    items.push({ description: 'Event Size Adjustment', amount: guestFee });
  }

  const hourFee = serviceHoursAdjustment(hours);
  if (hourFee) {
    total += hourFee;
    items.push({ description: hours < 5 ? 'Shorter Service Adjustment' : 'Additional Service Time', amount: hourFee });
  }

  const reqBartenders = requiredBartenders(guests);
  const extraBartenders = Math.max(0, reqBartenders - includedBartenders[pkg]);
  if (extraBartenders) {
    const staffing = extraBartenders * 25000;
    total += staffing;
    items.push({ description: 'Additional Bartender' + (extraBartenders > 1 ? 's' : '') + ' × ' + extraBartenders, amount: staffing });
  }

  Object.entries(optionPrices).forEach(([code, option]) => {
    if (!included.has(code) && selected.has(code)) {
      total += option.add;
      items.push({ description: option.name, amount: option.add });
    }
  });

  if (travel.miles !== null) {
    total += travel.fee;
    items.push({ description: 'Extended Service Area', amount: travel.fee });
  }

  const rushFee = rushAdjustment(dateInput?.value);
  if (rushFee) {
    total += rushFee;
    items.push({ description: 'Short-Notice Booking', amount: rushFee });
  }

  total = Math.max(0, Math.round(total));
  return {
    guests,
    hours,
    pkg,
    travel,
    requiredBartenders: reqBartenders,
    guestFee,
    hourFee,
    rushFee,
    items,
    total,
    retainer: Math.round(total * 0.30)
  };
}

function render() {
  if (!form || !totalEl || !retainerEl || !breakdownEl) return;
  const state = getState();

  if (guestDisplay) guestDisplay.textContent = state.guests.toLocaleString('en-US') + ' guests';
  if (guestAdjustmentText) {
    guestAdjustmentText.textContent = 'Event-size adjustment: ' + (state.guestFee ? '+' + money(state.guestFee) : 'Included') +
      ' · ' + state.requiredBartenders + (state.requiredBartenders === 1 ? ' bartender required' : ' bartenders required');
  }
  if (hoursDisplay) hoursDisplay.textContent = Number(state.hours).toFixed(state.hours % 1 ? 1 : 0) + ' hours';
  if (hoursAdjustmentText) {
    hoursAdjustmentText.textContent = 'Service-time adjustment: ' +
      (state.hourFee === 0 ? 'Included' : (state.hourFee > 0 ? '+' + money(state.hourFee) : '−' + money(Math.abs(state.hourFee))));
  }
  if (travelResultEl) travelResultEl.textContent = state.travel.label;

  totalEl.textContent = money(state.total);
  retainerEl.textContent = '30% retainer: ' + money(state.retainer);
  totalEl.classList.remove('demo-price-flash');
  void totalEl.offsetWidth;
  totalEl.classList.add('demo-price-flash');

  const rows = state.items.map(item => {
    const amount = item.amount === 0 ? 'Included' : (item.amount < 0 ? '−' + money(Math.abs(item.amount)) : '+' + money(item.amount));
    const displayAmount = item.description.endsWith('Package') ? money(item.amount) : amount;
    return '<div class="demo-breakdown-row"><span>' + item.description + '</span><strong>' + displayAmount + '</strong></div>';
  });
  breakdownEl.innerHTML = rows.join('');
}

function syncGuest(source) {
  let value = Math.max(1, Math.min(2000, Number(source.value) || 50));
  if (source === guestSlider) {
    guestNumber.value = String(value);
  } else if (guestSlider) {
    guestSlider.value = String(Math.max(Number(guestSlider.min), Math.min(Number(guestSlider.max), value)));
  }
  render();
}

function syncHours(source) {
  let value = Math.max(3, Math.min(12, Number(source.value) || 5));
  if (source === hoursSlider) {
    hoursNumber.value = String(value);
  } else if (hoursSlider) {
    hoursSlider.value = String(Math.max(Number(hoursSlider.min), Math.min(Number(hoursSlider.max), value)));
  }
  render();
}

guestSlider?.addEventListener('input', () => syncGuest(guestSlider));
guestNumber?.addEventListener('input', () => syncGuest(guestNumber));
hoursSlider?.addEventListener('input', () => syncHours(hoursSlider));
hoursNumber?.addEventListener('input', () => syncHours(hoursNumber));

function closeAddressSuggestions() {
  if (!addressSuggestionsEl || !addressInput) return;
  addressSuggestionsEl.classList.remove('open');
  addressSuggestionsEl.innerHTML = '';
  addressInput.setAttribute('aria-expanded', 'false');
}

function renderAddressSuggestions(items, message = '') {
  if (!addressSuggestionsEl || !addressInput) return;
  addressSuggestionsEl.innerHTML = '';
  if (message) {
    const row = document.createElement('div');
    row.className = 'demo-address-message';
    row.textContent = message;
    addressSuggestionsEl.appendChild(row);
    addressSuggestionsEl.classList.add('open');
    addressInput.setAttribute('aria-expanded', 'true');
    return;
  }
  if (!items.length) {
    closeAddressSuggestions();
    return;
  }
  items.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'demo-address-suggestion';
    button.setAttribute('role', 'option');
    button.dataset.index = String(index);
    const strong = document.createElement('strong');
    strong.textContent = item.label;
    const small = document.createElement('small');
    small.textContent = 'Select this address';
    button.append(strong, small);
    button.addEventListener('click', () => chooseAddress(index));
    addressSuggestionsEl.appendChild(button);
  });
  addressSuggestionsEl.classList.add('open');
  addressInput.setAttribute('aria-expanded', 'true');
}

async function chooseAddress(index) {
  const item = addressSuggestions[index];
  if (!item || !addressInput) return;
  selectedAddress = item;
  addressInput.value = item.label;
  closeAddressSuggestions();
  travelState = { miles: null, fee: 0, label: 'Calculating driving distance…' };
  render();

  try {
    const routeUrl = new URL(ADDRESS_API);
    routeUrl.searchParams.set('mode', 'route');
    routeUrl.searchParams.set('lat', String(item.lat));
    routeUrl.searchParams.set('lon', String(item.lon));
    const response = await fetch(routeUrl.toString(), { headers: { 'Accept': 'application/json' } });
    if (!response.ok) throw new Error('route lookup failed');
    const data = await response.json();
    const miles = Number(data.miles);
    if (!Number.isFinite(miles)) throw new Error('invalid route');
    travelState = {
      miles,
      fee: serviceAreaFee(miles),
      label: 'Driving distance from Bellflower: ' + miles.toFixed(1) + ' miles · ' +
        (serviceAreaFee(miles) ? money(serviceAreaFee(miles)) + ' service-area fee' : 'local travel included')
    };
  } catch {
    travelState = {
      miles: null,
      fee: 0,
      label: 'Address selected. The demo could not calculate routing right now, so no travel fee is being added.'
    };
  }
  render();
}

let addressTimer;
let addressRequestId = 0;
addressInput?.addEventListener('input', () => {
  clearTimeout(addressTimer);
  selectedAddress = null;
  travelState = {
    miles: null,
    fee: 0,
    label: 'Choose an address from the suggestions to calculate travel automatically.'
  };
  render();

  const q = addressInput.value.trim();
  if (q.length < 4) {
    addressSuggestions = [];
    closeAddressSuggestions();
    return;
  }

  const requestId = ++addressRequestId;
  renderAddressSuggestions([], 'Searching addresses…');
  addressTimer = setTimeout(async () => {
    try {
      const url = new URL(ADDRESS_API);
      url.searchParams.set('q', q);
      const response = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('address lookup failed');
      const data = await response.json();
      if (requestId !== addressRequestId) return;
      addressSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      if (addressSuggestions.length) renderAddressSuggestions(addressSuggestions);
      else renderAddressSuggestions([], 'No matching street addresses found. Keep typing a more complete address.');
    } catch {
      if (requestId !== addressRequestId) return;
      addressSuggestions = [];
      renderAddressSuggestions([], 'Address suggestions are temporarily unavailable. Try again in a moment.');
    }
  }, 320);
});

addressInput?.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeAddressSuggestions();
});

document.addEventListener('click', event => {
  if (!addressSuggestionsEl || !addressInput) return;
  const target = event.target;
  if (target instanceof Node && !addressSuggestionsEl.contains(target) && target !== addressInput) closeAddressSuggestions();
});
dateInput?.addEventListener('input', render);

form?.querySelectorAll('input[name="package"]').forEach(input => {
  input.addEventListener('change', () => {
    syncPackageOptions();
    render();
  });
});
form?.querySelectorAll('input[name="options"]').forEach(input => input.addEventListener('change', render));

form?.addEventListener('submit', event => {
  event.preventDefault();
  const state = getState();
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  payload.options = data.getAll('options');
  payload.guest_count = state.guests;
  payload.service_hours = state.hours;
  payload.language = document.documentElement.lang.toLowerCase().startsWith('es') ? 'es' : 'en';

  submitButton.disabled = true;
  submitButton.textContent = 'Opening Demo Quote…';
  if (status) status.textContent = 'Saving this private demo configuration locally in your browser…';

  const demo = {
    demo: true,
    number: 'DEMO-' + String(Math.floor(Math.random() * 900) + 100),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 72 * 3600000).toISOString(),
    payload,
    items: state.items,
    total_cents: state.total,
    retainer_cents: state.retainer,
    balance_cents: state.total - state.retainer,
    simulated_driving_miles: state.travel.miles,
    required_bartenders: state.requiredBartenders
  };

  sessionStorage.setItem('crafte_demo_quote', JSON.stringify(demo));
  window.location.href = 'demo-quote.html' + (payload.language === 'es' ? '?lang=es' : '');
});

if (dateInput) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  dateInput.min = yyyy + '-' + mm + '-' + dd;
}

syncPackageOptions();
render();

window.addEventListener('crafte-language-change', () => {
  render();
});
