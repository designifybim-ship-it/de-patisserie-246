/* De' Patisserie: Cakes & Treats menu, delivery map + tap-to-pick WhatsApp order form */
(function(){
  'use strict';
  var ITEMS = window.TREATS || [];
  var form = document.getElementById('treat-form');
  if (!ITEMS.length || !form) return;
  var WA = '12462644609';
  /* Delivery fee per parish in BBD. null shows "Coming soon"; set a number (e.g. 10) once approved. */
  var FEES = { 'St. Michael': null, 'Christ Church': null, 'St. Philip': null, 'St. George': null, 'St. James': null, 'St. Thomas': null,
               'St. John': null, 'St. Joseph': null, 'St. Peter': null, 'St. Andrew': null, 'St. Lucy': null };
  var byId = {}; ITEMS.forEach(function(it){ byId[it.id] = it; });
  var qty = {}, choice = { flavour: '', topping: '', colours: [], parish: '' }, mode = 'Pickup', mapParish = '';
  function $(id){ return document.getElementById(id); }
  function money(v){ return '$' + (Math.round(v * 100) / 100).toFixed(2); }
  function total(){ return ITEMS.reduce(function(s, it){ return s + (qty[it.id] || 0) * it.p; }, 0); }
  function count(){ return ITEMS.reduce(function(s, it){ return s + (qty[it.id] || 0); }, 0); }
  function has(kind){ return ITEMS.some(function(it){ return qty[it.id] > 0 && it.k === kind; }); }
  function hasBase(){ return ITEMS.some(function(it){ return qty[it.id] > 0 && (it.k === 'cake' || it.k === 'cheese' || /Cookie Cake/.test(it.n)); }); }
  function addonProblem(){ return ITEMS.some(function(it){ return qty[it.id] > 0 && it.c === 'extras'; }) && !hasBase(); }
  function leadInfo(){ var best = null; ITEMS.forEach(function(it){ if (qty[it.id] > 0 && (!best || (it.l || 1) > (best.l || 1))) best = it; }); return best; }
  function fee(p){ return typeof FEES[p] === 'number' ? FEES[p] : null; }
  function feeText(p){ var f = fee(p); return f === null ? 'Coming soon' : money(f); }
  function bump(el){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function val(id){ var el = $(id); return el ? (el.value || '').trim() : ''; }

  try { var saved = JSON.parse(localStorage.getItem('dp-treats') || '{}'); Object.keys(saved).forEach(function(k){ if (byId[k] && saved[k] > 0) qty[k] = Math.min(300, Math.max(byId[k].m || 1, saved[k])); }); } catch (e) {}
  function save(){ try { localStorage.setItem('dp-treats', JSON.stringify(qty)); } catch (e) {} }

  /* ---------- menu cards + order summary ---------- */
  function render(changed){
    document.querySelectorAll('.item-card[data-item]').forEach(function(row){
      var id = row.getAttribute('data-item'), n = qty[id] || 0, q = row.querySelector('.qty');
      if (q.textContent !== String(n)) { q.textContent = n; if (changed === id) bump(q); }
      row.querySelector('[data-minus]').disabled = n <= 0;
      row.classList.toggle('on', n > 0);
    });
    var list = $('of-items'), chosen = ITEMS.filter(function(it){ return qty[it.id] > 0; });
    if (!chosen.length) list.innerHTML = '<p class="of-empty"><i class="ph-fill ph-cake"></i> Nothing added yet. Tap <b>Add to order</b> on the menu above.</p>';
    else {
      list.innerHTML = '';
      chosen.forEach(function(it){
        var r = document.createElement('div'); r.className = 'of-row' + (changed === it.id ? ' hi' : ''); r.setAttribute('data-item', it.id);
        r.innerHTML = '<span class="of-n"></span><div class="stepper of-step"><button type="button" data-minus aria-label="One less">&minus;</button><span class="qty">' + qty[it.id] + '</span><button type="button" data-plus aria-label="One more">+</button></div><span class="of-p"></span><button type="button" class="of-x" aria-label="Remove ' + it.n + '"><i class="ph-bold ph-x"></i></button>';
        r.querySelector('.of-n').textContent = it.n;
        r.querySelector('.of-p').textContent = money(qty[it.id] * it.p);
        r.querySelector('.of-x').addEventListener('click', function(){ r.classList.add('out'); setTimeout(function(){ delete qty[it.id]; save(); render(); }, 200); });
        list.appendChild(r);
      });
    }
    var f = mode === 'Delivery' && choice.parish ? fee(choice.parish) : null;
    var t = money(total() + (f || 0)), c = count();
    var tot = $('of-total'); if (tot.textContent !== t) { tot.textContent = t; bump(tot); }
    $('ob-count').textContent = c + (c === 1 ? ' item' : ' items');
    $('ob-total').textContent = t + ' BBD';
    $('order-bar').hidden = c === 0;
    $('of-send-total').textContent = c ? t : '';
    $('of-addon').hidden = !addonProblem();
    applyLead();
    var cake = has('cake'), cheese = has('cheese');
    $('of-design').hidden = !(cake || cheese || has('deco'));
    $('of-flav-wrap').hidden = !cake;
    $('of-top-wrap').hidden = !cheese;
  }

  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-plus],[data-minus]'); if (!b) return;
    var row = b.closest('[data-item]'); if (!row) return;
    var id = row.getAttribute('data-item'), was = count();
    var it = byId[id], mn = it.m || 1, st = it.s || 1, cur = qty[id] || 0;
    if (b.hasAttribute('data-plus')) qty[id] = Math.min(300, cur ? cur + st : mn);
    else qty[id] = cur - st < mn ? 0 : cur - st;
    if (!qty[id]) delete qty[id];
    if (b.hasAttribute('data-plus') && !cur && mn > 1 && window.showToast) window.showToast('Added ' + mn + ' ' + it.n + '. The minimum is ' + mn + (st > 1 ? ', then add ' + st + ' at a time.' : '.'));
    save(); render(id);
    if (b.hasAttribute('data-plus')) { var bar = $('order-bar'); bar.classList.remove('pulse'); void bar.offsetWidth; bar.classList.add('pulse'); }
    if (b.hasAttribute('data-plus') && window.showToast && was === 0 && !(mn > 1)) window.showToast('Added! Keep browsing, or tap "Review and send" when you are ready.');
  });

  /* ---------- tap-to-pick choices ---------- */
  form.querySelectorAll('[data-choice]').forEach(function(group){
    var key = group.getAttribute('data-choice'), single = group.hasAttribute('data-single');
    group.addEventListener('click', function(e){
      var b = e.target.closest('.pill'); if (!b) return;
      var v = b.getAttribute('data-val');
      if (single) choice[key] = choice[key] === v ? '' : v;
      else { var a = choice[key], i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); }
      group.classList.remove('need');
      if (key === 'parish') setMapParish(choice.parish);
      syncPills(); render(); hideErr();
    });
  });
  function syncPills(){
    form.querySelectorAll('[data-choice]').forEach(function(group){
      var key = group.getAttribute('data-choice'), cur = choice[key];
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
  var calEl = form.querySelector('[data-cal]'), lastLead = 1;
  function applyLead(){
    if (!calEl || !calEl.setMinDays) return;
    var it = leadInfo(), days = it ? (it.l || 1) : 1, hint = $('of-lead');
    var cleared = calEl.setMinDays(days);
    if (days > 1) {
      var d = calEl.minDate();
      hint.hidden = false;
      hint.innerHTML = '<i class="ph-fill ph-hourglass-medium"></i> ' + it.n + ' needs ' + (days === 7 ? '1 week\u2019s' : days + ' days\u2019') + ' notice, so the earliest date is <b>' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + '</b>.';
    } else hint.hidden = true;
    if (cleared && window.showToast) window.showToast('Your date was too soon for ' + it.n + '. Please pick a new date.');
    lastLead = days;
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
    ITEMS.forEach(function(it){ if (qty[it.id]) L.push(qty[it.id] + ' x ' + it.n + ' - ' + money(qty[it.id] * it.p) + ' BBD'); });
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
      if (!$('of-flav-wrap').hidden && choice.flavour) design.push('Cake flavour: ' + choice.flavour);
      if (!$('of-top-wrap').hidden && choice.topping) design.push('Cheesecake topping: ' + choice.topping);
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
    if (window.showToast) window.showToast('WhatsApp is opening with your order. Just press send.');
  });
  form.addEventListener('input', hideErr);

  syncPills(); render();
})();
