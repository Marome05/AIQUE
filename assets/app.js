(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer:fine)').matches;
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress');
  const preloader = document.querySelector('.preloader');
  const menu = document.querySelector('.menu-overlay');
  const menuBtn = document.querySelector('.menu-toggle');
  const cursor = document.querySelector('.cursor');
  const cursorText = cursor?.querySelector('span');
  const parallaxEls = [...document.querySelectorAll('[data-speed]')];
  const parallaxNodes = [...document.querySelectorAll('[data-parallax]')];

  let lenis = null;
  let lenisRafId = 0;
  let lenisRequested = false;
  let scrollTicking = false;
  let introFinished = false;

  const startLenisRaf = () => {
    if (!lenis || lenisRafId) return;
    const raf = (time) => {
      if (!lenis) { lenisRafId = 0; return; }
      lenis.raf(time);
      lenisRafId = requestAnimationFrame(raf);
    };
    lenisRafId = requestAnimationFrame(raf);
  };

  const initLenis = () => {
    if (reduceMotion || lenis || typeof window.Lenis !== 'function') return;
    try {
      lenis = new window.Lenis({
        lerp: 0.09,
        smoothWheel: true,
        wheelMultiplier: 0.88,
        touchMultiplier: 1.05,
        syncTouch: false,
        orientation: 'vertical',
        gestureOrientation: 'vertical'
      });
      window.__aiqueLenis = lenis;
      if (body.dataset.workLocked === '1') lenis.stop();
      lenis.on?.('scroll', queueScrollUpdate);
      startLenisRaf();
      root.classList.add('lenis-ready');
    } catch (err) {
      lenis = null;
      window.__aiqueLenis = null;
      root.classList.add('native-scroll');
    }
  };

  const requestLenis = () => {
    if (reduceMotion || lenisRequested) return;
    lenisRequested = true;
    if (typeof window.Lenis === 'function') return initLenis();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js';
    script.async = true;
    script.onload = initLenis;
    script.onerror = () => root.classList.add('native-scroll');
    document.head.appendChild(script);
  };

  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;
    preloader?.classList.add('hidden');
    body.classList.remove('is-loading');
    body.classList.add('loaded');
    if (!reduceMotion) {
      document.querySelectorAll('.mask > span').forEach((el, i) => {
        el.animate([{transform:'translateY(116%)'},{transform:'translateY(0)'}],{duration:850,delay:i*70+25,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});
      });
    }
    requestLenis();
    queueScrollUpdate();
  };

  const beginExperience = () => setTimeout(finishIntro, reduceMotion ? 0 : 560);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', beginExperience, {once:true}); else beginExperience();
  setTimeout(finishIntro, 1300);

  const setScrollLock = (locked) => {
    body.classList.toggle('ui-locked', locked);
    if (lenis) (locked || body.dataset.workLocked === '1') ? lenis.stop() : lenis.start();
  };

  const setMenu = (open) => {
    menuBtn?.classList.toggle('open', open);
    menu?.classList.toggle('open', open);
    menu?.setAttribute('aria-hidden', String(!open));
    menuBtn?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    setScrollLock(open);
  };
  menuBtn?.addEventListener('click', () => setMenu(!menu?.classList.contains('open')));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // V6: text is treated as motion, not decoration. Text-level content across
  // the site receives a small rise/sharpen reveal as it enters the viewport.
  // Top-of-page hero copy keeps the stronger line-mask intro instead.
  const textCandidates = [...document.querySelectorAll(
    'main h2, main h3, main p, main .eyebrow, main .kicker, main .meta-block, main .role-title, main .role-team, main .role-loc, main .career-note, main .visual-label, main .outcome span, main .stat-cell span'
  )].filter(el => !el.closest('.hero,.page-hero,.career-hero,.project-hero,.work-stack') && !el.closest('.mask'));

  textCandidates.forEach((el, i) => {
    if (el.classList.contains('reveal')) {
      el.classList.add('text-scroll');
    } else {
      el.classList.add('text-scroll-inline');
      el.style.setProperty('--text-delay', `${Math.min((i % 5) * 42, 168)}ms`);
    }
  });

  if ('IntersectionObserver' in window && !reduceMotion) {
    const textObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('text-in');
        textObserver.unobserve(entry.target);
      });
    }, {threshold:.08, rootMargin:'0px 0px -5%'});
    document.querySelectorAll('.text-scroll-inline').forEach(el => textObserver.observe(el));
  } else {
    document.querySelectorAll('.text-scroll-inline').forEach(el => el.classList.add('text-in'));
  }

  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .1, rootMargin: '0px 0px -4%' });
    document.querySelectorAll('.reveal').forEach((el, i) => {
      const delay = Math.min((i % 7) * 34, 170);
      el.style.transitionDelay = `${delay}ms`;
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      revealObserver.observe(el);
    });
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));

  function queueScrollUpdate(){
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || root.scrollTop || 0;
      header?.classList.toggle('scrolled', y > 40);
      const max = Math.max(1, root.scrollHeight - innerHeight);
      if (progress) progress.style.transform = `scaleX(${Math.min(1,Math.max(0,y/max))})`;
      if (!reduceMotion && innerWidth > 720) {
        for (const el of parallaxEls) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom < -260 || rect.top > innerHeight + 260) continue;
          const speed = parseFloat(el.dataset.speed) || 0;
          const center = rect.top + rect.height*.5 - innerHeight*.5;
          el.style.transform = `translate3d(0,${center * -speed * .095}px,0)`;
        }
        for (const el of parallaxNodes) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom < -180 || rect.top > innerHeight + 180) continue;
          const speed = parseFloat(el.dataset.parallax) || 0;
          const center = rect.top + rect.height*.5 - innerHeight*.5;
          const shift = Math.max(-38, Math.min(38, center * -speed));
          el.style.translate = `0 ${shift.toFixed(2)}px`;
        }
      }
      updateWorkPanels();
      scrollTicking = false;
    });
  }
  addEventListener('scroll', queueScrollUpdate,{passive:true});
  addEventListener('resize', queueScrollUpdate,{passive:true});
  queueScrollUpdate();

  if (finePointer && cursor) {
    let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;
    addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY},{passive:true});
    const animateCursor=()=>{cx+=(mx-cx)*.2;cy+=(my-cy)*.2;cursor.style.transform=`translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;requestAnimationFrame(animateCursor)};
    animateCursor();
    document.querySelectorAll('[data-cursor]').forEach(el=>{
      el.addEventListener('mouseenter',()=>{
        const label=el.dataset.cursor || 'VIEW';
        cursor.classList.toggle('arrow',label==='↗');
        cursor.classList.toggle('view',label!=='↗');
        if(cursorText)cursorText.textContent=label;
      });
      el.addEventListener('mouseleave',()=>cursor.classList.remove('view','arrow'));
    });
  }

  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.project-teaser,.service-card,.culture-card').forEach(card=>{
      let raf=0;
      card.addEventListener('pointermove',e=>{
        if(raf)return;raf=requestAnimationFrame(()=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;card.style.setProperty('--rx',`${y*-1.4}deg`);card.style.setProperty('--ry',`${x*1.8}deg`);raf=0;});
      });
      card.addEventListener('mouseleave',()=>{card.style.removeProperty('--rx');card.style.removeProperty('--ry')});
    });
  }

  // Active-state logic for the full-screen Work stack. It deliberately uses
  // native sticky positioning rather than wheel hijacking so it stays smooth.
  const workPanels = [...document.querySelectorAll('.work-panel')];
  const workProgress = document.querySelector('.work-progress');
  const progressMarks = [...document.querySelectorAll('.work-progress i')];
  function updateWorkPanels(){
    if (!workPanels.length) return;
    if (body.classList.contains('work-index-page') && body.dataset.workCurtain === '1') {
      if(workProgress){
        const stack=document.querySelector('.work-stack')?.getBoundingClientRect();
        const visible=!!stack && stack.top < innerHeight*.5 && stack.bottom > innerHeight*.5;
        workProgress.classList.toggle('visible', visible);
      }
      return;
    }
    let closestIndex=0,closest=Infinity;
    workPanels.forEach((panel,i)=>{
      const rect=panel.getBoundingClientRect();
      const d=Math.abs(rect.top);
      if(d<closest){closest=d;closestIndex=i;}
      const mesh=panel.querySelector('.mesh');
      if(mesh && !reduceMotion && innerWidth>720){
        const local=Math.max(-1,Math.min(1,rect.top/innerHeight));
        mesh.style.translate=`0 ${local*18}px`;
      }
    });
    workPanels.forEach((p,i)=>p.classList.toggle('is-active',i===closestIndex));
    progressMarks.forEach((m,i)=>m.classList.toggle('active',i===closestIndex));
    if(workProgress){
      const stack=document.querySelector('.work-stack')?.getBoundingClientRect();
      workProgress.classList.toggle('visible', !!stack && stack.top < innerHeight*.25 && stack.bottom > innerHeight*.75);
    }
  }

  // Play project hero video when visible; otherwise pause to save resources.
  const heroVideo=document.querySelector('.project-video video');
  if(heroVideo && 'IntersectionObserver' in window){
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)heroVideo.play().catch(()=>{});else heroVideo.pause()}),{threshold:.05});
    obs.observe(heroVideo);
  }
})();

/* v3: full-page curtain controller for the Work showcase.
   The viewport stays locked while browsing projects. The next panel rises over the
   previous one; scrolling upward drops the current panel to reveal the one beneath.
   Lenis is paused inside the showcase so its wheel physics never fights the curtain. */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const stack = document.querySelector('.work-stack');
  const wraps = [...document.querySelectorAll('.work-panel-wrap')];
  if (!stack || !wraps.length || !body.classList.contains('work-index-page')) return;

  body.dataset.workCurtain = '1';
  root.classList.remove('work-snap-root');
  root.classList.add('work-curtain-root');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const marks = [...document.querySelectorAll('.work-progress i')];
  const progress = document.querySelector('.work-progress');
  const prevButton = document.querySelector('[data-work-prev]');
  const nextButton = document.querySelector('[data-work-next]');
  const intro = document.querySelector('.work-intro');
  const after = stack.nextElementSibling;
  const DURATION = reduceMotion ? 1 : 760;
  const EASE = 'cubic-bezier(.22,.88,.28,1)';
  const SPRING = 'cubic-bezier(.2,.9,.25,1)';

  let active = 0;
  let transitioning = false;
  let locked = false;
  let wheelSum = 0;
  let gestureArmed = true;
  let wheelIdle = 0;
  let alignIdle = 0;
  let touchStartY = 0;
  let touchActive = false;
  let suppressLockUntil = 0;

  const pageTop = el => (window.scrollY || root.scrollTop || 0) + el.getBoundingClientRect().top;
  const lenis = () => window.__aiqueLenis;

  const panelParts = i => {
    const wrap = wraps[i];
    return {
      wrap,
      panel: wrap?.querySelector('.work-panel'),
      stage: wrap?.querySelector('.work-logo-stage'),
      content: wrap?.querySelector('.panel-content'),
      meta: wrap?.querySelector('.panel-meta'),
      mesh: wrap?.querySelector('.mesh')
    };
  };

  const setActive = (index) => {
    active = Math.max(0, Math.min(wraps.length - 1, index));
    body.dataset.workActive = String(active);
    wraps.forEach((wrap, i) => {
      const isActive = i === active;
      wrap.classList.toggle('is-active', isActive);
      wrap.querySelector('.work-panel')?.classList.toggle('is-active', isActive);
      wrap.setAttribute('aria-hidden', String(!isActive));
    });
    marks.forEach((m, i) => m.classList.toggle('active', i === active));
    if (prevButton) prevButton.disabled = active === 0;
    if (nextButton) nextButton.disabled = active === wraps.length - 1;
  };

  const resetPanel = (i, visible = false) => {
    const {wrap, stage, content, meta, mesh} = panelParts(i);
    if (!wrap) return;
    wrap.getAnimations().forEach(a => a.cancel());
    [stage,content,meta,mesh].filter(Boolean).forEach(el => el.getAnimations().forEach(a => a.cancel()));
    wrap.style.transform = visible ? 'translate3d(0,0,0)' : 'translate3d(0,100%,0)';
    wrap.style.visibility = visible ? 'visible' : 'hidden';
    wrap.style.pointerEvents = visible ? 'auto' : 'none';
    wrap.style.zIndex = visible ? '3' : '1';
    if(stage){ stage.style.transform='translateY(-50%) scale(1)'; stage.style.opacity='1'; }
    if(content){ content.style.transform='translate3d(0,0,0)'; content.style.opacity='1'; }
    if(meta){ meta.style.transform='translate3d(0,0,0)'; meta.style.opacity='1'; }
    if(mesh){ mesh.style.transform='scale(1) translate3d(0,0,0)'; mesh.style.opacity='0.8'; }
  };

  wraps.forEach((_, i) => resetPanel(i, i === 0));
  setActive(0);

  const setLocked = value => {
    locked = value;
    body.dataset.workLocked = value ? '1' : '0';
    stack.classList.toggle('is-locked', value);
    progress?.classList.toggle('visible', value);
    const l = lenis();
    if (l) value ? l.stop() : l.start();
  };

  const alignAndLock = () => {
    if (locked || transitioning) return;
    const top = pageTop(stack);
    const current = window.scrollY || 0;
    if (Math.abs(current - top) <= 2) { setLocked(true); return; }
    const l = lenis();
    if (!reduceMotion && l?.scrollTo) {
      l.scrollTo(top, {
        duration: .42,
        easing: t => 1 - Math.pow(1 - t, 4),
        lock: true,
        force: true,
        onComplete: () => setLocked(true)
      });
    } else {
      window.scrollTo({top, behavior: reduceMotion ? 'auto' : 'smooth'});
      setTimeout(() => setLocked(true), reduceMotion ? 0 : 520);
    }
  };

  const animatePartsOut = (i, direction) => {
    const {stage, content, meta, mesh} = panelParts(i);
    if(stage) stage.animate([
      {transform:'translateY(-50%) scale(1)',opacity:1},
      {transform:'translateY(-50%) scale(.93)',opacity:.66}
    ],{duration:Math.max(1,DURATION*.52),easing:'cubic-bezier(.22,.75,.24,1)',fill:'forwards'});
    if(content) content.animate([
      {transform:'translate3d(0,0,0)',opacity:1},
      {transform:`translate3d(0,${direction > 0 ? -14 : 14}px,0)`,opacity:.42}
    ],{duration:Math.max(1,DURATION*.46),easing:'cubic-bezier(.22,.75,.24,1)',fill:'forwards'});
    if(meta) meta.animate([
      {transform:'translate3d(0,0,0)',opacity:1},
      {transform:`translate3d(0,${direction > 0 ? -10 : 10}px,0)`,opacity:.34}
    ],{duration:Math.max(1,DURATION*.38),easing:'ease',fill:'forwards'});
    if(mesh) mesh.animate([
      {transform:'scale(1) translate3d(0,0,0)',opacity:.8},
      {transform:'scale(1.035) translate3d(0,-7px,0)',opacity:.58}
    ],{duration:Math.max(1,DURATION*.7),easing:EASE,fill:'forwards'});
  };

  const animatePartsIn = (i, direction) => {
    const {stage, content, meta, mesh} = panelParts(i);
    if(stage) stage.animate([
      {transform:'translateY(-50%) scale(.90)',opacity:.46},
      {transform:'translateY(-50%) scale(.975)',opacity:.86,offset:.58},
      {transform:'translateY(-50%) scale(1.012)',opacity:1,offset:.84},
      {transform:'translateY(-50%) scale(1)',opacity:1}
    ],{duration:Math.max(1,DURATION),easing:SPRING,fill:'forwards'});
    if(content) content.animate([
      {transform:`translate3d(0,${direction > 0 ? 20 : -20}px,0)`,opacity:.12},
      {transform:'translate3d(0,0,0)',opacity:1}
    ],{duration:Math.max(1,DURATION*.70),delay:Math.max(0,DURATION*.12),easing:SPRING,fill:'forwards'});
    if(meta) meta.animate([
      {transform:`translate3d(0,${direction > 0 ? 12 : -12}px,0)`,opacity:.1},
      {transform:'translate3d(0,0,0)',opacity:1}
    ],{duration:Math.max(1,DURATION*.64),delay:Math.max(0,DURATION*.16),easing:SPRING,fill:'forwards'});
    if(mesh) mesh.animate([
      {transform:'scale(1.04) translate3d(0,10px,0)',opacity:.48},
      {transform:'scale(1) translate3d(0,0,0)',opacity:.8}
    ],{duration:Math.max(1,DURATION),easing:EASE,fill:'forwards'});
  };

  const transitionTo = async (next, direction) => {
    if (transitioning || next === active || next < 0 || next >= wraps.length) return;
    transitioning = true;
    const from = active;
    const fromParts = panelParts(from);
    const toParts = panelParts(next);

    // Both panels occupy the same viewport. Down: next rises over current.
    // Up: current drops away while previous is already visible underneath.
    toParts.wrap.style.visibility = 'visible';
    toParts.wrap.style.pointerEvents = 'none';
    fromParts.wrap.style.pointerEvents = 'none';

    let curtain;
    if (direction > 0) {
      fromParts.wrap.style.zIndex = '2';
      toParts.wrap.style.zIndex = '4';
      toParts.wrap.style.transform = 'translate3d(0,100%,0)';
      animatePartsOut(from, direction);
      animatePartsIn(next, direction);
      curtain = toParts.wrap.animate([
        {transform:'translate3d(0,100%,0)'},
        {transform:'translate3d(0,0,0)'}
      ],{duration:DURATION,easing:EASE,fill:'forwards'});
    } else {
      toParts.wrap.style.zIndex = '2';
      toParts.wrap.style.transform = 'translate3d(0,0,0)';
      fromParts.wrap.style.zIndex = '4';
      animatePartsOut(from, direction);
      animatePartsIn(next, direction);
      curtain = fromParts.wrap.animate([
        {transform:'translate3d(0,0,0)'},
        {transform:'translate3d(0,100%,0)'}
      ],{duration:DURATION,easing:EASE,fill:'forwards'});
    }

    setActive(next); // dots/background state update at the start of the snap
    try { await curtain.finished; } catch (_) {}

    wraps.forEach((_, i) => resetPanel(i, i === next));
    setActive(next);
    transitioning = false;
    wheelSum = 0;
  };

  const leaveShowcase = (direction) => {
    if (transitioning) return;
    suppressLockUntil = performance.now() + (reduceMotion ? 120 : 950);
    setLocked(false);
    const destination = direction > 0
      ? (after ? pageTop(after) : pageTop(stack) + innerHeight)
      : (intro ? Math.max(0, pageTop(intro) + intro.offsetHeight - innerHeight*.92) : Math.max(0,pageTop(stack)-innerHeight));
    const l = lenis();
    if (!reduceMotion && l?.scrollTo) {
      l.scrollTo(destination,{duration:.58,easing:t=>1-Math.pow(1-t,4),force:true});
    } else {
      window.scrollTo({top:destination,behavior:reduceMotion?'auto':'smooth'});
    }
  };

  const triggerDirection = direction => {
    if (transitioning || !locked) return;
    const next = active + direction;
    if (next < 0 || next >= wraps.length) leaveShowcase(direction);
    else transitionTo(next, direction);
  };

  prevButton?.addEventListener('click', () => {
    if (!locked || transitioning || active <= 0) return;
    transitionTo(active - 1, -1);
  });
  nextButton?.addEventListener('click', () => {
    if (!locked || transitioning || active >= wraps.length - 1) return;
    transitionTo(active + 1, 1);
  });

  // Trackpad/mouse: one physical gesture = exactly one project.
  window.addEventListener('wheel', event => {
    if (!locked) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || Math.abs(event.deltaY) < 1) return;
    event.preventDefault();
    clearTimeout(wheelIdle);
    wheelIdle = setTimeout(() => {
      wheelSum = 0;
      gestureArmed = true;
    }, 105);
    if (!gestureArmed || transitioning) return;
    wheelSum += event.deltaY;
    if (Math.abs(wheelSum) < 7) return;
    gestureArmed = false;
    const direction = wheelSum > 0 ? 1 : -1;
    wheelSum = 0;
    triggerDirection(direction);
  }, {passive:false,capture:true});

  // Keyboard mirrors the reference's discrete full-page snaps.
  window.addEventListener('keydown', event => {
    if (!locked || transitioning) return;
    if (!['ArrowDown','ArrowUp','PageDown','PageUp',' '].includes(event.key)) return;
    const direction = (event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) ? -1 : 1;
    event.preventDefault();
    triggerDirection(direction);
  });

  // Touch: one vertical swipe advances one project while the stage is locked.
  stack.addEventListener('touchstart', event => {
    if (!locked || !event.touches?.length) return;
    touchStartY = event.touches[0].clientY;
    touchActive = true;
  }, {passive:true});
  stack.addEventListener('touchmove', event => {
    if (locked && touchActive) event.preventDefault();
  }, {passive:false});
  stack.addEventListener('touchend', event => {
    if (!locked || !touchActive) return;
    touchActive = false;
    const y = event.changedTouches?.[0]?.clientY ?? touchStartY;
    const delta = touchStartY - y;
    if (Math.abs(delta) > 38) triggerDirection(delta > 0 ? 1 : -1);
  }, {passive:true});

  // As the user arrives from normal page scrolling, gently finish the alignment,
  // then hand wheel control to the curtain stage. Leaving either boundary restores Lenis.
  const considerLock = () => {
    if (locked || transitioning || performance.now() < suppressLockUntil || body.classList.contains('ui-locked')) return;
    const rect = stack.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight) return;
    clearTimeout(alignIdle);
    if (Math.abs(rect.top) < 4) {
      setLocked(true);
      return;
    }
    if (rect.top > -innerHeight*.08 && rect.top < innerHeight*.20) {
      alignIdle = setTimeout(alignAndLock, 55);
    }
  };
  window.addEventListener('scroll', considerLock,{passive:true});
  window.addEventListener('resize', () => { if(locked) window.scrollTo(0,pageTop(stack)); },{passive:true});
  considerLock();
})();

/* V4 — adaptive header theme.
   The header reads the section currently passing behind it and swaps the AIQUE
   wordmark + navigation contrast without affecting layout or smooth scrolling. */
(() => {
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.menu-overlay');
  const themed = [...document.querySelectorAll('[data-header-theme]')];
  if (!header || !themed.length) return;

  let raf = 0;
  let current = '';

  const applyTheme = () => {
    raf = 0;
    const menuOpen = menu?.classList.contains('open');
    header.classList.toggle('menu-open', !!menuOpen);
    if (menuOpen) {
      header.classList.remove('theme-light');
      header.classList.add('theme-dark');
      current = 'dark';
      return;
    }

    const probe = Math.max(28, Math.min(header.getBoundingClientRect().bottom * .72, 76));
    let theme = 'dark';
    for (const el of themed) {
      const r = el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) {
        theme = el.dataset.headerTheme || 'dark';
        break;
      }
    }
    if (theme === current) return;
    current = theme;
    header.classList.toggle('theme-light', theme === 'light');
    header.classList.toggle('theme-dark', theme !== 'light');
  };

  const queue = () => {
    if (raf) return;
    raf = requestAnimationFrame(applyTheme);
  };

  addEventListener('scroll', queue, {passive:true});
  addEventListener('resize', queue, {passive:true});
  if (menu && 'MutationObserver' in window) {
    new MutationObserver(queue).observe(menu, {attributes:true, attributeFilter:['class']});
  }
  applyTheme();
})();

/* ============================================================
   v7 — word-by-word editorial reveal + project-row pointer depth
   ============================================================ */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Split only explicitly marked editorial statements, preserving nested spans.
  const splitWords = (root) => {
    if (!root || root.dataset.wordSplit === 'true') return;
    let index = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node){ return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const frag=document.createDocumentFragment();
      const parts=node.nodeValue.split(/(\s+)/);
      parts.forEach(part => {
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        const span=document.createElement('span');
        span.className='word-reveal-unit';
        span.style.setProperty('--word-index', index++);
        span.textContent=part;
        frag.appendChild(span);
      });
      node.parentNode.replaceChild(frag,node);
    });
    root.dataset.wordSplit='true';
  };

  const wordBlocks=[...document.querySelectorAll('.word-reveal')];
  wordBlocks.forEach(splitWords);
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if (!entry.isIntersecting) return;
      entry.target.classList.add('words-in');
      io.unobserve(entry.target);
    }),{threshold:.18,rootMargin:'0px 0px -8%'});
    wordBlocks.forEach(el=>io.observe(el));
  } else wordBlocks.forEach(el=>el.classList.add('words-in'));

  // Extend scroll-text choreography to the list itself.
  const rowText=[...document.querySelectorAll('.work-row-v7 .work-row-no,.work-row-v7 .work-row-title strong,.work-row-v7 .work-row-title small,.work-row-v7 .work-row-desc,.work-row-v7 .work-row-cta')];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    rowText.forEach((el,i)=>{
      el.classList.add('text-scroll-inline');
      el.style.setProperty('--text-delay',`${(i%5)*38}ms`);
    });
    const rio=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if (!entry.isIntersecting) return;
      const row=entry.target.closest('.work-row-v7');
      row?.querySelectorAll('.text-scroll-inline').forEach((node,i)=>setTimeout(()=>node.classList.add('text-in'),i*42));
      rio.unobserve(entry.target);
    }),{threshold:.18,rootMargin:'0px 0px -6%'});
    document.querySelectorAll('.work-row-v7').forEach(row=>rio.observe(row));
  } else rowText.forEach(el=>el.classList.add('text-in'));

  // Project rows react to the pointer with a subtle radial light and inner depth.
  if (matchMedia('(pointer:fine)').matches && !reduceMotion) {
    document.querySelectorAll('.work-row-v7').forEach(row=>{
      const logo=row.querySelector('.work-logo-frame');
      row.addEventListener('pointermove', e=>{
        const r=row.getBoundingClientRect();
        const x=((e.clientX-r.left)/r.width)*100;
        const y=((e.clientY-r.top)/r.height)*100;
        row.style.setProperty('--mx',`${x.toFixed(2)}%`);
        row.style.setProperty('--my',`${y.toFixed(2)}%`);
        if (logo) {
          const dx=(x-50)*.045, dy=(y-50)*.035;
          logo.style.translate=`${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
        }
      },{passive:true});
      row.addEventListener('pointerleave',()=>{
        row.style.setProperty('--mx','50%'); row.style.setProperty('--my','50%');
        if (logo) logo.style.translate='';
      },{passive:true});
    });
  }
})();

