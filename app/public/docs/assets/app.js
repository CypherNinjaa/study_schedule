/* ==========================================================================
   Productivity OS docs — shared runtime
   Builds the chrome (sidebar, breadcrumbs, TOC, pager, search, theme) around
   each page's <main> content. No dependencies, works from the file system.
   ========================================================================== */
(function () {
  'use strict';

  /* ----- Inline icon set (Lucide-style, stroke) ------------------------- */
  var ICONS = {
    home: '<path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    rocket: '<path d="M5 15c-1.5 1-2 4-2 4s3-.5 4-2M9 12l3 3M15 4c3 0 5 2 5 5-1 5-6 8-8 9l-3-3c1-2 4-7 6-11Z"/><circle cx="14.5" cy="9.5" r="1.2"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h6"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    shield: '<path d="M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6z"/><path d="m9 12 2 2 4-4"/>',
    zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
    flame: '<path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1 .3-2 1-3 0 2 1 3 2 3-1-2 0-5 2-6-.5 2 0 3 1 4 .5-2 0-5-3-7Z"/>',
    gauge: '<path d="M12 14 15 9"/><circle cx="12" cy="14" r="1.5"/><path d="M4 18a9 9 0 1 1 16 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    'check-square': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
    book: '<path d="M4 5c0-1 1-2 2-2h13v16H6c-1 0-2 .5-2 2z"/><path d="M4 19c0-1 1-2 2-2h13"/>',
    repeat: '<path d="m17 2 3 3-3 3"/><path d="M4 12V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 12v3a4 4 0 0 1-4 4H4"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    graduation: '<path d="M22 9 12 5 2 9l10 4z"/><path d="M6 11v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 14 3-4 3 3 4-6"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m9 14-1 8 4-3 4 3-1-8"/>',
    clipboard: '<rect x="6" y="4" width="12" height="18" rx="2"/><path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9z"/><path d="m9 12 2 2 4-4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.3a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.3 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 2.3a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
    command: '<path d="M9 3a3 3 0 1 1-3 3h12a3 3 0 1 1-3 3v6a3 3 0 1 1 3 3H6a3 3 0 1 1 3-3z"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H14a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h6.5"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.9 2.1 2.1.9-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5"/><circle cx="12" cy="17.5" r=".6" fill="currentColor" stroke="none"/>',
    wrench: '<path d="M15 4a5 5 0 0 0-5.9 6.4l-6 6a2 2 0 0 0 2.8 2.8l6-6A5 5 0 0 0 20 8l-3 3-2.5-2.5 3-3A5 5 0 0 0 15 4Z"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    moon: '<path d="M21 12.8A8 8 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z"/>',
    'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    external: '<path d="M15 3h6v6M21 3l-9 9M10 5H5v14h14v-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    trophy: '<path d="M6 4h12v4a6 6 0 0 1-12 0z"/><path d="M6 6H3v1a3 3 0 0 0 3 3M18 6h3v1a3 3 0 0 1-3 3"/><path d="M12 14v3M8 21h8M9 21c0-2 1-4 3-4s3 2 3 4"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17h.01"/>',
    download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    github: '<path d="M9 19c-4 1.5-4-2-6-2m12 4v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6 0C6.2 2.3 5.1 2.6 5.1 2.6a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 3.7 9c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  };

  function icon(name, size) {
    var body = ICONS[name] || ICONS.info;
    var s = size || 18;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      body + '</svg>';
  }
  window.docsIcon = icon;

  /* Replace [data-icon] / [data-icon-after] placeholders with inline SVGs. */
  function hydrateIcons(root) {
    root.querySelectorAll('[data-icon]').forEach(function (el) {
      var name = el.getAttribute('data-icon');
      el.insertAdjacentHTML('afterbegin', icon(name, +el.getAttribute('data-icon-size') || 18));
      el.removeAttribute('data-icon');
    });
    root.querySelectorAll('[data-icon-after]').forEach(function (el) {
      var name = el.getAttribute('data-icon-after');
      el.insertAdjacentHTML('beforeend', icon(name, +el.getAttribute('data-icon-size') || 16));
      el.removeAttribute('data-icon-after');
    });
  }

  /* ----- Flatten nav ---------------------------------------------------- */
  var NAV = window.DOCS_NAV || [];
  var FLAT = [];
  NAV.forEach(function (group) {
    group.pages.forEach(function (p) {
      FLAT.push(Object.assign({ group: group.title }, p));
    });
  });

  var currentFile = location.pathname.split('/').pop() || 'index.html';
  if (currentFile === '') currentFile = 'index.html';
  var currentIndex = FLAT.findIndex(function (p) { return p.file === currentFile; });
  var current = FLAT[currentIndex] || FLAT[0];

  /* ----- Build sidebar -------------------------------------------------- */
  function buildSidebar() {
    var html = '';
    NAV.forEach(function (group) {
      html += '<div class="nav-group"><div class="nav-group__title">' + group.title + '</div>';
      group.pages.forEach(function (p) {
        var active = p.file === currentFile ? ' is-active' : '';
        html += '<a class="nav-link' + active + '" href="' + p.file + '">' +
          icon(p.icon, 17) + '<span>' + p.title + '</span></a>';
      });
      html += '</div>';
    });
    return html;
  }

  /* ----- Build breadcrumb ----------------------------------------------- */
  function buildBreadcrumb() {
    if (current.file === 'index.html') return '';
    return '<nav class="breadcrumb" aria-label="Breadcrumb">' +
      '<a href="index.html">Docs</a>' +
      '<span class="sep">' + icon('chevron-right', 13) + '</span>' +
      '<span class="muted">' + current.group + '</span>' +
      '<span class="sep">' + icon('chevron-right', 13) + '</span>' +
      '<span class="current">' + current.title + '</span></nav>';
  }

  /* ----- Build pager ---------------------------------------------------- */
  function buildPager() {
    var prev = FLAT[currentIndex - 1];
    var next = FLAT[currentIndex + 1];
    if (!prev && !next) return '';
    var html = '<nav class="pager" aria-label="Page navigation">';
    if (prev) {
      html += '<a href="' + prev.file + '"><small>' + icon('arrow-left', 13) + ' Previous</small>' +
        '<span class="pager__title">' + prev.title + '</span></a>';
    }
    if (next) {
      html += '<a class="pager--next" href="' + next.file + '"><small>Next ' + icon('arrow-right', 13) + '</small>' +
        '<span class="pager__title">' + next.title + '</span></a>';
    }
    return html + '</nav>';
  }

  /* ----- Build TOC from headings ---------------------------------------- */
  function slugify(t) {
    return t.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  }
  function buildTOC(docEl) {
    var heads = docEl.querySelectorAll('h2, h3');
    if (heads.length < 2) return '';
    var items = '';
    heads.forEach(function (h) {
      if (!h.id) h.id = slugify(h.textContent);
      var depth = h.tagName === 'H3' ? 3 : 2;
      items += '<a href="#' + h.id + '" data-depth="' + depth + '">' + h.textContent + '</a>';
      // add hover anchor
      var a = document.createElement('a');
      a.className = 'anchor'; a.href = '#' + h.id; a.textContent = '#';
      a.setAttribute('aria-label', 'Link to this section');
      h.appendChild(document.createTextNode(' '));
      h.appendChild(a);
    });
    return '<div class="toc"><div class="toc__title">On this page</div><nav>' + items + '</nav></div>';
  }

  /* ----- Assemble page -------------------------------------------------- */
  function build() {
    var main = document.querySelector('main.doc');
    if (!main) return;
    var docHTML = main.innerHTML;
    document.title = (current.file === 'index.html' ? '' : current.title + ' · ') + 'Productivity OS Docs';

    var shell =
      '<a class="skip-link visually-hidden" href="#main">Skip to content</a>' +
      '<header class="topbar">' +
        '<button class="iconbtn topbar__menu" id="menuBtn" aria-label="Open navigation">' + icon('menu', 20) + '</button>' +
        '<a class="topbar__brand" href="index.html">' +
          '<span class="topbar__logo">P</span>' +
          '<span>Productivity OS<small>Documentation</small></span>' +
        '</a>' +
        '<div class="topbar__spacer"></div>' +
        '<button class="searchbtn" id="searchBtn" aria-label="Search">' +
          icon('search', 16) + '<span class="label">Search the docs</span>' +
          '<span class="kbd">Ctrl K</span>' +
        '</button>' +
        '<button class="iconbtn" id="themeBtn" aria-label="Toggle theme">' + icon('moon', 19) + '</button>' +
      '</header>' +
      '<div class="backdrop" id="backdrop"></div>' +
      '<aside class="sidebar" id="sidebar">' + buildSidebar() + '</aside>' +
      '<div class="content">' +
        '<article class="doc" id="main">' + buildBreadcrumb() + docHTML + buildPager() +
          '<footer class="docfoot"><span>Productivity OS — your personal study &amp; productivity operating system.</span>' +
          '<span>Runs entirely on your device.</span></footer>' +
        '</article>' +
        '<div id="tocSlot"></div>' +
      '</div>' +
      searchModalHTML();

    var layout = document.createElement('div');
    layout.className = 'layout';
    layout.innerHTML = shell;
    document.body.innerHTML = '';
    document.body.appendChild(layout);

    // TOC needs the rendered doc
    var docEl = document.getElementById('main');
    hydrateIcons(document);
    var tocHTML = buildTOC(docEl);
    document.getElementById('tocSlot').outerHTML = tocHTML || '<div></div>';

    wireInteractions();
    wireScrollSpy();
  }

  /* ----- Search modal --------------------------------------------------- */
  function searchModalHTML() {
    return '<div class="search-overlay" id="searchOverlay" role="dialog" aria-modal="true" aria-label="Search">' +
      '<div class="search-modal">' +
        '<div class="search-input-row">' + icon('search', 18) +
          '<input id="searchInput" type="text" placeholder="Search features, concepts, how-tos…" autocomplete="off" spellcheck="false">' +
          '<span class="kbd">Esc</span>' +
        '</div>' +
        '<div class="search-results" id="searchResults"></div>' +
        '<div class="search-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> to navigate</span>' +
          '<span><span class="kbd">↵</span> to open</span></div>' +
      '</div></div>';
  }

  function renderResults(q) {
    var box = document.getElementById('searchResults');
    var query = q.trim().toLowerCase();
    var list = FLAT;
    if (query) {
      var terms = query.split(/\s+/);
      list = FLAT.map(function (p) {
        var hay = (p.title + ' ' + p.summary + ' ' + (p.keywords || '') + ' ' + p.group).toLowerCase();
        var score = 0;
        terms.forEach(function (t) {
          if (p.title.toLowerCase().indexOf(t) === 0) score += 12;
          else if (p.title.toLowerCase().indexOf(t) !== -1) score += 8;
          if (hay.indexOf(t) !== -1) score += 3;
        });
        return { p: p, score: score };
      }).filter(function (x) { return x.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .map(function (x) { return x.p; });
    }
    if (!list.length) {
      box.innerHTML = '<div class="search-empty">No matches for “' + escapeHTML(q) + '”.</div>';
      return;
    }
    box.innerHTML = list.slice(0, 8).map(function (p, i) {
      return '<a class="search-result' + (i === 0 ? ' is-active' : '') + '" href="' + p.file + '">' +
        '<div class="search-result__title">' + highlight(p.title, query) + '</div>' +
        '<div class="search-result__section">' + p.group + ' — ' + highlight(p.summary, query) + '</div></a>';
    }).join('');
  }

  function highlight(text, q) {
    if (!q) return escapeHTML(text);
    var terms = q.split(/\s+/).filter(Boolean).map(escapeReg);
    if (!terms.length) return escapeHTML(text);
    var re = new RegExp('(' + terms.join('|') + ')', 'ig');
    return escapeHTML(text).replace(re, '<mark>$1</mark>');
  }
  function escapeHTML(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function openSearch() {
    var ov = document.getElementById('searchOverlay');
    ov.classList.add('is-open');
    var input = document.getElementById('searchInput');
    input.value = '';
    renderResults('');
    setTimeout(function () { input.focus(); }, 30);
  }
  function closeSearch() { document.getElementById('searchOverlay').classList.remove('is-open'); }

  function activeResults() { return Array.prototype.slice.call(document.querySelectorAll('.search-result')); }
  function moveSel(dir) {
    var items = activeResults();
    if (!items.length) return;
    var idx = items.findIndex(function (el) { return el.classList.contains('is-active'); });
    if (idx !== -1) items[idx].classList.remove('is-active');
    var nx = (idx + dir + items.length) % items.length;
    items[nx].classList.add('is-active');
    items[nx].scrollIntoView({ block: 'nearest' });
  }

  /* ----- Theme ---------------------------------------------------------- */
  var THEME_KEY = 'docs-theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('themeBtn');
    if (btn) btn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon', 19);
  }
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var t = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(t);
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    var nx = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, nx);
    applyTheme(nx);
  }

  /* ----- Scroll spy for TOC --------------------------------------------- */
  function wireScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
    if (!links.length) return;
    var map = {};
    links.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
    var heads = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          var l = map[e.target.id];
          if (l) l.classList.add('is-active');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
    heads.forEach(function (h) { obs.observe(h); });
  }

  /* ----- Wire up -------------------------------------------------------- */
  function wireInteractions() {
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    document.getElementById('searchBtn').addEventListener('click', openSearch);

    var menuBtn = document.getElementById('menuBtn');
    var backdrop = document.getElementById('backdrop');
    if (menuBtn) menuBtn.addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    if (backdrop) backdrop.addEventListener('click', function () { document.body.classList.remove('nav-open'); });

    var input = document.getElementById('searchInput');
    input.addEventListener('input', function () { renderResults(input.value); });
    document.getElementById('searchOverlay').addEventListener('click', function (e) {
      if (e.target.id === 'searchOverlay') closeSearch();
    });

    document.addEventListener('keydown', function (e) {
      var overlayOpen = document.getElementById('searchOverlay').classList.contains('is-open');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlayOpen ? closeSearch() : openSearch(); return; }
      if (e.key === '/' && !overlayOpen && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); return; }
      if (!overlayOpen) return;
      if (e.key === 'Escape') { closeSearch(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
      else if (e.key === 'Enter') {
        var act = document.querySelector('.search-result.is-active');
        if (act) location.href = act.getAttribute('href');
      }
    });
  }

  /* ----- Go ------------------------------------------------------------- */
  initTheme();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
