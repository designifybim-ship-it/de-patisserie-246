/* De' Patisserie: Cakes & Treats menu + WhatsApp order form */
(function(){
  'use strict';
  var ITEMS = window.TREATS || [];
  var form = document.getElementById('treat-form');
  if (!ITEMS.length || !form) return;
  var WA = '12462644609';
  var byId = {}; ITEMS.forEach(function(it){ byId[it.id] = it; });
  var qty = {};
  var mode = 'Pickup';
  function $(id){ return document.getElementById(id); }
  function money(v){ v = Math.round(v * 100) / 100; return '$' + (v % 1 === 0 ? String(v) : v.toFixed(2)); }
  function total(){ return ITEMS.reduce(function(s, it){ return s + (qty[it.id] || 0) * it.p; }, 0); }
  function count(){ return ITEMS.reduce(function(s, it){ return s + (qty[it.id] || 0); }, 0); }
  function bump(el){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  // restore a draft left on this device
  try { var saved = JSON.parse(localStorage.getItem('dp-treats') || '{}'); Object.keys(saved).forEach(function(k){ if (byId[k] && saved[k] > 0) qty[k] = Math.min(99, saved[k]); }); } catch (e) {}
  function save(){ try { localStorage.setItem('dp-treats', JSON.stringify(qty)); } catch (e) {} }

  function render(changed){
    document.querySelectorAll('[data-item]').forEach(function(row){
      var id = row.getAttribute('data-item'), n = qty[id] || 0, q = row.querySelector('.qty');
      if (q.textContent !== String(n)) { q.textContent = n; if (changed === id) bump(q); }
      row.querySelector('[data-minus]').disabled = n <= 0;
      row.classList.toggle('on', n > 0);
    });
    var list = $('of-items'), chosen = ITEMS.filter(function(it){ return qty[it.id] > 0; });
    if (!chosen.length) list.innerHTML = '<p class="of-empty">Nothing added yet. Tap <b>+</b> on the menu above to add items.</p>';
    else {
      list.innerHTML = '';
      chosen.forEach(function(it){
        var r = document.createElement('div'); r.className = 'of-row';
        r.innerHTML = '<span class="of-q"></span><span class="of-n"></span><span class="of-p"></span><button type="button" class="of-x" aria-label="Remove">&times;</button>';
        r.querySelector('.of-q').textContent = qty[it.id] + ' x';
        r.querySelector('.of-n').textContent = it.n;
        r.querySelector('.of-p').textContent = money(qty[it.id] * it.p);
        r.querySelector('.of-x').addEventListener('click', function(){ delete qty[it.id]; save(); render(); });
        list.appendChild(r);
      });
    }
    var t = money(total()), c = count();
    var tot = $('of-total'); if (tot.textContent !== t) { tot.textContent = t; bump(tot); }
    $('ob-count').textContent = c + (c === 1 ? ' item' : ' items');
    $('ob-total').textContent = t + ' BBD';
    $('order-bar').hidden = c === 0;
  }

  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-plus],[data-minus]'); if (!b) return;
    var row = b.closest('[data-item]'); if (!row) return;
    var id = row.getAttribute('data-item');
    qty[id] = Math.max(0, Math.min(99, (qty[id] || 0) + (b.hasAttribute('data-plus') ? 1 : -1)));
    if (!qty[id]) delete qty[id];
    save(); render(id);
    if (b.hasAttribute('data-plus') && window.showToast && count() === 1) window.showToast('Added. Scroll down or tap "Review and send" when you are ready.');
  });

  form.querySelectorAll('[data-mode]').forEach(function(btn){
    btn.addEventListener('click', function(){
      mode = btn.getAttribute('data-mode');
      form.querySelectorAll('[data-mode]').forEach(function(x){ x.classList.toggle('active', x === btn); });
      $('of-delivery').hidden = mode !== 'Delivery';
    });
  });

  // earliest date: tomorrow
  (function(){ var d = new Date(); d.setDate(d.getDate() + 1); var iso = d.toISOString().slice(0, 10); $('of-date').min = iso; })();

  function val(id){ return ($(id).value || '').trim(); }
  function prettyDate(v){ if (!v) return ''; var p = v.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
  function prettyTime(v){ if (!v) return ''; var p = v.split(':'), h = +p[0]; var ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + p[1] + ' ' + ap; }

  function problem(){
    if (!count()) return ['Please add at least one item from the menu.', null];
    if (!val('of-date')) return ['Please choose the date you need your order.', 'of-date'];
    if (!val('of-time')) return ['Please choose a time.', 'of-time'];
    if (mode === 'Delivery' && !val('of-parish')) return ['Please choose your delivery parish.', 'of-parish'];
    if (mode === 'Delivery' && !val('of-area')) return ['Please add your area or a landmark.', 'of-area'];
    if (!val('of-name')) return ['Please add your name.', 'of-name'];
    if (!val('of-phone')) return ['Please add your WhatsApp number.', 'of-phone'];
    return null;
  }

  function message(){
    var L = [];
    L.push("Hello De' Patisserie, I would like to place an order.");
    L.push('');
    L.push('MY ORDER');
    ITEMS.forEach(function(it){ if (qty[it.id]) L.push(qty[it.id] + ' x ' + it.n + ' - ' + money(qty[it.id] * it.p) + ' BBD'); });
    L.push('Estimated total: ' + money(total()) + ' BBD' + (mode === 'Delivery' ? ' plus delivery' : ''));
    L.push('');
    L.push('DATE AND ' + (mode === 'Delivery' ? 'DELIVERY' : 'PICKUP'));
    L.push('Date needed: ' + prettyDate(val('of-date')));
    L.push('Time: ' + prettyTime(val('of-time')));
    L.push('Method: ' + mode);
    if (mode === 'Delivery') { L.push('Parish: ' + val('of-parish')); L.push('Area / landmark: ' + val('of-area')); }
    var f = val('of-flavour'), th = val('of-theme'), m = val('of-message');
    if (f || th || m) {
      L.push(''); L.push('DESIGN DETAILS');
      if (f) L.push('Flavour: ' + f);
      if (th) L.push('Colours / theme: ' + th);
      if (m) L.push('Message on cake: ' + m);
    }
    L.push('');
    L.push('MY DETAILS');
    L.push('Name: ' + val('of-name'));
    L.push('WhatsApp number: ' + val('of-phone'));
    L.push('Notes: ' + (val('of-notes') || 'None'));
    L.push('');
    L.push('I understand my order is confirmed once you approve it and receive the 50% deposit. Thank you.');
    return L.join('\n');
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var err = $('of-error'), bad = problem();
    if (bad) {
      err.textContent = bad[0]; err.hidden = false;
      if (bad[1]) $(bad[1]).focus(); else document.querySelector('.cat-grid').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    err.hidden = true;
    var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(message());
    var w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
    if (window.showToast) window.showToast('WhatsApp is opening with your order. Just press send.');
  });

  form.addEventListener('input', function(){ $('of-error').hidden = true; });
  render();
})();
