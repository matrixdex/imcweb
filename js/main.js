// ── Sticky nav on scroll ──
const nav = document.getElementById('nav');
function updateNavState() {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}
window.addEventListener('scroll', updateNavState);
updateNavState();

// ── Mobile nav toggle ──
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('mobile-open');
    navToggle.setAttribute('aria-expanded', isOpen);
    nav.classList.toggle('menu-open', isOpen);
  });
}

// ── Desktop dropdowns (Clinics / Shop) ──
document.querySelectorAll('.has-dropdown').forEach(item => {
  const toggle = item.querySelector('[data-dropdown-toggle]');
  if (!toggle) return;
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.has-dropdown.open').forEach(el => el.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.has-dropdown.open').forEach(el => el.classList.remove('open'));
});

// ── Scroll reveal ──
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObserver.observe(el));

// ── Doctor profile tabs ──
const doctorTabs = document.querySelectorAll('.doctor-tab');
const doctorPanels = document.querySelectorAll('.doctor-panel');
const doctorsTabsEl = document.querySelector('.doctors-tabs');
const doctorsTrackFill = document.getElementById('doctorsTrackFill');

function positionDoctorFill(tab) {
  if (!doctorsTrackFill || !doctorsTabsEl || !tab) return;
  const containerRect = doctorsTabsEl.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  doctorsTrackFill.style.width = `${tabRect.width}px`;
  doctorsTrackFill.style.transform = `translateX(${tabRect.left - containerRect.left}px)`;
}

if (doctorTabs.length) {
  doctorTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      doctorTabs.forEach(t => t.classList.remove('active'));
      doctorPanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-doctor');
      document.querySelector(`[data-doctor-panel="${target}"]`).classList.add('active');
      positionDoctorFill(tab);
    });
  });
  window.addEventListener('resize', () => {
    positionDoctorFill(document.querySelector('.doctor-tab.active'));
  });
  window.addEventListener('load', () => {
    positionDoctorFill(document.querySelector('.doctor-tab.active'));
  });
  positionDoctorFill(document.querySelector('.doctor-tab.active'));
}

// ── Clinics carousel ──
// Paged by whole screens (not a 1-card slide): perView cards per page,
// Prev/Next always move exactly one page. Page position is tracked as
// a page NUMBER (pageIndex), not a card index, so the disabled state
// is a single unambiguous comparison against pageCount - 1 — nothing
// to get out of sync after a resize.
const clinicsWrap = document.querySelector('.clinics-track-wrap');
const clinicsTrack = document.getElementById('clinicsTrack');
const clinicPrev = document.getElementById('clinicPrev');
const clinicNext = document.getElementById('clinicNext');
if (clinicsWrap && clinicsTrack && clinicPrev && clinicNext) {
  const cards = Array.from(clinicsTrack.querySelectorAll('.clinic-card'));
  let pageIndex = 0;

  function visibleCount() {
    const w = window.innerWidth;
    if (w <= 620) return 1;
    if (w <= 1100) return 2;
    return 4;
  }
  // Swipe is only for small/medium (mobile/tablet) screens; large
  // screens use the Prev/Next buttons only.
  function swipeEnabled() {
    return window.innerWidth <= 1100;
  }
  function pageCount() {
    return Math.max(1, Math.ceil(cards.length / visibleCount()));
  }

  function goToPage(index, animate) {
    const maxPage = pageCount() - 1;
    pageIndex = Math.min(Math.max(0, index), maxPage);
    const pageWidth = clinicsWrap.clientWidth;
    if (animate === false) {
      clinicsTrack.style.transition = 'none';
      clinicsTrack.style.transform = `translateX(-${pageIndex * pageWidth}px)`;
      clinicsTrack.offsetHeight; // flush the instant jump before re-enabling the transition
      clinicsTrack.style.transition = '';
    } else {
      clinicsTrack.style.transform = `translateX(-${pageIndex * pageWidth}px)`;
    }
    clinicPrev.disabled = pageIndex === 0;
    clinicNext.disabled = pageIndex === maxPage;
    const firstVisible = pageIndex * visibleCount();
    cards.forEach((card, i) => card.classList.toggle('active', i === firstVisible));
  }

  clinicPrev.addEventListener('click', () => goToPage(pageIndex - 1));
  clinicNext.addEventListener('click', () => goToPage(pageIndex + 1));
  window.addEventListener('resize', () => goToPage(pageIndex, false));
  goToPage(0, false);

  // ── Swipe / drag (small & medium screens only) ──
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragDeltaX = 0;
  let dragAxis = null; // 'x' | 'y' | null (undecided)

  clinicsWrap.addEventListener('pointerdown', (e) => {
    if (!swipeEnabled()) return;
    dragging = true;
    dragAxis = null;
    dragDeltaX = 0;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    clinicsTrack.style.transition = 'none';
  });

  clinicsWrap.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (dragAxis === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      dragAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (dragAxis !== 'x') return;
    e.preventDefault();
    dragDeltaX = dx;
    const pageWidth = clinicsWrap.clientWidth;
    clinicsTrack.style.transform = `translateX(${-(pageIndex * pageWidth) + dx}px)`;
  }, { passive: false });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    clinicsTrack.style.transition = '';
    const pageWidth = clinicsWrap.clientWidth;
    if (dragAxis === 'x' && Math.abs(dragDeltaX) > pageWidth * 0.18) {
      goToPage(pageIndex + (dragDeltaX < 0 ? 1 : -1));
    } else {
      goToPage(pageIndex);
    }
  }
  clinicsWrap.addEventListener('pointerup', endDrag);
  clinicsWrap.addEventListener('pointercancel', endDrag);
  clinicsWrap.addEventListener('pointerleave', () => { if (dragging) endDrag(); });
}

// ── Testimonials carousel ──
const TESTIMONIALS = [
  {
    name: 'James R.',
    role: 'Long-term Patient',
    quote: "Dr. Ali's hands-on approach and genuine attention to my history changed how I understood my own health. Two years on, I still recommend the centre to anyone who'll listen."
  },
  {
    name: 'Aisha K.',
    role: 'Patient, London',
    quote: 'After years of chronic back pain, the combination of osteopathy and hypoxic training gave me results no other clinic had. The whole team genuinely listens.'
  },
  {
    name: 'Daniel P.',
    role: 'Patient, United Kingdom',
    quote: 'What stood out was how personal the care felt. Every visit was tailored, and the results spoke for themselves within weeks.'
  }
];
let testiIndex = 0;
const testiName = document.getElementById('testiName');
const testiRole = document.getElementById('testiRole');
const testiQuote = document.getElementById('testiQuote');
const testiPrev = document.getElementById('testiPrev');
const testiNext = document.getElementById('testiNext');

function renderTestimonial() {
  const t = TESTIMONIALS[testiIndex];
  if (testiName) testiName.textContent = t.name;
  if (testiRole) testiRole.textContent = t.role;
  if (testiQuote) testiQuote.textContent = t.quote;
}
if (testiPrev && testiNext) {
  testiPrev.addEventListener('click', () => {
    testiIndex = (testiIndex - 1 + TESTIMONIALS.length) % TESTIMONIALS.length;
    renderTestimonial();
  });
  testiNext.addEventListener('click', () => {
    testiIndex = (testiIndex + 1) % TESTIMONIALS.length;
    renderTestimonial();
  });
}
