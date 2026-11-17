(function(){
  'use strict';
  window.__sweet = true;
  var IMG = 'assets/img/';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#f8aec0','#f5849c','#e64870','#87152c','#ffe7b8','#fcd0d7'];
  function $(id){ return document.getElementById(id); }

  /* keep anchored sections clear of the sticky header */
  document.querySelectorAll('section[id]').forEach(function(s){ s.style.scrollMarginTop = '96px'; });
  if (location.hash && location.hash.length > 1) {
    window.addEventListener('load', function(){ var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); });
  }

  /* ---------- drop date ----------
     Leave DROP_DATE empty to always use the coming Saturday (Barbados time),
     or set a specific drop, e.g. '2026-10-31'. */
  var DROP_DATE = '';
  var BB = -4 * 60; // Barbados is UTC-4 all year
  function bbNow(){ var n = new Date(); return new Date(n.getTime() + BB * 60000); } // read with getUTC*
  function dropDay(){
    if (DROP_DATE) { var p = DROP_DATE.split('-'); return Date.UTC(+p[0], +p[1]-1, +p[2]); }
    var b = bbNow(); var days = (6 - b.getUTCDay() + 7) % 7;
    return Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() + days);
  }
  var DAY = dropDay();
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var d0 = new Date(DAY);
  var DROP_LABEL = WEEKDAYS[d0.getUTCDay()] + ', ' + d0.getUTCDate() + ' ' + MONTHS[d0.getUTCMonth()] + ' ' + d0.getUTCFullYear();
  var DROP_SHORT = WEEKDAYS[d0.getUTCDay()] + ' ' + d0.getUTCDate() + ' ' + MONTHS[d0.getUTCMonth()];
  document.querySelectorAll('[data-drop-date]').forEach(function(el){ el.textContent = DROP_SHORT; });

  /* ---------- menu + year ---------- */
  var toggle = $('menu-toggle'), nav = $('site-nav');
  function setMenu(open){ if (!nav) return; nav.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.innerHTML = open ? '<i class="ph-bold ph-x"></i>' : '<i class="ph-bold ph-list"></i>'; }
  if (toggle && nav) {
    toggle.addEventListener('click', function(e){ e.stopPropagation(); setMenu(!nav.classList.contains('open')); });
    nav.addEventListener('click', function(e){ if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', function(e){ if (nav.classList.contains('open') && !nav.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') setMenu(false); });
    var menuY = 0;
    toggle.addEventListener('click', function(){ menuY = window.scrollY; });
    window.addEventListener('scroll', function(){ if (nav.classList.contains('open') && Math.abs(window.scrollY - menuY) > 60) setMenu(false); }, { passive: true });
    window.addEventListener('resize', function(){ if (window.innerWidth > 820 && nav.classList.contains('open')) setMenu(false); });
  }
  document.querySelectorAll('[data-year]').forEach(function(el){ el.textContent = new Date().getFullYear(); });

  /* ---------- toast ---------- */
  var toastEl = document.querySelector('.toast'), toastTimer;
  window.showToast = function(msg){ if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 3600); };

  /* ---------- countdown ---------- */
  var cdWrap = $('countdown');
  if (cdWrap) {
    var cd = {}; ['d','h','m','s'].forEach(function(k){ cd[k] = cdWrap.querySelector('[data-cd="'+k+'"]'); });
    var target = DAY - BB * 60000; // midnight Saturday in Barbados, as a real timestamp
    if (Date.now() >= target) {
      $('cd-title').textContent = 'It\'s Saturday Treats day!';
      $('countdown-date').textContent = 'Today\'s rolls are being finished with love.';
    } else {
      $('countdown-date').textContent = 'Next drop: ' + DROP_SHORT;
    }
    var pad = function(n){ return (n < 10 ? '0' : '') + n; };
    var setCd = function(el, v){ v = pad(v); if (el.textContent === v) return; el.textContent = v; if (!reduce) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } };
    var tick = function(){
      var s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setCd(cd.d, Math.floor(s/86400)); setCd(cd.h, Math.floor(s%86400/3600));
      setCd(cd.m, Math.floor(s%3600/60)); setCd(cd.s, s%60);
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- sprinkles ---------- */
  document.querySelectorAll('canvas.sprinkles').forEach(function(sc){
    var sx = sc.getContext('2d'), sp = [], sw = 0, sh = 0;
    if (!sx) return;
    function size(){ var r = sc.getBoundingClientRect(), d = window.devicePixelRatio || 1; sw = r.width; sh = r.height; sc.width = sw*d; sc.height = sh*d; sx.setTransform(d,0,0,d,0,0);
      sp = []; var n = Math.round(sw*sh/9000);
      for (var i=0;i<n;i++) sp.push({x:Math.random()*sw,y:Math.random()*sh,a:Math.random()*Math.PI,va:(Math.random()-.5)*.01,vy:.12+Math.random()*.25,c:COLORS[i%COLORS.length],l:7+Math.random()*6,o:.25+Math.random()*.35});
      draw(); }
    function draw(){ sx.clearRect(0,0,sw,sh); sp.forEach(function(p){ sx.save(); sx.globalAlpha=p.o; sx.translate(p.x,p.y); sx.rotate(p.a); sx.fillStyle=p.c; sx.beginPath(); if (sx.roundRect) sx.roundRect(-p.l/2,-2,p.l,4,2); else sx.rect(-p.l/2,-2,p.l,4); sx.fill(); sx.restore(); }); }
    function step(){ sp.forEach(function(p){ p.y+=p.vy; p.a+=p.va; if (p.y>sh+10){ p.y=-10; p.x=Math.random()*sw; } }); draw(); requestAnimationFrame(step); }
    size(); window.addEventListener('resize', size); if (!reduce) requestAnimationFrame(step);
  });

  /* ---------- confetti ---------- */
  var cc = $('confetti'), cx = cc && cc.getContext('2d'), bits = [], running = false;
  function sizeC(){ if (!cx) return; var d = window.devicePixelRatio || 1; cc.width = innerWidth*d; cc.height = innerHeight*d; cx.setTransform(d,0,0,d,0,0); }
  sizeC(); window.addEventListener('resize', sizeC);
  function stepC(){ cx.clearRect(0,0,innerWidth,innerHeight);
    bits.forEach(function(b){ b.x+=b.vx; b.y+=b.vy; b.vy+=.18; b.vx*=.98; b.r+=b.vr; b.life-=.012;
      cx.save(); cx.globalAlpha=Math.max(0,b.life); cx.translate(b.x,b.y); cx.rotate(b.r); cx.fillStyle=b.c;
      if (b.t==='h'){ cx.font='16px Poppins, sans-serif'; cx.fillText('♥',-6,6); } else { cx.fillRect(-5,-2,10,4); }
      cx.restore(); });
    bits = bits.filter(function(b){ return b.life>0 && b.y<innerHeight+20; });
    if (bits.length) requestAnimationFrame(stepC); else { running=false; cx.clearRect(0,0,innerWidth,innerHeight); }
  }
  function burst(x, y, n){
    if (reduce || !cx) return;
    for (var i=0;i<(n||46);i++){ var a = Math.random()*Math.PI*2, v = 3+Math.random()*6;
      bits.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:COLORS[i%COLORS.length],t:Math.random()<.35?'h':'s',life:1}); }
    if (!running){ running = true; requestAnimationFrame(stepC); }
  }
  function burstAt(el, n){ var r = el.getBoundingClientRect(); burst(r.left + r.width/2, r.top + r.height/2, n); }
  var badge = $('badge'); if (badge) badge.addEventListener('click', function(){ burstAt(badge, 60); });
  function bump(el){ if (!el || reduce) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  /* ---------- scroll reveal with stagger ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal, [data-observe]'));
  revealEls.forEach(function(el){
    if (!el.classList.contains('reveal')) return;
    var sibs = Array.prototype.filter.call(el.parentNode.children, function(c){ return c.classList.contains('reveal'); });
    var i = sibs.indexOf(el); if (i > 0) el.style.setProperty('--d', Math.min(i, 6) * 90 + 'ms');
  });
  function countUp(el){
    if (el.getAttribute('data-done')) return; el.setAttribute('data-done', '1');
    var to = +el.getAttribute('data-count'), suffix = el.getAttribute('data-suffix') || '', t0 = null;
    if (reduce) { el.textContent = to + suffix; return; }
    function f(t){ if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix; if (p < 1) requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }
  function show(el){ el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(countUp); if (el.hasAttribute('data-count')) countUp(el); }
  if (reduce || !('IntersectionObserver' in window)) revealEls.forEach(show);
  else {
    var io = new IntersectionObserver(function(entries){ entries.forEach(function(en){ if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  }

  /* ---------- awning: compact on scroll + progress piping ---------- */
  var header = document.querySelector('.site-header'), bar = $('scroll-bar'), toTop = $('to-top'), ticking = false;
  function onScroll(){
    ticking = false;
    var y = window.scrollY || window.pageYOffset, max = document.documentElement.scrollHeight - innerHeight;
    if (header) { if (y > 140) header.classList.add('compact'); else if (y < 40) header.classList.remove('compact'); }
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    if (toTop) { toTop.classList.toggle('show', y > 700); toTop.style.setProperty('--spin', (y / 3) + 'deg'); }
  }
  window.addEventListener('scroll', function(){ if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); burstAt(toTop, 30); });

  /* ---------- rising hearts in the pink call-to-action bands ---------- */
  document.querySelectorAll('canvas.hearts').forEach(function(hc){
    var hx = hc.getContext('2d'), hs = [], w = 0, h = 0;
    if (!hx || reduce) return;
    function size(){ var r = hc.getBoundingClientRect(), d = window.devicePixelRatio || 1; w = r.width; h = r.height; hc.width = w*d; hc.height = h*d; hx.setTransform(d,0,0,d,0,0);
      hs = []; for (var i = 0; i < Math.round(w / 40); i++) hs.push(newHeart(true)); }
    function newHeart(anywhere){ return { x: Math.random()*w, y: anywhere ? Math.random()*h : h + 20, s: 10 + Math.random()*16, v: .3 + Math.random()*.6, a: Math.random()*6.28, o: .15 + Math.random()*.35 }; }
    function step(){ hx.clearRect(0,0,w,h);
      hs.forEach(function(p, i){ p.y -= p.v; p.a += .02; if (p.y < -30) hs[i] = newHeart(false);
        hx.globalAlpha = p.o; hx.fillStyle = '#fff'; hx.font = p.s + 'px Poppins, sans-serif'; hx.fillText('♥', p.x + Math.sin(p.a)*12, p.y); });
      requestAnimationFrame(step); }
    size(); window.addEventListener('resize', size); requestAnimationFrame(step);
  });

  /* ---------- gentle 3D tilt on menu cards, parallax on the hero box ---------- */
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  if (!reduce && finePointer) {
    document.querySelectorAll('.flavour').forEach(function(card){
      card.addEventListener('pointermove', function(e){ var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        card.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg'); card.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg'); });
      card.addEventListener('pointerleave', function(){ card.style.setProperty('--ry', '0deg'); card.style.setProperty('--rx', '0deg'); });
    });
    var art = document.querySelector('.hero-art'), hero = document.querySelector('.hero');
    if (art && hero) {
      hero.addEventListener('pointermove', function(e){ var r = hero.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        art.style.transform = 'translate(' + (px * 18).toFixed(1) + 'px,' + (py * 14).toFixed(1) + 'px)'; });
      hero.addEventListener('pointerleave', function(){ art.style.transform = ''; });
    }
  }

  /* ---------- a little sprinkle pop on main buttons ---------- */
  document.addEventListener('pointerdown', function(e){
    var b = e.target.closest('.btn, .nav-cta, .ic-add, .os-add'); if (!b || b.disabled || reduce) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement('span');
    s.className = 'ripple'; s.style.width = s.style.height = d + 'px';
    s.style.left = (e.clientX - r.left - d / 2) + 'px'; s.style.top = (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(s); setTimeout(function(){ s.remove(); }, 700);
  });

  /* ---------- menu data (BBD, priced per roll, boxes of 2, 4 or 6) ---------- */
  var FLAV = {
    classic: { label:'Sweetheart Classic', short:'Classic', img:'classic-cinnamon-roll.png', price:6 },
    biscoff: { label:'Biscoff Dream',      short:'Biscoff', img:'biscoff-cinnamon-roll.png', price:8.5 },
    apple:   { label:'Apple Cinnamon',     short:'Apple',   img:'apple-cinnamon-roll.png',   price:8.5 }
  };
  var KEYS = ['classic','biscoff','apple'];
  var SIZES = [2,4,6];
  function money(v){ return '$' + (Math.round(v * 100) / 100).toFixed(2); }
  function slotsClass(n){ return 'slots' + (n === 4 ? ' four' : n === 2 ? ' two' : ''); }
  function slotsHtml(list, size, animate, removable){
    var out = '';
    for (var i = 0; i < size; i++){
      var f = FLAV[list[i]];
      if (f) out += (removable ? '<button type="button" class="slot filled" data-slot="'+i+'" aria-label="Remove one '+f.short+'">' : '<div class="slot">') +
        '<img src="'+IMG+f.img+'" alt="'+(removable ? '' : f.label)+'" style="animation-delay:'+(animate ? i*60 : 0)+'ms">' + (removable ? '</button>' : '</div>');
      else out += '<div class="slot empty"></div>';
    }
    return out;
  }
  /* counts {classic:2, apple:2} -> ['classic','classic','apple','apple'] */
  function countsToList(c){ var l = []; KEYS.forEach(function(k){ for (var i=0;i<(c[k]||0);i++) l.push(k); }); return l; }
  function countsTotal(c){ return KEYS.reduce(function(s,k){ return s + (c[k]||0); }, 0); }
  function countsPrice(c){ return KEYS.reduce(function(s,k){ return s + (c[k]||0) * FLAV[k].price; }, 0); }
  function countsText(c){ return KEYS.filter(function(k){ return c[k]; }).map(function(k){ return c[k] + ' ' + FLAV[k].short; }).join(', '); }

  /* ---------- homepage "fill a box" toy ---------- */
  var homeSlots = $('slots');
  if (homeSlots) {
    var hSize = 4, hCounts = { classic:2, apple:2 };
    var hChips = $('pick-chips');
    KEYS.forEach(function(k){ var b = document.createElement('button'); b.type = 'button'; b.className = 'pick'; b.setAttribute('data-add', k); b.innerHTML = '<img src="'+IMG+FLAV[k].img+'" alt="">' + FLAV[k].short + ' <small>' + money(FLAV[k].price) + '</small>'; hChips.appendChild(b); });
    var hRender = function(animate){
      document.querySelectorAll('[data-home-size]').forEach(function(b){ b.classList.toggle('active', +b.getAttribute('data-home-size') === hSize); });
      var n = countsTotal(hCounts), full = n >= hSize;
      homeSlots.className = slotsClass(hSize);
      homeSlots.innerHTML = slotsHtml(countsToList(hCounts), hSize, animate, true);
      hChips.querySelectorAll('[data-add]').forEach(function(b){ b.disabled = full; });
      $('pick-count').textContent = n + ' of ' + hSize + ' rolls';
      $('pick-hint').textContent = full ? 'Your box is full. Tap a roll in the box to take it out.' : 'Tap a flavour to add a roll. ' + (hSize - n) + ' space' + (hSize - n === 1 ? '' : 's') + ' left.';
      $('box-name').textContent = 'Box of ' + hSize;
      $('box-detail').textContent = n ? countsText(hCounts) : 'Add some rolls';
      var bs = $('box-sum'), bsv = money(countsPrice(hCounts)); if (bs.textContent !== bsv) { bs.textContent = bsv; bump(bs); }
    };
    document.querySelectorAll('[data-home-size]').forEach(function(b){ b.addEventListener('click', function(){
      hSize = +b.getAttribute('data-home-size');
      var list = countsToList(hCounts).slice(0, hSize); hCounts = {}; list.forEach(function(k){ hCounts[k] = (hCounts[k]||0) + 1; });
      hRender(true);
    }); });
    hChips.addEventListener('click', function(e){ var b = e.target.closest('[data-add]'); if (!b || b.disabled) return;
      var k = b.getAttribute('data-add'); hCounts[k] = (hCounts[k]||0) + 1; hRender(false);
      if (countsTotal(hCounts) === hSize) burstAt(homeSlots, 50);
    });
    homeSlots.addEventListener('click', function(e){ var s = e.target.closest('[data-slot]'); if (!s) return;
      var k = countsToList(hCounts)[+s.getAttribute('data-slot')]; if (k) { hCounts[k]--; if (!hCounts[k]) delete hCounts[k]; hRender(false); }
    });
    hRender(false);
  }

  /* ---------- Saturday Treats order builder (opens WhatsApp with the order) ---------- */
  var wizard = $('wizard');
  if (!wizard) return;
  var WHATSAPP = '12462644609';
  var PARISHES = ['St. Michael','Christ Church','St. Philip','St. George','St. James','St. Thomas','St. John','St. Joseph','St. Peter','St. Andrew','St. Lucy'];
  function newBox(){ return { mode:'single', flavour:'classic', size:2, mix:{ classic:1, apple:1 }, mixSize:2 }; }
  var ref = (function(){ var d = new Date(DAY); var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i=0;i<4;i++) s += chars[Math.floor(Math.random()*chars.length)]; return 'DP-' + String(d.getUTCMonth()+1).padStart(2,'0') + String(d.getUTCDate()).padStart(2,'0') + '-' + s; })();
  var S = { step:1, boxes:[newBox()], active:0, fulfil:'Pickup', parish:'', pay:'CIBC First Pay', diet:['No dietary needs'] };
  var panels = wizard.querySelectorAll('.step-panel'), dots = wizard.querySelectorAll('.step-dots li');
  var STEPS = panels.length;
  var box = function(){ return S.boxes[S.active]; };

  function boxCounts(b){ if (b.mode === 'single') { var c = {}; c[b.flavour] = b.size; return c; } return b.mix; }
  function boxSize(b){ return b.mode === 'single' ? b.size : b.mixSize; }
  function boxPrice(b){ return countsPrice(boxCounts(b)); }
  function boxFull(b){ return countsTotal(boxCounts(b)) === boxSize(b); }
  function total(){ return S.boxes.reduce(function(s,b){ return s + boxPrice(b); }, 0); }
  function rollCount(){ return S.boxes.reduce(function(s,b){ return s + countsTotal(boxCounts(b)); }, 0); }
  function boxTitle(b){ return b.mode === 'single' ? b.size + ' ' + FLAV[b.flavour].label : 'Mixed box of ' + b.mixSize; }
  function boxDetail(b){
    if (b.mode === 'single') return 'Box of ' + b.size + ', all ' + FLAV[b.flavour].short + ' (' + money(FLAV[b.flavour].price) + ' each)';
    var n = countsTotal(b.mix);
    return n ? countsText(b.mix) + (n < b.mixSize ? ' (' + (b.mixSize - n) + ' more to choose)' : '') : 'Choose ' + b.mixSize + ' rolls';
  }
  function val(id){ var el = $(id); return el ? el.value.trim() : ''; }
  function prettyTime(v){ if (!v) return ''; var p = v.split(':'), h = +p[0], m = p[1]; if (isNaN(h)) return v; var ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m + ' ' + ap; }
  function isDelivery(){ return S.fulfil === 'Delivery'; }

  function renderBox(animate){
    var b = box(), mixed = b.mode === 'mixed';
    wizard.querySelectorAll('[data-mode]').forEach(function(x){ x.classList.toggle('active', x.getAttribute('data-mode') === b.mode); });
    $('single-area').hidden = mixed; $('mixed-area').hidden = !mixed;
    wizard.querySelectorAll('[data-flavour]').forEach(function(x){ x.classList.toggle('active', x.getAttribute('data-flavour') === b.flavour); });
    wizard.querySelectorAll('[data-size]').forEach(function(x){ var n = +x.getAttribute('data-size'); x.classList.toggle('active', n === b.size); x.querySelector('strong').textContent = money(FLAV[b.flavour].price * n); });
    wizard.querySelectorAll('[data-mixsize]').forEach(function(x){ x.classList.toggle('active', +x.getAttribute('data-mixsize') === b.mixSize); });
    var left = b.mixSize - countsTotal(b.mix);
    KEYS.forEach(function(k){
      var row = wizard.querySelector('[data-row="'+k+'"]'); if (!row) return;
      var q = row.querySelector('.qty'), nv = String(b.mix[k] || 0); if (q.textContent !== nv) { q.textContent = nv; bump(q); }
      row.querySelector('[data-minus]').disabled = !(b.mix[k] > 0);
      row.querySelector('[data-plus]').disabled = left <= 0;
      row.classList.toggle('on', (b.mix[k]||0) > 0);
    });
    $('mix-count').textContent = countsTotal(b.mix) + ' of ' + b.mixSize + ' chosen';
    $('mix-count').classList.toggle('done', left === 0);
    $('sel-label').textContent = 'Box ' + (S.active + 1) + ' of ' + S.boxes.length;
    $('sel-title').textContent = boxTitle(b);
    $('sel-detail').textContent = boxDetail(b);
    var sp = $('sel-price'), spv = money(boxPrice(b)); if (sp.textContent !== spv) { sp.textContent = spv; bump(sp); }
    var stage = $('roll-slots');
    stage.className = slotsClass(boxSize(b)); stage.innerHTML = slotsHtml(countsToList(boxCounts(b)), boxSize(b), animate, false);
    renderBoxList(); renderTotal();
  }
  function renderBoxList(){
    $('box-count').textContent = S.boxes.length + ' of 3 boxes in your order';
    var add = $('add-box'); add.disabled = S.boxes.length >= 3;
    add.innerHTML = S.boxes.length >= 3 ? '<i class="ph-fill ph-check"></i> 3 box limit reached' : '<i class="ph-fill ph-plus"></i> Add another box';
    var wrap = $('box-list'); wrap.innerHTML = '';
    S.boxes.forEach(function(b, i){
      var item = document.createElement('div'); item.className = 'box-item' + (i === S.active ? ' active' : '');
      item.innerHTML = '<button type="button" class="box-edit" data-edit="'+i+'"><span>Box '+(i+1)+(i === S.active ? ' · editing' : '')+'</span><strong></strong><small>'+money(boxPrice(b))+' BBD · tap to edit</small></button>' + (S.boxes.length > 1 ? '<button type="button" class="box-remove" data-remove="'+i+'" aria-label="Remove box '+(i+1)+'">×</button>' : '');
      item.querySelector('strong').textContent = boxTitle(b);
      wrap.appendChild(item);
    });
  }
  function renderTotal(){
    var pp = $('progress-price'), ppv = money(total()) + ' BBD total'; if (pp.textContent !== ppv) { pp.textContent = ppv; bump(pp); }
    var st = $('send-total'); if (st) st.textContent = money(total()) + ' BBD';
    var sl = $('send-total-label'); if (sl) sl.textContent = isDelivery() ? 'Food subtotal' : 'Total';
    var so = $('send-order'); if (so) so.textContent = S.boxes.length + (S.boxes.length === 1 ? ' box' : ' boxes') + ', ' + rollCount() + ' rolls · ' + S.fulfil;
    var dn = $('send-delivery-note'); if (dn) dn.hidden = !isDelivery();
  }

  function message(){
    var L = [];
    L.push("Hello De' Patisserie, I would like to place a Saturday Treats order.");
    L.push('');
    L.push('Order date: ' + DROP_LABEL);
    L.push('Order reference: ' + ref);
    L.push('');
    L.push('MY ORDER');
    S.boxes.forEach(function(b, i){
      var line = 'Box ' + (i+1) + ': ' + boxTitle(b);
      if (b.mode === 'mixed') line += ' (' + countsText(b.mix) + ')';
      L.push(line + ' - ' + money(boxPrice(b)) + ' BBD');
    });
    if (isDelivery()) { L.push('Food subtotal: ' + money(total()) + ' BBD'); L.push('Delivery fee: to be confirmed'); }
    else L.push('Total: ' + money(total()) + ' BBD');
    L.push('');
    L.push('PICKUP OR DELIVERY');
    L.push('Method: ' + S.fulfil);
    if (isDelivery()) { L.push('Parish: ' + (S.parish || '-')); L.push('Area / landmark: ' + (val('delivery-area') || '-')); L.push('Preferred delivery time: ' + (prettyTime(val('delivery-time')) || '-')); }
    else L.push('Preferred pickup time: ' + (prettyTime(val('pickup-time')) || '-'));
    L.push('');
    L.push('MY DETAILS');
    L.push('Name: ' + (val('cust-name') || '-'));
    L.push('WhatsApp number: ' + (val('cust-whatsapp') || '-'));
    if (val('cust-email')) L.push('Email: ' + val('cust-email'));
    L.push('Payment method: ' + S.pay);
    L.push('Dietary needs: ' + S.diet.join(', '));
    L.push('Notes: ' + (val('cust-notes') || 'None'));
    L.push('');
    L.push('I understand my order is confirmed once you approve it and receive the 50% deposit. Thank you.');
    return L.join('\n');
  }
  function waLink(){ return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(message()); }

  function check(step){
    if (step === 1) {
      for (var i = 0; i < S.boxes.length; i++) { var b = S.boxes[i];
        if (!boxFull(b)) { var left = boxSize(b) - countsTotal(boxCounts(b)); return 'Box ' + (i+1) + ': choose ' + left + ' more roll' + (left === 1 ? '' : 's') + ' to fill your mixed box of ' + b.mixSize + '.'; } }
    }
    if (step === 2) {
      if (isDelivery()) { if (!S.parish) return 'Please choose your delivery parish.'; if (!val('delivery-area')) return 'Please add your delivery area or a landmark.'; if (!val('delivery-time')) return 'Please add your preferred delivery time.'; }
      else if (!val('pickup-time')) return 'Please add your preferred pickup time.';
    }
    if (step === 3) { if (!val('cust-name')) return 'Please add your name.'; if (!val('cust-whatsapp')) return 'Please add your WhatsApp number so we can confirm your order.'; }
    return '';
  }
  function checkAll(){ return check(1) || check(2) || check(3); }
  function goTo(step, noScroll){
    S.step = Math.max(1, Math.min(STEPS, step));
    panels.forEach(function(p, i){ p.classList.toggle('active', i === S.step - 1); });
    dots.forEach(function(d, i){ d.classList.toggle('done', i < S.step - 1); d.classList.toggle('now', i === S.step - 1); });
    $('progress-fill').style.width = (S.step / STEPS * 100) + '%';
    $('step-label').textContent = 'Step ' + S.step + ' of ' + STEPS;
    renderTotal();
    if (noScroll) return;
    var top = wizard.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }

  wizard.addEventListener('click', function(e){
    var t = e.target.closest('button, a'); if (!t || !wizard.contains(t)) return;
    var b = box();
    if (t.hasAttribute('data-mode')) { b.mode = t.getAttribute('data-mode'); renderBox(true); }
    else if (t.hasAttribute('data-flavour')) { b.flavour = t.getAttribute('data-flavour'); renderBox(true); }
    else if (t.hasAttribute('data-size')) { b.size = +t.getAttribute('data-size'); renderBox(true); }
    else if (t.hasAttribute('data-mixsize')) { b.mixSize = +t.getAttribute('data-mixsize');
      var list = countsToList(b.mix).slice(0, b.mixSize); b.mix = {}; list.forEach(function(k){ b.mix[k] = (b.mix[k]||0) + 1; }); renderBox(true); }
    else if (t.hasAttribute('data-plus')) { var k = t.getAttribute('data-plus'); if (countsTotal(b.mix) < b.mixSize) { b.mix[k] = (b.mix[k]||0) + 1; renderBox(false); if (boxFull(b)) burstAt($('roll-slots'), 40); } }
    else if (t.hasAttribute('data-minus')) { var m = t.getAttribute('data-minus'); if (b.mix[m] > 0) { b.mix[m]--; if (!b.mix[m]) delete b.mix[m]; renderBox(false); } }
    else if (t.id === 'add-box') { if (S.boxes.length >= 3) return; S.boxes.push(newBox()); S.active = S.boxes.length - 1; renderBox(true); window.showToast('Box ' + S.boxes.length + ' added. Choose what goes in it.'); }
    else if (t.hasAttribute('data-edit')) { S.active = +t.getAttribute('data-edit'); renderBox(true); }
    else if (t.hasAttribute('data-remove')) { var r = +t.getAttribute('data-remove'); S.boxes.splice(r,1); if (S.active >= S.boxes.length) S.active = S.boxes.length - 1; else if (r < S.active) S.active--; renderBox(false); window.showToast('Box removed from your order.'); }
    else if (t.hasAttribute('data-fulfil')) { S.fulfil = t.getAttribute('data-fulfil'); wizard.querySelectorAll('[data-fulfil]').forEach(function(x){ x.classList.toggle('active', x === t); }); $('pickup-fields').hidden = isDelivery(); $('delivery-fields').hidden = !isDelivery(); renderTotal(); }
    else if (t.hasAttribute('data-parish')) { S.parish = t.getAttribute('data-parish'); wizard.querySelectorAll('[data-parish]').forEach(function(x){ x.classList.toggle('selected', x === t); }); }
    else if (t.hasAttribute('data-pay')) { S.pay = t.getAttribute('data-pay'); wizard.querySelectorAll('[data-pay]').forEach(function(x){ x.classList.toggle('selected', x === t); }); }
    else if (t.hasAttribute('data-diet')) { var none = 'No dietary needs', v = t.getAttribute('data-diet');
      if (v === none) S.diet = [none];
      else { S.diet = S.diet.filter(function(x){ return x !== none; }); var j = S.diet.indexOf(v); if (j > -1) S.diet.splice(j,1); else S.diet.push(v); if (!S.diet.length) S.diet = [none]; }
      wizard.querySelectorAll('[data-diet]').forEach(function(x){ x.classList.toggle('selected', S.diet.indexOf(x.getAttribute('data-diet')) > -1); }); }
    else if (t.hasAttribute('data-next')) { var msg = check(S.step); if (msg) return window.showToast(msg); goTo(S.step + 1); }
    else if (t.hasAttribute('data-back')) { goTo(S.step - 1); }
    else if (t.id === 'send-wa') {
      var bad = checkAll();
      if (bad) { e.preventDefault(); window.showToast(bad); return; }
      t.href = waLink(); burstAt(t, 60);
      window.showToast('WhatsApp is opening with your order. Just press send.');
    }
    else if (t.id === 'copy-msg') {
      var bad2 = checkAll(); if (bad2) return window.showToast(bad2);
      var txt = message(), done = function(){ window.showToast('Order copied. Paste it into WhatsApp to +1 (246) 264-4609.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function(){ window.showToast('Please message +1 (246) 264-4609 on WhatsApp.'); });
      else window.showToast('Please message +1 (246) 264-4609 on WhatsApp.');
    }
  });

  var pw = $('parish-chips');
  PARISHES.forEach(function(p){ var c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.setAttribute('data-parish', p); c.textContent = p; pw.appendChild(c); });
  renderBox(false); goTo(1, true);
})();
