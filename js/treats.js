/* De' Patisserie: Cakes & Treats menu, flavour chooser, delivery map + tap-to-pick WhatsApp order form */
(function(){
  'use strict';
  var ITEMS = window.TREATS || [], OPTS = window.TREAT_OPTS || {};
  var form = document.getElementById('treat-form');
  if (!ITEMS.length || !form) return;
  var WA = '12462644609';
  /* Delivery fee per parish in BBD. null shows "Coming soon"; set a number (e.g. 10) once approved. */
  var FEES = { 'St. Michael': null, 'Christ Church': null, 'St. Philip': null, 'St. George': null, 'St. James': null, 'St. Thomas': null,
               'St. John': null, 'St. Joseph': null, 'St. Peter': null, 'St. Andrew': null, 'St. Lucy': null };
  var byId = {}; ITEMS.forEach(function(it){ byId[it.id] = it; });
  /* the order is a list of lines: one per item + flavour */
  var lines = [], choice = { colours: [], parish: '' }, mode = 'Pickup', mapParish = '';
  function $(id){ return document.getElementById(id); }
  function money(v){ return '$' + (Math.round(v * 100) / 100).toFixed(2); }
  function key(id, opt){ return id + '|' + (opt || ''); }
  function findLine(k){ for (var i = 0; i < lines.length; i++) if (key(lines[i].id, lines[i].opt) === k) return lines[i]; return null; }
  function itemQty(id){ return lines.reduce(function(s, l){ return s + (l.id === id ? l.q : 0); }, 0); }
  function total(){ return lines.reduce(function(s, l){ return s + l.q * byId[l.id].p; }, 0); }
  function count(){ return lines.reduce(function(s, l){ return s + l.q; }, 0); }
  function inOrder(test){ return lines.some(function(l){ return test(byId[l.id]); }); }
  function has(kind){ return inOrder(function(it){ return it.k === kind; }); }
  function hasBase(){ return inOrder(function(it){ return it.k === 'cake' || it.k === 'cheese' || /Cookie Cake/.test(it.n); }); }
  function addonProblem(){ return inOrder(function(it){ return it.c === 'extras'; }) && !hasBase(); }
  function leadInfo(){ var best = null; lines.forEach(function(l){ var it = byId[l.id]; if (!best || (it.l || 1) > (best.l || 1)) best = it; }); return best; }
  function lineName(l){ return byId[l.id].n + (l.opt ? ' (' + l.opt + ')' : ''); }
  function fee(p){ return typeof FEES[p] === 'number' ? FEES[p] : null; }
  function feeText(p){ var f = fee(p); return f === null ? 'Coming soon' : money(f); }
  function bump(el){ if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function val(id){ var el = $(id); return el ? (el.value || '').trim() : ''; }
  function toast(t){ if (window.showToast) window.showToast(t); }

  try {
    var saved = JSON.parse(localStorage.getItem('dp-treats2') || '[]');
    saved.forEach(function(l){ var it = byId[l.id]; if (!it || !(l.q > 0)) return; if (it.o && OPTS[it.o].list.indexOf(l.opt) < 0) return;
      lines.push({ id: l.id, opt: it.o ? l.opt : '', q: Math.min(300, Math.max(it.m || 1, l.q)) }); });
  } catch (e) {}
  function save(){ try { localStorage.setItem('dp-treats2', JSON.stringify(lines)); } catch (e) {} }

  /* change a line by one step (respects minimums) */
  function step(id, opt, dir){
    var it = byId[id], mn = it.m || 1, st = it.s || 1, l = findLine(key(id, opt)), cur = l ? l.q : 0, nq;
    if (dir > 0) nq = Math.min(300, cur ? cur + st : mn); else nq = cur - st < mn ? 0 : cur - st;
    if (!l && nq) { l = { id: id, opt: opt || '', q: 0 }; lines.push(l); }
    if (l) l.q = nq;
    lines = lines.filter(function(x){ return x.q > 0; });
    return { added: !cur && nq > 0, mn: mn, st: st, it: it };
  }

  /* ---------- menu cards + order summary ---------- */
  function render(changedKey){
    document.querySelectorAll('.item-card[data-item]').forEach(function(card){
      var id = card.getAttribute('data-item'), n = itemQty(id);
      card.classList.toggle('on', n > 0);
      if (card.classList.contains('has-opts')) {
        var c = card.querySelector('.ic-count'), flav = lines.filter(function(l){ return l.id === id; }).length;
        c.textContent = n ? n + ' added' : '';
        card.querySelector('.ic-choose-t').textContent = n ? 'Add another' : ('Choose ' + (byId[id].o === 'top' ? 'topping' : 'flavour'));
      } else {
        var q = card.querySelector('.qty');
        if (q.textContent !== String(n)) { q.textContent = n; if (changedKey === key(id, '')) bump(q); }
        card.querySelector('[data-minus]').disabled = n <= 0;
      }
    });
    var list = $('of-items');
    if (!lines.length) list.innerHTML = '<p class="of-empty"><i class="ph-fill ph-cake"></i> Nothing added yet. Tap any treat on the menu above.</p>';
    else {
      list.innerHTML = '';
      lines.forEach(function(l){
        var it = byId[l.id], k = key(l.id, l.opt);
        var r = document.createElement('div'); r.className = 'of-row' + (changedKey === k ? ' hi' : ''); r.setAttribute('data-line', k);
        r.innerHTML = '<span class="of-n"><b></b><em></em></span><div class="stepper of-step"><button type="button" data-lminus aria-label="One less">&minus;</button><span class="qty">' + l.q + '</span><button type="button" data-lplus aria-label="One more">+</button></div><span class="of-p"></span><button type="button" class="of-x" aria-label="Remove">&times;</button>';
        r.querySelector('.of-n b').textContent = it.n;
        r.querySelector('.of-n em').textContent = l.opt ? (it.o === 'top' ? 'Topping' : 'Flavour') + ': ' + l.opt : '';
        r.querySelector('.of-p').textContent = money(l.q * it.p);
        r.querySelector('.of-x').addEventListener('click', function(){ r.classList.add('out'); setTimeout(function(){ lines = lines.filter(function(x){ return x !== l; }); save(); render(); }, 200); });
        list.appendChild(r);
      });
    }
    var f = mode === 'Delivery' && choice.parish ? fee(choice.parish) : null;
    var t = money(total() + (f || 0)), c = count();
    var tot = $('of-total'); if (tot.textContent !== t) { tot.textContent = t; bump(tot); }
    $('ob-count').textContent = c + (c === 1 ? ' item' : ' items'); var obn = $('ob-n'); if (obn) obn.textContent = c;
    $('ob-total').textContent = t + ' BBD';
    $('order-bar').hidden = c === 0;
    $('of-send-total').textContent = c ? t : '';
    $('of-addon').hidden = !addonProblem();
    applyLead();
    $('of-design').hidden = !(has('cake') || has('cheese') || has('deco'));
  }
  function pulseBar(){}
  var reduceMo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function bumpBasket(){ var bk = $('order-bar'); if (!bk) return; bk.classList.remove('got'); void bk.offsetWidth; bk.classList.add('got'); }
  /* the treat's photo flies into the pink basket */
  function flyToBasket(mediaEl){
    var bk = $('order-bar'); if (!bk || bk.hidden || reduceMo || !mediaEl) return bumpBasket();
    var from = mediaEl.getBoundingClientRect(), to = bk.querySelector('.bk-ico').getBoundingClientRect();
    if (!from.width) return bumpBasket();
    var img = mediaEl.querySelector('img'), ph = mediaEl.classList.contains('ic-ph') || mediaEl.classList.contains('ph') || !img;
    var s = Math.min(from.width, from.height, 110), el = document.createElement('div');
    el.className = 'fly-item' + (ph ? ' blank' : '');
    if (ph) el.innerHTML = '&#9825;'; else el.style.backgroundImage = 'url("' + img.getAttribute('src') + '")';
    var x0 = from.left + from.width / 2 - s / 2, y0 = from.top + from.height / 2 - s / 2;
    el.style.left = x0 + 'px'; el.style.top = y0 + 'px'; el.style.width = el.style.height = s + 'px';
    document.body.appendChild(el);
    var dx = to.left + to.width / 2 - (x0 + s / 2), dy = to.top + to.height * 0.35 - (y0 + s / 2), lift = Math.min(160, Math.abs(dy) * 0.35 + 60);
    var a = el.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + dx * 0.45 + 'px,' + (dy * 0.45 - lift) + 'px) scale(.75) rotate(-18deg)', opacity: 1, offset: 0.45 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.2) rotate(-36deg)', opacity: 0.4 }
    ], { duration: 800, easing: 'cubic-bezier(.45,.05,.55,.95)' });
    a.onfinish = function(){ el.remove(); bumpBasket(); };
  }

  /* plain items: + / − on the card */
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-plus],[data-minus]'); if (!b) return;
    var card = b.closest('.item-card[data-item]'); if (!card) return;
    var id = card.getAttribute('data-item'), was = count(), dir = b.hasAttribute('data-plus') ? 1 : -1;
    var r = step(id, '', dir); save(); render(key(id, ''));
    if (dir > 0) {
      flyToBasket(card.querySelector('.ic-media') || b);
      if (r.added && r.mn > 1) toast('Added ' + r.mn + ' ' + r.it.n + '. The minimum is ' + r.mn + (r.st > 1 ? ', then add ' + r.st + ' at a time.' : '.'));
      else if (was === 0) toast('In the basket! Tap it when you are ready to send.');
    }
  });
  /* order list: + / − per line */
  $('of-items').addEventListener('click', function(e){
    var b = e.target.closest('[data-lplus],[data-lminus]'); if (!b) return;
    var k = b.closest('[data-line]').getAttribute('data-line'), p = k.split('|');
    step(p[0], p[1], b.hasAttribute('data-lplus') ? 1 : -1); save(); render(k);
  });

  /* ---------- flavour chooser sheet ---------- */
  var sheet = document.createElement('div');
  sheet.className = 'opt-sheet'; sheet.hidden = true;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'os-title');
  sheet.innerHTML =
    '<div class="os-card">' +
      '<button type="button" class="os-x" aria-label="Close">&times;</button>' +
      '<div class="os-head"><div class="os-img"><img alt=""></div><div class="os-name"><h3 id="os-title"></h3><span class="os-price"></span><span class="os-min"></span></div></div>' +
      '<span class="of-label os-label"></span>' +
      '<div class="pills os-pills" role="radiogroup"></div>' +
      '<p class="os-in"></p>' +
      '<div class="os-row"><span class="of-label">How many?</span><div class="stepper os-step"><button type="button" data-os="-1" aria-label="One less">&minus;</button><span class="qty os-q">1</span><button type="button" data-os="1" aria-label="One more">+</button></div></div>' +
      '<button type="button" class="btn os-add" disabled></button>' +
    '</div>';
  document.body.appendChild(sheet);
  var S = { id: null, opt: '', q: 1 }, lastFocus = null;
  function sheetDraw(){
    var it = byId[S.id], o = OPTS[it.o], word = it.o === 'top' ? 'topping' : 'flavour';
    sheet.querySelectorAll('.os-pills .pill').forEach(function(b){ var on = b.getAttribute('data-val') === S.opt; b.classList.toggle('sel', on); b.setAttribute('aria-checked', on); });
    sheet.querySelector('.os-q').textContent = S.q;
    sheet.querySelector('[data-os="-1"]').disabled = S.q - (it.s || 1) < (it.m || 1);
    var add = sheet.querySelector('.os-add');
    add.disabled = !S.opt;
    add.innerHTML = S.opt ? '<i class="ph-bold ph-plus"></i> Add ' + S.q + ' ' + S.opt + ' &middot; ' + money(S.q * it.p) : 'Pick a ' + word + ' first';
    var have = lines.filter(function(l){ return l.id === S.id; });
    sheet.querySelector('.os-in').innerHTML = have.length ? '<i class="ph-fill ph-check-circle"></i> Already in your order: ' + have.map(function(l){ return l.q + ' ' + l.opt; }).join(', ') : '';
    void o;
  }
  function openSheet(id, fromEl){
    var it = byId[id], o = OPTS[it.o]; if (!o) return;
    S = { id: id, opt: '', q: it.m || 1 };
    var card = document.querySelector('.item-card[data-item="' + id + '"]'), img = card && card.querySelector('.ic-media img');
    var im = sheet.querySelector('.os-img img'); im.src = img ? img.getAttribute('src') : 'assets/img/logo.png';
    sheet.querySelector('.os-img').classList.toggle('ph', !!(card && card.querySelector('.ic-ph')));
    sheet.querySelector('#os-title').textContent = it.n;
    sheet.querySelector('.os-price').textContent = money(it.p) + (it.m > 1 || /each/.test(card ? card.querySelector('.ic-price').textContent : '') ? ' each' : '');
    sheet.querySelector('.os-min').textContent = it.m > 1 ? 'Minimum ' + it.m + (it.s > 1 ? ', then ' + it.s + ' at a time' : '') : '';
    sheet.querySelector('.os-label').textContent = 'Pick a ' + (it.o === 'top' ? 'topping' : 'flavour');
    sheet.querySelector('.os-pills').innerHTML = o.list.map(function(v){ return '<button type="button" class="pill" role="radio" aria-checked="false" data-val="' + v + '">' + v + '</button>'; }).join('');
    sheetDraw();
    lastFocus = fromEl || document.activeElement;
    sheet.hidden = false; requestAnimationFrame(function(){ sheet.classList.add('in'); });
    document.documentElement.classList.add('ig-lock');
    setTimeout(function(){ var f = sheet.querySelector('.os-pills .pill'); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function closeSheet(){
    sheet.classList.remove('in'); document.documentElement.classList.remove('ig-lock');
    setTimeout(function(){ sheet.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  sheet.addEventListener('click', function(e){
    if (e.target === sheet || e.target.closest('.os-x')) return closeSheet();
    var p = e.target.closest('.os-pills .pill'); if (p) { S.opt = p.getAttribute('data-val'); sheetDraw(); return; }
    var s = e.target.closest('[data-os]');
    if (s) { var it = byId[S.id], mn = it.m || 1, st = it.s || 1; S.q = +s.getAttribute('data-os') > 0 ? Math.min(300, S.q + st) : Math.max(mn, S.q - st); sheetDraw(); bump(sheet.querySelector('.os-q')); return; }
    if (e.target.closest('.os-add') && S.opt) {
      var was = count(), k = key(S.id, S.opt), l = findLine(k);
      if (l) l.q = Math.min(300, l.q + S.q); else lines.push({ id: S.id, opt: S.opt, q: S.q });
      var osImg = sheet.querySelector('.os-img'); save(); render(k); flyToBasket(osImg); closeSheet();
      toast('Added ' + S.q + ' ' + byId[S.id].n + ' (' + S.opt + ').' + (was === 0 ? ' Tap the basket when you are ready.' : ''));
    }
  });
  document.addEventListener('keydown', function(e){ if (!sheet.hidden && e.key === 'Escape') closeSheet(); });
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-choose]'); if (!b) return;
    openSheet(b.closest('[data-item]').getAttribute('data-item'), b);
  });
  // tapping a photo on a flavour item opens the chooser too
  document.querySelectorAll('.item-card.has-opts .ic-media').forEach(function(m){
    m.style.cursor = 'pointer';
    m.addEventListener('click', function(){ openSheet(m.closest('[data-item]').getAttribute('data-item')); });
  });

  /* ---------- tap-to-pick choices in the form ---------- */
  form.querySelectorAll('[data-choice]').forEach(function(group){
    var k = group.getAttribute('data-choice'), single = group.hasAttribute('data-single');
    group.addEventListener('click', function(e){
      var b = e.target.closest('.pill'); if (!b) return;
      var v = b.getAttribute('data-val');
      if (single) choice[k] = choice[k] === v ? '' : v;
      else { var a = choice[k], i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); }
      group.classList.remove('need');
      if (k === 'parish') setMapParish(choice.parish);
      syncPills(); render(); hideErr();
    });
  });
  function syncPills(){
    form.querySelectorAll('[data-choice]').forEach(function(group){
      var cur = choice[group.getAttribute('data-choice')];
      group.querySelectorAll('.pill').forEach(function(b){ var v = b.getAttribute('data-val'), on = Array.isArray(cur) ? cur.indexOf(v) > -1 : cur === v; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); });
    });
    var fl = $('of-fee');
    if (mode === 'Delivery' && choice.parish) { fl.hidden = false; fl.innerHTML = '<i class="ph-fill ph-moped"></i> Delivery to ' + choice.parish + ': <b>' + feeText(choice.parish) + '</b>' + (fee(choice.parish) === null ? ' <small>(we\'ll confirm it on WhatsApp)</small>' : ''); }
    else fl.hidden = true;
  }

  function setMode(m){
    mode = m;
    form.querySelectorAll('[data-mode]').forEach(function(x){ var on = x.getAttribute('data-mode') === m; x.classList.toggle('active', on); x.setAttribute('aria-checked', on); });
    $('of-delivery').hidden = m !== 'Delivery';
    $('of-when-title').textContent = m === 'Delivery' ? 'When should we deliver?' : 'When will you pick up?';
    syncPills(); render(); hideErr();
  }
  form.querySelectorAll('[data-mode]').forEach(function(btn){ btn.addEventListener('click', function(){ setMode(btn.getAttribute('data-mode')); }); });

  /* ---------- delivery map ---------- */
  function setMapParish(p){
    mapParish = p;
    document.querySelectorAll('.bb-labels text').forEach(function(x){ x.classList.toggle('sel', !!p && x.getAttribute('data-for') === p); });
    document.querySelectorAll('.bb-p,.fee-list li').forEach(function(x){ x.classList.toggle('sel', !!p && x.getAttribute('data-parish') === p); });
    var nm = $('deliv-name'); if (!nm) return;
    nm.textContent = p || 'Tap the map';
    $('deliv-fee').textContent = p ? feeText(p) : '';
    $('deliv-pick').classList.toggle('on', !!p);
    if (p) bump($('deliv-pick'));
  }
  if (document.querySelector('.bb-map')) {
    var tiers = { 5: 't1', 10: 't2', 15: 't3', 20: 't4', 25: 't5' };
    document.querySelectorAll('.bb-p').forEach(function(p){ var f = fee(p.getAttribute('data-parish')); if (f !== null && tiers[f]) p.classList.add(tiers[f]); });
    document.querySelectorAll('.bb-labels text').forEach(function(t){ var f = fee(t.getAttribute('data-for')); t.querySelector('.bb-fee').textContent = f === null ? '' : money(f); });
    document.querySelectorAll('.fee-list li').forEach(function(li){ li.querySelector('.fee-v').textContent = feeText(li.getAttribute('data-parish')); });
    document.querySelectorAll('.bb-p,.fee-list button').forEach(function(el){
      el.addEventListener('click', function(){ setMapParish(el.getAttribute('data-parish')); });
      el.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMapParish(el.getAttribute('data-parish')); } });
    });
    $('deliv-go').addEventListener('click', function(){ if (mapParish) choice.parish = mapParish; setMode('Delivery'); });
  }

  /* ---------- notice time: earliest date depends on what's in the order ---------- */
  var calEl = form.querySelector('[data-cal]');
  function applyLead(){
    if (!calEl || !calEl.setMinDays) return;
    var it = leadInfo(), days = it ? (it.l || 1) : 1, hint = $('of-lead');
    var cleared = calEl.setMinDays(days);
    if (days > 1) {
      var d = calEl.minDate();
      hint.hidden = false;
      hint.innerHTML = '<i class="ph-fill ph-hourglass-medium"></i> ' + it.n + ' needs ' + (days === 7 ? '1 week’s' : days + ' days’') + ' notice, so the earliest date is <b>' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + '</b>.';
    } else hint.hidden = true;
    if (cleared) toast('Your date was too soon for ' + it.n + '. Please pick a new date.');
  }

  /* ---------- date + time summary ---------- */
  function prettyDate(v, noYear){ if (!v) return ''; var p = v.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var o = { weekday: 'long', day: 'numeric', month: 'long' }; if (!noYear) o.year = 'numeric'; return d.toLocaleDateString('en-GB', o); }
  function prettyTime(v){ return v && window.DPLabelTime ? window.DPLabelTime(v) : v; }
  function updateWhen(){
    var d = val('of-date'), t = val('of-time'), el = $('of-when');
    if (!d && !t) { el.innerHTML = '<i class="ph-fill ph-calendar-heart"></i> Pick a date and time'; el.classList.remove('ok'); return; }
    el.innerHTML = '<i class="ph-fill ph-calendar-heart"></i> ' + (d ? '<b>' + prettyDate(d, true) + '</b>' : 'Pick a date') + (t ? ' at <b>' + prettyTime(t) + '</b>' : ', now pick a time');
    el.classList.toggle('ok', !!(d && t)); bump(el);
  }
  $('of-date').addEventListener('change', updateWhen); $('of-time').addEventListener('change', updateWhen);

  /* ---------- validation + message ---------- */
  function problem(){
    if (!count()) return ['Please add at least one item from the menu.', 'ofb-items'];
    if (addonProblem()) return ['Add-ons go with a cake, cheesecake or cupcakes. Please add one, or remove the add-on.', 'ofb-items'];
    if (mode === 'Delivery' && !choice.parish) return ['Please tap your delivery parish.', 'of-parishes'];
    if (mode === 'Delivery' && !val('of-area')) return ['Please add your area or a landmark so we can find you.', 'of-area'];
    if (!val('of-date')) return ['Please pick a date on the calendar.', '.cal'];
    if (!val('of-time')) return ['Please pick a time.', '.tslots'];
    if (!val('of-name')) return ['Please add your name.', 'of-name'];
    if (val('of-phone').replace(/\D/g, '').length < 7) return ['Please add your WhatsApp number.', 'of-phone'];
    return null;
  }

  function message(){
    var L = [], f = mode === 'Delivery' ? fee(choice.parish) : null;
    L.push("Hello De' Patisserie, I would like to place an order.");
    L.push(''); L.push('MY ORDER');
    lines.forEach(function(l){ L.push(l.q + ' x ' + lineName(l) + ' - ' + money(l.q * byId[l.id].p) + ' BBD'); });
    if (mode === 'Delivery') {
      L.push('Items subtotal: ' + money(total()) + ' BBD');
      L.push('Delivery fee: ' + (f === null ? 'to be confirmed' : money(f) + ' BBD'));
      L.push('Estimated total: ' + money(total() + (f || 0)) + ' BBD' + (f === null ? ' plus delivery' : ''));
    } else L.push('Estimated total: ' + money(total()) + ' BBD');
    L.push(''); L.push(mode === 'Delivery' ? 'DELIVERY' : 'PICKUP');
    L.push('Date: ' + prettyDate(val('of-date')));
    L.push('Time: ' + prettyTime(val('of-time')));
    if (mode === 'Delivery') { L.push('Parish: ' + choice.parish); L.push('Area / landmark: ' + val('of-area')); }
    var design = [];
    if (!$('of-design').hidden) {
      if (choice.colours.length) design.push('Colours: ' + choice.colours.join(', '));
      if (val('of-message')) design.push('Message on top: ' + val('of-message'));
    }
    if (design.length) { L.push(''); L.push('DESIGN DETAILS'); L = L.concat(design); }
    L.push(''); L.push('MY DETAILS');
    L.push('Name: ' + val('of-name'));
    L.push('WhatsApp number: ' + val('of-phone'));
    if (val('of-notes')) L.push('Allergies / notes: ' + val('of-notes'));
    L.push('');
    L.push('I understand my order is confirmed once you approve it and receive the 50% deposit. Thank you.');
    return L.join('\n');
  }

  function hideErr(){ $('of-error').hidden = true; }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var err = $('of-error'), bad = problem();
    if (bad) {
      err.textContent = bad[0]; err.hidden = false; bump(err);
      var target = bad[1].charAt(0) === '.' ? form.querySelector(bad[1]) : $(bad[1]);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (/^(INPUT|TEXTAREA)$/.test(target.tagName)) setTimeout(function(){ target.focus({ preventScroll: true }); }, 400);
        else { target.classList.remove('need'); void target.offsetWidth; target.classList.add('need'); }
      }
      return;
    }
    err.hidden = true;
    var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(message());
    var w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
    toast('WhatsApp is opening with your order. Just press send.');
  });
  form.addEventListener('input', hideErr);

  syncPills(); render();
})();