/* ============================================================
   v8 — scroll-progress word reveal + restrained interactive depth
   ============================================================ */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer:fine)').matches;

  // Progress-based reveal for the second homepage section. Unlike a one-shot
  // IntersectionObserver reveal, every word responds continuously to scroll.
  const revealSection = document.querySelector('[data-scroll-reveal-section]');
  const revealCopy = revealSection?.querySelector('[data-scroll-reveal-copy]');
  let words = [];
  if (revealCopy) {
    const text = revealCopy.textContent.trim();
    revealCopy.textContent = '';
    const parts = text.split(/(\s+)/);
    parts.forEach(part => {
      if (!part.trim()) { revealCopy.appendChild(document.createTextNode(part)); return; }
      const span = document.createElement('span');
      span.className = 'scroll-word-v8';
      span.textContent = part;
      revealCopy.appendChild(span);
      words.push(span);
    });
  }

  let revealRaf = 0;
  const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
  const updateWordReveal = () => {
    revealRaf = 0;
    if (!revealSection || !words.length || reduceMotion) return;
    const r = revealSection.getBoundingClientRect();
    const travel = Math.max(1, r.height - innerHeight);
    const progress = clamp((-r.top) / travel);
    const spread = .76;
    words.forEach((word, i) => {
      const start = (i / Math.max(1, words.length - 1)) * spread;
      const local = clamp((progress - start) / .18);
      const eased = 1 - Math.pow(1 - local, 3);
      word.style.opacity = String(.19 + eased * .81);
      word.style.transform = `translate3d(0,${(18 * (1-eased)).toFixed(2)}px,0)`;
      word.style.filter = `blur(${(4 * (1-eased)).toFixed(2)}px)`;
    });
  };
  const queueReveal = () => {
    if (revealRaf) return;
    revealRaf = requestAnimationFrame(updateWordReveal);
  };
  addEventListener('scroll', queueReveal, {passive:true});
  addEventListener('resize', queueReveal, {passive:true});
  updateWordReveal();

  // Cleaner project list interaction: pointer light follows the user but the
  // layout stays calm and list-like.
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.project-row-v8').forEach(row => {
      row.addEventListener('pointermove', e => {
        const r = row.getBoundingClientRect();
        const x = ((e.clientX-r.left)/r.width)*100;
        const y = ((e.clientY-r.top)/r.height)*100;
        row.style.setProperty('--mx', `${x.toFixed(1)}%`);
        row.style.setProperty('--my', `${y.toFixed(1)}%`);
        row.style.setProperty('--tilt-y', `${((x-50)*0.045).toFixed(2)}deg`);
        row.style.setProperty('--tilt-x', `${((50-y)*0.035).toFixed(2)}deg`);
      }, {passive:true});
      row.addEventListener('pointerleave', () => {
        row.style.setProperty('--mx','50%');
        row.style.setProperty('--my','50%');
        row.style.setProperty('--tilt-y','0deg');
        row.style.setProperty('--tilt-x','0deg');
      }, {passive:true});
    });

    // Subtle hero response: only background light follows the pointer, so video
    // playback and typography stay stable.
    document.querySelectorAll('.project-hero-v8').forEach(hero => {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        const x = ((e.clientX-r.left)/r.width)*100;
        const y = ((e.clientY-r.top)/r.height)*100;
        hero.style.setProperty('--hero-x', `${x.toFixed(1)}%`);
        hero.style.setProperty('--hero-y', `${y.toFixed(1)}%`);
      }, {passive:true});
    });
  }
})();

