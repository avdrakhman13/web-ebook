var TOTAL = BOOK.pages;
var LAST = TOTAL + 2;
var RATIO = 1654 / 2339;

var root = document.documentElement;
var wrap = document.getElementById('book-wrap');
var flipbook = document.getElementById('flipbook');
var prevBtn = document.getElementById('prev');
var nextBtn = document.getElementById('next');
var slider = document.getElementById('slider');
var pageInput = document.getElementById('page-input');
var progress = document.getElementById('progress');

var pageFlip = null;
var pages = [];
var index = 0;
var portrait = false;
var soundOn = true;
var startIndex = 0;

try {
  soundOn = localStorage.getItem('ebook-sound') !== 'off';
  startIndex = Math.min(LAST, Math.max(0, parseInt(localStorage.getItem('ebook-index') || '0', 10) || 0));
} catch (error) {}

var sounds = ['sounds/flip1.wav', 'sounds/flip2.wav', 'sounds/flip3.wav'].map(function (src) {
  var audio = new Audio(src);
  audio.preload = 'auto';
  audio.volume = 0.8;
  return audio;
});

function playFlip() {
  if (!soundOn) {
    return;
  }
  var audio = sounds[Math.floor(Math.random() * sounds.length)];
  audio.currentTime = 0;
  audio.play().catch(function () {});
}

function pad(n) {
  return String(n).padStart(3, '0');
}

function tocHTML() {
  var html = '<div class="toc-page"><h2>Мазмұны</h2><p class="toc-sub">Тақырыпты басыңыз — кітап сол бетке ашылады</p><ul class="toc-list">';
  BOOK.toc.forEach(function (section) {
    html += '<li><button class="toc-link is-section" data-page="' + section.page + '"><span>' + section.title + '</span><em>' + section.page + '</em></button>';
    if (section.items) {
      html += '<ul>';
      section.items.forEach(function (item) {
        html += '<li><button class="toc-link" data-page="' + item[1] + '"><span>' + item[0] + '</span><em>' + item[1] + '</em></button></li>';
      });
      html += '</ul>';
    }
    html += '</li>';
  });
  return html + '</ul></div>';
}

function buildPages() {
  var html = '<div class="page is-left">' + tocHTML() + '</div>';
  for (var n = 1; n <= TOTAL; n++) {
    var side = n % 2 === 0 ? 'is-left' : 'is-right';
    html += '<div class="page ' + side + '"><img data-src="pages/' + pad(n) + '.webp" alt="' + n + '-бет" draggable="false"><span class="page-num">' + n + '</span></div>';
  }
  document.getElementById('back-cover').insertAdjacentHTML('beforebegin', html);
  pages = Array.prototype.slice.call(flipbook.querySelectorAll('.page'));
}

function loadNear(i) {
  for (var k = i - 4; k <= i + 5; k++) {
    var page = pages[k];
    var img = page && page.querySelector('img[data-src]');
    if (img && !img.getAttribute('src')) {
      img.src = img.dataset.src;
    }
  }
}

function pageSize() {
  var single = innerWidth < 860;
  var availH = innerHeight - 58 - 74 - 36;
  var availW = innerWidth - 40;
  var h = availH;
  var w = h * RATIO;
  var count = single ? 1 : 2;
  if (w * count > availW) {
    w = availW / count;
    h = w / RATIO;
  }
  return { w: Math.floor(w), h: Math.floor(h), single: single };
}

function shownIndexes() {
  if (portrait || index === 0 || index === LAST) {
    return [index];
  }
  var left = index % 2 === 1 ? index : index - 1;
  return [left, left + 1];
}

function shownPages() {
  return shownIndexes().map(function (i) {
    return i - 1;
  }).filter(function (n) {
    return n >= 0 && n <= TOTAL;
  });
}

function label() {
  if (index === 0) {
    return 'Мұқаба';
  }
  if (index === LAST) {
    return 'Соңы';
  }
  return shownPages().map(function (n) {
    return n === 0 ? 'Мазмұны' : n;
  }).join(shownPages()[0] === 0 ? ', ' : '–');
}

