(function () {
  const STORAGE_KEYS = {
    internId: 'megthiranInternId',
    loginGateNotice: 'megthiranLoginGateNotice',
    splashSessionSeen: 'megthiranSplashSessionSeen',
  };

  const INTERN_ID_REGEX = /^M\d{2}IP\d{3}$/;
  const DOB_REGEX = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
  const DASHBOARD_LAUNCH_AT = new Date('2026-06-01T00:00:00+05:30').getTime();
  const SPLASH_DURATION_MS = 2150;
  const SPLASH_EXIT_MS = 650;
  const DASHBOARD_DATA = {
    name: 'Intern Name',
    plan: 'Premium',
    startDate: '10 Apr 2026',
    duration: '8 Weeks',
    creditsEarned: 0,
  };

  let navBackdrop = null;
  let pendingGateModal = false;
  let pageEntryComplete = false;
  let typewriterTimers = [];

  document.addEventListener('DOMContentLoaded', function () {
    annotatePageShell();

    const page = document.body.dataset.page || 'public';
    const isPublicPage = page !== 'login' && page !== 'dashboard';
    const isLegalPage = page === 'legal';

    if (isPublicPage) {
      document.body.classList.add('site-public');
    }

    if (isLegalPage) {
      document.body.classList.add('site-legal');
    }

    if (document.querySelector('.hero')) {
      document.body.classList.add('site-home');
    }

    if (page === 'login' && !isDashboardAvailable()) {
      redirectWithGateNotice('index.html');
      return;
    }

    if (page === 'dashboard' && !isDashboardAvailable()) {
      redirectWithGateNotice('index.html');
      return;
    }

    initSiteNav();
    initHashScroll();
    initLoginGate();
    initDomainShowcase();
    initPageTransitions();

    if (page === 'login') {
      initLoginPage();
    } else if (page === 'dashboard') {
      initDashboardPage();
    } else {
      window.setTimeout(function () {
        if (!isLegalPage) {
          initHeaderScrollEffect();
          initScrollReveal();
          initSubtleParallax();
          initFramerMotionEnhancements();
        }
      }, 0);
    }

    if (shouldShowSplash()) {
      runInitialSplash();
    } else {
      completePageEntry();
    }
  });

  window.addEventListener('pageshow', function () {
    document.body.classList.remove('page-transition-leaving', 'site-route-leaving', 'is-page-leaving');
    if (document.body.classList.contains('site-intro-active') || document.querySelector('.site-splash')) {
      return;
    }

    if (document.body.classList.contains('site-public')) {
      completePageEntry();
    }
  });

  window.addEventListener('hashchange', function () {
    document.body.classList.remove('page-transition-leaving', 'site-route-leaving', 'is-page-leaving');
    scrollToPageHash(window.location.hash, false);
  });

  function annotatePageShell() {
    Array.from(document.body.children).forEach(function (child) {
      if (!child.matches('[data-page-shell], script, style')) {
        child.setAttribute('data-page-shell', '');
      }
    });
  }

  function shouldShowSplash() {
    if (!document.body.classList.contains('site-public')) {
      return false;
    }

    if (document.body.classList.contains('site-legal')) {
      return false;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }

    const navigationEntries = window.performance && typeof window.performance.getEntriesByType === 'function'
      ? window.performance.getEntriesByType('navigation')
      : [];
    const navigationType = navigationEntries.length ? navigationEntries[0].type : '';
    const hasSeenSplashThisSession = sessionStorage.getItem(STORAGE_KEYS.splashSessionSeen) === 'true';

    if (navigationType === 'reload') {
      return true;
    }

    if (!hasSeenSplashThisSession) {
      return true;
    }

    return false;
  }

  function runInitialSplash() {
    document.body.classList.add('site-intro-active');

    const splash = document.createElement('div');
    splash.className = 'site-splash';
    splash.setAttribute('aria-hidden', 'true');
    splash.innerHTML = [
      '<div class="site-splash__backdrop"></div>',
      '<div class="site-splash__particle site-splash__particle--one"></div>',
      '<div class="site-splash__particle site-splash__particle--two"></div>',
      '<div class="site-splash__particle site-splash__particle--three"></div>',
      '<div class="site-splash__particle site-splash__particle--four"></div>',
      '<div class="site-splash__particle site-splash__particle--five"></div>',
      '<div class="site-splash__orb"></div>',
      '<div class="site-splash__center">',
      '  <div class="site-splash__logo-glow"></div>',
      '  <div class="site-splash__ring"></div>',
      '  <img src="./assets/logo/megsyra-logo.png" alt="" class="site-splash__logo" />',
      '</div>'
    ].join('');

    document.body.insertBefore(splash, document.body.firstChild);

    window.setTimeout(function () {
      splash.classList.add('is-leaving');
      sessionStorage.setItem(STORAGE_KEYS.splashSessionSeen, 'true');

      window.setTimeout(function () {
        splash.remove();
        completePageEntry();
      }, SPLASH_EXIT_MS);
    }, SPLASH_DURATION_MS);
  }

  function completePageEntry() {
    if (pageEntryComplete) {
      return;
    }

    pageEntryComplete = true;

    window.requestAnimationFrame(function () {
      document.body.classList.remove('site-intro-active');
      document.body.classList.add('site-ready');

      if (pendingGateModal || sessionStorage.getItem(STORAGE_KEYS.loginGateNotice) === 'true') {
        pendingGateModal = false;
        sessionStorage.removeItem(STORAGE_KEYS.loginGateNotice);
        window.setTimeout(openLoginGateModal, 320);
      }
    });
  }

  function initSiteNav() {
    const menuToggle = document.querySelector('.menu-toggle');
    const siteNav = document.getElementById('siteNav');

    if (!menuToggle || !siteNav) {
      return;
    }

    menuToggle.setAttribute('aria-label', 'Toggle navigation');
    menuToggle.innerHTML = [
      '<span class="menu-toggle__box" aria-hidden="true">',
      '  <span class="menu-toggle__line"></span>',
      '  <span class="menu-toggle__line"></span>',
      '  <span class="menu-toggle__line"></span>',
      '</span>'
    ].join('');

    navBackdrop = document.createElement('button');
    navBackdrop.type = 'button';
    navBackdrop.className = 'site-nav-backdrop';
    navBackdrop.setAttribute('aria-label', 'Close navigation');
    document.body.appendChild(navBackdrop);

    function closeMenu() {
      siteNav.classList.remove('open');
      menuToggle.classList.remove('is-open');
      navBackdrop.classList.remove('is-visible');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('site-nav-open');
    }

    function openMenu() {
      siteNav.classList.add('open');
      menuToggle.classList.add('is-open');
      navBackdrop.classList.add('is-visible');
      menuToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('site-nav-open');
    }

    menuToggle.addEventListener('click', function () {
      if (siteNav.classList.contains('open')) {
        closeMenu();
        return;
      }

      openMenu();
    });

    navBackdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 780) {
        closeMenu();
      }
    });
  }

  function initHashScroll() {
    if (!window.location.hash) {
      return;
    }

    window.addEventListener('load', function () {
      scrollToPageHash(window.location.hash, false);
    });
  }

  function getHeaderOffset() {
    const header = document.querySelector('.site-header');
    return header ? header.getBoundingClientRect().height : 0;
  }

  function scrollToPageHash(hash, updateHistory) {
    if (!hash || hash === '#') {
      return false;
    }

    let target = null;

    try {
      target = document.querySelector(hash);
    } catch (error) {
      return false;
    }

    if (!target) {
      return false;
    }

    document.body.classList.remove('page-transition-leaving', 'site-route-leaving', 'is-page-leaving');

    const headerOffset = getHeaderOffset();
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    const scrollTop = Math.max(0, targetTop - headerOffset - 14);

    window.scrollTo({
      top: scrollTop,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });

    if (updateHistory && window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }

    return true;
  }

  function normalizePagePath(pathname) {
    return pathname.replace(/\/index\.html$/, '/');
  }

  function initHeaderScrollEffect() {
    const header = document.querySelector('.site-header');

    if (!header) {
      return;
    }

    function syncHeaderState() {
      header.classList.toggle('scrolled', window.scrollY > 12);
    }

    syncHeaderState();
    window.addEventListener('scroll', syncHeaderState, { passive: true });
  }

  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.hidden').forEach(function (element) {
        element.classList.add('show');
      });
      return;
    }

    const selectors = [
      '.section:not(.hero)',
      '.section:not(.hero) h2',
      '.section:not(.hero) h3',
      '.section:not(.hero) .section-text',
      '.what-you-get-shell',
      '.benefit-card',
      '.project-feature-card',
      '.about-content',
      '.about-marquee',
      '.pricing-card',
      '.domain-card',
      '.domain-section-card',
      '.domain-group',
      '.domain-pill',
      '.process-step',
      '.contact-card',
      '.social-block',
      '.why-card',
      '.package-detail-card',
      '.package-block',
      '.package-actions',
      '.final-cta',
      '.quick-summary'
    ];

    const revealElements = Array.from(document.querySelectorAll(selectors.join(',')))
      .filter(function (element) {
        return !element.closest('.page-login, .page-dashboard') && !element.closest('.hero');
      });

    revealElements.forEach(function (element, index) {
      element.classList.add('hidden');

      if (element.matches('h2, h3')) {
        element.classList.add('reveal-heading');
      }

      if (element.matches('.section-text')) {
        element.classList.add('reveal-text');
      }

      if (element.matches('.pricing-card, .domain-card, .domain-section-card, .domain-pill, .process-step, .contact-card, .package-block, .why-card, .benefit-card, .project-feature-card')) {
        element.classList.add('reveal-stagger');
      }

      if (!element.style.getPropertyValue('--reveal-delay') && element.classList.contains('reveal-stagger')) {
        element.style.setProperty('--reveal-delay', ((index % 4) * 0.12).toFixed(2) + 's');
      }
    });

    setStaggerDelay('#domainsList .domain-card', 0.1);
    setStaggerDelay('.domain-showcase .domain-section-card', 0.14);
    setStaggerDelay('.benefit-grid .benefit-card', 0.08);
    setDomainPillStaggers();
    setStaggerDelay('.pricing-grid .pricing-card', 0.12);
    setStaggerDelay('.process-steps .process-step', 0.14);
    setStaggerDelay('.contact-grid .contact-card', 0.12);
    setStaggerDelay('.why-grid .why-card', 0.1);
    setStaggerDelay('.package-detail-card .package-block', 0.12);

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    });

    revealElements.forEach(function (element) {
      observer.observe(element);
    });
  }

  function setStaggerDelay(selector, gap) {
    document.querySelectorAll(selector).forEach(function (element, index) {
      element.style.setProperty('--reveal-delay', (index * gap).toFixed(2) + 's');
    });
  }

  function setDomainPillStaggers() {
    document.querySelectorAll('.domain-group').forEach(function (group) {
      group.querySelectorAll('.domain-pill').forEach(function (element, index) {
        element.style.setProperty('--reveal-delay', Math.min(index * 0.035, 0.42).toFixed(2) + 's');
      });
    });
  }

  function initSubtleParallax() {
    const parallaxElements = Array.from(document.querySelectorAll('.hero-visual, .what-you-get-shell, .project-feature-card, .domain-section-card, .domain-card, .pricing-card, .why-card, .contact-card'))
      .filter(function (element) {
        return !element.closest('.page-login, .page-dashboard');
      });

    if (!parallaxElements.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    parallaxElements.forEach(function (element) {
      element.classList.add('reveal-parallax');
    });

    let ticking = false;

    function updateParallax() {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      parallaxElements.forEach(function (element) {
        const rect = element.getBoundingClientRect();

        if (rect.bottom < 0 || rect.top > viewportHeight) {
          return;
        }

        const midpoint = rect.top + rect.height / 2;
        const offset = (midpoint - viewportHeight / 2) * -0.018;
        const clampedOffset = Math.max(-10, Math.min(10, offset));
        element.style.setProperty('--parallax-y', clampedOffset.toFixed(2) + 'px');
      });

      ticking = false;
    }

    function requestParallaxUpdate() {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(updateParallax);
    }

    updateParallax();
    window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
    window.addEventListener('resize', requestParallaxUpdate);
  }

  function initFramerMotionEnhancements() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const framerMotion = window.framerMotion || window.FramerMotion || window.Motion || window['framer-motion'];
    const animate = framerMotion && framerMotion.animate;

    if (typeof animate !== 'function') {
      return;
    }

    try {
      document.querySelectorAll('.laptop-mockup').forEach(function (laptop) {
        animate(laptop, {
          filter: [
            'drop-shadow(0 34px 34px rgba(0, 0, 0, 0.42)) drop-shadow(0 0 34px rgba(0, 178, 224, 0.14))',
            'drop-shadow(0 40px 38px rgba(0, 0, 0, 0.46)) drop-shadow(0 0 42px rgba(0, 178, 224, 0.2))',
            'drop-shadow(0 34px 34px rgba(0, 0, 0, 0.42)) drop-shadow(0 0 34px rgba(0, 178, 224, 0.14))',
          ],
        }, {
          duration: 7.5,
          repeat: Infinity,
          easing: 'ease-in-out',
        });
      });
    } catch (error) {
      document.documentElement.classList.add('framer-motion-fallback');
    }
  }

  function initPageTransitions() {
    if (!document.body.classList.contains('site-public')) {
      return;
    }

    window.requestAnimationFrame(function () {
      document.body.classList.add('page-transition-ready');
    });

    document.addEventListener('click', function (event) {
      const link = event.target.closest('a');

      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const href = link.getAttribute('href') || '';

      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank') {
        return;
      }

      if (href.startsWith('#')) {
        if (scrollToPageHash(href, true)) {
          event.preventDefault();
        }
        return;
      }

      const nextUrl = new URL(href, window.location.href);

      if (nextUrl.origin === window.location.origin && normalizePagePath(nextUrl.pathname) === normalizePagePath(window.location.pathname) && nextUrl.hash) {
        if (scrollToPageHash(nextUrl.hash, true)) {
          event.preventDefault();
        }
        return;
      }

      if (nextUrl.origin !== window.location.origin || nextUrl.href === window.location.href) {
        return;
      }

      event.preventDefault();
      document.body.classList.add('page-transition-leaving', 'site-route-leaving');

      window.setTimeout(function () {
        window.location.href = nextUrl.href;
      }, 180);
    });
  }

  function initDomainShowcase() {
    const domainsList = document.getElementById('domainsList');

    if (!domainsList) {
      return;
    }

    const domainSections = [
      {
        className: 'domain-section-technical',
        eyebrow: '50+ focused tracks',
        title: 'Technical Domains',
        description: 'Engineering, software, data, design, electronics, and applied technical internship paths.',
        groups: [
          {
            title: 'Software / IT',
            domains: ['Web Development Fundamentals', 'Frontend Development', 'JavaScript Programming', 'Python Programming', 'Java Programming', 'Database Management with SQL', 'REST API Development', 'Software Testing & QA', 'Computer Programming Fundamentals', 'Computer Fundamentals', 'AI Tools & Prompt Engineering', 'Data Analysis', 'Machine Learning', 'Data Visualization', 'Cloud Computing', 'Big Data', 'Cybersecurity', 'Ethical Hacking', 'Digital Privacy & Security'],
          },
          {
            title: 'UI/UX & Design',
            domains: ['UI Design', 'Mobile App UI', 'Web Design', 'Graphic Design', 'Design Thinking'],
          },
          {
            title: 'Electronics / Embedded',
            domains: ['Arduino', 'Basic Electronics', 'Circuit Design', 'Embedded Systems', 'Sensors', 'Electrical Machines', 'Robotics', 'Automation', 'Industrial Automation'],
          },
          {
            title: 'Mechanical',
            domains: ['CAD Design', '3D Modelling', 'Mechanical Components', 'Manufacturing Process', 'Product Design', 'Industrial Safety'],
          },
          {
            title: 'Civil',
            domains: ['AutoCAD Civil', 'Building Materials', 'Construction Planning'],
          },
          {
            title: 'Chemical',
            domains: ['Chemical Process Engineering', 'Chemical Safety', 'Green Chemical Engineering'],
          },
          {
            title: 'Medical / Biomedical',
            domains: ['Medical Coding', 'Healthcare Data', 'Medical Devices', 'Hospital Management', 'Biomedical Equipment'],
          },
        ],
      },
      {
        className: 'domain-section-hybrid',
        eyebrow: 'Premium enterprise track',
        title: 'Tech + Business Skills',
        description: 'A focused middle layer for students who want technical fluency with workplace-ready business execution.',
        groups: [
          {
            title: '',
            domains: ['Business Analysis', 'Project Management', 'Quality Assurance', 'HR Operations', 'Data Analytics', 'AI Productivity Tools', 'Agile Collaboration', 'Technical Communication'],
          },
          {
            title: 'Business Management',
            domains: ['Business Development', 'Entrepreneurship', 'Business Analytics', 'Market Research', 'HR Management', 'Talent Acquisition', 'Employee Engagement', 'Project Management', 'Operations Management', 'Sales', 'CRM', 'Event Management'],
          },
        ],
      },
      {
        className: 'domain-section-non-technical',
        eyebrow: 'Creative and business tracks',
        title: 'Non-Technical Domains',
        description: 'Communication, marketing, media, business, people operations, and management internship paths.',
        groups: [
          {
            title: 'Content / Writing',
            domains: ['Content Writing', 'Blogging', 'Copywriting', 'Technical Writing'],
          },
          {
            title: 'Marketing / Media',
            domains: ['Digital Marketing', 'Social Media Marketing', 'Influencer Marketing', 'SEO', 'Email Marketing', 'Brand Management', 'Public Relations', 'Video Editing', 'Digital Content Creation'],
          },
        ],
      },
    ];

    domainsList.innerHTML = domainSections.map(renderDomainSection).join('');
  }

  function renderDomainSection(section) {
    return [
      '<section class="domain-section-card ' + section.className + '" data-domain-section>',
      '  <div class="domain-section-head">',
      '    <p class="domain-section-eyebrow">' + escapeHtml(section.eyebrow) + '</p>',
      '    <h3>' + escapeHtml(section.title) + '</h3>',
      '    <p>' + escapeHtml(section.description) + '</p>',
      '  </div>',
      '  <div class="domain-groups">',
      section.groups.map(renderDomainGroup).join(''),
      '  </div>',
      '</section>',
    ].join('');
  }

  function renderDomainGroup(group) {
    const title = group.title
      ? '<h4>' + escapeHtml(group.title) + '</h4>'
      : '';

    return [
      '<div class="domain-group">',
      title,
      '  <ul class="domain-pill-grid">',
      group.domains.map(function (domain) {
        return '<li class="domain-pill"><span>' + escapeHtml(domain) + '</span></li>';
      }).join(''),
      '  </ul>',
      '</div>',
    ].join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[character];
    });
  }

  function initLoginGate() {
    const locked = !isDashboardAvailable();
    const loginLinks = document.querySelectorAll('a[href="login.html"], a[href="./login.html"], .nav-login-btn');

    if (locked) {
      loginLinks.forEach(function (link) {
        link.addEventListener('click', function (event) {
          event.preventDefault();
          openLoginGateModal();
        });
      });
    }

    if (sessionStorage.getItem(STORAGE_KEYS.loginGateNotice) === 'true') {
      pendingGateModal = true;
      if (pageEntryComplete) {
        sessionStorage.removeItem(STORAGE_KEYS.loginGateNotice);
        pendingGateModal = false;
        openLoginGateModal();
      }
    }
  }

  function openLoginGateModal() {
    if (document.body.classList.contains('site-modal-open')) {
      restartTypewriter();
      return;
    }

    let modal = document.querySelector('.login-gate-modal');
    if (!modal) {
      modal = buildLoginGateModal();
      document.body.appendChild(modal);
    }

    document.body.classList.add('site-modal-open');
    modal.classList.add('is-visible');
    modal.removeAttribute('hidden');
    restartTypewriter();
  }

  function closeLoginGateModal() {
    const modal = document.querySelector('.login-gate-modal');

    if (!modal) {
      return;
    }

    modal.classList.remove('is-visible');
    document.body.classList.remove('site-modal-open');
    window.setTimeout(function () {
      modal.setAttribute('hidden', 'hidden');
    }, 240);
  }

  function buildLoginGateModal() {
    const modal = document.createElement('div');
    modal.className = 'login-gate-modal';
    modal.setAttribute('hidden', 'hidden');
    modal.innerHTML = [
      '<div class="login-gate-modal__backdrop" data-close-gate="true"></div>',
      '<div class="login-gate-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="loginGateTitle">',
      '  <button type="button" class="login-gate-modal__close" aria-label="Close message">&times;</button>',
      '  <div class="login-gate-modal__eyebrow">Dashboard Access</div>',
      '  <h2 id="loginGateTitle" class="login-gate-modal__headline"><span class="typewriter-text" data-typewriter-title></span></h2>',
      '  <p class="login-gate-modal__message"><span class="typewriter-text" data-typewriter-text></span><span class="typewriter-cursor" aria-hidden="true"></span></p>',
      '  <button type="button" class="login-gate-modal__action">Continue Exploring</button>',
      '</div>'
    ].join('');

    modal.addEventListener('click', function (event) {
      if (event.target.matches('[data-close-gate="true"]')) {
        closeLoginGateModal();
      }
    });

    modal.querySelector('.login-gate-modal__close').addEventListener('click', closeLoginGateModal);
    modal.querySelector('.login-gate-modal__action').addEventListener('click', closeLoginGateModal);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeLoginGateModal();
      }
    });

    return modal;
  }

  function clearTypewriterTimers() {
    typewriterTimers.forEach(function (timerId) {
      window.clearTimeout(timerId);
    });
    typewriterTimers = [];
  }

  function scheduleTypewriter(callback, delay) {
    const timerId = window.setTimeout(function () {
      typewriterTimers = typewriterTimers.filter(function (storedId) {
        return storedId !== timerId;
      });
      callback();
    }, delay);

    typewriterTimers.push(timerId);
    return timerId;
  }

  function typewriteText(target, message, options, done) {
    const minDelay = options.minDelay;
    const maxDelay = options.maxDelay;
    const pauseOnSpace = options.pauseOnSpace || 0;
    let index = 0;

    target.textContent = '';
    target.classList.add('is-typing');
    target.classList.remove('is-resting');

    function step() {
      target.textContent = message.slice(0, index + 1);
      index += 1;

      if (index >= message.length) {
        target.classList.remove('is-typing');
        if (done) {
          done();
        }
        return;
      }

      const currentCharacter = message.charAt(index - 1);
      const nextCharacter = message.charAt(index);
      let delay = minDelay + Math.random() * (maxDelay - minDelay);

      if (currentCharacter === ' ') {
        delay += pauseOnSpace;
      } else if (nextCharacter === ' ') {
        delay += pauseOnSpace * 0.45;
      }

      scheduleTypewriter(step, delay);
    }

    scheduleTypewriter(step, options.initialDelay || 0);
  }

  function restartTypewriter() {
    const titleTarget = document.querySelector('[data-typewriter-title]');
    const messageTarget = document.querySelector('[data-typewriter-text]');

    if (!titleTarget || !messageTarget) {
      return;
    }

    const titleMessage = 'YOUR JOURNEY BEGINS SOON';
    const detailMessage = 'DASHBOARD ACCESS OPENS ON JUNE 1, 2026';
    titleTarget.textContent = '';
    messageTarget.textContent = '';
    titleTarget.classList.remove('is-typing', 'is-resting');
    messageTarget.classList.remove('is-typing', 'is-resting');

    clearTypewriterTimers();

    typewriteText(titleTarget, titleMessage, {
      initialDelay: 130,
      minDelay: 50,
      maxDelay: 76,
      pauseOnSpace: 92,
    }, function () {
      titleTarget.classList.add('is-resting');

      scheduleTypewriter(function () {
        titleTarget.classList.remove('is-resting');
        typewriteText(messageTarget, detailMessage, {
          initialDelay: 0,
          minDelay: 44,
          maxDelay: 70,
          pauseOnSpace: 104,
        }, function () {
          messageTarget.classList.add('is-resting');
        });
      }, 380);
    });
  }

  function initLoginPage() {
    const form = document.getElementById('loginForm');
    const internIdInput = document.getElementById('internId');
    const dobInput = document.getElementById('dob');
    const internIdError = document.getElementById('internIdError');
    const dobError = document.getElementById('dobError');

    if (getStoredInternId()) {
      window.location.replace('dashboard.html');
      return;
    }

    if (!form || !internIdInput || !dobInput) {
      return;
    }

    internIdInput.addEventListener('input', function () {
      internIdInput.value = internIdInput.value.toUpperCase();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors(internIdError, dobError);

      const internId = internIdInput.value.trim().toUpperCase();
      const dob = dobInput.value.trim();
      const internValidation = validateInternId(internId);
      const dobValid = validateDob(dob);

      internIdInput.value = internId;

      if (!internValidation.valid) {
        internIdError.textContent = internValidation.message;
      }

      if (!dob) {
        dobError.textContent = 'Enter your password.';
      } else if (!dobValid) {
        dobError.textContent = 'Use Date of Birth format DD-MM-YYYY.';
      }

      if (!internValidation.valid || !dobValid) {
        return;
      }

      localStorage.setItem(STORAGE_KEYS.internId, internId);
      window.location.replace('dashboard.html');
    });
  }

  function initDashboardPage() {
    const internId = getStoredInternId();

    if (!internId) {
      window.location.replace('login.html');
      return;
    }

    populateDashboard(internId);
    bindLogout();
    bindBackGuard();
  }

  function validateInternId(value) {
    if (!value) {
      return { valid: false, message: 'Enter your Intern ID.' };
    }

    if (!INTERN_ID_REGEX.test(value)) {
      return { valid: false, message: 'Use the format M26IP001, M26IP002, M26IP003.' };
    }

    const numericPart = Number.parseInt(value.slice(-3), 10);
    if (!Number.isInteger(numericPart) || numericPart < 1) {
      return { valid: false, message: 'Intern ID sequence must start from 001.' };
    }

    return { valid: true, message: '' };
  }

  function validateDob(value) {
    if (!DOB_REGEX.test(value)) {
      return false;
    }

    const parts = value.split('-').map(Number);
    const date = new Date(parts[2], parts[1] - 1, parts[0]);

    return (
      date.getFullYear() === parts[2] &&
      date.getMonth() === parts[1] - 1 &&
      date.getDate() === parts[0]
    );
  }

  function isDashboardAvailable() {
    return Date.now() >= DASHBOARD_LAUNCH_AT;
  }

  function redirectWithGateNotice(destination) {
    sessionStorage.setItem(STORAGE_KEYS.loginGateNotice, 'true');
    window.location.replace(destination);
  }

  function getStoredInternId() {
    const value = localStorage.getItem(STORAGE_KEYS.internId) || '';
    return validateInternId(value).valid ? value : '';
  }

  function populateDashboard(internId) {
    const creditsFill = document.getElementById('creditsFill');
    const planDurationMap = {
      Basic: '15 Days',
      Standard: '25 Days',
      Premium: '30 Days',
      Elite: '45 Days',
    };
    const headerDuration = planDurationMap[DASHBOARD_DATA.plan] || DASHBOARD_DATA.duration;

    setText('internIdDisplay', internId);
    setText('planDisplay', DASHBOARD_DATA.plan);
    setText('startDateDisplay', DASHBOARD_DATA.startDate);
    setText('durationDisplay', headerDuration);
    setText('creditsEarnedLabel', DASHBOARD_DATA.creditsEarned + '% earned');

    if (creditsFill) {
      creditsFill.style.width = DASHBOARD_DATA.creditsEarned + '%';
    }
  }

  function bindLogout() {
    const logoutButton = document.getElementById('logoutButton');
    if (!logoutButton) {
      return;
    }

    logoutButton.addEventListener('click', function () {
      localStorage.removeItem(STORAGE_KEYS.internId);
      window.location.replace('login.html');
    });
  }

  function bindBackGuard() {
    history.pushState({ dashboardGuard: true }, '', window.location.href);
    window.addEventListener('popstate', function () {
      window.location.replace('index.html');
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function clearErrors() {
    Array.prototype.forEach.call(arguments, function (node) {
      if (node) {
        node.textContent = '';
      }
    });
  }
})();