/* ---------- browse menu: side list on very wide screens, a button that opens the list elsewhere ---------- */
(function(){
  var nav = document.getElementById('jump'), btn = document.getElementById('jump-btn'); if (!nav) return;
  var links = nav.querySelectorAll('[data-jump]'), hero = document.querySelector('.page-hero'), header = document.querySelector('.site-header');
  function setOpen(o){ nav.classList.toggle('open', o); if (btn) btn.setAttribute('aria-expanded', String(o)); }
  if (btn) btn.addEventListener('click', function(e){ e.stopPropagation(); setOpen(!nav.classList.contains('open')); });
  links.forEach(function(a){ a.addEventListener('click', function(){ setOpen(false); }); });
  document.addEventListener('click', function(e){ if (!nav.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') setOpen(false); });
  function onScroll(){
    if (header) document.documentElement.style.setProperty('--hdr', Math.round(header.getBoundingClientRect().bottom) + 'px');
    var show = !hero || hero.getBoundingClientRect().bottom < 80;
    nav.classList.toggle('show', show); if (btn) btn.classList.toggle('show', show);
    var cur = null, mid = window.innerHeight * 0.35;
    links.forEach(function(a){ var sec = document.getElementById(a.getAttribute('data-jump')); if (sec && sec.getBoundingClientRect().top <= mid) cur = a; });
    links.forEach(function(a){ a.classList.toggle('on', a === cur); });
    var bar = document.getElementById('order-bar'); if (btn) btn.classList.toggle('lift', !!bar && !bar.hidden);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); onScroll(); setInterval(onScroll, 1000);
})();
