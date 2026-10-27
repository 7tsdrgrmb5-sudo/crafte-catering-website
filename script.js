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

const form = document.getElementById('quoteForm');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const provided = data.getAll('provided').join(', ') || 'Not specified';
  const subject = `CraftE Quote Request - ${data.get('type') || 'Event'} - ${data.get('date') || ''}`;
  const body = [
    'Hi CraftE Catering,',
    '',
    'I would like a quote for my event:',
    `Name: ${data.get('name') || ''}`,
    `Event date: ${data.get('date') || ''}`,
    `City / Venue: ${data.get('city') || ''}`,
    `Event type: ${data.get('type') || ''}`,
    `Total guests: ${data.get('guests') || ''}`,
    `Approx. drinking guests: ${data.get('drinking') || 'Not specified'}`,
    `Service hours: ${data.get('hours') || ''}`,
    `Setting: ${data.get('setting') || ''}`,
    `I will provide: ${provided}`,
    `Notes: ${data.get('notes') || 'None'}`,
    '',
    'Thank you!'
  ].join('\n');

  window.location.href = `mailto:craftecateringllc@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});