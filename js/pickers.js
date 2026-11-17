/* De' Patisserie: themed calendar + time slot pickers.
   <input type="hidden" id="x"><div class="cal" data-cal data-for="x" data-min-days="1"></div>
   <input type="hidden" id="t"><div class="slots" data-slots="09:00,10:00" data-for="t"></div>
   The hidden input gets the value (YYYY-MM-DD or HH:MM) and fires input + change. */
(function(){
  'use strict';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function iso(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fire(inp){ inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
  function label(hhmm){ var p = hhmm.split(':'), h = +p[0], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + p[1] + ' ' + ap; }
  window.DPLabelTime = label;

  function calendar(el){
    var inp = document.getElementById(el.getAttribute('data-for')); if (!inp) return;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var min = new Date(today); min.setDate(min.getDate() + (+el.getAttribute('data-min-days') || 0));
    var max = new Date(today); max.setMonth(max.getMonth() + 6);
    var view = new Date(min.getFullYear(), min.getMonth(), 1);
    el.innerHTML = '<div class="cal-head"><button type="button" class="cal-nav" data-dir="-1" aria-label="Previous month"><i class="ph-bold ph-caret-left"></i></button>' +
      '<strong class="cal-title" aria-live="polite"></strong><button type="button" class="cal-nav" data-dir="1" aria-label="Next month"><i class="ph-bold ph-caret-right"></i></button></div>' +
      '<div class="cal-week">' + DAYS.map(function(d){ return '<span>' + d.charAt(0) + '<em>' + d.slice(1) + '</em></span>'; }).join('') + '</div><div class="cal-grid" role="grid"></div>';
    var grid = el.querySelector('.cal-grid'), title = el.querySelector('.cal-title');
    function draw(dir){
      title.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
      var first = new Date(view), html = '';
      for (var i = 0; i < first.getDay(); i++) html += '<span class="cal-pad"></span>';
      var n = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= n; d++) {
        var day = new Date(view.getFullYear(), view.getMonth(), d), v = iso(day), off = day < min || day > max;
        html += '<button type="button" class="cal-day' + (v === inp.value ? ' sel' : '') + (+day === +today ? ' today' : '') + (day.getDay() === 6 ? ' sat' : '') +
          '" data-date="' + v + '"' + (off ? ' disabled' : '') + ' aria-label="' + day.toDateString() + '">' + d + '</button>';
      }
      grid.innerHTML = html;
      if (dir) { grid.classList.remove('slide-l', 'slide-r'); void grid.offsetWidth; grid.classList.add(dir > 0 ? 'slide-l' : 'slide-r'); }
      el.querySelector('[data-dir="-1"]').disabled = view <= new Date(min.getFullYear(), min.getMonth(), 1);
      el.querySelector('[data-dir="1"]').disabled = view >= new Date(max.getFullYear(), max.getMonth(), 1);
    }
    el.addEventListener('click', function(e){
      var nav = e.target.closest('.cal-nav'), day = e.target.closest('.cal-day');
      if (nav && !nav.disabled) { var dir = +nav.getAttribute('data-dir'); view.setMonth(view.getMonth() + dir); draw(dir); }
      else if (day && !day.disabled) { inp.value = day.getAttribute('data-date'); draw(); fire(inp); el.classList.remove('need'); }
    });
    var x0 = null;
    grid.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; }, { passive: true });
    grid.addEventListener('touchend', function(e){ if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { var b = el.querySelector('[data-dir="' + (dx < 0 ? 1 : -1) + '"]'); if (b && !b.disabled) b.click(); } }, { passive: true });
    el.setValue = function(v){ inp.value = v || ''; if (v) { var p = v.split('-'); view = new Date(+p[0], +p[1] - 1, 1); } draw(); };
    if (inp.value) el.setValue(inp.value); else draw();
  }

  function slots(el){
    var inp = document.getElementById(el.getAttribute('data-for')); if (!inp) return;
    el.setAttribute('role', 'radiogroup');
    el.innerHTML = el.getAttribute('data-slots').split(',').map(function(t){
      var h = +t.split(':')[0], icon = h < 12 ? 'ph-sun-horizon' : h < 16 ? 'ph-sun' : 'ph-moon-stars';
      return '<button type="button" class="tslot" role="radio" aria-checked="false" data-time="' + t + '"><i class="ph-fill ' + icon + '"></i>' + label(t) + '</button>';
    }).join('');
    function sync(){ el.querySelectorAll('.tslot').forEach(function(b){ var on = b.getAttribute('data-time') === inp.value; b.classList.toggle('sel', on); b.setAttribute('aria-checked', on); }); }
    el.addEventListener('click', function(e){ var b = e.target.closest('.tslot'); if (!b) return; inp.value = b.getAttribute('data-time'); sync(); fire(inp); el.classList.remove('need'); });
    el.setValue = function(v){ inp.value = v || ''; sync(); };
    sync();
  }

  document.querySelectorAll('[data-cal]').forEach(calendar);
  document.querySelectorAll('[data-slots]').forEach(slots);
})();