/* =========================================================
   V12 — About lightbox + Careers application modal
   ========================================================= */
(() => {
  // About image viewer. The page keeps all photography in the document while
  // offering a more immersive inspection interaction without a separate route.
  const lightbox = document.querySelector('.about-lightbox-v12');
  if (lightbox) {
    const sourceEls = [...document.querySelectorAll('[data-photo-lightbox]')];
    const unique = [];
    const seen = new Set();
    sourceEls.forEach(el => {
      const img = el.querySelector('img');
      if (!img || seen.has(img.getAttribute('src'))) return;
      seen.add(img.getAttribute('src'));
      unique.push({src:img.getAttribute('src'), alt:img.getAttribute('alt') || 'AIQUE team photo', caption:el.querySelector('figcaption')?.textContent?.trim() || ''});
    });
    const img = lightbox.querySelector('figure img');
    const caption = lightbox.querySelector('figure figcaption');
    let active = 0;
    const render = () => {
      const item = unique[active];
      if (!item) return;
      img.src = item.src; img.alt = item.alt; caption.textContent = item.caption || item.alt;
    };
    const open = src => {
      const idx = unique.findIndex(x => x.src === src);
      active = idx >= 0 ? idx : 0;
      render();
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden','false');
      document.body.style.overflow='hidden';
      lightbox.querySelector('.about-lightbox-close-v12')?.focus({preventScroll:true});
    };
    const close = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden','true');
      document.body.style.overflow='';
    };
    sourceEls.forEach(el => el.addEventListener('click', () => open(el.querySelector('img')?.getAttribute('src'))));
    lightbox.querySelector('.about-lightbox-close-v12')?.addEventListener('click', close);
    lightbox.querySelector('.about-lightbox-nav-v12.prev')?.addEventListener('click', () => { active=(active-1+unique.length)%unique.length; render(); });
    lightbox.querySelector('.about-lightbox-nav-v12.next')?.addEventListener('click', () => { active=(active+1)%unique.length; render(); });
    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
    addEventListener('keydown', e => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') { active=(active-1+unique.length)%unique.length; render(); }
      if (e.key === 'ArrowRight') { active=(active+1)%unique.length; render(); }
    });
  }

  // Careers prototype application modal.
  const modal = document.querySelector('.application-modal-v12');
  if (modal) {
    const form = modal.querySelector('.application-form-v12');
    const role = modal.querySelector('#apply-role-v12');
    const success = modal.querySelector('.application-success-v12');
    const head = modal.querySelector('.application-modal-head-v12');
    const actions = modal.querySelector('.application-actions-v12');
    const openButtons = [...document.querySelectorAll('[data-apply-role]')];
    const closeButtons = [...modal.querySelectorAll('[data-close-application]')];
    let lastTrigger = null;
    const open = (selectedRole, trigger) => {
      lastTrigger = trigger || null;
      if (role && selectedRole) role.value = selectedRole;
      form.hidden = false; head.hidden = false; success.hidden = true; if(actions) actions.hidden = false;
      modal.querySelector('.application-drawer-scroll-v14')?.scrollTo({top:0,behavior:'auto'});
      modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
      document.body.classList.add('application-modal-open');
      setTimeout(() => modal.querySelector('.application-modal-close-v12')?.focus({preventScroll:true}), 40);
    };
    const close = () => {
      modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
      document.body.classList.remove('application-modal-open');
      lastTrigger?.focus?.({preventScroll:true});
    };
    openButtons.forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); open(btn.dataset.applyRole, btn); }));
    closeButtons.forEach(btn => btn.addEventListener('click', close));
    addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
    form?.addEventListener('submit', e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      form.hidden = true; head.hidden = true; success.hidden = false; if(actions) actions.hidden = true;
      success.querySelector('button')?.focus({preventScroll:true});
    });
  }
})();

