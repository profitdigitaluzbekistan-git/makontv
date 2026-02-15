/**
 * MakonTV API Client — Bridge Layer
 *
 * Подключается к backend API и подменяет моковые данные.
 * Вставляется после основного скрипта, ДО i18n.js.
 *
 * Что делает:
 * 1. Переопределяет buildHome() — загружает hero + collections из API
 * 2. Переопределяет buildCatalogs() — загружает movies/series из API
 * 3. Переопределяет search — запрос к /api/search
 * 4. Переопределяет go('detail') — загружает данные фильма из API
 * 5. Переопределяет go('series-detail') — загружает сериал + эпизоды
 * 6. Подключает favorites, history, notifications к API
 */
(function() {
  'use strict';

  // ═══════════════════════════
  // CONFIG
  // ═══════════════════════════
  const API_BASE = window.MAKONTV_API_URL || '';  // '' = same origin, or 'http://localhost:3001'
  const LANG = () => localStorage.getItem('makontv_lang') || 'ru';

  // Temp user ID (until auth is implemented)
  let CURRENT_USER_ID = localStorage.getItem('makontv_user_id') || null;

  function api(path) {
    const sep = path.includes('?') ? '&' : '?';
    return fetch(`${API_BASE}${path}${sep}lang=${LANG()}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
  }

  function apiPost(path, body) {
    return fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }

  // ═══════════════════════════
  // CARD RENDERER (enhanced — supports poster URLs)
  // ═══════════════════════════
  function renderCard(item, index, badge) {
    const title = item.title || item.name || '—';
    const poster = item.posterUrl
      ? `<img src="${item.posterUrl}" alt="${title}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`
      : `<div class="pc-poster ${PG(index)}"></div>`;
    const slug = (item.slug || '').replace(/'/g, "\\'");
    const type = item.type || 'movie';
    const clickPage = type === 'series' ? 'series-detail' : 'detail';

    let badgeHtml = '';
    if (badge === 'top' && index < 3) badgeHtml = '<div class="pc-badge bdg-top">TOP</div>';
    if (badge === 'new') badgeHtml = '<div class="pc-badge bdg-new">NEW</div>';
    if (badge === 'exc' && index % 4 === 0) badgeHtml = '<div class="pc-badge bdg-exc">Эксклюзив</div>';
    if (item.isPremium) badgeHtml += '<div class="pc-badge bdg-exc">Premium</div>';

    return `<div class="pc" onclick="MakonAPI.goDetail('${clickPage}','${slug}')" data-slug="${slug}" data-type="${type}">
      <div class="pc-img">${badgeHtml}${poster}<div class="pc-ov"><div class="play-c">${IC.play}</div></div></div>
      <div class="pc-info"><div class="pc-title">${title}</div></div>
    </div>`;
  }

  function renderCards(containerId, items, badge) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!items || items.length === 0) {
      el.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-title">Нет контента</div></div>';
      return;
    }
    el.innerHTML = items.map((item, i) => renderCard(item, i, badge)).join('');
  }

  // ═══════════════════════════
  // 1. HOME PAGE
  // ═══════════════════════════
  const _origBuildHome = window.buildHome;

  window.buildHome = function() {
    // Show skeleton loading state
    var el = document.getElementById('home-main');
    if (el) {
      el.innerHTML = mkSec('Популярное', 'hc-skel1') + mkSec('Новинки', 'hc-skel2') + mkSec('Рекомендации', 'hc-skel3');
      rSkel('hc-skel1', 6);
      rSkel('hc-skel2', 6);
      rSkel('hc-skel3', 6);
    }

    // Race API call against 10s timeout
    var homeAbort = new AbortController();
    var homeTimer = setTimeout(function() { homeAbort.abort(); }, 10000);
    fetch(API_BASE + '/api/home?lang=' + LANG(), { signal: homeAbort.signal })
      .then(function(r) { clearTimeout(homeTimer); if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(data => {
      el = document.getElementById('home-main');
      if (!el) return;

      // Build sections from API collections — skip empty ones
      var visibleCollections = (data.collections || []).filter(coll => coll.items && coll.items.length > 0);
      var html = '';
      visibleCollections.forEach(coll => {
        var carId = 'hc-' + coll.slug.replace(/[^a-z0-9]/g, '');
        html += mkSec(coll.title, carId, coll.slug);
      });

      if (!html) {
        el.innerHTML = '<div class="empty" style="padding:48px 0;text-align:center"><div class="empty-title" style="color:var(--t2)">Контент скоро появится</div></div>';
        return;
      }
      el.innerHTML = html;

      // Render collection items synchronously
      visibleCollections.forEach(coll => {
        var carId = 'hc-' + coll.slug.replace(/[^a-z0-9]/g, '');
        var badge = coll.slug === 'trending' ? 'top' : coll.slug === 'new' ? 'new' : '';
        renderCards(carId, coll.items, badge);
      });

      // Continue watching — only show if user has actual history
      if (CURRENT_USER_ID) {
        api('/api/users/' + CURRENT_USER_ID + '/history?continue=true').then(function(history) {
          if (history && history.length > 0) {
            // Prepend continue watching section before first collection
            var cwSection = document.createElement('div');
            cwSection.id = 'cw-section';
            cwSection.innerHTML = mkSec('Продолжить просмотр', 'hc-cw');
            el.insertBefore(cwSection, el.firstChild);
            renderContinueWatching('hc-cw', history);
          }
        }).catch(function() { /* No history — don't show section */ });
      }

      // Hero slider
      if (data.hero && data.hero.length > 0) {
        buildHeroSlider(data.hero);
      }
    }).catch(function(err) {
      console.error('Home API error:', err);
      el = document.getElementById('home-main');
      if (el) {
        el.innerHTML = '<div class="empty" style="padding:48px 0;text-align:center">' +
          '<div class="empty-title" style="color:var(--t2)">Не удалось загрузить</div>' +
          '<div class="empty-desc" style="color:var(--t3);margin:8px 0 16px">Проверьте подключение к интернету</div>' +
          '<button class="btn btn-p" onclick="buildHome()">Повторить</button>' +
          '</div>';
      }
    });
  };

  function buildHeroSlider(items) {
    window._heroItems = items;
    window._heroIndex = 0;
    window._currentHeroSlug = items[0].slug;
    window._currentHeroType = items[0].type || 'movie';

    var track = document.getElementById('heroTrack');
    if (!track) return;

    // Build slides
    track.innerHTML = items.map(function(item, i) {
      var bgUrl = item.backdropUrl || item.posterUrl || '';
      var bgStyle = bgUrl ? 'background-image:url(' + bgUrl + ');background-size:cover;background-position:center' : '';
      var clickPage = item.type === 'series' ? 'series-detail' : 'detail';
      var slug = (item.slug || '').replace(/'/g, "\\'");
      var meta = [
        item.rating ? '<span class="h-rating">' + item.rating + '</span>' : '',
        item.year ? '<span class="h-mt">' + item.year + '</span>' : '',
        item.ageRating ? '<span class="h-dot"></span><span class="h-mt">' + item.ageRating + '</span>' : '',
        item.durationMin ? '<span class="h-dot"></span><span class="h-mt">' + item.durationMin + ' мин</span>' : '',
        item.quality ? '<span class="h-dot"></span><span class="h-mt">' + item.quality + '</span>' : '',
      ].filter(Boolean).join('');
      var desc = item.shortDesc || item.description || '';
      if (desc.length > 200) desc = desc.substring(0, 200) + '...';

      return '<div class="hero-slide">' +
        '<div class="hero-bg" style="' + bgStyle + '"></div>' +
        '<div class="hero-fade"></div>' +
        '<div class="hero-ct"><div class="hero-ct-in">' +
          '<div class="h-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span class="h-badge-text">Эксклюзив</span></div>' +
          '<h1 class="h-title">' + (item.title || '') + '</h1>' +
          '<div class="h-meta">' + meta + '</div>' +
          '<p class="h-desc">' + desc + '</p>' +
          '<div class="h-act">' +
            '<button class="btn btn-p" onclick="MakonAPI.goDetail(\'' + clickPage + '\',\'' + slug + '\')"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Смотреть</button>' +
            '<button class="btn btn-s" onclick="handleSaveGlobal()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>В избранное</button>' +
            '<button class="btn btn-g" onclick="MakonAPI.goDetail(\'' + clickPage + '\',\'' + slug + '\')">Подробнее</button>' +
          '</div>' +
        '</div></div>' +
      '</div>';
    }).join('');

    // Build dots
    var dotsEl = document.getElementById('heroDots');
    if (dotsEl) {
      dotsEl.innerHTML = items.map(function(_, i) {
        return '<button class="h-dot-b' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '"></button>';
      }).join('');
      dotsEl.querySelectorAll('.h-dot-b').forEach(function(dot) {
        dot.addEventListener('click', function() {
          var idx = parseInt(dot.getAttribute('data-idx'));
          heroGoTo(idx);
        });
      });
    }

    // Show/hide arrows
    var prevBtn = document.getElementById('heroPrev');
    var nextBtn = document.getElementById('heroNext');
    if (items.length <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (dotsEl) dotsEl.style.display = 'none';
    }

    // Auto-rotate every 6 seconds
    if (items.length > 1) {
      window._heroTimer = setInterval(function() {
        heroGoTo((window._heroIndex + 1) % items.length);
      }, 6000);
    }
  }

  // Navigate to specific slide
  window.heroGoTo = function(idx) {
    var items = window._heroItems;
    if (!items) return;
    window._heroIndex = idx;
    var track = document.getElementById('heroTrack');
    if (track) track.style.transform = 'translateX(-' + idx * 100 + '%)';
    // Update dots
    document.querySelectorAll('.hero-dots .h-dot-b').forEach(function(d, i) {
      d.classList.toggle('active', i === idx);
    });
    window._currentHeroSlug = items[idx].slug;
    window._currentHeroType = items[idx].type || 'movie';
    resetHeroTimer();
  };

  // Expose for arrows in HTML
  window.updateHeroDots = function(idx) {
    document.querySelectorAll('.hero-dots .h-dot-b').forEach(function(d, i) {
      d.classList.toggle('active', i === idx);
    });
  };

  window.resetHeroTimer = function() {
    if (window._heroTimer) clearInterval(window._heroTimer);
    var items = window._heroItems;
    if (!items || items.length <= 1) return;
    window._heroTimer = setInterval(function() {
      heroGoTo((window._heroIndex + 1) % items.length);
    }, 6000);
  };

  function renderContinueWatching(containerId, items) {
    const el = document.getElementById(containerId);
    if (!el || !items || !items.length) {
      // Hide the entire continue watching section instead of showing permanent skeletons
      var cwSection = document.getElementById('cw-section');
      if (cwSection) cwSection.remove();
      return;
    }

    el.innerHTML = items.map((it, i) => {
      const pct = parseFloat(it.progressPct) || 0;
      const title = it.title || it.seriesTitle || '—';
      const sub = it.type === 'episode'
        ? `${it.seriesTitle} · С${it.seasonNumber}:E${it.number || ''}`
        : `${Math.round((it.durationSec - it.progressSec) / 60)}мин осталось`;

      return `<div class="cw" onclick="go('${it.type === 'episode' ? 'series-detail' : 'detail'}')">
        <div class="cw-img"><div class="cw-poster ${PG(i)}"></div>
          <div class="cw-play"><div class="play-c">${IC.play}</div></div>
          <div class="cw-prog"><div class="cw-prog-f" style="width:${pct}%"></div></div>
        </div>
        <div class="cw-meta"><div class="cw-t">${title}</div><div class="cw-s">${sub}</div></div>
      </div>`;
    }).join('');
  }

  // ═══════════════════════════
  // 2. CATALOGS
  // ═══════════════════════════
  const _origBuildCatalogs = window.buildCatalogs;

  window.buildCatalogs = function() {
    rSkel('cat-films', 12);
    rSkel('cat-series', 12);

    // Load movies
    api('/api/movies?limit=20').then(data => {
      var items = (data.data || data).map(function(m) { m.type = m.type || 'movie'; return m; });
      renderCards('cat-films', items, '');
    }).catch(() => {
      rPC('cat-films', [...M, ...S.slice(0, 6)], '');
    });

    // Load series
    api('/api/series?limit=20').then(data => {
      var items = (data.data || data).map(function(s) { s.type = s.type || 'series'; return s; });
      renderCards('cat-series', items, '');
    }).catch(() => {
      rPC('cat-series', [...S, ...M.slice(0, 6)], '');
    });

    // Load genres for filter chips
    api('/api/genres').then(genresList => {
      window._genres = genresList;
      renderGenreChips(genresList);
    }).catch(() => {});
  };

  function renderGenreChips(genresList) {
    const containers = document.querySelectorAll('.cat-filters');
    containers.forEach(container => {
      let html = '<div class="chip active" onclick="MakonAPI.filterGenre(null,this)">Все</div>';
      genresList.forEach(g => {
        html += `<div class="chip" onclick="MakonAPI.filterGenre('${g.slug}',this)">${g.name}</div>`;
      });
      container.innerHTML = html;
    });
  }

  // ═══════════════════════════
  // 3. SEARCH
  // ═══════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    const si = document.getElementById('searchInput');
    if (!si) return;

    let searchTimeout;

    // Override search input handler
    si.removeEventListener('input', si._handler);  // remove old if exists
    si._handler = function() {
      clearTimeout(searchTimeout);
      const q = si.value.trim();
      const sr = document.getElementById('searchResults');

      if (!q) {
        sr.innerHTML = '<div class="search-hint">Введите название фильма или сериала</div>';
        return;
      }

      // Show skeleton
      sr.innerHTML = '<div class="search-grid">' +
        Array(6).fill(0).map(() => '<div class="skel-card"><div class="skel skel-poster"></div><div class="skel skel-text w60"></div></div>').join('') +
        '</div>';

      searchTimeout = setTimeout(() => {
        api(`/api/search?q=${encodeURIComponent(q)}`).then(data => {
          if (data.results && data.results.length > 0) {
            sr.innerHTML = `<div class="search-hint">${data.total} результатов для «${q}»</div><div class="search-grid" id="sr-grid"></div>`;
            renderCards('sr-grid', data.results, '');
          } else {
            sr.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><div class="empty-title">Ничего не найдено</div><div class="empty-desc">Попробуйте изменить запрос</div></div>`;
          }
        }).catch(() => {
          // Fallback to client-side search
          const all = [...M, ...S];
          const res = all.filter(t => t.toLowerCase().includes(q.toLowerCase()));
          if (res.length) {
            sr.innerHTML = `<div class="search-hint">${res.length} результатов для «${q}»</div><div class="search-grid" id="sr-grid"></div>`;
            rPC('sr-grid', res, '');
          } else {
            sr.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><div class="empty-title">Ничего не найдено</div></div>`;
          }
        });
      }, 300);
    };
    si.addEventListener('input', si._handler);
  });

  // ═══════════════════════════
  // 4. DETAIL PAGE (movie)
  // ═══════════════════════════
  window.MakonAPI = window.MakonAPI || {};

  function showDetailOverlay(pageId) {
    var page = document.getElementById(pageId);
    if (!page) return;
    // Remove existing overlay
    var old = page.querySelector('.detail-overlay');
    if (old) old.remove();
    var ov = document.createElement('div');
    ov.className = 'detail-overlay';
    ov.innerHTML = '<div class="detail-spinner"></div>';
    page.appendChild(ov);
  }
  function hideDetailOverlay(pageId) {
    var page = document.getElementById(pageId);
    if (!page) return;
    var ov = page.querySelector('.detail-overlay');
    if (ov) ov.remove();
  }

  MakonAPI.goDetail = function(page, slug) {
    if (!slug) { go(page); return; }

    // Store slug for the page — go() will include it in the hash
    window._currentSlug = slug;
    window._currentPage = page;

    // Show overlay BEFORE showing the page
    var pageId = 'page-' + page;
    showDetailOverlay(pageId);

    // Show page (go() sets hash with slug)
    go(page);

    // Load real data
    if (page === 'detail') {
      loadMovieDetail(slug);
    } else if (page === 'series-detail') {
      loadSeriesDetail(slug);
    }
  };

  function loadMovieDetail(slug) {
    api(`/api/movies/${encodeURIComponent(slug)}`).then(movie => {
      // Update title
      const titleEl = document.querySelector('#page-detail .d-title');
      if (titleEl) titleEl.textContent = movie.title;

      // Update breadcrumb
      const breadLast = document.querySelector('#page-detail .bread-in');
      if (breadLast) {
        const spans = breadLast.querySelectorAll('span:last-child');
        if (spans.length) spans[spans.length - 1].textContent = movie.title;
      }

      // Update description
      const descEl = document.querySelector('#page-detail .d-desc, #page-detail #dDesc');
      if (descEl) descEl.textContent = movie.description || movie.shortDesc || '';

      // Update about description
      const aboutDesc = document.querySelector('#page-detail .about-desc');
      if (aboutDesc) aboutDesc.textContent = movie.description || '';

      // Update meta badges
      const metaEl = document.querySelector('#page-detail .d-meta');
      if (metaEl) {
        metaEl.innerHTML = [
          movie.rating ? `<span class="d-rating">${movie.rating}</span>` : '',
          movie.year ? `<span class="d-mt">${movie.year}</span>` : '',
          movie.durationMin ? `<span class="d-dot"></span><span class="d-mt">${movie.durationMin} мин</span>` : '',
          movie.ageRating ? `<span class="d-dot"></span><span class="d-mt">${movie.ageRating}</span>` : '',
        ].filter(Boolean).join('');
      }

      // Update genre chips
      const chipsEl = document.querySelector('#page-detail .d-chips');
      if (chipsEl && movie.genres && movie.genres.length > 0) {
        chipsEl.innerHTML = movie.genres.map(g => `<div class="d-chip">${g.name}</div>`).join('');
      }

      // Update backdrop
      const heroBgEl = document.querySelector('#page-detail .d-hero-bg-i');
      if (heroBgEl && (movie.backdropUrl || movie.posterUrl)) {
        heroBgEl.style.backgroundImage = `url(${movie.backdropUrl || movie.posterUrl})`;
        heroBgEl.style.backgroundSize = 'cover';
        heroBgEl.style.backgroundPosition = 'center';
      }

      // Update "О фильме" section
      const aboutDets = document.querySelector('#page-detail .about-dets');
      if (aboutDets) {
        aboutDets.innerHTML = `
          <div class="about-r"><span class="about-l">Год</span><span class="about-v">${movie.year || '—'}</span></div>
          <div class="about-r"><span class="about-l">Страна</span><span class="about-v">${movie.country || '—'}</span></div>
          <div class="about-r"><span class="about-l">Жанр</span><span class="about-v">${(movie.genres || []).map(g => g.name).join(', ') || '—'}</span></div>
          <div class="about-r"><span class="about-l">Длительность</span><span class="about-v">${movie.durationMin ? movie.durationMin + ' мин' : '—'}</span></div>
          <div class="about-r"><span class="about-l">Качество</span><span class="about-v">${movie.quality || 'HD'}</span></div>
          <div class="about-r"><span class="about-l">Возраст</span><span class="about-v">${movie.ageRating || '—'}</span></div>
        `;
      }

      // Update cast
      const castEl = document.querySelector('#page-detail .cast-grid, #page-detail .car[id*="cast"]');
      if (castEl && movie.cast && movie.cast.length > 0) {
        castEl.innerHTML = movie.cast.map(p =>
          `<div class="cast-c" onclick="MakonAPI.openActor('${p.id}')">
            <div class="cast-img">${p.photoUrl ? `<img src="${p.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : `<div class="cast-ph">${(p.name || '?')[0]}</div>`}</div>
            <div class="cast-name">${p.name}</div>
            <div class="cast-role">${p.characterName || p.role || ''}</div>
          </div>`
        ).join('');
      }

      // Update reviews
      const reviewsEl = document.querySelector('#page-detail .reviews-list');
      if (reviewsEl && movie.reviews && movie.reviews.length > 0) {
        reviewsEl.innerHTML = movie.reviews.map(r =>
          `<div class="review">
            <div class="review-h"><div class="review-av">${(r.userName || '?')[0]}</div>
              <div><div class="review-name">${r.userName}</div><div class="review-date">${new Date(r.createdAt).toLocaleDateString('ru')}</div></div>
              <div class="review-stars">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</div></div>
            <div class="review-text">${r.text || ''}</div>
          </div>`
        ).join('');
      }

      // Similar movies
      if (movie.similar && movie.similar.length > 0) {
        const simEl = document.getElementById('car-rec');
        if (simEl) renderCards('car-rec', movie.similar, '');
      }

      // Store for video player
      window._currentMovie = movie;
      window._currentSeries = null;
      _loadReviews();
      if (window.updateMeta) updateMeta(movie.title, movie.shortDesc || movie.description, movie.posterUrl || movie.backdropUrl);
      hideDetailOverlay('page-detail');
    }).catch(err => {
      console.warn('Failed to load movie detail:', err.message);
      hideDetailOverlay('page-detail');
    });
  }

  // ═══════════════════════════
  // 5. SERIES DETAIL
  // ═══════════════════════════
  function loadSeriesDetail(slug) {
    api(`/api/series/${encodeURIComponent(slug)}`).then(show => {
      // Title
      const titleEl = document.querySelector('#page-series-detail .d-title');
      if (titleEl) titleEl.textContent = show.title;

      // Breadcrumb
      const breadIn = document.querySelector('#page-series-detail .bread-in');
      if (breadIn) {
        var genreName = (show.genres && show.genres[0]) ? show.genres[0].name : '';
        var breadGenre = breadIn.querySelector('.bread-genre');
        var breadTitle = breadIn.querySelector('.bread-title');
        if (breadGenre) breadGenre.textContent = genreName;
        if (breadTitle) breadTitle.textContent = show.title;
      }

      // Description
      const descEl = document.querySelector('#page-series-detail .d-desc');
      if (descEl) descEl.textContent = show.description || show.shortDesc || '';

      // About description
      const aboutDesc = document.querySelector('#page-series-detail .about-desc');
      if (aboutDesc) aboutDesc.textContent = show.description || '';

      // Meta badges
      const metaEl = document.querySelector('#page-series-detail .d-meta');
      if (metaEl) {
        const seasonCount = show.seasons ? show.seasons.length : 0;
        const episodeCount = show.seasons ? show.seasons.reduce((sum, s) => sum + (s.episodes ? s.episodes.length : 0), 0) : 0;
        metaEl.innerHTML = [
          show.rating ? `<span class="d-rating">${show.rating}</span>` : '',
          show.year ? `<span class="d-mt">${show.year}</span>` : '',
          seasonCount ? `<span class="d-dot"></span><span class="d-mt">${seasonCount} сезон${seasonCount > 1 ? (seasonCount < 5 ? 'а' : 'ов') : ''}</span>` : '',
          episodeCount ? `<span class="d-dot"></span><span class="d-mt">${episodeCount} серий</span>` : '',
          show.ageRating ? `<span class="d-dot"></span><span class="d-mt">${show.ageRating}</span>` : '',
        ].filter(Boolean).join('');
      }

      // Genre chips
      const chipsEl = document.querySelector('#page-series-detail .d-chips');
      if (chipsEl && show.genres && show.genres.length > 0) {
        chipsEl.innerHTML = show.genres.map(g => `<div class="d-chip">${g.name}</div>`).join('');
      }

      // Hero background
      const heroBgEl = document.querySelector('#page-series-detail .d-hero-bg-i');
      if (heroBgEl && (show.backdropUrl || show.posterUrl)) {
        heroBgEl.style.backgroundImage = `url(${show.backdropUrl || show.posterUrl})`;
        heroBgEl.style.backgroundSize = 'cover';
        heroBgEl.style.backgroundPosition = 'center';
      }

      // About details
      const aboutDets = document.querySelector('#page-series-detail .about-dets');
      if (aboutDets) {
        const genreNames = (show.genres || []).map(g => g.name).join(', ') || '—';
        const castNames = (show.cast || []).map(c => c.name).join(', ') || '—';
        aboutDets.innerHTML = `
          <div class="about-r"><span class="about-l">Год</span><span class="about-v">${show.year || '—'}</span></div>
          <div class="about-r"><span class="about-l">Страна</span><span class="about-v">${show.country || 'Узбекистан'}</span></div>
          <div class="about-r"><span class="about-l">Жанр</span><span class="about-v">${genreNames}</span></div>
          <div class="about-r"><span class="about-l">В ролях</span><span class="about-v">${castNames}</span></div>
        `;
      }

      // Store seasons data globally for season switcher
      window._seriesSeasons = show.seasons || [];
      window._currentSeries = show;

      // Build season selector from API data
      if (show.seasons && show.seasons.length > 0) {
        buildSeasonsFromAPI(show.seasons);
      } else {
        var grid = document.getElementById('epGrid');
        if (grid) grid.innerHTML = '<div class="empty" style="grid-column:1/-1;padding:var(--sp32) 0"><div class="empty-title">Эпизоды скоро появятся</div></div>';
      }

      // Similar series
      if (show.similar && show.similar.length > 0) {
        var simItems = show.similar.map(function(s) { s.type = s.type || 'series'; return s; });
        renderCards('car-ser-rec', simItems, '');
      }

      _loadReviews();
      if (window.updateMeta) updateMeta(show.title, show.shortDesc || show.description, show.posterUrl || show.backdropUrl);
      hideDetailOverlay('page-series-detail');
    }).catch(err => {
      console.warn('Failed to load series detail:', err.message);
      hideDetailOverlay('page-series-detail');
    });
  }

  function buildSeasonsFromAPI(seasonsData) {
    // Season selector — uses ep-season-btn class from index.html CSS
    const selEl = document.getElementById('epSeasonSel');
    if (selEl) {
      selEl.innerHTML = seasonsData.map(function(s, i) {
        var label = s.title || ('Сезон ' + s.number);
        var count = s.episodes ? s.episodes.length : 0;
        return '<button class="ep-season-btn' + (i === 0 ? ' active' : '') + '" onclick="MakonAPI.switchSeason(' + i + ')">' +
          label + '</button>';
      }).join('');
    }

    // Render first season episodes
    if (seasonsData[0]) {
      renderEpisodesFromAPI(seasonsData[0].episodes || [], seasonsData[0].number || 1);
    }
  }

  function renderEpisodesFromAPI(episodes, seasonNum) {
    var grid = document.getElementById('epGrid');
    if (!grid) return;
    var seriesTitle = (window._currentSeries && window._currentSeries.title) || '';
    var GRADS = ['#1a1a2e,#16213e','#16213e,#0f3460','#0f3460,#1a1a2e','#2d1b69,#11998e','#11998e,#1a1a2e','#1a1a2e,#0f3460','#16213e,#2d1b69','#0f3460,#16213e'];

    grid.innerHTML = episodes.map(function(ep, i) {
      var title = ep.title || ('Серия ' + ep.number);
      var durText = ep.durationMin ? ep.durationMin + ' мин' : '';
      var grad = GRADS[i % GRADS.length];
      var thumb = ep.thumbnailUrl
        ? '<img src="' + ep.thumbnailUrl + '" alt="" style="width:100%;height:100%;object-fit:cover">'
        : '<div class="ep-thumb-bg" style="background:linear-gradient(135deg,' + grad + ')"></div>';
      var videoUrl = ep.videoUrl ? ep.videoUrl.replace(/'/g, "\\'") : '';
      var safeTitle = seriesTitle.replace(/'/g, "\\'");
      var epLabel = 'S' + (seasonNum || 1) + ' · Серия ' + ep.number + ' «' + title.replace(/'/g, "\\'") + '»';

      return '<div class="ep-card" onclick="playEpisode(\'' + safeTitle + '\',\'' + epLabel + '\'' + (videoUrl ? ',\'' + videoUrl + '\'' : '') + ')">' +
        '<div class="ep-thumb">' + thumb +
          '<div class="ep-thumb-play"><div class="play-c"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div></div>' +
          (durText ? '<span class="ep-dur">' + durText + '</span>' : '') +
          (ep.isFree ? '<span class="ep-dur" style="left:8px;right:auto;background:var(--accent);color:#0A0A0F">Бесплатно</span>' : '') +
        '</div>' +
        '<div class="ep-label">' + ep.number + '. <b>' + title + '</b></div>' +
      '</div>';
    }).join('');
  }

  MakonAPI.switchSeason = function(idx) {
    var seasons = window._seriesSeasons || [];
    if (!seasons[idx]) return;

    // Update active button
    document.querySelectorAll('.ep-season-btn').forEach(function(b, i) { b.classList.toggle('active', i === idx); });

    renderEpisodesFromAPI(seasons[idx].episodes || [], seasons[idx].number || (idx + 1));
  };

  // ═══════════════════════════
  // 6. ACTOR PAGE
  // ═══════════════════════════
  MakonAPI.openActor = function(personId) {
    go('actor');

    api(`/api/persons/${personId}`).then(person => {
      const nameEl = document.querySelector('#page-actor .actor-name, #page-actor .hero-t');
      if (nameEl) nameEl.textContent = person.name;

      const bioEl = document.querySelector('#page-actor .actor-bio');
      if (bioEl) bioEl.textContent = person.bio || '';

      const infoEl = document.querySelector('#page-actor .actor-info');
      if (infoEl) {
        infoEl.innerHTML = [
          person.birthPlace ? `<div class="info-item"><span class="info-l">Место рождения</span><span class="info-v">${person.birthPlace}</span></div>` : '',
        ].join('');
      }

      // Filmography
      const filmEl = document.querySelector('#page-actor .actor-films, #page-actor .car');
      if (filmEl && person.filmography) {
        renderCards(filmEl.id || 'actor-films', person.filmography, '');
      }
    }).catch(err => {
      console.warn('Failed to load actor:', err.message);
    });
  };

  // ═══════════════════════════
  // 7. PLANS PAGE — keep static HTML, don't override with dynamic API data
  // Static plan cards in index.html already have correct styling.
  // ═══════════════════════════

  // ═══════════════════════════
  // 8. NOTIFICATIONS
  // ═══════════════════════════
  MakonAPI.loadNotifications = function() {
    // Fetch global notifications (visible to everyone)
    var endpoint = '/api/notifications';
    // If user is logged in, fetch their personal notifications instead
    if (CURRENT_USER_ID) endpoint = '/api/users/' + CURRENT_USER_ID + '/notifications';

    api(endpoint).then(function(notifs) {
      var list = document.getElementById('notifList');
      if (!list) return;

      var unread = notifs.filter(function(n) { return !n.isRead; }).length;
      var badge = document.getElementById('notifBadge');
      if (badge) {
        badge.style.display = unread > 0 ? '' : 'none';
      }

      var svgPlay = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="m10 8 6 4-6 4z"/></svg>';
      var svgGift = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
      var svgGear = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

      var iconTypes = { new_episode: svgPlay, promo: svgGift, system: svgGear, new_movie: svgPlay, update: svgGear };
      var colorTypes = { new_episode: 'c1', promo: 'c2', system: 'c3', new_movie: 'c1', update: 'c3' };

      if (!notifs.length) {
        list.innerHTML = '<div class="ni"><div class="ni-ic c3">' + svgPlay + '</div><div class="ni-bd"><div class="ni-tx">Нет уведомлений</div></div></div>';
        return;
      }

      list.innerHTML = notifs.map(function(n) {
        var icon = iconTypes[n.type] || svgPlay;
        var color = colorTypes[n.type] || 'c1';
        var unreadClass = n.isRead ? '' : ' ur';
        var dot = n.isRead ? '' : '<div class="ni-dt"></div>';
        var title = (typeof n.title === 'object') ? (n.title.ru || n.title.uz || '') : (n.title || '');
        var body = (typeof n.body === 'object') ? (n.body.ru || n.body.uz || '') : (n.body || '');
        var text = title + (body ? ' ' + body : '');
        var time = n.createdAt ? formatTimeAgo(n.createdAt) : '';
        var onclick = n.actionUrl ? 'onclick="MakonAPI.readNotif(\'' + n.id + '\',\'' + (n.actionUrl || '') + '\')"' : '';
        return '<div class="ni' + unreadClass + '" ' + onclick + '><div class="ni-ic ' + color + '">' + icon + '</div><div class="ni-bd"><div class="ni-tx">' + text + '</div>' + (time ? '<div class="ni-tm">' + time + '</div>' : '') + '</div>' + dot + '</div>';
      }).join('');
    }).catch(function() {});
  };

  function formatTimeAgo(dateStr) {
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    var diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин. назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч. назад';
    var days = Math.floor(diff / 86400);
    if (days === 1) return 'вчера';
    return days + ' дн. назад';
  }

  MakonAPI.readNotif = function(id, actionUrl) {
    if (CURRENT_USER_ID) {
      apiPost(`/api/users/${CURRENT_USER_ID}/notifications/${id}/read`);
    }
    if (actionUrl) {
      const page = actionUrl.replace('#', '');
      go(page);
    }
  };

  // ═══════════════════════════
  // 9. FAVORITES
  // ═══════════════════════════
  MakonAPI.loadFavorites = function() {
    if (!CURRENT_USER_ID) return Promise.resolve([]);

    var fetchFavs = MakonAPI.authFetch
      ? MakonAPI.authFetch(`/api/users/${CURRENT_USER_ID}/favorites`).then(r => {
          if (!r.ok) throw new Error(r.statusText);
          return r.json();
        })
      : api(`/api/users/${CURRENT_USER_ID}/favorites`);

    return fetchFavs.then(favs => {
      window._apiFavorites = favs;
      return favs;
    }).catch(() => []);
  };

  MakonAPI.addFavorite = function(movieId, seriesId) {
    if (!window.isAuth) { if (window.openAuth) openAuth(); return; }
    if (!CURRENT_USER_ID) return;
    const body = movieId ? { movieId } : { seriesId };
    (MakonAPI.authFetch
      ? MakonAPI.authFetch(`/api/users/${CURRENT_USER_ID}/favorites`, {
          method: 'POST',
          body: JSON.stringify(body),
        }).then(r => r.json())
      : apiPost(`/api/users/${CURRENT_USER_ID}/favorites`, body)
    ).then(() => {
      showToast('Добавлено в избранное');
    });
  };

  MakonAPI.removeFavorite = function(favoriteId) {
    if (!window.isAuth) return;
    if (!CURRENT_USER_ID) return;
    (MakonAPI.authFetch
      ? MakonAPI.authFetch(`/api/users/${CURRENT_USER_ID}/favorites/${favoriteId}`, { method: 'DELETE' })
      : fetch(`${API_BASE}/api/users/${CURRENT_USER_ID}/favorites/${favoriteId}`, { method: 'DELETE' })
    ).then(() => showToast('Удалено из избранного'));
  };

  // ═══════════════════════════
  // 10. GENRE FILTER
  // ═══════════════════════════
  MakonAPI.filterGenre = function(genreSlug, chipEl) {
    // Update active chip
    if (chipEl) {
      chipEl.closest('.cat-filters').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chipEl.classList.add('active');
    }

    const isFilms = !!document.getElementById('page-catalog-films')?.classList.contains('visible');
    const containerId = isFilms ? 'cat-films' : 'cat-series';
    const endpoint = isFilms ? '/api/movies' : '/api/series';

    rSkel(containerId, 12);

    const itemType = isFilms ? 'movie' : 'series';
    const url = genreSlug ? `${endpoint}?genre=${genreSlug}&limit=20` : `${endpoint}?limit=20`;
    api(url).then(data => {
      var items = (data.data || data).map(function(m) { m.type = m.type || itemType; return m; });
      renderCards(containerId, items, '');
    }).catch(() => {});
  };

  // ═══════════════════════════
  // 11. SET USER (called after login)
  // ═══════════════════════════
  MakonAPI.setUser = function(userId) {
    CURRENT_USER_ID = userId;
    localStorage.setItem('makontv_user_id', userId);
    MakonAPI.loadNotifications();
    MakonAPI.loadFavorites();
  };

  MakonAPI.clearUser = function() {
    CURRENT_USER_ID = null;
    localStorage.removeItem('makontv_user_id');
  };

  // ═══════════════════════════
  // 12. REVIEWS
  // ═══════════════════════════
  var _reviewRating = 0;

  // Star rating interaction
  document.addEventListener('DOMContentLoaded', function() {
    var starsContainer = document.getElementById('revStars');
    if (starsContainer) {
      starsContainer.querySelectorAll('svg').forEach(function(star) {
        star.addEventListener('click', function() {
          _reviewRating = parseInt(star.getAttribute('data-v'));
          _updateStars();
        });
        star.addEventListener('mouseenter', function() {
          var v = parseInt(star.getAttribute('data-v'));
          starsContainer.querySelectorAll('svg').forEach(function(s) {
            s.style.fill = parseInt(s.getAttribute('data-v')) <= v ? 'var(--gold)' : 'none';
          });
        });
      });
      starsContainer.addEventListener('mouseleave', function() { _updateStars(); });
    }
  });

  function _updateStars() {
    var starsContainer = document.getElementById('revStars');
    if (!starsContainer) return;
    starsContainer.querySelectorAll('svg').forEach(function(s) {
      s.style.fill = parseInt(s.getAttribute('data-v')) <= _reviewRating ? 'var(--gold)' : 'none';
    });
  }

  MakonAPI.submitReview = function() {
    var text = document.getElementById('revText');
    if (!_reviewRating) { showToast('Выберите оценку'); return; }
    if (!text || !text.value.trim()) { showToast('Напишите отзыв'); return; }

    var movie = window._currentMovie;
    var series = window._currentSeries;
    var body = {
      rating: _reviewRating,
      text: text.value.trim(),
      userName: CURRENT_USER_ID ? undefined : 'Гость',
    };
    if (movie) body.movieId = movie.id;
    else if (series) body.seriesId = series.id;

    var userId = CURRENT_USER_ID || 'guest';
    apiPost('/api/reviews', body).then(function() {
      showToast('Отзыв отправлен!');
      text.value = '';
      _reviewRating = 0;
      _updateStars();
      // Reload reviews
      _loadReviews();
    }).catch(function() {
      showToast('Ошибка при отправке');
    });
  };

  function _loadReviews() {
    var movie = window._currentMovie;
    var series = window._currentSeries;
    var id = movie ? movie.id : (series ? series.id : null);
    var type = movie ? 'movie' : 'series';
    if (!id) return;

    api('/api/reviews?type=' + type + '&id=' + id).then(function(reviews) {
      _renderReviews(reviews);
    }).catch(function() {});
  }

  function _renderReviews(reviews) {
    var list = document.getElementById('revList');
    if (!list) return;
    if (!reviews || !reviews.length) {
      list.innerHTML = '<div style="color:var(--t3);font-size:14px">Пока нет отзывов. Будьте первым!</div>';
      return;
    }
    list.innerHTML = reviews.map(function(r) {
      var stars = '';
      for (var i = 1; i <= 5; i++) {
        stars += '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (i <= r.rating ? 'var(--gold)' : 'none') + '" stroke="var(--gold)" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
      }
      var time = r.createdAt ? formatTimeAgo(r.createdAt) : '';
      var name = r.userName || 'Пользователь';
      return '<div class="rev-card">' +
        '<div class="rev-card-top">' +
          '<div class="rev-card-av">' + name[0].toUpperCase() + '</div>' +
          '<div><div class="rev-card-name">' + name + '</div><div class="rev-card-date">' + time + '</div></div>' +
          '<div style="margin-left:auto;display:flex;gap:2px">' + stars + '</div>' +
        '</div>' +
        '<div class="rev-card-text">' + r.text + '</div>' +
      '</div>';
    }).join('');
  }

  // ═══════════════════════════
  // 13. VIDEO PLAYER
  // ═══════════════════════════
  MakonAPI.initPlayer = function(containerId, url, opts) {
    opts = opts || {};
    var container = document.getElementById(containerId);
    if (!container) return;

    // Detect URL type
    var isYoutube = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/.exec(url);
    var isHLS = /\.m3u8(\?|$)/i.test(url);

    if (isYoutube) {
      // YouTube embed
      var videoId = isYoutube[1];
      container.innerHTML = '<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;background:#000">' +
        (opts.title ? '<div style="position:absolute;top:0;left:0;right:0;padding:16px 60px;background:linear-gradient(180deg,rgba(0,0,0,.8),transparent);z-index:10;color:#fff;font-size:16px;font-weight:600">' + opts.title + '</div>' : '') +
        '<iframe src="https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0&modestbranding=1" style="flex:1;border:none;width:100%;height:100%" allow="autoplay;encrypted-media;fullscreen" allowfullscreen></iframe>' +
        '</div>';
    } else if (isHLS) {
      // HLS via hls.js
      container.innerHTML = '<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;background:#000">' +
        (opts.title ? '<div class="player-title" style="position:absolute;top:0;left:0;right:0;padding:16px 60px;background:linear-gradient(180deg,rgba(0,0,0,.8),transparent);z-index:10;color:#fff;font-size:16px;font-weight:600">' + opts.title + '</div>' : '') +
        '<video id="hlsVideo" style="flex:1;width:100%;height:100%;background:#000" controls autoplay playsinline></video>' +
        '</div>';
      var video = document.getElementById('hlsVideo');
      if (window.Hls && Hls.isSupported()) {
        var hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() { video.play(); });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play();
      }
      _setupProgressTracking(video, opts);
    } else {
      // Direct MP4/video URL
      container.innerHTML = '<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;background:#000">' +
        (opts.title ? '<div class="player-title" style="position:absolute;top:0;left:0;right:0;padding:16px 60px;background:linear-gradient(180deg,rgba(0,0,0,.8),transparent);z-index:10;color:#fff;font-size:16px;font-weight:600;pointer-events:none">' + opts.title + '</div>' : '') +
        '<video id="nativeVideo" style="flex:1;width:100%;height:100%;background:#000" controls autoplay playsinline>' +
        '<source src="' + url + '" type="video/mp4">' +
        '</video>' +
        '</div>';
      var vid = document.getElementById('nativeVideo');
      vid.play().catch(function() {});
      _setupProgressTracking(vid, opts);
    }
  };

  function _setupProgressTracking(videoEl, opts) {
    if (!videoEl || !CURRENT_USER_ID || !opts.movieId) return;
    var lastSaved = 0;
    videoEl.addEventListener('timeupdate', function() {
      var now = Math.floor(Date.now() / 1000);
      if (now - lastSaved < 15) return; // save every 15 seconds
      lastSaved = now;
      var progress = Math.floor(videoEl.currentTime);
      var duration = Math.floor(videoEl.duration) || 0;
      if (progress > 5) {
        apiPost('/api/users/' + CURRENT_USER_ID + '/history', {
          movieId: opts.movieId,
          progressSec: progress,
          durationSec: duration,
        }).catch(function() {});
      }
    });
  }

  // ═══════════════════════════
  // AUTO-INIT
  // ═══════════════════════════
  // Expose globally
  window.MakonAPI = MakonAPI;
  window.renderCards = renderCards;

  // ═══════════════════════════
  // OVERRIDE go() — no longer needed for detail loading since goDetail handles it.
  // Keep original go() untouched. Detail loading happens via goDetail() or navigateFromHash().
  // ═══════════════════════════

  // Handle pending detail from hash (page loaded before api-client.js)
  if (window._pendingDetail) {
    var pd = window._pendingDetail;
    window._pendingDetail = null;
    MakonAPI.goDetail(pd.page, pd.slug);
  }

  // ═══════════════════════════
  // RE-RENDER WITH API DATA
  // ═══════════════════════════
  // The original buildHome/buildCatalogs were called BEFORE this script loaded,
  // so they rendered mock data. Now that we've overridden them, re-call to fetch real data.
  if (API_BASE) {
    console.log('🔄 Re-rendering with API data from:', API_BASE);
    try { window.buildHome(); } catch(e) { console.warn('buildHome re-render failed:', e); }
    try { window.buildCatalogs(); } catch(e) { console.warn('buildCatalogs re-render failed:', e); }
  }

  // Load notifications for all users (global notifications for guests, personal for logged-in)
  setTimeout(() => {
    MakonAPI.loadNotifications();
    if (CURRENT_USER_ID) {
      MakonAPI.loadFavorites();
    }
  }, 500);

  console.log('✅ MakonTV API Client loaded. API:', API_BASE || '(same origin)');

})();