function updateUI() {
  var shown = shownIndexes();
  prevBtn.disabled = index === 0;
  nextBtn.disabled = shown[shown.length - 1] >= LAST;
  var visible = shownPages();
  slider.value = visible.length ? visible[0] : (index === 0 ? 0 : TOTAL);
  pageInput.value = label();
  progress.style.width = (index / LAST * 100) + '%';
  wrap.classList.toggle('is-front', !portrait && index === 0);
  wrap.classList.toggle('is-back', !portrait && index === LAST);
  markCurrent();
  try {
    localStorage.setItem('ebook-index', String(index));
  } catch (error) {}
}

function goTo(n) {
  if (!pageFlip) {
    return;
  }
  var target = Math.max(1, Math.min(TOTAL + 1, n + 1));
  loadNear(target);
  if (shownIndexes().indexOf(target) !== -1) {
    flash(target);
    return;
  }
  pageFlip.flip(target);
  setTimeout(function () {
    flash(target);
  }, 1000);
}

function flash(i) {
  var page = pages[i];
  if (!page || i <= 1) {
    return;
  }
  page.animate([
    { boxShadow: 'inset 0 0 0 0 rgba(233, 196, 106, 0)' },
    { boxShadow: 'inset 0 0 0 6px rgba(233, 196, 106, 0.9)' },
    { boxShadow: 'inset 0 0 0 0 rgba(233, 196, 106, 0)' }
  ], { duration: 1400, easing: 'ease-out' });
}

function setPageWidthVar() {
  var rect = pageFlip.getBoundsRect();
  root.style.setProperty('--pw', Math.round(rect.pageWidth) + 'px');
}

function initBook() {
  var size = pageSize();
  flipbook.style.width = (size.single ? size.w : size.w * 2) + 'px';
  flipbook.style.height = size.h + 'px';
  root.style.setProperty('--pw', size.w + 'px');

  pageFlip = new St.PageFlip(flipbook, {
    width: size.w,
    height: size.h,
    size: 'fixed',
    showCover: true,
    usePortrait: size.single,
    drawShadow: true,
    maxShadowOpacity: 0.6,
    flippingTime: 900,
    showPageCorners: true,
    mobileScrollSupport: false,
    startPage: startIndex
  });

  loadNear(startIndex);
  pageFlip.loadFromHTML(pages);
  index = pageFlip.getCurrentPageIndex();
  portrait = pageFlip.getOrientation() === 'portrait';

  pageFlip.on('flip', function (event) {
    index = event.data;
    loadNear(index);
    updateUI();
  });

  pageFlip.on('changeState', function (event) {
    if (event.data === 'flipping') {
      playFlip();
    }
  });

  pageFlip.on('changeOrientation', function (event) {
    portrait = event.data === 'portrait';
    setPageWidthVar();
    updateUI();
  });

  setPageWidthVar();
  updateUI();
  flipbook.classList.add('is-ready');
}

function closeAll() {
  document.querySelectorAll('.drawer.is-open, .overlay.is-open').forEach(function (el) {
    el.classList.remove('is-open');
  });
}

function toggle(id) {
  var el = document.getElementById(id);
  var open = !el.classList.contains('is-open');
  closeAll();
  if (open) {
    el.classList.add('is-open');
  }
  return open;
}

function goFromAnywhere(n) {
  closeAll();
  setTimeout(function () {
    goTo(n);
  }, 250);
}

function buildSideToc() {
  var box = document.getElementById('toc-side');
  var html = '';
  BOOK.toc.forEach(function (section, k) {
    if (!section.items) {
      html += '<button class="side-link is-top" data-page="' + section.page + '"><span>' + section.title + '</span><em>' + section.page + '</em></button>';
      return;
    }
    html += '<details' + (k === 2 ? ' open' : '') + '><summary data-page="' + section.page + '"><span>' + section.title + '</span><em>' + section.page + '</em></summary>';
    section.items.forEach(function (item) {
      html += '<button class="side-link" data-page="' + item[1] + '"><span>' + item[0] + '</span><em>' + item[1] + '</em></button>';
    });
    html += '</details>';
  });
  box.innerHTML = html;
}

