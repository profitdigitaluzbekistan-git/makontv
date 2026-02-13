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
    // Show skeleton immediately
    _origBuildHome();

    api('/api/home').then(data => {
      const el = document.getElementById('home-main');
      if (!el) return;

      // Build sections from API collections
      let html = '';

      // Continue watching (from user history if logged in)
      if (CURRENT_USER_ID) {
        html += mkSec('Продолжить просмотр', 'hc-cw');
      }

      // Collections from API
      if (data.collections) {
        data.collections.forEach(coll => {
          const carId = 'hc-' + coll.slug.replace(/[^a-z0-9]/g, '');
          html += mkSec(coll.title, carId);
        });
      }

      el.innerHTML = html;

      // Render continue watching
      if (CURRENT_USER_ID) {
        api(`/api/users/${CURRENT_USER_ID}/history?continue=true`).then(history => {
          renderContinueWatching('hc-cw', history);
        }).catch(() => rCW('hc-cw'));
      }

      // Render collection items
      if (data.collections) {
        data.collections.forEach((coll, idx) => {
          const carId = 'hc-' + coll.slug.replace(/[^a-z0-9]/g, '');
          const badge = coll.slug === 'trending' ? 'top' : coll.slug === 'new' ? 'new' : '';
          renderCards(carId, coll.items, badge);
        });
      }

      // Hero banner from featured
      if (data.hero && data.hero.length > 0) {
        updateHero(data.hero[0]);
      }
    }).catch(err => {
      console.warn('API unavailable, using mock data:', err.message);
      _origBuildHome();
    });
  };

  function updateHero(item) {
    // Update hero section with real data (selectors match actual HTML classes)
    const heroTitle = document.querySelector('.h-title');
    const heroDesc = document.querySelector('.h-desc');
    const heroMeta = document.querySelector('.h-meta');

    if (heroTitle) heroTitle.textContent = item.title || '';
    if (heroDesc) heroDesc.textContent = item.shortDesc || item.description || '';
    // Show badge
    const heroBadge = document.querySelector('.h-badge');
    if (heroBadge) heroBadge.style.display = '';
    if (heroMeta) {
      heroMeta.innerHTML = [
        item.rating ? `<span class="h-rating">${item.rating}</span>` : '',
        item.year ? `<span class="h-mt">${item.year}</span>` : '',
        item.ageRating ? `<span class="h-dot"></span><span class="h-mt">${item.ageRating}</span>` : '',
        item.durationMin ? `<span class="h-dot"></span><span class="h-mt">${item.durationMin} мин</span>` : '',
        item.quality ? `<span class="h-dot"></span><span class="h-mt">${item.quality}</span>` : '',
      ].filter(Boolean).join('');
    }

    // Update backdrop / poster
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
      const bgUrl = item.backdropUrl || item.posterUrl;
      if (bgUrl) {
        heroBg.style.backgroundImage = `url(${bgUrl})`;
        heroBg.style.backgroundSize = 'cover';
        heroBg.style.backgroundPosition = 'center';
      }
    }

    // Update "Смотреть" and "Подробнее" buttons to navigate to the right movie
    const clickPage = item.type === 'series' ? 'series-detail' : 'detail';
    const heroActions = document.querySelector('.h-act');
    if (heroActions) {
      const buttons = heroActions.querySelectorAll('button');
      buttons.forEach(btn => {
        const text = btn.textContent.trim();
        if (text.includes('Смотреть') || text.includes('Подробнее')) {
          btn.onclick = function() { MakonAPI.goDetail(clickPage, item.slug); };
        }
      });
    }

    // Store current movie slug for "Watch" button
    window._currentHeroSlug = item.slug;
    window._currentHeroType = item.type || 'movie';
  }

  function renderContinueWatching(containerId, items) {
    const el = document.getElementById(containerId);
    if (!el || !items.length) { rCW(containerId); return; }

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
      renderCards('cat-films', data.data || data, '');
    }).catch(() => {
      // Fallback to mock
      rPC('cat-films', [...M, ...S.slice(0, 6)], '');
    });

    // Load series
    api('/api/series?limit=20').then(data => {
      renderCards('cat-series', data.data || data, '');
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
        sr.innerHTML = '<div class="search-hint">Попробуйте: «Тень Самарканда», «Триллер», «Караван»</div>';
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

  MakonAPI.goDetail = function(page, slug) {
    if (!slug) { go(page); return; }

    // Store slug for the page
    window._currentSlug = slug;
    window._currentPage = page;

    go(page);

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
    }).catch(err => {
      console.warn('Failed to load movie detail:', err.message);
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
      const breadLast = document.querySelector('#page-series-detail .bread-in');
      if (breadLast) {
        const spans = breadLast.querySelectorAll('span:last-child');
        if (spans.length) spans[spans.length - 1].textContent = show.title;
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
          seasonCount ? `<span class="d-dot"></span><span class="d-mt">Сезон ${seasonCount}</span>` : '',
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
      }

      // Similar series
      if (show.similar && show.similar.length > 0) {
        renderCards('car-ser-rec', show.similar, '');
      }

    }).catch(err => {
      console.warn('Failed to load series detail:', err.message);
    });
  }

  function buildSeasonsFromAPI(seasonsData) {
    // Season selector
    const selEl = document.querySelector('#page-series-detail .ep-season-sel, #epSeasonSel');
    if (selEl) {
      selEl.innerHTML = seasonsData.map((s, i) =>
        `<button class="season-btn ${i === 0 ? 'active' : ''}" onclick="MakonAPI.switchSeason(${i})">${s.title || 'Сезон ' + s.number}</button>`
      ).join('');
    }

    // Render first season episodes
    if (seasonsData[0]) {
      renderEpisodesFromAPI(seasonsData[0].episodes || []);
    }
  }

  function renderEpisodesFromAPI(episodes) {
    const grid = document.querySelector('#page-series-detail .ep-grid, #epGrid');
    if (!grid) return;

    grid.innerHTML = episodes.map((ep, i) => {
      const title = ep.title || `Серия ${ep.number}`;
      const durText = ep.durationMin ? `${ep.durationMin} мин` : '';

      return `<div class="ep ${i === 0 ? 'ep-active' : ''}" onclick="playEpisode('${title}','')">
        <div class="ep-thumb"><div class="ep-poster ${PG(i)}"></div>
          <div class="ep-play"><div class="play-c play-sm">${IC.play}</div></div>
          ${ep.isFree ? '<div class="ep-free">Бесплатно</div>' : ''}
          ${durText ? `<div class="ep-dur">${durText}</div>` : ''}
        </div>
        <div class="ep-info"><div class="ep-num">Серия ${ep.number}</div><div class="ep-t">${title}</div>
          ${ep.description ? `<div class="ep-desc">${ep.description}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  MakonAPI.switchSeason = function(idx) {
    const seasons = window._seriesSeasons || [];
    if (!seasons[idx]) return;

    // Update active button
    document.querySelectorAll('.season-btn').forEach((b, i) => b.classList.toggle('active', i === idx));

    renderEpisodesFromAPI(seasons[idx].episodes || []);
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
  // 7. PLANS PAGE
  // ═══════════════════════════
  const _origUpdatePlans = window.updatePlans;

  window.updatePlans = function() {
    api('/api/plans').then(plansList => {
      const container = document.querySelector('#page-plans .plans-grid, .plan-cards');
      if (!container) { _origUpdatePlans(); return; }

      container.innerHTML = plansList.map(p => {
        const features = Array.isArray(p.features) ? p.features : [];
        return `<div class="plan-c ${p.isBest ? 'plan-best' : ''}">
          ${p.isBest ? '<div class="plan-badge">Лучший выбор</div>' : ''}
          <div class="plan-name">${p.name}</div>
          <div class="plan-price">${p.priceLabel || p.price + ' сум/мес'}</div>
          <ul class="plan-feat">${features.map(f => `<li>${f}</li>`).join('')}</ul>
          <button class="plan-btn" onclick="go('checkout')">Выбрать</button>
        </div>`;
      }).join('');
    }).catch(() => {
      _origUpdatePlans();
    });
  };

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

    return api(`/api/users/${CURRENT_USER_ID}/favorites`).then(favs => {
      window._apiFavorites = favs;
      return favs;
    }).catch(() => []);
  };

  MakonAPI.addFavorite = function(movieId, seriesId) {
    if (!CURRENT_USER_ID) return;
    const body = movieId ? { movieId } : { seriesId };
    apiPost(`/api/users/${CURRENT_USER_ID}/favorites`, body).then(() => {
      showToast('Добавлено в избранное');
    });
  };

  MakonAPI.removeFavorite = function(favoriteId) {
    if (!CURRENT_USER_ID) return;
    fetch(`${API_BASE}/api/users/${CURRENT_USER_ID}/favorites/${favoriteId}`, { method: 'DELETE' })
      .then(() => showToast('Удалено из избранного'));
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

    const url = genreSlug ? `${endpoint}?genre=${genreSlug}&limit=20` : `${endpoint}?limit=20`;
    api(url).then(data => {
      renderCards(containerId, data.data || data, '');
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
  // AUTO-INIT
  // ═══════════════════════════
  // Expose globally
  window.MakonAPI = MakonAPI;

  // ═══════════════════════════
  // OVERRIDE go() to integrate API detail loading
  // ═══════════════════════════
  const _origGo = window.go;
  window.go = function(page) {
    _origGo(page);

    // After go() shows the page, load real data for detail pages
    if (page === 'detail' && window._currentSlug) {
      loadMovieDetail(window._currentSlug);
    }
    if (page === 'series-detail' && window._currentSlug) {
      loadSeriesDetail(window._currentSlug);
    }
  };

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
