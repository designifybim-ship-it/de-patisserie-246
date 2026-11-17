/* De' Patisserie order book. Everything is stored in this browser only (localStorage). */
(function(){
  'use strict';
  var MENU = window.DP_MENU || [];
  var KEY = 'dp-orderbook-v1';
  var STATUSES = [
    ['new', 'To review'], ['approved', 'Approved'], ['deposit', 'Deposit paid'],
    ['baking', 'Baking'], ['ready', 'Ready'], ['done', 'Completed'],
    ['inquiry', 'Inquiry'], ['hold', 'On hold'], ['declined', 'Declined'], ['cancelled', 'Cancelled']
  ];
  var PIPE = ['new', 'approved', 'deposit', 'baking', 'ready', 'done'], SIDE = ['inquiry', 'hold', 'declined', 'cancelled'];
  function closed(o){ return o.status === 'done' || o.status === 'cancelled' || o.status === 'declined'; }
  var ST = {}; STATUSES.forEach(function(s){ ST[s[0]] = s[1]; });
  var UNITS = ['g', 'kg', 'ml', 'L', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'each'];
  var TO_BASE = { g: ['g', 1], kg: ['g', 1000], oz: ['g', 28.35], lb: ['g', 453.6], ml: ['ml', 1], L: ['ml', 1000], cup: ['ml', 240], tbsp: ['ml', 15], tsp: ['ml', 5], each: ['each', 1] };
  var STARTER_ING = [
    ['All-purpose flour', 2, 'kg'], ['Granulated sugar', 2, 'kg'], ['Icing sugar', 1, 'kg'], ['Brown sugar', 1, 'kg'],
    ['Butter', 454, 'g'], ['Eggs', 30, 'each'], ['Whole milk', 1, 'L'], ['Heavy cream', 1, 'L'], ['Cream cheese', 227, 'g'],
    ['Vanilla essence', 250, 'ml'], ['Cocoa powder', 500, 'g'], ['Baking powder', 400, 'g'], ['Baking soda', 450, 'g'], ['Salt', 1, 'kg'],
    ['Vegetable oil', 1, 'L'], ['Chocolate chips', 340, 'g'], ['White chocolate', 340, 'g'], ['Biscoff spread', 400, 'g'],
    ['Biscoff biscuits', 250, 'g'], ['Oreo cookies', 432, 'g'], ['Graham crackers', 400, 'g'], ['Red food colouring', 30, 'ml'],
    ['Strawberries', 454, 'g'], ['Cake box', 1, 'each'], ['Cake board', 1, 'each'], ['Cupcake liners', 100, 'each']
  ];

  /* ---------- storage ---------- */
  var db = load();
  function blank(){
    return { orders: [], ingredients: STARTER_ING.map(function(r, i){ return { id: 'i' + (i + 1), name: r[0], size: r[1], unit: r[2], price: '' }; }),
             recipes: {}, settings: { firstPay: '+1 (246) 820-9988', deposit: 50, pinHash: '' }, seq: 1 };
  }
  function load(){ try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.orders) { var b = blank(); d.settings = Object.assign(b.settings, d.settings || {}); d.ingredients = d.ingredients || b.ingredients; d.recipes = d.recipes || {}; return d; } } catch (e) {} return blank(); }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save. Is storage full?'); } }

  /* ---------- helpers ---------- */
  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v){ v = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(v) ? 0 : v; }
  function money(v){ return '$' + (Math.round(num(v) * 100) / 100).toFixed(2); }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function todayISO(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(iso, n){ var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function niceDate(iso, long){ if (!iso) return 'No date yet'; var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); return d.toLocaleDateString('en-GB', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' }); }
  var tt; function toast(m){ var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(function(){ t.classList.remove('show'); }, 2600); }
  function copy(text){
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function(){ toast('Copied. Paste it in WhatsApp.'); }, fallback);
    fallback(); function fallback(){ var a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); toast('Copied. Paste it in WhatsApp.'); } catch (e) { toast('Could not copy'); } a.remove(); }
  }
  function waLink(phone, text){ var d = String(phone || '').replace(/\D/g, ''); if (d.length === 7) d = '1246' + d; if (d.length === 10) d = '1' + d; return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function menuFind(name){
    var n = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (!n) return null;
    var best = null; MENU.forEach(function(m){ var mn = m.n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (mn === n) best = m; });
    if (best) return best;
    MENU.forEach(function(m){ var mn = m.n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (!best && (n.indexOf(mn) === 0 || mn.indexOf(n) === 0)) best = m; });
    return best;
  }

  /* ---------- order maths ---------- */
  function subtotal(o){ return o.items.reduce(function(s, it){ return s + num(it.qty) * num(it.price); }, 0); }
  function total(o){ return subtotal(o) + num(o.deliveryFee) + num(o.rushFee) - num(o.discount); }
  function depositDue(o){ return Math.round(total(o) * num(db.settings.deposit) / 100 * 100) / 100; }
  function balance(o){ return total(o) - num(o.paid); }
  function ingCPU(ing){ var size = num(ing.size), price = num(ing.price); if (!size || !price) return null; var b = TO_BASE[ing.unit] || ['each', 1]; return price / (size * b[1]); }
  function recipeCost(menuId){
    var r = db.recipes[menuId]; if (!r || !r.lines || !r.lines.length) return null;
    var c = 0, missing = 0;
    r.lines.forEach(function(l){ var ing = db.ingredients.filter(function(i){ return i.id === l.ing; })[0]; if (!ing) return; var cpu = ingCPU(ing); if (cpu === null) { missing++; return; } var b = TO_BASE[l.unit || ing.unit] || ['each', 1]; c += num(l.qty) * b[1] * cpu; });
    c = c / Math.max(1, num(r.yield) || 1) + num(r.extra);
    return { cost: c, missing: missing };
  }
  function orderCost(o){
    var c = 0, known = 0, unknown = 0;
    o.items.forEach(function(it){ var rc = it.menuId ? recipeCost(it.menuId) : null; if (rc) { c += rc.cost * num(it.qty); known++; } else unknown++; });
    return { cost: c, known: known, unknown: unknown };
  }

  /* ---------- WhatsApp message parser ---------- */
  function parseMessage(raw){
    var o = newOrder(); o.raw = raw;
    var lines = raw.replace(/\r/g, '').split('\n').map(function(l){ return l.replace(/^\s*\[[^\]]{4,40}\]\s*[^:]{1,40}:\s*/, '').replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?:\s?[AP]M)?\s*-\s*[^:]{1,40}:\s*/i, '').trim(); });
    function field(re){ for (var i = 0; i < lines.length; i++) { var m = lines[i].match(re); if (m) return m[1].trim(); } return ''; }
    lines.forEach(function(l){
      var m = l.match(/^(\d+)\s*x\s+(.+?)\s*-\s*\$\s*([\d,]+(?:\.\d+)?)/i);
      if (m) { var qty = +m[1], name = m[2], tot = num(m[3]), flav = ''; var fm = name.match(/^(.*)\s+\(([^()]+)\)$/); if (fm && menuFind(fm[1])) { name = fm[1]; flav = fm[2]; }
        var mi = menuFind(name); o.items.push({ name: mi ? mi.n : name, menuId: mi ? mi.id : '', flavour: flav, qty: qty, price: qty ? Math.round(tot / qty * 100) / 100 : tot }); return; }
      var b = l.match(/^Box\s*\d+\s*:\s*(.+?)\s*-\s*\$\s*([\d,]+(?:\.\d+)?)/i);
      if (b) o.items.push({ name: 'Saturday Treats: ' + b[1], menuId: '', flavour: '', qty: 1, price: num(b[2]) });
    });
    var d = field(/^(?:Date|Order date|Date needed)\s*:\s*(.+)$/i); if (d) o.date = toISO(d);
    o.time = field(/^(?:Time|Preferred (?:pickup|delivery) time)\s*:\s*(.+)$/i).replace(/^-$/, '');
    var method = field(/^Method\s*:\s*(.+)$/i);
    if (/deliver/i.test(method) || lines.some(function(l){ return /^DELIVERY$/i.test(l); }) || field(/^Parish\s*:\s*(.+)$/i)) o.method = 'Delivery';
    o.parish = field(/^Parish\s*:\s*(.+)$/i).replace(/^-$/, '');
    o.area = field(/^Area\s*\/\s*landmark\s*:\s*(.+)$/i).replace(/^-$/, '');
    o.name = field(/^Name\s*:\s*(.+)$/i).replace(/^-$/, '');
    o.phone = field(/^(?:WhatsApp number|Phone|Number)\s*:\s*(.+)$/i).replace(/^-$/, '');
    o.colours = field(/^Colou?rs?(?:\s*\/\s*theme)?\s*:\s*(.+)$/i);
    o.message = field(/^Message on (?:top|cake)\s*:\s*(.+)$/i);
    var notes = [field(/^(?:Allergies\s*\/\s*notes|Notes)\s*:\s*(.+)$/i), field(/^Dietary needs\s*:\s*(.+)$/i)].filter(function(x){ return x && !/^none|no dietary needs$/i.test(x); });
    o.notes = notes.join('. ');
    var fee = field(/^Delivery fee\s*:\s*\$?\s*([\d.]+)/i); if (fee) o.deliveryFee = num(fee);
    if (!o.items.length) { var t = field(/^(?:Estimated total|Total)\s*:\s*\$?\s*([\d,.]+)/i); if (t) o.items.push({ name: 'Order (see message)', menuId: '', flavour: '', qty: 1, price: num(t) }); }
    return o;
  }
  function toISO(s){
    var m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (m) { var mi = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].slice(0, 3).toLowerCase()); if (mi > -1) return m[3] + '-' + String(mi + 1).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0'); }
    m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
    m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { var y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0'); }
    return '';
  }
  function newOrder(){ return { id: uid(), no: 0, created: new Date().toISOString(), status: 'new', name: '', phone: '', method: 'Pickup', date: '', time: '', parish: '', area: '', items: [], colours: '', message: '', notes: '', deliveryFee: '', rushFee: '', discount: '', paid: '', internal: '', raw: '' }; }

  /* ---------- customer messages ---------- */
  function itemLines(o){ return o.items.map(function(it){ return num(it.qty) + ' x ' + it.name + (it.flavour ? ' (' + it.flavour + ')' : '') + ' - ' + money(num(it.qty) * num(it.price)); }); }
  function first(o){ return (o.name || '').split(' ')[0] || 'there'; }
  function msgConfirm(o){
    var L = ['Hello ' + first(o) + ', thank you for ordering with De\' Patisserie. Your order has been reviewed and approved.', '', 'YOUR ORDER'].concat(itemLines(o));
    if (num(o.deliveryFee)) L.push('Delivery fee - ' + money(o.deliveryFee));
    if (num(o.rushFee)) L.push('Rush fee - ' + money(o.rushFee));
    if (num(o.discount)) L.push('Discount - minus ' + money(o.discount));
    L.push('Total: ' + money(total(o)) + ' BBD', 'Deposit (' + db.settings.deposit + '%): ' + money(depositDue(o)) + ' BBD', '');
    L.push((o.method === 'Delivery' ? 'Delivery' : 'Pickup') + ': ' + niceDate(o.date, true) + (o.time ? ' at ' + o.time : ''));
    if (o.method === 'Delivery' && (o.parish || o.area)) L.push('To: ' + [o.area, o.parish].filter(Boolean).join(', '));
    L.push('', 'Please send your deposit by CIBC First Pay to ' + db.settings.firstPay + ' and send a screenshot here. Your order is confirmed once the deposit is received. Thank you!');
    return L.join('\n');
  }
  function msgDeposit(o){ return 'Hello ' + first(o) + ', your deposit of ' + money(o.paid) + ' has been received. Your order for ' + niceDate(o.date, true) + ' is confirmed. Balance due on ' + (o.method === 'Delivery' ? 'delivery' : 'pickup') + ': ' + money(Math.max(0, balance(o))) + ' BBD. Thank you for choosing De\' Patisserie!'; }
  function msgInquiry(o){ return 'Hello ' + first(o) + ', thank you for your order request with De\' Patisserie! Before I confirm, could you tell me a little more about '+ (o.items.length ? 'your ' + o.items[0].name : 'your order') + '? For example the flavour, colours or theme, any message on top, and an inspiration photo if you have one. Thank you!'; }
  function msgHold(o){ return 'Hello ' + first(o) + ', thank you for your order request with De\' Patisserie! I\'m just checking my schedule for ' + niceDate(o.date, true) + ' and will get back to you shortly to confirm. Thank you for your patience.'; }
  function msgDecline(o){ return 'Hello ' + first(o) + ', thank you so much for thinking of De\' Patisserie. Unfortunately I\'m not able to take this order for ' + niceDate(o.date, true) + ', as my spots are full. I would love to bake for you another time, so please reach out again with a little more notice. Thank you for understanding!'; }
  function msgReady(o){ return 'Hello ' + first(o) + ', your De\' Patisserie order is ready' + (o.method === 'Delivery' ? ' and on its way to you' : ' for pickup') + '! Balance due: ' + money(Math.max(0, balance(o))) + ' BBD. Enjoy every bite!'; }

  /* ---------- lock ---------- */
  function sha(s){ if (!window.crypto || !crypto.subtle) return Promise.resolve('plain:' + s); return crypto.subtle.digest('SHA-256', new TextEncoder().encode('dp-salt-' + s)).then(function(b){ return Array.prototype.map.call(new Uint8Array(b), function(x){ return x.toString(16).padStart(2, '0'); }).join(''); }); }
  function unlocked(){ try { return sessionStorage.getItem('dp-ob-open') === '1'; } catch (e) { return false; } }
  function openApp(){ try { sessionStorage.setItem('dp-ob-open', '1'); } catch (e) {} $('#lock').hidden = true; $('#app').hidden = false; go('home'); }
  var setting = !db.settings.pinHash, firstPin = '', entry = '', busy = false;
  function msg(m){ $('#lock-msg').textContent = m; }
  function dots(){ $$('#pin-dots i').forEach(function(d, i){ d.classList.toggle('on', i < entry.length); }); }
  function bad(m){ msg(m); entry = ''; dots(); var c = $('.lock-card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
  if (setting) msg('Create a 4-number PIN');
  function press(k){
    if (busy) return;
    if (k === 'del') { entry = entry.slice(0, -1); dots(); return; }
    if (entry.length >= 4) return;
    entry += k; dots();
    if (entry.length === 4) { busy = true; setTimeout(check, 180); }
  }
  function check(){
    var p = entry;
    if (setting) {
      if (!firstPin) { firstPin = p; entry = ''; dots(); msg('Type the same PIN again'); busy = false; return; }
      if (p !== firstPin) { firstPin = ''; busy = false; return bad("Those didn't match. Create your PIN again"); }
      sha(p).then(function(h){ db.settings.pinHash = h; save(); setting = false; busy = false; openApp(); toast('PIN set'); });
      return;
    }
    sha(p).then(function(h){ busy = false; if (h === db.settings.pinHash) { entry = ''; openApp(); } else bad('Wrong PIN, try again'); });
  }
  $('#keypad').addEventListener('click', function(e){ var b = e.target.closest('[data-k]'); if (b) press(b.getAttribute('data-k')); });
  document.addEventListener('keydown', function(e){ if ($('#lock').hidden) return; if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); });
  $('#lock-form').addEventListener('submit', function(e){ e.preventDefault(); });
  $('#lock-btn').addEventListener('click', function(){ try { sessionStorage.removeItem('dp-ob-open'); } catch (e) {} location.reload(); });
  if (!setting && unlocked()) openApp();

  /* ---------- navigation ---------- */
  var current = null, filter = 'active';
  $('#tabs').addEventListener('click', function(e){ var b = e.target.closest('[data-tab]'); if (b) go(b.getAttribute('data-tab')); });
  function go(view, id){
    $$('[data-view]').forEach(function(s){ s.hidden = s.getAttribute('data-view') !== view; });
    $$('#tabs [data-tab]').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-tab') === (view === 'detail' ? 'orders' : view === 'invoice' ? 'invoices' : view)); });
    current = id || null;
    ({ home: viewHome, orders: viewOrders, add: viewAdd, detail: viewDetail, costs: viewCosts, shop: viewShop, settings: viewSettings, invoices: viewInvoices, invoice: viewInvoice })[view]();
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', function(e){ var o = e.target.closest('[data-open]'); if (o) go('detail', o.getAttribute('data-open')); var iv = e.target.closest('[data-invoice]'); if (iv) go('invoice', iv.getAttribute('data-invoice')); });

  function orderRow(o){
    var p = o.date ? o.date.split('-') : null, d = p ? new Date(+p[0], +p[1] - 1, +p[2]) : null;
    var sum = o.items.map(function(it){ return num(it.qty) + ' x ' + it.name; }).join(', ') || 'No items yet';
    return '<button type="button" class="oitem" data-open="' + o.id + '"><span class="odate">' + (d ? '<b>' + d.getDate() + '</b><small>' + d.toLocaleDateString('en-GB', { month: 'short' }) + '</small>' : '<small>No date</small>') + '</span>' +
      '<span style="min-width:0"><span class="oname">' + esc(o.name || 'No name') + '</span> <span class="pill st-' + o.status + '">' + ST[o.status] + '</span><span class="osum" style="display:block">' + esc(sum) + '</span>' +
      '<span class="osum" style="display:block">' + esc(o.method + (o.time ? ' · ' + o.time : '')) + '</span></span>' +
      '<span class="oright"><b>' + money(total(o)) + '</b><small class="muted">' + (num(o.paid) >= total(o) && total(o) ? 'Paid in full' : num(o.paid) ? 'Paid ' + money(o.paid) : 'Nothing paid') + '</small></span></button>';
  }

  /* ---------- overview ---------- */
  function viewHome(){
    var t = todayISO(), wk = addDays(t, 7), act = db.orders.filter(function(o){ return !closed(o); });
    var toReview = act.filter(function(o){ return o.status === 'new'; });
    var awaiting = act.filter(function(o){ return o.status === 'approved'; });
    var week = act.filter(function(o){ return o.date && o.date >= t && o.date <= wk; }).sort(function(a, b){ return (a.date + a.time).localeCompare(b.date + b.time); });
    var month = t.slice(0, 7), mo = db.orders.filter(function(o){ return o.status !== 'cancelled' && (o.date || o.created).slice(0, 7) === month; });
    var rev = mo.reduce(function(s, o){ return s + total(o); }, 0), cost = mo.reduce(function(s, o){ return s + orderCost(o).cost; }, 0);
    var owed = act.reduce(function(s, o){ return s + Math.max(0, balance(o)); }, 0);
    var h = '<h2>Hi Daneisha &#9825;</h2><div class="stats">' +
      '<div class="stat hot"><small>To review</small><b>' + toReview.length + '</b></div>' +
      '<div class="stat"><small>Waiting on deposit</small><b>' + awaiting.length + '</b></div>' +
      '<div class="stat"><small>This month\'s sales</small><b>' + money(rev) + '</b></div>' +
      '<div class="stat"><small>Still to collect</small><b>' + money(owed) + '</b></div></div>';
    h += '<div class="card"><div class="row" style="justify-content:space-between"><h3>Coming up this week</h3><button class="b b-main b-sm" data-go="add">+ New order</button></div>' + (week.length ? '<div class="olist">' + week.map(orderRow).join('') + '</div>' : '<p class="empty">Nothing due in the next 7 days.</p>') + '</div>';
    if (toReview.length) h += '<div class="card"><h3>New orders to review</h3><div class="olist">' + toReview.map(orderRow).join('') + '</div></div>';
    if (cost) h += '<p class="small muted" style="margin-top:12px">Estimated ingredient cost this month: ' + money(cost) + ' &middot; estimated profit: ' + money(rev - cost) + ' (only counts items with recipes filled in).</p>';
    $('[data-view=home]').innerHTML = h;
  }
  document.addEventListener('click', function(e){ var g = e.target.closest('[data-go]'); if (g) go(g.getAttribute('data-go')); });

  /* ---------- orders list ---------- */
  function viewOrders(){
    var F = [['active', 'Active'], ['new', 'To review'], ['inquiry', 'Inquiry'], ['hold', 'On hold'], ['approved', 'Approved'], ['deposit', 'Deposit paid'], ['baking', 'Baking'], ['ready', 'Ready'], ['done', 'Completed'], ['declined', 'Declined'], ['cancelled', 'Cancelled'], ['all', 'All']];
    var list = db.orders.filter(function(o){ return filter === 'all' ? true : filter === 'active' ? (!closed(o)) : o.status === filter; });
    var q = (viewOrders.q || '').toLowerCase();
    if (q) list = list.filter(function(o){ return (o.name + ' ' + o.phone + ' ' + o.items.map(function(i){ return i.name; }).join(' ')).toLowerCase().indexOf(q) > -1; });
    list.sort(function(a, b){ return ((a.date || '9999') + a.time).localeCompare((b.date || '9999') + b.time); });
    var h = '<div class="row" style="justify-content:space-between;margin-bottom:10px"><h2 style="margin:0">Orders</h2><button class="b b-main" data-go="add">+ New order</button></div>' +
      '<input class="in" id="o-search" placeholder="Search name, number or item" value="' + esc(viewOrders.q || '') + '" style="margin-bottom:10px">' +
      '<div class="filters">' + F.map(function(f){ return '<button data-f="' + f[0] + '" class="' + (filter === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>';
    if (!list.length) h += '<p class="empty">No orders here yet. Tap <b>+ New order</b> and paste a WhatsApp message.</p>';
    else { var last = ''; h += '<div class="olist">'; list.forEach(function(o){ var k = o.date || ''; if (k !== last) { h += '<div class="day-h">' + niceDate(k, true) + '</div>'; last = k; } h += orderRow(o); }); h += '</div>'; }
    var v = $('[data-view=orders]'); v.innerHTML = h;
    $$('[data-f]', v).forEach(function(b){ b.addEventListener('click', function(){ filter = b.getAttribute('data-f'); viewOrders(); }); });
    var s = $('#o-search'); s.addEventListener('input', function(){ viewOrders.q = s.value; var pos = s.selectionStart; viewOrders(); var n = $('#o-search'); n.focus(); n.setSelectionRange(pos, pos); });
  }

  /* ---------- add (paste) ---------- */
  function viewAdd(){
    var v = $('[data-view=add]');
    v.innerHTML = '<h2>New order</h2><div class="card"><h3>Paste the WhatsApp message</h3><p class="muted small">Long-press the customer\'s order message in WhatsApp, tap Copy, then paste it here. The details fill in by themselves and you can fix anything after.</p>' +
      '<textarea id="paste" rows="9" class="in" style="width:100%;padding:12px;border:1.5px solid var(--p200);border-radius:14px;font-size:15px" placeholder="Hello De\' Patisserie, I would like to place an order..."></textarea>' +
      '<div class="row" style="margin-top:10px"><button class="b b-main" id="p-read">Read message</button><button class="b" id="p-paste">Paste from clipboard</button><button class="b b-ghost" id="p-blank">Start a blank order</button></div><div id="p-out" style="margin-top:14px"></div></div>';
    $('#p-paste').addEventListener('click', function(){ if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function(t){ $('#paste').value = t; read(); }, function(){ toast('Long-press the box and choose Paste'); }); else toast('Long-press the box and choose Paste'); });
    $('#p-blank').addEventListener('click', function(){ var o = newOrder(); addOrder(o); go('detail', o.id); });
    $('#p-read').addEventListener('click', read);
    function read(){
      var raw = $('#paste').value.trim(); if (!raw) return toast('Paste a message first');
      var o = parseMessage(raw), sub = subtotal(o);
      var out = '<div class="parsed"><div><b>Customer:</b> ' + esc(o.name || 'not found') + (o.phone ? ' · ' + esc(o.phone) : '') + '</div>' +
        '<div><b>' + o.method + ':</b> ' + esc(niceDate(o.date, true)) + (o.time ? ' at ' + esc(o.time) : '') + (o.parish ? ' · ' + esc(o.parish) : '') + '</div>' +
        '<div><b>Items:</b><br>' + (o.items.length ? o.items.map(function(it){ return '&bull; ' + num(it.qty) + ' x ' + esc(it.name) + (it.flavour ? ' (' + esc(it.flavour) + ')' : '') + ' &mdash; ' + money(num(it.qty) * num(it.price)) + (it.menuId ? '' : ' <span class="small muted">(not on menu)</span>'); }).join('<br>') : 'none found, you can add them on the next screen') + '</div>' +
        (o.colours ? '<div><b>Colours:</b> ' + esc(o.colours) + '</div>' : '') + (o.message ? '<div><b>Message on top:</b> ' + esc(o.message) + '</div>' : '') + (o.notes ? '<div><b>Notes:</b> ' + esc(o.notes) + '</div>' : '') +
        '<div><b>Items total:</b> ' + money(sub) + '</div></div>' +
        '<div class="row" style="margin-top:12px"><button class="b b-main" id="p-save">Save order</button></div>';
      $('#p-out').innerHTML = out;
      $('#p-save').addEventListener('click', function(){ addOrder(o); toast('Order saved'); go('detail', o.id); });
    }
  }
  function addOrder(o){ o.no = db.seq++; db.orders.push(o); save(); }

  /* ---------- order detail ---------- */
  function viewDetail(){
    var o = db.orders.filter(function(x){ return x.id === current; })[0], v = $('[data-view=detail]');
    if (!o) { v.innerHTML = '<p class="empty">Order not found.</p>'; return; }
    var cats = {}; MENU.forEach(function(m){ (cats[m.cat] = cats[m.cat] || []).push(m); });
    var opts = '<option value="">Custom item</option>' + Object.keys(cats).map(function(c){ return '<optgroup label="' + esc(c) + '">' + cats[c].map(function(m){ return '<option value="' + m.id + '">' + esc(m.n) + ' (' + money(m.p) + ')</option>'; }).join('') + '</optgroup>'; }).join('');
    var idx = STATUSES.map(function(s){ return s[0]; }).indexOf(o.status);
    var h = '<div class="dhead"><button class="b b-ghost b-sm" data-go="orders">&larr; Orders</button><h2>' + esc(o.name || 'New order') + ' <span class="small muted" style="font-family:Poppins">#' + o.no + '</span></h2>' +
      '<button class="b b-dark b-sm" data-invoice="' + o.id + '">Invoice</button>' +
      (o.phone ? '<a class="b b-wa b-sm" href="' + waLink(o.phone) + '" target="_blank" rel="noopener">Open chat</a>' : '') + '</div>';
    var pi = PIPE.indexOf(o.status);
    if (o.status === 'new' || o.status === 'inquiry' || o.status === 'hold') h += '<div class="decide"><span>Decide:</span><button class="b b-main b-sm" data-st="approved">Approve</button><button class="b b-sm" data-st="inquiry">Need more info</button><button class="b b-sm" data-st="hold">Put on hold</button><button class="b b-danger b-sm" data-st="declined">Decline</button></div>';
    h += '<div class="steps">' + PIPE.map(function(k, i){ return '<button data-st="' + k + '" class="' + (k === o.status ? 'on' : (pi > -1 && i < pi ? 'past' : '')) + '">' + ST[k] + '</button>'; }).join('') +
      '<span class="steps-sep"></span>' + SIDE.map(function(k){ return '<button data-st="' + k + '" class="side' + (k === o.status ? ' on' : '') + '">' + ST[k] + '</button>'; }).join('') + '</div>';
    if (o.date && o.date < addDays(todayISO(), 3) && o.status === 'new') h += '<p class="warn" style="margin-bottom:12px">This is inside 3 days\' notice. Add a rush fee if you\'re taking it.</p>';
    h += '<div class="grid2"><div class="card"><h3>Customer</h3><div class="grid2">' +
      fld('name', 'Name', o.name) + fld('phone', 'WhatsApp number', o.phone, 'tel') + '</div><div class="grid2" style="margin-top:10px">' +
      '<label class="f">Pickup or delivery<select data-k="method"><option' + (o.method === 'Pickup' ? ' selected' : '') + '>Pickup</option><option' + (o.method === 'Delivery' ? ' selected' : '') + '>Delivery</option></select></label>' +
      fld('date', 'Date', o.date, 'date') + '</div><div class="grid2" style="margin-top:10px">' + fld('time', 'Time', o.time) + fld('parish', 'Parish', o.parish) + '</div>' +
      '<div style="margin-top:10px">' + fld('area', 'Area or landmark', o.area) + '</div></div>' +
      '<div class="card"><h3>Design</h3>' + fld('colours', 'Colours / theme', o.colours) + '<div style="margin-top:10px">' + fld('message', 'Message on top', o.message) + '</div>' +
      '<label class="f" style="margin-top:10px">Customer notes / allergies<textarea data-k="notes" rows="2">' + esc(o.notes) + '</textarea></label>' +
      '<label class="f" style="margin-top:10px">My private notes<textarea data-k="internal" rows="2" placeholder="Only you see this">' + esc(o.internal) + '</textarea></label></div></div>';
    h += '<div class="card"><h3>Items &amp; price</h3><table class="it"><thead><tr><th>Item</th><th>Flavour</th><th>Qty</th><th>Price each</th><th></th></tr></thead><tbody>' +
      o.items.map(function(it, i){ return '<tr data-i="' + i + '"><td class="nm"><input data-ik="name" value="' + esc(it.name) + '" list="menu-names"></td><td class="fl"><input data-ik="flavour" value="' + esc(it.flavour) + '" placeholder="Flavour"></td><td><input class="num" data-ik="qty" inputmode="numeric" placeholder="Qty" value="' + esc(it.qty) + '"></td><td><input class="money" data-ik="price" inputmode="decimal" placeholder="$ each" value="' + esc(it.price) + '"></td><td><button class="x" data-del="' + i + '" aria-label="Remove">&times;</button></td></tr>'; }).join('') +
      '</tbody></table><datalist id="menu-names">' + MENU.map(function(m){ return '<option value="' + esc(m.n) + '">'; }).join('') + '</datalist>' +
      '<div class="row" style="margin-top:10px"><select class="in" id="add-item" style="max-width:340px">' + opts + '</select><button class="b b-sm" id="add-btn">+ Add item</button></div>' +
      '<div class="totals"><div><span>Items</span><b>' + money(subtotal(o)) + '</b></div>' +
      '<div><span>Delivery fee</span><input data-k="deliveryFee" inputmode="decimal" value="' + esc(o.deliveryFee) + '" placeholder="0.00"></div>' +
      '<div><span>Rush fee</span><input data-k="rushFee" inputmode="decimal" value="' + esc(o.rushFee) + '" placeholder="0.00"></div>' +
      '<div><span>Discount</span><input data-k="discount" inputmode="decimal" value="' + esc(o.discount) + '" placeholder="0.00"></div>' +
      '<div class="big"><span>Total</span><span>' + money(total(o)) + ' BBD</span></div>' +
      '<div><span>' + db.settings.deposit + '% deposit</span><b>' + money(depositDue(o)) + '</b></div>' +
      '<div><span>Paid so far</span><input data-k="paid" inputmode="decimal" value="' + esc(o.paid) + '" placeholder="0.00"></div>' +
      '<div><span>Balance</span><b class="' + (balance(o) > 0 ? 'bad' : 'good') + '">' + money(Math.max(0, balance(o))) + '</b></div></div>';
    var oc = orderCost(o), prof = total(o) - num(o.deliveryFee) - oc.cost;
    h += '<div class="profit"><div><small>Ingredient cost</small><b>' + (oc.known ? money(oc.cost) : '&ndash;') + '</b></div><div class="' + (prof >= 0 ? 'good' : 'bad') + '"><small>Profit</small><b>' + (oc.known ? money(prof) : '&ndash;') + '</b></div><div><small>Margin</small><b>' + (oc.known && total(o) ? Math.round(prof / (total(o) - num(o.deliveryFee) || 1) * 100) + '%' : '&ndash;') + '</b></div></div>' +
      (oc.unknown ? '<p class="small muted" style="margin-top:6px">' + oc.unknown + ' item(s) have no recipe yet, so their cost isn\'t counted. Add them in <a href="#" data-go="costs">Recipes &amp; costs</a>.</p>' : '') + '</div>';
    var msgs = [['Approve &amp; ask for deposit', msgConfirm(o)], ['Deposit received', msgDeposit(o)], ['Order ready', msgReady(o)], ['Need more info', msgInquiry(o)], ['On hold', msgHold(o)], ['Decline', msgDecline(o)]];
    h += '<div class="card"><h3>Messages to send</h3><div class="row" id="msg-tabs" style="margin-bottom:10px">' + msgs.map(function(m, i){ return '<button class="b b-sm' + (i === 0 ? ' b-dark' : '') + '" data-m="' + i + '">' + m[0] + '</button>'; }).join('') + '</div>' +
      '<div class="msgbox" id="msg-text"></div><div class="row" style="margin-top:10px"><button class="b b-main" id="m-copy">Copy message</button>' + (o.phone ? '<a class="b b-wa" id="m-wa" target="_blank" rel="noopener">Send on WhatsApp</a>' : '') + '</div></div>';
    if (o.raw) h += '<details class="card"><summary style="cursor:pointer;font-weight:600;color:var(--berry)">Original WhatsApp message</summary><div class="msgbox" style="margin-top:10px">' + esc(o.raw) + '</div></details>';
    h += '<div class="row" style="margin-top:14px;justify-content:space-between"><button class="b b-danger b-sm" id="del-order">Delete order</button><span class="small muted">Added ' + new Date(o.created).toLocaleString('en-GB') + '</span></div>';
    v.innerHTML = h;
    function setMsg(i){ $('#msg-text').textContent = msgs[i][1]; $$('[data-m]').forEach(function(b){ b.classList.toggle('b-dark', +b.getAttribute('data-m') === i); }); var a = $('#m-wa'); if (a) a.href = waLink(o.phone, msgs[i][1]); setMsg.i = i; }
    setMsg(o.status === 'deposit' || o.status === 'baking' ? 1 : o.status === 'ready' ? 2 : o.status === 'inquiry' ? 3 : o.status === 'hold' ? 4 : o.status === 'declined' ? 5 : 0);
    $$('[data-m]', v).forEach(function(b){ b.addEventListener('click', function(){ setMsg(+b.getAttribute('data-m')); }); });
    $('#m-copy').addEventListener('click', function(){ copy($('#msg-text').textContent); });
    $$('[data-st]', v).forEach(function(b){ b.addEventListener('click', function(){ o.status = b.getAttribute('data-st'); if (o.status === 'deposit' && !num(o.paid)) o.paid = depositDue(o); save(); viewDetail(); toast('Marked as ' + ST[o.status]); }); });
    $$('[data-k]', v).forEach(function(el){ el.addEventListener('change', function(){ o[el.getAttribute('data-k')] = el.value; save(); viewDetail(); }); });
    $$('[data-ik]', v).forEach(function(el){ el.addEventListener('change', function(){ var it = o.items[+el.closest('tr').getAttribute('data-i')], k = el.getAttribute('data-ik'); it[k] = el.value; if (k === 'name') { var m = menuFind(el.value); it.menuId = m ? m.id : ''; if (m && !num(it.price)) it.price = m.p; } save(); viewDetail(); }); });
    $$('[data-del]', v).forEach(function(b){ b.addEventListener('click', function(){ o.items.splice(+b.getAttribute('data-del'), 1); save(); viewDetail(); }); });
    $('#add-btn').addEventListener('click', function(){ var id = $('#add-item').value, m = MENU.filter(function(x){ return x.id === id; })[0]; o.items.push(m ? { name: m.n, menuId: m.id, flavour: '', qty: 1, price: m.p } : { name: '', menuId: '', flavour: '', qty: 1, price: '' }); save(); viewDetail(); });
    $('#del-order').addEventListener('click', function(){ if (confirmDel()) { db.orders = db.orders.filter(function(x){ return x !== o; }); save(); go('orders'); toast('Order deleted'); } });
    function confirmDel(){ var b = $('#del-order'); if (b.dataset.sure) return true; b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; setTimeout(function(){ if (b.isConnected) { delete b.dataset.sure; b.textContent = 'Delete order'; } }, 3000); return false; }
  }
  function fld(k, label, val, type){ return '<label class="f">' + label + '<input data-k="' + k + '" type="' + (type || 'text') + '" value="' + esc(val) + '"' + (type === 'tel' ? ' inputmode="tel"' : '') + '></label>'; }

  /* ---------- invoices ---------- */
  function invNo(o){ if (!o.invoiceNo) { db.invSeq = (db.invSeq || 0) + 1; o.invoiceNo = 'DP-' + String(db.invSeq).padStart(4, '0'); o.invoiceDate = o.invoiceDate || todayISO(); save(); } return o.invoiceNo; }
  function viewInvoices(){
    var v = $('[data-view=invoices]'), list = db.orders.slice().sort(function(a, b){ return (b.date || '').localeCompare(a.date || ''); });
    var h = '<div class="row" style="justify-content:space-between;margin-bottom:10px"><h2 style="margin:0">Invoices</h2><button class="b b-main" id="inv-new">+ New invoice</button></div>' +
      '<p class="small muted" style="margin-bottom:12px">Pick an order to make its invoice, or start a new one for something that didn\'t come through WhatsApp.</p>';
    if (!list.length) h += '<p class="empty">No orders yet.</p>';
    else h += '<div class="olist">' + list.map(function(o){ return '<div class="inv-row"><div><b>' + esc(o.name || 'No name') + '</b> <span class="pill st-' + o.status + '">' + ST[o.status] + '</span><br><span class="small muted">' + (o.invoiceNo ? o.invoiceNo + ' &middot; ' : '') + esc(niceDate(o.date)) + ' &middot; ' + money(total(o)) + '</span></div><button class="b b-sm b-dark" data-invoice="' + o.id + '">' + (o.invoiceNo ? 'Open invoice' : 'Make invoice') + '</button></div>'; }).join('') + '</div>';
    v.innerHTML = h;
    $('#inv-new').addEventListener('click', function(){ var o = newOrder(); o.status = 'approved'; addOrder(o); go('detail', o.id); toast('Fill in the customer and items, then tap Invoice'); });
  }
  function viewInvoice(){
    var o = db.orders.filter(function(x){ return x.id === current; })[0], v = $('[data-view=invoice]');
    if (!o) { v.innerHTML = '<p class="empty">Order not found.</p>'; return; }
    var no = invNo(o), paid = num(o.paid), tot = total(o), bal = Math.max(0, tot - paid);
    var stamp = paid >= tot && tot > 0 ? 'PAID' : paid > 0 ? 'DEPOSIT PAID' : 'UNPAID';
    var rows = o.items.map(function(it){ return '<tr><td>' + esc(it.name) + (it.flavour ? '<small>' + esc(it.flavour) + '</small>' : '') + '</td><td class="r">' + num(it.qty) + '</td><td class="r">' + money(it.price) + '</td><td class="r">' + money(num(it.qty) * num(it.price)) + '</td></tr>'; }).join('');
    var extra = '';
    if (num(o.deliveryFee)) extra += '<div><span>Delivery' + (o.parish ? ' (' + esc(o.parish) + ')' : '') + '</span><span>' + money(o.deliveryFee) + '</span></div>';
    if (num(o.rushFee)) extra += '<div><span>Rush fee</span><span>' + money(o.rushFee) + '</span></div>';
    if (num(o.discount)) extra += '<div><span>Discount</span><span>&minus;' + money(o.discount) + '</span></div>';
    v.innerHTML = '<div class="row no-print" style="justify-content:space-between;margin-bottom:12px"><button class="b b-ghost b-sm" data-open="' + o.id + '">&larr; Back to order</button><div class="row"><button class="b" id="inv-copy">Copy as text</button><button class="b b-main" id="inv-print">Save as PDF / Print</button></div></div>' +
      '<div class="no-print grid2" style="margin-bottom:12px"><label class="f">Invoice date<input type="date" id="inv-date" value="' + esc(o.invoiceDate || todayISO()) + '"></label><label class="f">Note on invoice<input id="inv-note" value="' + esc(o.invoiceNote || '') + '" placeholder="e.g. Thank you for celebrating with us!"></label></div>' +
      '<article class="invoice" id="invoice"><header class="inv-head"><img src="assets/img/logo.png" alt=""><div class="inv-title"><h1>Invoice</h1><span class="inv-stamp ' + stamp.toLowerCase().replace(/ /g, '-') + '">' + stamp + '</span></div></header>' +
      '<div class="inv-meta"><div><small>From</small><b>De\' Patisserie</b><span>Cakes &amp; desserts, Barbados</span><span>WhatsApp +1 (246) 264-4609</span><span>@depatisserie246</span></div>' +
      '<div><small>Bill to</small><b>' + esc(o.name || '') + '</b>' + (o.phone ? '<span>' + esc(o.phone) + '</span>' : '') + (o.method === 'Delivery' && (o.area || o.parish) ? '<span>' + esc([o.area, o.parish].filter(Boolean).join(', ')) + '</span>' : '') + '</div>' +
      '<div class="inv-nums"><div><small>Invoice no.</small><b>' + no + '</b></div><div><small>Invoice date</small><b>' + esc(niceDate(o.invoiceDate || todayISO())) + '</b></div><div><small>' + (o.method === 'Delivery' ? 'Delivery' : 'Pickup') + '</small><b>' + esc(niceDate(o.date)) + (o.time ? ', ' + esc(o.time) : '') + '</b></div></div></div>' +
      '<table class="inv-t"><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="muted">No items yet</td></tr>') + '</tbody></table>' +
      '<div class="inv-tot"><div><span>Subtotal</span><span>' + money(subtotal(o)) + '</span></div>' + extra +
      '<div class="big"><span>Total (BBD)</span><span>' + money(tot) + '</span></div><div><span>Paid</span><span>' + money(paid) + '</span></div><div class="due"><span>Balance due</span><span>' + money(bal) + '</span></div></div>' +
      '<div class="inv-pay"><b>How to pay</b><span>CIBC First Pay: ' + esc(db.settings.firstPay) + '</span><span>Bank transfer or cash also accepted. Please send a screenshot of your payment on WhatsApp.</span>' + (bal > 0 && paid === 0 ? '<span>A ' + db.settings.deposit + '% deposit of ' + money(depositDue(o)) + ' confirms your order.</span>' : '') + '</div>' +
      (o.invoiceNote ? '<p class="inv-note">' + esc(o.invoiceNote) + '</p>' : '') +
      '<footer class="inv-foot">Thank you for choosing De\' Patisserie &#9825; Made with love in Barbados</footer></article>';
    $('#inv-print').addEventListener('click', function(){ window.print(); });
    $('#inv-date').addEventListener('change', function(e){ o.invoiceDate = e.target.value; save(); viewInvoice(); });
    $('#inv-note').addEventListener('change', function(e){ o.invoiceNote = e.target.value; save(); viewInvoice(); });
    $('#inv-copy').addEventListener('click', function(){
      var L = ["De' Patisserie - Invoice " + no, 'Date: ' + niceDate(o.invoiceDate || todayISO()), 'Bill to: ' + (o.name || ''), ''].concat(itemLines(o));
      if (num(o.deliveryFee)) L.push('Delivery - ' + money(o.deliveryFee)); if (num(o.rushFee)) L.push('Rush fee - ' + money(o.rushFee)); if (num(o.discount)) L.push('Discount - minus ' + money(o.discount));
      L.push('', 'Total: ' + money(tot) + ' BBD', 'Paid: ' + money(paid), 'Balance due: ' + money(bal) + ' BBD', '', 'Pay by CIBC First Pay: ' + db.settings.firstPay);
      copy(L.join('\n'));
    });
  }

  /* ---------- recipes & costs ---------- */
  function viewCosts(){
    var v = $('[data-view=costs]');
    var h = '<h2>Recipes &amp; costs</h2><div class="card"><h3>1. Ingredient prices</h3><p class="small muted">Type what you pay for each pack and how big the pack is. The cost per gram or per egg works itself out.</p>' +
      '<div class="ing-row head"><span>Ingredient</span><span>Pack size</span><span>Unit</span><span>Pack price ($)</span><span>Cost per unit</span><span></span></div>' +
      db.ingredients.map(function(g, i){ var c = ingCPU(g), b = TO_BASE[g.unit] || ['each', 1];
        return '<div class="ing-row" data-g="' + i + '"><input data-gk="name" value="' + esc(g.name) + '"><input data-gk="size" inputmode="decimal" value="' + esc(g.size) + '"><select data-gk="unit">' + UNITS.map(function(u){ return '<option' + (u === g.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select><input data-gk="price" inputmode="decimal" placeholder="0.00" value="' + esc(g.price) + '"><span class="cpu">' + (c === null ? '&ndash;' : '$' + (c < 0.1 ? c.toFixed(4) : c.toFixed(2)) + '/' + b[0]) + '</span><button class="x" data-gdel="' + i + '" aria-label="Remove">&times;</button></div>'; }).join('') +
      '<button class="b b-sm" id="g-add" style="margin-top:10px">+ Add ingredient</button></div>';
    var byCat = {}; MENU.forEach(function(m){ (byCat[m.cat] = byCat[m.cat] || []).push(m); });
    h += '<div class="card"><h3>2. What goes into each item</h3><p class="small muted">Open an item and add its ingredients. "Makes" is how many of that item the amounts make (e.g. a batch that makes 12 cupcakes). Add packaging like boxes and boards as "Extra cost".</p>';
    Object.keys(byCat).forEach(function(c){
      h += '<div class="cat-h">' + esc(c) + '</div><div class="rec-list">';
      byCat[c].forEach(function(m){
        var r = db.recipes[m.id] || { lines: [], yield: 1, extra: '' }, rc = recipeCost(m.id);
        var mg = rc ? Math.round((m.p - rc.cost) / m.p * 100) : null;
        h += '<details class="rec" data-r="' + m.id + '"' + (viewCosts.open === m.id ? ' open' : '') + '><summary><b>' + esc(m.n) + '</b><span class="c">Sells ' + money(m.p) + '<br>' + (rc ? 'Costs ' + money(rc.cost) + (rc.missing ? ' *' : '') : 'No recipe yet') + '</span><span class="m ' + (mg === null ? 'muted' : mg >= 50 ? 'good' : mg >= 25 ? '' : 'bad') + '">' + (mg === null ? '' : mg + '%') + '</span></summary><div class="rec-body">' +
          (r.lines || []).map(function(l, i){ var g = db.ingredients.filter(function(x){ return x.id === l.ing; })[0], cpu = g ? ingCPU(g) : null, b = TO_BASE[l.unit] || ['each', 1];
            return '<div class="rl" data-l="' + i + '"><select data-lk="ing">' + db.ingredients.map(function(x){ return '<option value="' + x.id + '"' + (x.id === l.ing ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select><input data-lk="qty" inputmode="decimal" placeholder="amount" value="' + esc(l.qty) + '"><select data-lk="unit">' + UNITS.map(function(u){ return '<option' + (u === l.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select><span class="rc small muted">' + (cpu === null ? 'no price' : money(num(l.qty) * b[1] * cpu)) + '</span><button class="x" data-ldel="' + i + '">&times;</button></div>'; }).join('') +
          '<div class="row"><button class="b b-sm" data-ladd>+ Add ingredient</button></div><div class="grid2"><label class="f">Makes (how many)<input data-rk="yield" inputmode="numeric" value="' + esc(r.yield || 1) + '"></label><label class="f">Extra cost per item (box, board, topper) $<input data-rk="extra" inputmode="decimal" placeholder="0.00" value="' + esc(r.extra) + '"></label></div>' +
          (rc && rc.missing ? '<p class="small warn">* Some ingredients have no price yet, so this cost is too low.</p>' : '') + '</div></details>';
      });
      h += '</div>';
    });
    h += '</div>';
    v.innerHTML = h;
    $$('[data-gk]', v).forEach(function(el){ el.addEventListener('change', function(){ db.ingredients[+el.closest('[data-g]').getAttribute('data-g')][el.getAttribute('data-gk')] = el.value; save(); viewCosts(); }); });
    $$('[data-gdel]', v).forEach(function(b){ b.addEventListener('click', function(){ db.ingredients.splice(+b.getAttribute('data-gdel'), 1); save(); viewCosts(); }); });
    $('#g-add').addEventListener('click', function(){ db.ingredients.push({ id: 'i' + uid(), name: 'New ingredient', size: 1, unit: 'g', price: '' }); save(); viewCosts(); });
    $$('[data-r]', v).forEach(function(d){
      var id = d.getAttribute('data-r'); function R(){ return db.recipes[id] = db.recipes[id] || { lines: [], yield: 1, extra: '' }; }
      d.addEventListener('toggle', function(){ if (d.open) viewCosts.open = id; });
      $$('[data-lk]', d).forEach(function(el){ el.addEventListener('change', function(){ var l = R().lines[+el.closest('[data-l]').getAttribute('data-l')], k = el.getAttribute('data-lk'); l[k] = el.value; if (k === 'ing') { var g = db.ingredients.filter(function(x){ return x.id === el.value; })[0]; if (g) l.unit = TO_BASE[g.unit] && TO_BASE[g.unit][0] === 'each' ? 'each' : (TO_BASE[g.unit] || ['g'])[0]; } save(); viewCosts.open = id; viewCosts(); }); });
      $$('[data-ldel]', d).forEach(function(b){ b.addEventListener('click', function(){ R().lines.splice(+b.getAttribute('data-ldel'), 1); save(); viewCosts.open = id; viewCosts(); }); });
      $$('[data-rk]', d).forEach(function(el){ el.addEventListener('change', function(){ R()[el.getAttribute('data-rk')] = el.value; save(); viewCosts.open = id; viewCosts(); }); });
      $('[data-ladd]', d).addEventListener('click', function(){ var g = db.ingredients[0]; R().lines.push({ ing: g ? g.id : '', qty: '', unit: g ? (TO_BASE[g.unit] || ['g'])[0] : 'g' }); save(); viewCosts.open = id; viewCosts(); });
    });
  }

  /* ---------- shopping list ---------- */
  function viewShop(){
    var v = $('[data-view=shop]'), from = viewShop.from || todayISO(), to = viewShop.to || addDays(todayISO(), 7);
    var os = db.orders.filter(function(o){ return o.date && o.date >= from && o.date <= to && ['approved', 'deposit', 'baking'].indexOf(o.status) > -1; });
    var need = {}, noRecipe = {};
    os.forEach(function(o){ o.items.forEach(function(it){ var r = it.menuId && db.recipes[it.menuId]; if (!r || !r.lines || !r.lines.length) { noRecipe[it.name] = (noRecipe[it.name] || 0) + num(it.qty); return; }
      r.lines.forEach(function(l){ var g = db.ingredients.filter(function(x){ return x.id === l.ing; })[0]; if (!g) return; var b = TO_BASE[l.unit] || ['each', 1]; var key = g.id; need[key] = need[key] || { g: g, amt: 0, base: b[0] }; need[key].amt += num(l.qty) * b[1] * num(it.qty) / Math.max(1, num(r.yield) || 1); }); }); });
    var rows = Object.keys(need).map(function(k){ var n = need[k], gb = TO_BASE[n.g.unit] || ['each', 1], packs = num(n.g.size) ? n.amt / (num(n.g.size) * gb[1]) : 0, cpu = ingCPU(n.g);
      var amt = n.base === 'g' && n.amt >= 1000 ? (n.amt / 1000).toFixed(2) + ' kg' : n.base === 'ml' && n.amt >= 1000 ? (n.amt / 1000).toFixed(2) + ' L' : Math.ceil(n.amt) + ' ' + n.base;
      return '<tr><td>' + esc(n.g.name) + '</td><td>' + amt + '</td><td>' + (packs ? Math.ceil(packs * 10) / 10 + ' pack' + (packs > 1 ? 's' : '') : '&ndash;') + '</td><td>' + (cpu === null ? '&ndash;' : money(n.amt * cpu)) + '</td></tr>'; });
    var h = '<h2>Shopping list</h2><div class="card"><div class="grid2"><label class="f">From<input type="date" id="s-from" value="' + from + '"></label><label class="f">To<input type="date" id="s-to" value="' + to + '"></label></div>' +
      '<p class="small muted" style="margin-top:8px">Counts approved, deposit-paid and baking orders in these dates: <b>' + os.length + ' order' + (os.length === 1 ? '' : 's') + '</b>.</p></div>';
    h += '<div class="card"><h3>What you need</h3>' + (rows.length ? '<table class="it"><thead><tr><th>Ingredient</th><th>Amount</th><th>Packs</th><th>Cost</th></tr></thead><tbody>' + rows.join('') + '</tbody></table><div class="row" style="margin-top:12px"><button class="b b-main" id="s-copy">Copy list</button></div>' : '<p class="empty">Nothing to buy yet. Add recipes in <b>Recipes &amp; costs</b> and approve some orders.</p>') + '</div>';
    var nr = Object.keys(noRecipe); if (nr.length) h += '<p class="warn" style="margin-top:12px">No recipe yet for: ' + nr.map(function(n){ return esc(noRecipe[n] + ' x ' + n); }).join(', ') + '. These aren\'t in the list.</p>';
    v.innerHTML = h;
    $('#s-from').addEventListener('change', function(e){ viewShop.from = e.target.value; viewShop(); });
    $('#s-to').addEventListener('change', function(e){ viewShop.to = e.target.value; viewShop(); });
    var sc = $('#s-copy'); if (sc) sc.addEventListener('click', function(){ var lines = $$('[data-view=shop] tbody tr').map(function(tr){ var t = tr.querySelectorAll('td'); return '- ' + t[0].textContent + ': ' + t[1].textContent + (t[2].textContent !== '\u2013' ? ' (' + t[2].textContent + ')' : ''); }); copy('Shopping list, ' + niceDate(from) + ' to ' + niceDate(to) + '\n' + lines.join('\n')); });
  }

  /* ---------- settings ---------- */
  function viewSettings(){
    var v = $('[data-view=settings]');
    v.innerHTML = '<h2>Settings</h2><div class="card"><h3>Payments</h3><div class="grid2"><label class="f">CIBC First Pay number<input id="set-fp" value="' + esc(db.settings.firstPay) + '"></label><label class="f">Deposit %<input id="set-dep" inputmode="numeric" value="' + esc(db.settings.deposit) + '"></label></div></div>' +
      '<div class="card"><h3>Backup</h3><p class="small muted">Your orders live only on this phone or laptop. Download a backup every week or so, and use it to move everything to another device.</p><div class="row"><button class="b b-main" id="bk-down">Download backup</button><label class="b">Restore from backup<input type="file" id="bk-up" accept=".json,application/json" hidden></label></div></div>' +
      '<div class="card"><h3>PIN</h3><div class="row"><button class="b" id="pin-reset">Change PIN</button></div></div>' +
      '<p class="small muted" style="margin-top:14px">' + db.orders.length + ' orders · ' + db.ingredients.length + ' ingredients · ' + Object.keys(db.recipes).length + ' recipes saved on this device.</p>';
    $('#set-fp').addEventListener('change', function(e){ db.settings.firstPay = e.target.value; save(); toast('Saved'); });
    $('#set-dep').addEventListener('change', function(e){ db.settings.deposit = num(e.target.value) || 50; save(); toast('Saved'); });
    $('#bk-down').addEventListener('click', function(){ var d = JSON.parse(JSON.stringify(db)); var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' })); a.download = 'de-patisserie-orders-' + todayISO() + '.json'; a.click(); toast('Backup downloaded'); });
    $('#bk-up').addEventListener('change', function(e){ var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function(){ try { var d = JSON.parse(r.result); if (!d.orders) throw 0; var pin = db.settings.pinHash; db = d; db.settings.pinHash = db.settings.pinHash || pin; save(); toast('Backup restored'); go('home'); } catch (x) { toast("That file isn't a backup"); } }; r.readAsText(f); });
    $('#pin-reset').addEventListener('click', function(){ db.settings.pinHash = ''; save(); try { sessionStorage.removeItem('dp-ob-open'); } catch (e) {} location.reload(); });
  }
})();