function markCurrent() {
  var visible = shownPages();
  var page = visible.length ? visible[visible.length - 1] : -1;
  var best = null;
  document.querySelectorAll('#toc-side [data-page]').forEach(function (el) {
    el.classList.remove('is-current');
    if (+el.dataset.page <= page) {
      best = el;
    }
  });
  if (best) {
    best.classList.add('is-current');
  }
}

function buildThumbs() {
  var box = document.getElementById('thumbs');
  var html = '<button class="thumb" data-page="0"><span class="thumb-toc">Мазмұны</span>Мазмұны</button>';
  for (var n = 1; n <= TOTAL; n++) {
    html += '<button class="thumb" data-page="' + n + '" style="animation-delay:' + Math.min(n * 12, 600) + 'ms"><img loading="lazy" src="thumbs/' + pad(n) + '.webp" alt="">' + n + '</button>';
  }
  box.innerHTML = html;
}

function openThumbs() {
  if (!toggle('thumbs-overlay')) {
    return;
  }
  var visible = shownPages();
  document.querySelectorAll('.thumb').forEach(function (el) {
    el.classList.toggle('is-current', visible.indexOf(+el.dataset.page) !== -1);
  });
  var currentThumb = document.querySelector('.thumb.is-current');
  if (currentThumb) {
    currentThumb.scrollIntoView({ block: 'center' });
  }
}

function openZoom() {
  var visible = shownPages();
  if (!visible.length || !toggle('zoom-overlay')) {
    return;
  }
  var html = '';
  visible.forEach(function (n) {
    if (n === 0) {
      html += '<div class="zoom-toc">' + tocHTML() + '</div>';
    } else {
      var isWide = BOOK.wide.indexOf(n) !== -1;
      html += '<img class="' + (isWide ? 'is-wide' : '') + '" src="' + (isWide ? 'wide/' : 'pages/') + pad(n) + '.webp" alt="' + n + '-бет">';
    }
  });
  document.getElementById('zoom-body').innerHTML = html;
  document.getElementById('zoom-title').textContent = label() + ' бет';
  document.getElementById('zoom-body').scrollTop = 0;
}

