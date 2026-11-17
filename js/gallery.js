/* De' Patisserie: Instagram-style gallery with a post viewer */
(function(){
  'use strict';
  var posts = window.IG_POSTS || [];
  var tiles = document.querySelectorAll('[data-ig]');
  if (!tiles.length || !posts.length) return;
  var WA = '12462644609';
  var IG = 'https://www.instagram.com/depatisserie246/';
  function src(i){ return 'assets/gallery/g' + String(i + 1).padStart(2, '0') + '.webp'; }

  var box = document.createElement('div');
  box.className = 'ig-modal';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photo viewer');
  box.hidden = true;
  box.innerHTML =
    '<button class="ig-x" type="button" aria-label="Close">&times;</button>' +
    '<button class="ig-nav ig-prev" type="button" aria-label="Previous photo"><i class="ph-bold ph-caret-left"></i></button>' +
    '<div class="ig-post">' +
      '<div class="ig-media"><img alt=""></div>' +
      '<div class="ig-side">' +
        '<div class="ig-user"><a class="ig-mini" href="' + IG + '" target="_blank" rel="noopener" aria-label="Open Instagram"><img src="assets/img/logo.png" alt=""></a><a class="ig-name" href="' + IG + '" target="_blank" rel="noopener">depatisserie246</a><span class="ig-dot">&middot;</span><a href="' + IG + '" target="_blank" rel="noopener">Follow</a></div>' +
        '<div class="ig-cap"><h3></h3><p></p></div>' +
        '<div class="ig-row"><button class="ig-like" type="button" aria-label="Like"><i class="ph-bold ph-heart"></i></button><span class="ig-count"></span></div>' +
        '<div class="ig-buttons"><a class="btn btn-primary ig-order" target="_blank" rel="noopener"><i class="ph-fill ph-whatsapp-logo"></i> Ask about this on WhatsApp</a>' +
        '<a class="btn ig-insta" target="_blank" rel="noopener"><i class="ph-fill ph-instagram-logo"></i> View on Instagram</a></div>' +
      '</div>' +
    '</div>' +
    '<button class="ig-nav ig-next" type="button" aria-label="Next photo"><i class="ph-bold ph-caret-right"></i></button>';
  document.body.appendChild(box);

  var img = box.querySelector('.ig-media img'), h = box.querySelector('.ig-cap h3'), p = box.querySelector('.ig-cap p');
  var like = box.querySelector('.ig-like'), count = box.querySelector('.ig-count'), order = box.querySelector('.ig-order'), insta = box.querySelector('.ig-insta');
  var cur = 0, lastFocus = null, liked = {};

  function show(i){
    cur = (i + posts.length) % posts.length;
    var post = posts[cur];
    img.src = src(cur); img.alt = post.t + '. ' + post.d;
    h.textContent = post.t; p.textContent = post.d;
    count.textContent = (cur + 1) + ' of ' + posts.length;
    like.classList.toggle('on', !!liked[cur]);
    like.innerHTML = liked[cur] ? '<i class="ph-fill ph-heart"></i>' : '<i class="ph-bold ph-heart"></i>';
    order.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent("Hello De' Patisserie, I saw the " + post.t.toLowerCase() + " in your gallery and would like to ask about ordering something similar.");
    insta.href = post.ig || IG; // set post.ig to a specific Instagram post link to open that post
    var nx = new Image(); nx.src = src((cur + 1) % posts.length);
  }
  function open(i){
    lastFocus = document.activeElement;
    show(i); box.hidden = false;
    requestAnimationFrame(function(){ box.classList.add('in'); });
    document.documentElement.classList.add('ig-lock');
    box.querySelector('.ig-x').focus();
  }
  function close(){
    box.classList.remove('in'); document.documentElement.classList.remove('ig-lock');
    setTimeout(function(){ box.hidden = true; }, 220);
    if (lastFocus) lastFocus.focus();
  }

  tiles.forEach(function(t){ t.addEventListener('click', function(){ open(+t.getAttribute('data-ig')); }); });
  box.querySelector('.ig-x').addEventListener('click', close);
  box.querySelector('.ig-prev').addEventListener('click', function(){ show(cur - 1); });
  box.querySelector('.ig-next').addEventListener('click', function(){ show(cur + 1); });
  box.addEventListener('click', function(e){ if (e.target === box) close(); });
  like.addEventListener('click', function(){
    liked[cur] = !liked[cur]; show(cur);
    if (liked[cur]) { like.classList.remove('pop'); void like.offsetWidth; like.classList.add('pop'); }
  });
  img.addEventListener('dblclick', function(){ if (!liked[cur]) like.click(); });
  document.addEventListener('keydown', function(e){
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
  // swipe on phones
  var x0 = null, y0 = null;
  box.addEventListener('touchstart', function(e){ var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
  box.addEventListener('touchend', function(e){
    if (x0 === null) return;
    var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  }, { passive: true });

  // highlight circles filter the grid
  var hls = document.querySelectorAll('.ig-hl');
  hls.forEach(function(h){ h.addEventListener('click', function(){
    var f = h.getAttribute('data-filter'), i = 0;
    hls.forEach(function(x){ var on = x === h; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
    var tt = document.getElementById('ig-tab-t'); if (tt) tt.textContent = f === 'all' ? 'Posts' : h.querySelector('.hl-t').textContent;
    tiles.forEach(function(t){
      var show = f === 'all' || t.getAttribute('data-cat') === f;
      t.classList.remove('pop-in');
      if (show) { t.hidden = false; t.style.animationDelay = (i++ * 40) + 'ms'; void t.offsetWidth; t.classList.add('pop-in'); }
      else t.hidden = true;
    });
  }); });
})();
