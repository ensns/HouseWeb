/* ══════════════════════════════════════════════════════════════
   HouseWeb — інтерактив
   Налаштування форми заявки — у блоці CONFIG нижче.
   ══════════════════════════════════════════════════════════════ */

const CONFIG = {
  /* Пошта власника — на неї піде заявка, якщо сервіс форм не підключено */
  ownerEmail: 'your.mail@example.com',

  /* Необов'язково: адреса від Formspree / Getform / Basin.
     Поки порожньо — форма відкриває поштову програму відвідувача.
     Приклад: 'https://formspree.io/f/abcdwxyz'                        */
  formEndpoint: ''
};

document.addEventListener('DOMContentLoaded', () => {
  const P = window.HOUSE_PHOTOS || {};

  /* ── 1. Підставляємо фото з photos.js ─────────────────────── */
  document.querySelectorAll('[data-photo]').forEach(img => {
    const item = P[img.dataset.photo];
    if (!item) return;
    img.src = item.src;
    if (item.alt && !img.alt) img.alt = item.alt;
  });

  /* ── 2. Будуємо галерею ───────────────────────────────────── */
  const grid = document.getElementById('gallery-grid');
  const shots = P.gallery || [];

  shots.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shot' + (item.size ? ` shot--${item.size}` : '');
    btn.dataset.tag = item.tag || '';
    btn.dataset.index = i;
    btn.style.animationDelay = `${Math.min(i, 8) * 45}ms`;
    btn.setAttribute('aria-label', `Відкрити фото: ${item.caption || ''}`);

    /* Через DOM, а не через рядок HTML: підпис з лапками нічого не зламає */
    const img = new Image();
    img.src = item.src;
    img.alt = item.caption || '';
    img.loading = 'lazy';
    btn.appendChild(img);

    if (item.caption) {
      const cap = document.createElement('span');
      cap.className = 'shot__caption';
      cap.textContent = item.caption;
      btn.appendChild(cap);
    }

    grid.appendChild(btn);
  });

  /* ── 3. Фільтри галереї ───────────────────────────────────── */
  const filters = document.querySelectorAll('.filter');

  filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(b => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });

    const tag = btn.dataset.filter;
    grid.querySelectorAll('.shot').forEach(shot => {
      const show = tag === 'all' || shot.dataset.tag === tag;
      shot.style.display = show ? '' : 'none';
    });
  }));

  /* Список фото, які зараз видимі — для навігації в лайтбоксі */
  const visibleShots = () =>
    [...grid.querySelectorAll('.shot')].filter(s => s.style.display !== 'none');

  /* ── 4. Лайтбокс ──────────────────────────────────────────── */
  const lb        = document.getElementById('lightbox');
  const lbImage   = document.getElementById('lb-image');
  const lbCaption = document.getElementById('lb-caption');
  const lbCounter = document.getElementById('lb-counter');
  let   lbList    = [];
  let   lbPos     = 0;
  let   lastFocus = null;

  function lbRender() {
    const item = lbList[lbPos];
    lbImage.src = item.src;
    lbImage.alt = item.caption || '';
    lbImage.classList.toggle('is-plan', !!item.isPlan);
    lbCaption.textContent = item.caption || '';

    /* Стрілки й лічильник потрібні лише коли фото більше одного */
    const many = lbList.length > 1;
    lbCounter.textContent = many ? `${lbPos + 1} / ${lbList.length}` : '';
    document.getElementById('lb-prev').hidden = !many;
    document.getElementById('lb-next').hidden = !many;
  }

  /* items — масив { src, caption }; from — елемент, якому повернути фокус */
  function lbOpen(items, startIndex, from) {
    if (!items.length) return;
    lbList = items;
    lbPos = Math.max(0, startIndex);
    lastFocus = from || null;
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    lbRender();
    document.getElementById('lb-close').focus();
  }

  function lbClose() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; }, 300);
    if (lastFocus) lastFocus.focus();
  }

  const lbStep = d => {
    lbPos = (lbPos + d + lbList.length) % lbList.length;
    lbRender();
  };

  grid.addEventListener('click', e => {
    const shot = e.target.closest('.shot');
    if (!shot) return;
    const list = visibleShots();
    lbOpen(list.map(s => shots[s.dataset.index]), list.indexOf(shot), shot);
  });

  document.getElementById('lb-close').addEventListener('click', lbClose);
  document.getElementById('lb-prev').addEventListener('click', () => lbStep(-1));
  document.getElementById('lb-next').addEventListener('click', () => lbStep(1));
  lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });

  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape')     lbClose();
    if (e.key === 'ArrowLeft')  lbStep(-1);
    if (e.key === 'ArrowRight') lbStep(1);
  });

  /* Свайп на телефоні */
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 55) lbStep(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });

  /* ── 5. Планування ────────────────────────────────────────── */
  const planTabs  = document.querySelectorAll('.plan-tab');
  const planImage = document.getElementById('plan-image');
  const planTitle = document.getElementById('plan-title');
  const planRooms = document.getElementById('plan-rooms');

  let currentPlan = null;

  /* Схема на телефоні виходить дрібною — відкриваємо її на весь екран */
  planImage.addEventListener('click', () => {
    if (currentPlan) {
      lbOpen([{ src: currentPlan.image, caption: currentPlan.title, isPlan: true }], 0, planImage);
    }
  });

  function showPlan(i) {
    const plan = (P.plans || [])[i];
    if (!plan) return;
    currentPlan = plan;
    planImage.src = plan.image;
    planImage.alt = plan.alt || plan.title;
    planTitle.textContent = plan.title;
    planRooms.innerHTML = plan.rooms
      .map(([name, area]) => `<li><span>${name}</span><b>${area}</b></li>`)
      .join('');
  }

  planTabs.forEach(tab => tab.addEventListener('click', () => {
    planTabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-pressed', String(on));
    });
    showPlan(Number(tab.dataset.plan));
  }));

  showPlan(0);

  /* ── 6. Шапка ─────────────────────────────────────────────── */
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('nav-burger');
  const links  = document.getElementById('nav-links');

  const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 60);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  burger.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });

  links.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      links.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* Зміна розміру вікна: гасимо переходи, щоб меню не миготіло */
  let resizeTimer;
  window.addEventListener('resize', () => {
    document.documentElement.classList.add('is-resizing');
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(
      () => document.documentElement.classList.remove('is-resizing'), 220);
  });

  /* ── 7. Поява блоків при прокрутці ────────────────────────── */
  let pending = [...document.querySelectorAll('.reveal')];

  if (!('IntersectionObserver' in window)) {
    pending.forEach(el => el.classList.add('is-visible'));
    pending = [];
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        obs.unobserve(en.target);
        pending = pending.filter(el => el !== en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    pending.forEach(el => io.observe(el));

    /* Страховка на випадок, коли спостерігач не спрацьовує (фонова вкладка,
       нетиповий браузер): те саме перевіряємо при прокрутці. Коли все
       показано — слухач знімається сам. */
    const sweep = () => {
      pending = pending.filter(el => {
        if (el.getBoundingClientRect().top >= window.innerHeight) return true;
        el.classList.add('is-visible');
        io.unobserve(el);
        return false;
      });
      if (!pending.length) {
        window.removeEventListener('scroll', sweep);
        window.removeEventListener('resize', sweep);
      }
    };

    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep);
    setTimeout(sweep, 1200);
  }

  /* ── 8. Форма заявки ──────────────────────────────────────── */
  const form   = document.getElementById('lead-form');
  const status = document.getElementById('form-status');

  const setStatus = (text, kind) => {
    status.textContent = text;
    status.className = 'form__status' + (kind ? ` is-${kind}` : '');
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();

    let valid = true;
    form.querySelectorAll('[required]').forEach(input => {
      const bad = !input.value.trim();
      input.closest('.field').classList.toggle('is-invalid', bad);
      if (bad) valid = false;
    });

    if (!valid) {
      setStatus('Заповніть, будь ласка, ім’я та телефон.', 'err');
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    /* Варіант А: підключено сервіс форм */
    if (CONFIG.formEndpoint) {
      setStatus('Надсилаємо…');
      try {
        const res = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form)
        });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        setStatus('Дякуємо! Ми зателефонуємо найближчим часом.', 'ok');
      } catch (err) {
        setStatus('Не вдалося надіслати. Зателефонуйте, будь ласка, напряму.', 'err');
      }
      return;
    }

    /* Варіант Б: без сервера — відкриваємо поштову програму */
    const body = [
      `Ім'я: ${data.name}`,
      `Телефон: ${data.phone}`,
      `Зручний день: ${data.when || '—'}`,
      '',
      data.message || ''
    ].join('\n');

    window.location.href =
      `mailto:${CONFIG.ownerEmail}` +
      `?subject=${encodeURIComponent('Заявка на перегляд — вул. Садова, 12')}` +
      `&body=${encodeURIComponent(body)}`;

    setStatus('Відкрили поштову програму — надішліть готового листа.', 'ok');
  });
});
