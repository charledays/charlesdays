/**
 * The station gallery: where GET OFF lands at a station with a takeover. A full-screen viewer
 * over the paused scene: one image at a time, whole and at its own proportions, with a quiet
 * caption, previous/next (buttons, arrow keys, swipe), and a rail of the station's works to jump
 * between them. Every image of every work runs in one sequence, so the visitor never goes back
 * to the train between pieces. It opens on the hero piece, the one the camera just pushed into.
 *
 * RETURN TO TRAIN, Escape and the browser's Back all close it; the train is exactly where it was.
 */
import { LINE } from './stations.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function pad(n) { return n < 10 ? '0' + n : String(n); }

export function createGallery(root, options) {
  var el = root.querySelector('[data-gallery]');
  var body = el.querySelector('[data-gallery-body]');
  var reduceMotion = options.reduceMotion;
  var fadeMs = options.fadeMs;
  var open = false;
  var hideTimer = null;
  var slides = [];
  var works = [];
  var index = 0;
  var refs = null;

  function render(station, content) {
    el.style.setProperty('--accent', content.accent || LINE.color);
    works = content.works;
    slides = [];
    works.forEach(function (work, w) {
      work.images.forEach(function (image, n) {
        slides.push({ work: work, w: w, image: image, n: n + 1, of: work.images.length });
      });
    });
    body.innerHTML = '' +
      '<header class="g-bar">' +
        '<p class="g-stop"><span class="g-bullet" aria-hidden="true">' + esc(LINE.bullet) + '</span>' +
          '<span id="galleryTitle">' + esc(station.name) + '</span></p>' +
        '<p class="g-count" data-count aria-live="polite"></p>' +
        '<button type="button" class="g-return" data-return>&#8592; Return to train</button>' +
      '</header>' +
      '<div class="g-stage" data-stage>' +
        '<figure class="g-figure"><img data-img alt="" decoding="async"></figure>' +
        '<button type="button" class="g-nav g-prev" data-prev aria-label="Previous image"><span aria-hidden="true">&#8592;</span></button>' +
        '<button type="button" class="g-nav g-next" data-next aria-label="Next image"><span aria-hidden="true">&#8594;</span></button>' +
      '</div>' +
      '<footer class="g-caption">' +
        '<div class="g-caption-text"><h2 class="g-title" data-title></h2><p class="g-meta" data-meta></p></div>' +
        '<div class="g-links" data-links></div>' +
      '</footer>' +
      '<nav class="g-rail" data-own-scroll aria-label="' + esc(station.name) + ' works">' +
        works.map(function (work, w) {
          return '<button type="button" class="g-thumb" data-work="' + w + '" aria-label="' + esc(work.title || 'Work ' + (w + 1)) + '">' +
            '<img src="' + esc(work.src) + '" alt="" loading="lazy" decoding="async"></button>';
        }).join('') +
        '<a class="g-thumb g-thumb-page" href="' + esc(station.href) + '">Full ' + esc(station.name) + ' page &#8599;</a>' +
      '</nav>';
    refs = {
      img: body.querySelector('[data-img]'),
      count: body.querySelector('[data-count]'),
      title: body.querySelector('[data-title]'),
      meta: body.querySelector('[data-meta]'),
      links: body.querySelector('[data-links]'),
      stage: body.querySelector('[data-stage]'),
      thumbs: body.querySelectorAll('[data-work]')
    };
  }

  var loading = 0;
  function preload(i) {
    var s = slides[(i + slides.length) % slides.length];
    if (s) { var im = new Image(); im.decoding = 'async'; im.src = s.image.src; }
  }

  /** Show slide i (wraps round). */
  function go(i) {
    if (!slides.length) return;
    index = (i + slides.length) % slides.length;
    var s = slides[index];
    var work = s.work;
    var ticket = ++loading;
    var img = refs.img;
    img.classList.add('is-loading');
    var next = new Image();
    next.decoding = 'async';
    next.onload = next.onerror = function () {
      if (ticket !== loading) return;
      img.src = s.image.src;
      img.alt = s.image.alt;
      img.classList.remove('is-loading');
    };
    next.src = s.image.src;

    refs.count.textContent = pad(index + 1) + ' / ' + pad(slides.length);
    refs.title.textContent = work.title;
    var meta = [work.meta, s.of > 1 ? 'Image ' + s.n + ' of ' + s.of : '', s.image.caption].filter(Boolean);
    refs.meta.textContent = meta.join('  ·  ');
    var links = '';
    if (work.href) links += '<a class="g-link" href="' + esc(work.href) + '">View project &#8599;</a>';
    if (work.external) links += '<a class="g-link" href="' + esc(work.external.url) + '" target="_blank" rel="noopener noreferrer">' + esc(work.external.label) + ' &#8599;</a>';
    refs.links.innerHTML = links;
    Array.prototype.forEach.call(refs.thumbs, function (t, w) {
      var on = w === s.w;
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
      if (on && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    preload(index + 1);
    preload(index - 1);
  }

  function show(station, content) {
    if (open) return;
    open = true;
    clearTimeout(hideTimer);
    render(station, content);
    go(0);
    el.hidden = false;
    // Next frame, so the fade runs from 0.
    requestAnimationFrame(function () { el.classList.add('is-open'); });
    var first = el.querySelector('[data-return]');
    if (first) first.focus({ preventScroll: true });
    try { history.pushState({ subwayGallery: station.id }, '', '#' + station.id); } catch (e) { /* sandboxed */ }
  }

  /** Close: fade out, then hand back to the train. */
  function hide() {
    if (!open) return;
    open = false;
    loading++;
    el.classList.remove('is-open');
    options.onClosed();
    hideTimer = setTimeout(function () {
      el.hidden = true;
      body.innerHTML = '';
      refs = null;
    }, reduceMotion ? 0 : fadeMs);
    // Back to GET OFF once the overlay has shown it again (a frame after the train has the scene).
    requestAnimationFrame(function () { requestAnimationFrame(options.focusAfter); });
  }

  /** The visible buttons go through history so Back and RETURN TO TRAIN are the same action. */
  function requestClose() {
    if (history.state && history.state.subwayGallery) history.back();
    else hide();
  }

  el.addEventListener('click', function (e) {
    if (!open) return;
    if (e.target.closest('[data-return]')) requestClose();
    else if (e.target.closest('[data-prev]')) go(index - 1);
    else if (e.target.closest('[data-next]')) go(index + 1);
    else {
      var t = e.target.closest('[data-work]');
      if (t) {
        var w = +t.getAttribute('data-work');
        for (var i = 0; i < slides.length; i++) if (slides[i].w === w) { go(i); break; }
      }
    }
  });
  // On the document, so the keys still work after a click lands on the image and takes focus.
  function onKey(e) {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); return; }
    // Keep Tab inside the dialog.
    if (e.key === 'Tab') {
      var f = el.querySelectorAll('button, a[href]');
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }
  document.addEventListener('keydown', onKey);

  // Swipe on the image: a mostly horizontal drag of 40px or more turns the page.
  var swipe = null;
  el.addEventListener('pointerdown', function (e) {
    if (open && e.target.closest('[data-stage]') && !e.target.closest('button')) swipe = { x: e.clientX, y: e.clientY };
  });
  el.addEventListener('pointerup', function (e) {
    if (!swipe) return;
    var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
  });
  el.addEventListener('pointercancel', function () { swipe = null; });

  function onPop() { if (open) hide(); }
  window.addEventListener('popstate', onPop);
  // A reload with a gallery hash lands on the train, not on a stale entry.
  if (/^#[\w-]+$/.test(window.location.hash)) {
    try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* ignore */ }
  }

  return {
    show: show,
    isOpen: function () { return open; },
    dispose: function () {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
    }
  };
}