function escapeHTML(text) {
  return text.replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function search(query) {
  var info = document.getElementById('search-info');
  var box = document.getElementById('search-results');
  query = query.trim().toLowerCase();
  if (query.length < 2) {
    info.textContent = 'Кемінде 2 әріп жазыңыз';
    box.innerHTML = '';
    return;
  }
  var html = '';
  var found = 0;
  BOOK.text.forEach(function (text, k) {
    var at = text.toLowerCase().indexOf(query);
    if (at === -1) {
      return;
    }
    found++;
    if (found > 80) {
      return;
    }
    var start = Math.max(0, at - 50);
    var snippet = (start > 0 ? '…' : '') + escapeHTML(text.slice(start, at)) +
      '<mark>' + escapeHTML(text.slice(at, at + query.length)) + '</mark>' +
      escapeHTML(text.slice(at + query.length, at + query.length + 70)) + '…';
    html += '<button class="result" style="animation-delay:' + Math.min(found * 25, 500) + 'ms" data-page="' + (k + 1) + '"><b>' + (k + 1) + '-бет</b>' + snippet + '</button>';
  });
  info.textContent = found ? found + ' бетте табылды' : 'Ештеңе табылмады';
  box.innerHTML = html;
}

function makeTags() {
  var words = ['<html>', '{ css }', 'js()', '<div>', 'PHP', 'HTTP', '<form>', 'flex', '</>', 'DOM', 'grid', '<a>'];
  var box = document.getElementById('tags');
  words.forEach(function (word, k) {
    var tag = document.createElement('i');
    tag.textContent = word;
    tag.style.left = (8 + (k * 37) % 80) + '%';
    tag.style.top = (20 + (k * 53) % 70) + '%';
    tag.style.animationDelay = (k * 0.8) + 's';
    box.appendChild(tag);
  });
}

function showHint() {
  var hint = document.getElementById('hint');
  hint.classList.add('is-visible');
  setTimeout(function () {
    hint.classList.remove('is-visible');
  }, 4000);
}

flipbook.addEventListener('click', function (event) {
  if (event.target.closest('#open')) {
    pageFlip.flipNext();
    return;
  }
  var link = event.target.closest('[data-page]');
  if (link) {
    goTo(+link.dataset.page);
  }
});

flipbook.addEventListener('dblclick', function (event) {
  if (!event.target.closest('.toc-page')) {
    openZoom();
  }
});

document.getElementById('home').addEventListener('click', function () {
  closeAll();
  pageFlip.flip(0);
});

prevBtn.addEventListener('click', function () {
  pageFlip.flipPrev();
});

nextBtn.addEventListener('click', function () {
  pageFlip.flipNext();
});

document.getElementById('btn-toc').addEventListener('click', function () {
  toggle('toc-drawer');
});

document.getElementById('btn-search').addEventListener('click', function () {
  if (toggle('search-drawer')) {
    setTimeout(function () {
      document.getElementById('search-input').focus();
    }, 300);
  }
});

document.getElementById('btn-thumbs').addEventListener('click', openThumbs);
document.getElementById('btn-zoom').addEventListener('click', openZoom);

document.getElementById('btn-sound').addEventListener('click', function () {
  soundOn = !soundOn;
  this.classList.toggle('is-off', !soundOn);
  try {
    localStorage.setItem('ebook-sound', soundOn ? 'on' : 'off');
  } catch (error) {}
  if (soundOn) {
    playFlip();
  }
});

document.getElementById('btn-full').addEventListener('click', function () {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
});

document.querySelectorAll('[data-close]').forEach(function (button) {
  button.addEventListener('click', closeAll);
});

['toc-side', 'search-results', 'thumbs'].forEach(function (id) {
  document.getElementById(id).addEventListener('click', function (event) {
    var link = event.target.closest('[data-page]');
    if (!link || link.tagName === 'SUMMARY') {
      return;
    }
    goFromAnywhere(+link.dataset.page);
  });
});

document.getElementById('search-input').addEventListener('input', function () {
  search(this.value);
});

slider.addEventListener('input', function () {
  var tip = document.getElementById('slider-tip');
  var n = +slider.value;
  tip.classList.add('is-visible');
  tip.style.left = (n / TOTAL * 100) + '%';
  document.getElementById('slider-img').src = 'thumbs/' + pad(Math.max(1, n)) + '.webp';
  document.getElementById('slider-text').textContent = n === 0 ? 'Мазмұны' : n + '-бет';
});

slider.addEventListener('change', function () {
  document.getElementById('slider-tip').classList.remove('is-visible');
  goTo(+slider.value);
});

pageInput.addEventListener('focus', function () {
  this.select();
});

pageInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    var n = parseInt(this.value, 10);
    if (!isNaN(n)) {
      goTo(n);
    }
    this.blur();
  }
});

pageInput.addEventListener('blur', function () {
  this.value = label();
});

document.addEventListener('keydown', function (event) {
  if (event.target.tagName === 'INPUT') {
    if (event.key === 'Escape') {
      event.target.blur();
      closeAll();
    }
    return;
  }
  if (event.key === 'Escape') {
    closeAll();
  } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
    pageFlip.flipNext();
  } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    pageFlip.flipPrev();
  } else if (event.key === 'Home') {
    goTo(0);
  } else if (event.key === 'End') {
    pageFlip.flip(LAST);
  }
});

var lastSingle = innerWidth < 860;
window.addEventListener('resize', function () {
  clearTimeout(window.resizeTimer);
  window.resizeTimer = setTimeout(function () {
    if ((innerWidth < 860) !== lastSingle) {
      location.reload();
    }
  }, 300);
});

document.getElementById('total').textContent = '/ ' + TOTAL;
slider.max = TOTAL;
document.getElementById('btn-sound').classList.toggle('is-off', !soundOn);
makeTags();
buildPages();
buildSideToc();
buildThumbs();

if (window.St && St.PageFlip) {
  initBook();
  showHint();
} else {
  flipbook.classList.add('is-ready');
  flipbook.innerHTML = '<p style="padding:40px;max-width:420px;color:#fff;text-align:center">Кітапты ашу үшін интернетке қосылыңыз (парақ аудару кітапханасы жүктелмеді).</p>';
}
