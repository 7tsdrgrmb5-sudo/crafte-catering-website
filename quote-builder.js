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

const packageBase = { basic: 45000, deluxe: 70000, premium: 95000 };
const includedBartenders = { basic: 2, deluxe: 2, premium: 3 };
const includedByPackage = {
  basic: [],
  deluxe: ['THEMED_STYLING', 'ELEVATED_GARNISH', 'COCKTAIL_SIGNAGE', 'LED_LIGHTING'],
  premium: ['THEMED_STYLING', 'ELEVATED_GARNISH', 'COCKTAIL_SIGNAGE', 'LED_LIGHTING', 'COCKTAIL_SERVER', 'SHOT_OCLOCK']
};
const optionPrices = {
  THEMED_STYLING: { name: 'Themed styling & décor', add: 12500, credit: 7500 },
  ELEVATED_GARNISH: { name: 'Elevated garnish package', add: 10000, credit: 5000 },
  COCKTAIL_SIGNAGE: { name: 'Custom cocktail signage', add: 5000, credit: 2500 },
  LED_LIGHTING: { name: 'LED bar lighting', add: 5000, credit: 2500 },
  COCKTAIL_SERVER: { name: 'Dedicated cocktail server', add: 25000, credit: 20000 },
  SHOT_OCLOCK: { name: "Shot O'Clock experience", add: 10000, credit: 5000 },
  MOCKTAIL_STATION: { name: 'Dedicated mocktail station', add: 10000, credit: 0 }
};

function syncPackageOptions(pkg) {
  const included = new Set(includedByPackage[pkg] || []);
  document.querySelectorAll('input[name="options"]').forEach(input => {
    input.checked = included.has(input.value);
    const price = document.querySelector('[data-option-price="' + input.value + '"]');
    if (price) {
      if (!price.dataset.original) {
        price.dataset.original = optionPrices[input.value] ? '+$' + (optionPrices[input.value].add / 100) : '';
      }
      price.textContent = included.has(input.value) ? 'Included' : price.dataset.original;
    }
  });
}
document.querySelectorAll('input[name="package"]').forEach(input => {
  input.addEventListener('change', () => syncPackageOptions(input.value));
});

function guestAdjustment(guests) {
  if (guests <= 50) return 0;
  if (guests <= 100) return 15000;
  if (guests <= 150) return 30000;
  if (guests <= 200) return 45000;
  return 45000 + Math.ceil((guests - 200) / 50) * 15000;
}
function requiredBartenders(guests) {
  if (guests <= 50) return 1;
  if (guests <= 100) return 2;
  if (guests <= 150) return 3;
  return 3 + Math.ceil((guests - 150) / 50);
}
function demoServiceAreaFee() {
  return { miles: 28, fee: 5000, label: 'Extended Service Area Fee' };
}

form?.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  payload.options = data.getAll('options');
  payload.guest_count = Number(payload.guest_count);
  payload.drinking_guest_count = payload.drinking_guest_count ? Number(payload.drinking_guest_count) : null;
  payload.service_hours = Number(payload.service_hours || 5);

  if (payload.drinking_guest_count && payload.drinking_guest_count > payload.guest_count) {
    status.textContent = 'Drinking guests cannot be greater than total guests.';
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Calculating Your Quote…';
  status.textContent = 'Running the private demo quote simulation…';

  const pkg = payload.package;
  const selected = new Set(payload.options || []);
  const included = new Set(includedByPackage[pkg] || []);
  const items = [];
  let total = packageBase[pkg] || 0;

  items.push({ description: pkg[0].toUpperCase() + pkg.slice(1) + ' Package', amount: total });

  const guestFee = guestAdjustment(payload.guest_count);
  if (guestFee) {
    total += guestFee;
    items.push({ description: 'Event Size Adjustment', amount: guestFee });
  }

  const reqBartenders = requiredBartenders(payload.guest_count);
  const extraBartenders = Math.max(0, reqBartenders - includedBartenders[pkg]);
  if (extraBartenders) {
    const amount = extraBartenders * 25000;
    total += amount;
    items.push({ description: 'Additional Bartender' + (extraBartenders > 1 ? 's' : '') + ' × ' + extraBartenders, amount });
  }

  Object.entries(optionPrices).forEach(([code, option]) => {
    const isIncluded = included.has(code);
    const chosen = selected.has(code);
    if (!isIncluded && chosen) {
      total += option.add;
      items.push({ description: option.name, amount: option.add });
    } else if (isIncluded && !chosen && option.credit) {
      total -= option.credit;
      items.push({ description: 'Removed: ' + option.name, amount: -option.credit });
    }
  });

  const area = demoServiceAreaFee();
  total += area.fee;
  items.push({ description: area.label, amount: area.fee });

  const eventDate = new Date(payload.event_date + 'T12:00:00');
  const daysUntil = (eventDate.getTime() - Date.now()) / 86400000;
  if (daysUntil < 7) {
    total += 15000;
    items.push({ description: 'Short-Notice Booking', amount: 15000 });
  }

  total = Math.max(0, Math.round(total));
  const retainer = Math.round(total * 0.30);
  const balance = total - retainer;

  const demo = {
    demo: true,
    number: 'DEMO-' + String(Math.floor(Math.random() * 900) + 100),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 72 * 3600000).toISOString(),
    payload,
    items,
    total_cents: total,
    retainer_cents: retainer,
    balance_cents: balance,
    simulated_driving_miles: area.miles,
    required_bartenders: reqBartenders
  };

  sessionStorage.setItem('crafte_demo_quote', JSON.stringify(demo));
  window.location.href = 'demo-quote.html';
});
