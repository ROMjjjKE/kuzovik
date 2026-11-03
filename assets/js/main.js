/* Кузовик. Интерфейс: меню, сравнение «до/после», подсветка слоёв, форма. */
(function () {
  'use strict';

  const CONFIG = {
    phone: '+375291700087',
    whatsapp: '375291700087',
    formEndpoint: '' // вставьте URL обработчика (Formspree, CRM), чтобы заявки уходили автоматически
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- шапка ---------- */
  const header = $('#header');
  const fab = $('.fab');
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 8);
    fab?.classList.toggle('is-visible', y > window.innerHeight * 0.6);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- мобильное меню ---------- */
  const burger = $('#burger');
  const menu = $('#menu');
  const closeMenu = () => {
    if (!menu?.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger?.setAttribute('aria-expanded', 'false');
    burger?.setAttribute('aria-label', 'Открыть меню');
    document.body.classList.remove('nav-locked');
  };
  const openMenu = () => {
    menu?.classList.add('is-open');
    menu?.setAttribute('aria-hidden', 'false');
    burger?.setAttribute('aria-expanded', 'true');
    burger?.setAttribute('aria-label', 'Закрыть меню');
    document.body.classList.add('nav-locked');
  };
  burger?.addEventListener('click', () => (menu?.classList.contains('is-open') ? closeMenu() : openMenu()));
  $$('#menu a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 1080) closeMenu(); });

  /* ---------- сравнение до/после ---------- */
  const compare = $('#compare');
  const range = $('#compareRange');
  const before = $('#compareBefore');
  const setPos = (v) => {
    const pos = Math.max(0, Math.min(100, v));
    compare?.style.setProperty('--pos', pos + '%');
    if (before) before.style.setProperty('--pos', pos + '%');
    if (range && Number(range.value) !== Math.round(pos)) range.value = String(Math.round(pos));
  };
  setPos(50);
  range?.addEventListener('input', () => setPos(Number(range.value)));

  if (compare) {
    let dragging = false;
    const fromEvent = (e) => {
      const r = compare.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      setPos((x / r.width) * 100);
    };
    const start = (e) => { dragging = true; fromEvent(e); };
    const move = (e) => { if (dragging) { fromEvent(e); e.preventDefault(); } };
    const end = () => { dragging = false; };

    compare.addEventListener('pointerdown', (e) => { if (e.target === range) return; start(e); });
    compare.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    compare.addEventListener('pointercancel', end);

    // деликатная подсказка при первом появлении в кадре
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          let t0 = null;
          const dur = 1400;
          const step = (ts) => {
            if (t0 === null) t0 = ts;
            const p = Math.min(1, (ts - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setPos(50 + Math.sin(eased * Math.PI * 2) * 18 * (1 - eased));
            if (p < 1) requestAnimationFrame(step);
            else setPos(50);
          };
          requestAnimationFrame(step);
        });
      }, { threshold: 0.5 });
      io.observe(compare);
    }
  }

  /* ---------- подсветка слоёв ---------- */
  const layers = $$('.layer');
  const bars = $$('.stack__bar');
  if (layers.length && 'IntersectionObserver' in window) {
    const layerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const idx = Number(entry.target.dataset.layer || 0);
        layers.forEach((l) => l.classList.toggle('is-active', l === entry.target));
        bars.forEach((bar) => {
          bar.classList.toggle('is-on', Number(bar.dataset.stack) <= idx);
        });
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    layers.forEach((l) => layerObserver.observe(l));
  } else {
    bars.forEach((bar) => bar.classList.add('is-on'));
  }

  /* ---------- плавные якоря ---------- */
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- активный пункт меню ---------- */
  const navLinks = $$('.nav a');
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- форма ---------- */
  const form = $('#leadForm');
  const success = $('#formSuccess');
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const setError = (name, message) => {
    const slot = document.querySelector('[data-error-for="' + name + '"]');
    if (slot) slot.textContent = message || '';
  };

  const collect = () => {
    const data = new FormData(form);
    return {
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      work: String(data.get('work') || '').trim(),
      details: String(data.get('details') || '').trim()
    };
  };

  const buildText = (d) => {
    const lines = [
      'Заявка с сайта: антикоррозионная обработка',
      'Имя: ' + d.name,
      'Телефон: ' + d.phone
    ];
    if (d.work) lines.push('Что обработать: ' + d.work);
    if (d.details) lines.push('Объект: ' + d.details);
    return lines.join('\n');
  };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = collect();
    let ok = true;
    setError('name', '');
    setError('phone', '');

    if (d.name.length < 2) { setError('name', 'Как к вам обращаться?'); ok = false; }
    const digits = d.phone.replace(/\D/g, '');
    if (digits.length < 9) { setError('phone', 'Проверьте номер: нужно не меньше 9 цифр'); ok = false; }
    if (!ok) {
      const firstError = form.querySelector('.field__error:not(:empty)');
      firstError?.closest('.field')?.querySelector('input')?.focus();
      return;
    }

    const text = buildText(d);
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    if (CONFIG.formEndpoint) {
      try {
        await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(d)
        });
      } catch (err) {
        /* тихо: покажем кнопки связи */
      }
    }

    const wa = $('#successWa');
    const call = $('#successCall');
    if (wa) wa.href = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text);
    if (call) call.href = 'tel:' + CONFIG.phone;
    if (success) success.hidden = false;
    if (submit) {
      submit.disabled = false;
      submit.textContent = 'Заявка собрана';
    }
    success?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();
