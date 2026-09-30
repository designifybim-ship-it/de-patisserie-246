(() => {
  'use strict';
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.menu-toggle');
  const toast = document.querySelector('.toast');

  toggle?.addEventListener('click', () => {
    if (!nav) return;
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (nav?.classList.contains('open')) {
        nav.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
      }
    }
  });

  const currentFile = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.getAttribute('href') === currentFile) link.classList.add('active');
  });



  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.14, rootMargin: '0px 0px -40px' });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  window.showToast = message => {
    if (!toast) return;
    toast.textContent = String(message || '');
    toast.classList.add('show');
    clearTimeout(window.__dpToastTimer);
    window.__dpToastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  };

  document.querySelectorAll('[data-countdown]').forEach(countdown => {
    const targetString = countdown.getAttribute('data-date') || '2026-10-03T00:00:00-04:00';
    const target = new Date(targetString).getTime();
    const label = countdown.querySelector('.countdown-label');
    const set = (selector, value) => {
      const el = countdown.querySelector(selector);
      if (el) el.textContent = String(value).padStart(2, '0');
    };
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      set('[data-days]', days);
      set('[data-hours]', hours);
      set('[data-minutes]', minutes);
      set('[data-seconds]', seconds);
      if (diff === 0 && label) label.textContent = 'Saturday Treats is here ♡';
    };
    tick();
    setInterval(tick, 1000);
  });
})();
