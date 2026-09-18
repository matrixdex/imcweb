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
  });
  navLinks.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('mobile-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
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
// The paged carousel (buttons only, 4 cards/page) is desktop-only —
// above 1100px, matching the CSS breakpoint where .clinic-card switches
// from the horizontal track to a plain vertical stack. At or below
// 1100px this block does nothing: every card is already visible in
// normal document flow, no JS involvement needed.
//
// Page position is tracked as a page NUMBER (pageIndex), not a card
// index, so the disabled state is a single unambiguous comparison
// against pageCount - 1 — nothing to get out of sync after a resize.
const clinicsWrap = document.querySelector('.clinics-track-wrap');
const clinicsTrack = document.getElementById('clinicsTrack');
const clinicPrev = document.getElementById('clinicPrev');
const clinicNext = document.getElementById('clinicNext');
if (clinicsWrap && clinicsTrack && clinicPrev && clinicNext) {
  const cards = Array.from(clinicsTrack.querySelectorAll('.clinic-card'));
  const PER_VIEW = 4;
  let pageIndex = 0;

  function carouselActive() {
    return window.innerWidth > 1100;
  }
  function pageCount() {
    return Math.max(1, Math.ceil(cards.length / PER_VIEW));
  }

  function goToPage(index, animate) {
    if (!carouselActive()) return;
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
    const firstVisible = pageIndex * PER_VIEW;
    cards.forEach((card, i) => card.classList.toggle('active', i === firstVisible));
  }

  // Re-sync on every resize: entering carousel mode re-applies the
  // current page's transform (CSS provides the transform:none stack
  // otherwise); entering stacked mode just clears the inline transform
  // the CSS `!important` rule would already override anyway, and drops
  // the single-card highlight that only makes sense as "current page".
  function syncToViewport() {
    if (carouselActive()) {
      goToPage(pageIndex, false);
    } else {
      clinicsTrack.style.transition = '';
      clinicsTrack.style.transform = '';
      cards.forEach(card => card.classList.remove('active'));
    }
  }

  clinicPrev.addEventListener('click', () => goToPage(pageIndex - 1));
  clinicNext.addEventListener('click', () => goToPage(pageIndex + 1));
  window.addEventListener('resize', syncToViewport);
  syncToViewport();
}

// ── Product data & detail overlay ──
const IMC_PRODUCTS = {
  'joint-support-oil': {
    category: 'Massage Oil',
    name: 'Joint Support Oil',
    price: '£25',
    desc: 'A blend of natural oils formulated for use on inflammation of the muscles, ligaments and joints. Not tested on animals.',
    ingredients: 'Sesamum indicum (sesame seed oil), Brassica alba (mustard seed oil), Nigella sativa (black seed oil), Syzygium aromaticum (clove oil), Mahanarayan oil.',
    benefits: 'Muscle, ligament and joint inflammation, easing stiffness and discomfort.',
    imageFile: 'joint-support-oil.png'
  },
  'detox-powder': {
    category: 'Health Food',
    name: 'Detox Powder',
    price: '£45',
    desc: 'A blend of time-tested traditional ingredients, made into a detox tea for detoxification and gut health. Soak half a teaspoon in a cup of hot water and leave overnight. Strain the tea and drink on an empty stomach in the morning.',
    ingredients: 'Kadu (Swertia chirayata), Kariatu (Enicostemma littorale), Neem (Azadirachta indica), Amla (Emblica officinalis).',
    benefits: 'Detoxification, gut health, a gentle morning cleansing ritual.',
    imageFile: 'detox-powder.png'
  },
  'breakfast-mewa': {
    category: 'Breakfast Muesli',
    name: 'Breakfast Mewa',
    price: '£55',
    desc: 'A handcrafted superfood of ancient India. Add one cup of mewa to one cup of milk, mix thoroughly, then heat for 7 minutes over a gas hob. Contains gluten and nuts.',
    ingredients: 'Oats, almonds, sliced pistachios, green raisins, barberries, dried orange peels, saffron.',
    benefits: 'Sustained morning energy, easy digestion, a nourishing start to the day.',
    imageFile: 'breakfast-mewa.png'
  }
};

const productOverlay = document.getElementById('productOverlay');
if (productOverlay) {
  const overlayIcon        = document.getElementById('productOverlayIcon');
  const overlayCategory    = document.getElementById('productOverlayCategory');
  const overlayTitle       = document.getElementById('productOverlayTitle');
  const overlayPrice       = document.getElementById('productOverlayPrice');
  const overlayDesc        = document.getElementById('productOverlayDesc');
  const overlayIngredients = document.getElementById('productOverlayIngredients');
  const overlayBenefits    = document.getElementById('productOverlayBenefits');
  const enquireLink        = document.getElementById('productEnquireLink');
  let lastFocused = null;

  function openProduct(id) {
    const p = IMC_PRODUCTS[id];
    if (!p) return;
    overlayIcon.innerHTML = `<img src="./assets/${p.imageFile}" alt="${p.name}">`;
    overlayCategory.textContent    = p.category;
    overlayTitle.textContent       = p.name;
    overlayPrice.textContent       = p.price;
    overlayDesc.textContent        = p.desc;
    overlayIngredients.textContent = p.ingredients;
    overlayBenefits.textContent    = p.benefits;
    const body = `Hi. I would like to order IMC's ${p.name}\n\nQuantity: 1\nPickup/Delivery: Pickup at 75 Harley Street, London W1G 8QL\nDelivery Address (for deliveries in UK and EU): \n\nThanks`;
    enquireLink.href = `mailto:enquiries@theintegratedmed.com?subject=${encodeURIComponent(`Product Enquiry – ${p.name}`)}&body=${encodeURIComponent(body)}`;
    lastFocused = document.activeElement;
    productOverlay.classList.add('open');
    productOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overlay-open');
    const closeBtn = productOverlay.querySelector('.product-overlay-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeProduct() {
    productOverlay.classList.remove('open');
    productOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overlay-open');
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-product]');
    if (!trigger || trigger.closest('#productOverlay')) return;
    e.preventDefault();
    openProduct(trigger.getAttribute('data-product'));
  });

  productOverlay.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', closeProduct);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && productOverlay.classList.contains('open')) closeProduct();
  });
}
