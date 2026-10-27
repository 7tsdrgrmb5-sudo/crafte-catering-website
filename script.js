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
document.getElementById('year').textContent = new Date().getFullYear();

const instagramUrl = 'https://www.instagram.com/craftecatering/';
const form = document.getElementById('quoteForm');
const status = document.getElementById('quoteStatus');
const preview = document.getElementById('quotePreview');
const messageBox = document.getElementById('quoteMessage');
const copyAgain = document.getElementById('copyAgain');
let latestMessage = '';

async function copyMessage(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  } catch (_) {
    return false;
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const provided = data.getAll('provided').join(', ') || 'Not specified';

  latestMessage = [
    'Hi CraftE Catering! I would like a quote for my event:',
    '',
    `Name: ${data.get('name') || ''}`,
    `Event date: ${data.get('date') || ''}`,
    `City / Venue: ${data.get('city') || ''}`,
    `Event type: ${data.get('type') || ''}`,
    `Total guests: ${data.get('guests') || ''}`,
    `Approx. drinking guests: ${data.get('drinking') || 'Not specified'}`,
    `Service hours: ${data.get('hours') || ''}`,
    `Setting: ${data.get('setting') || ''}`,
    `I can provide: ${provided}`,
    `Notes: ${data.get('notes') || 'None'}`,
    '',
    'Thank you!'
  ].join('\n');

  const instagramWindow = window.open('about:blank', '_blank');
  const copied = await copyMessage(latestMessage);

  if (messageBox) messageBox.textContent = latestMessage;
  if (preview) preview.hidden = false;
  if (status) {
    status.textContent = copied
      ? 'Copied! Instagram is opening — tap Message and paste your request.'
      : 'Instagram is opening. Your request is shown below so you can copy it manually.';
  }

  if (instagramWindow) {
    instagramWindow.location.href = instagramUrl;
  } else {
    window.location.href = instagramUrl;
  }
});

copyAgain?.addEventListener('click', async () => {
  if (!latestMessage) return;
  const copied = await copyMessage(latestMessage);
  if (status) status.textContent = copied ? 'Copied again.' : 'Select the message below and copy it manually.';
});
