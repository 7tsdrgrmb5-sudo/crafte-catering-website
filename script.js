const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.textContent = open ? '✕' : '☰';
});

nav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (menuButton) menuButton.textContent = '☰';
  });
});

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

function isSpanish(){return document.documentElement.lang.toLowerCase().startsWith('es')}
function ui(){
  return isSpanish()?{
    included:'Incluido',
    drinkingError:'Los invitados que beberán no pueden ser más que el total de invitados.',
    calculatingButton:'Calculando Tu Cotización…',
    calculatingStatus:'Calculando el tamaño del evento, personal, área de servicio y tus selecciones…',
    genericQuoteError:'No pudimos calcular tu cotización. Revisa la dirección del evento e inténtalo de nuevo.',
    submit:'Calcular Mi Cotización'
  }:{
    included:'Included',
    drinkingError:'Drinking guests cannot be greater than total guests.',
    calculatingButton:'Calculating Your Quote…',
    calculatingStatus:'Calculating event size, staffing, service area and your selections…',
    genericQuoteError:'We could not calculate your quote. Please check the venue address and try again.',
    submit:'Calculate My Quote'
  };
}

const SUPABASE_URL = 'https://ozjctdmdwoutsebkjcpn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_tERnQU70mt-6imXPumOiUg_EDTYsQpH';
const form = document.getElementById('quoteForm');
const status = document.getElementById('quoteStatus');
const submitButton = document.getElementById('quoteSubmit');

const includedByPackage = {
  basic: [],
  deluxe: ['THEMED_STYLING', 'ELEVATED_GARNISH', 'COCKTAIL_SIGNAGE', 'LED_LIGHTING'],
  premium: ['THEMED_STYLING', 'ELEVATED_GARNISH', 'COCKTAIL_SIGNAGE', 'LED_LIGHTING', 'COCKTAIL_SERVER', 'SHOT_OCLOCK']
};

function syncPackageOptions(pkg) {
  const included = new Set(includedByPackage[pkg] || []);
  document.querySelectorAll('input[name="options"]').forEach(input => {
    input.checked = included.has(input.value);
    const price = document.querySelector('[data-option-price="' + input.value + '"]');
    if (price) price.textContent = included.has(input.value) ? ui().included : price.dataset.original || price.textContent;
    if (price && !price.dataset.original) {
      const base = {
        THEMED_STYLING: '+$125',
        ELEVATED_GARNISH: '+$100',
        COCKTAIL_SIGNAGE: '+$50',
        LED_LIGHTING: '+$50',
        COCKTAIL_SERVER: '+$250',
        SHOT_OCLOCK: '+$100',
        MOCKTAIL_STATION: '+$100'
      };
      price.dataset.original = base[input.value] || '';
      if (!included.has(input.value)) price.textContent = price.dataset.original;
    }
  });
}

document.querySelectorAll('input[name="package"]').forEach(input => {
  input.addEventListener('change', () => syncPackageOptions(input.value));
});

form?.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  payload.options = data.getAll('options');
  payload.guest_count = Number(payload.guest_count);
  payload.drinking_guest_count = payload.drinking_guest_count ? Number(payload.drinking_guest_count) : null;
  payload.service_hours = Number(payload.service_hours || 5);
  payload.analytics_session_id = window.CraftEAnalytics?.sessionId || null;
  payload.language = isSpanish() ? 'es' : 'en';

  if (payload.drinking_guest_count && payload.drinking_guest_count > payload.guest_count) {
    status.textContent = ui().drinkingError;
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = ui().calculatingButton;
  status.textContent = ui().calculatingStatus;

  try {
    const response = await fetch(SUPABASE_URL + '/functions/v1/create-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to create quote.');

    window.location.href = 'quote.html?token=' + encodeURIComponent(result.quote.token) + (isSpanish() ? '&lang=es' : '');
  } catch (error) {
    status.textContent = isSpanish() ? ui().genericQuoteError : (error.message || ui().genericQuoteError);
    submitButton.disabled = false;
    submitButton.textContent = ui().submit;
  }
});

window.addEventListener('crafte-language-change',()=>{
  const selected=document.querySelector('input[name="package"]:checked');
  if(selected)syncPackageOptions(selected.value);
  if(submitButton && !submitButton.disabled)submitButton.textContent=ui().submit;
  if(status)status.textContent='';
});