/* =========================================================
   V16 — interactive technology map + project showcase parallax
   ========================================================= */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer:fine)').matches;

  document.querySelectorAll('.tech-orbit-v16').forEach(orbit => {
    const coreLabel = orbit.querySelector('[data-tech-core-label]');
    const defaultLabel = coreLabel?.textContent || 'Product + Engineering';
    const chips = [...orbit.querySelectorAll('.tech-chip-v16')];
    const activate = chip => {
      orbit.classList.add('is-tech-active');
      chips.forEach(x => x.classList.toggle('is-active', x === chip));
      if (coreLabel) coreLabel.textContent = chip.dataset.techLabel || defaultLabel;
    };
    const reset = () => {
      orbit.classList.remove('is-tech-active');
      chips.forEach(x => x.classList.remove('is-active'));
      if (coreLabel) coreLabel.textContent = defaultLabel;
    };
    chips.forEach(chip => {
      chip.addEventListener('mouseenter', () => activate(chip));
      chip.addEventListener('focus', () => activate(chip));
      chip.addEventListener('mouseleave', reset);
      chip.addEventListener('blur', reset);
    });
    if (fine && !reduceMotion) {
      orbit.addEventListener('pointermove', e => {
        const r = orbit.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - .5) * 10;
        const y = ((e.clientY - r.top) / r.height - .5) * 10;
        orbit.style.setProperty('--tech-x', `${x.toFixed(2)}px`);
        orbit.style.setProperty('--tech-y', `${y.toFixed(2)}px`);
      }, {passive:true});
      orbit.addEventListener('pointerleave', () => {
        orbit.style.setProperty('--tech-x','0px');
        orbit.style.setProperty('--tech-y','0px');
        reset();
      }, {passive:true});
    }
  });

  if (fine && !reduceMotion) {
    document.querySelectorAll('.project-showcase-v16').forEach(showcase => {
      showcase.addEventListener('pointermove', e => {
        const r = showcase.getBoundingClientRect();
        const x = ((e.clientX-r.left)/r.width - .5) * 16;
        const y = ((e.clientY-r.top)/r.height - .5) * 16;
        showcase.style.setProperty('--show-x', `${x.toFixed(2)}px`);
        showcase.style.setProperty('--show-y', `${y.toFixed(2)}px`);
        showcase.style.setProperty('--show-img-x', `${(-x*.35).toFixed(2)}px`);
        showcase.style.setProperty('--show-img-y', `${(-y*.35).toFixed(2)}px`);
      }, {passive:true});
      showcase.addEventListener('pointerleave', () => {
        showcase.style.setProperty('--show-x','0px');
        showcase.style.setProperty('--show-y','0px');
        showcase.style.setProperty('--show-img-x','0px');
        showcase.style.setProperty('--show-img-y','0px');
      }, {passive:true});
    });
  }
})();

// V18 business partnership prototype form
(() => {
  const form = document.querySelector('#partnership-form-v18');
  if (!form) return;
  const status = document.querySelector('.partnership-form-status-v18');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (status) status.hidden = false;
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.innerHTML = '<span>Inquiry captured</span><b>✓</b>';
      button.disabled = true;
    }
    status?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();
