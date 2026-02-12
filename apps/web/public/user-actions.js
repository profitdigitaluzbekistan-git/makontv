/**
 * MakonTV User Actions Bridge
 *
 * Connects frontend UI buttons to real API endpoints.
 * Loaded after api-client.js, before i18n.js.
 *
 * Covers: reviews, profiles, referral, downloads, watch progress auto-save.
 */
(function() {
  'use strict';

  const API = window.MAKONTV_API_URL || '';
  const UID = () => localStorage.getItem('makontv_user_id') || null;
  const LANG = () => localStorage.getItem('makontv_lang') || 'ru';

  function api(path) {
    const sep = path.includes('?') ? '&' : '?';
    return fetch(`${API}${path}${sep}lang=${LANG()}`).then(r => r.json());
  }
  function apiPost(path, body) {
    return fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }
  function apiDelete(path) {
    return fetch(`${API}${path}`, { method: 'DELETE' }).then(r => r.json());
  }

  // ═══ REVIEWS ═══

  /**
   * Submit a review from the movie/series detail page.
   * Called from: "Оставить отзыв" button
   */
  MakonAPI.submitReview = function(opts) {
    const uid = UID();
    if (!uid) { openAuth(); return; }

    const { movieId, seriesId, rating, text } = opts;
    apiPost(`/api/users/${uid}/reviews`, { movieId, seriesId, rating, text })
      .then(r => {
        if (r.error) { showToast(r.error); return; }
        showToast('Спасибо за отзыв!');
        // Reload detail page to show new review
        if (window._currentSlug) {
          if (window._currentPage === 'detail') MakonAPI.goDetail('detail', window._currentSlug);
          else MakonAPI.goDetail('series-detail', window._currentSlug);
        }
      })
      .catch(() => showToast('Не удалось отправить отзыв'));
  };

  /**
   * Render a review form in the reviews section.
   */
  MakonAPI.renderReviewForm = function(containerId, movieId, seriesId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const uid = UID();
    if (!uid) return; // no form if not logged in

    const formHtml = `
      <div class="review-form" style="margin-bottom:24px;padding:16px;background:rgba(255,255,255,0.05);border-radius:12px">
        <div style="margin-bottom:12px;font-weight:600">Оставить отзыв</div>
        <div class="review-stars-input" id="review-stars" style="font-size:24px;cursor:pointer;margin-bottom:12px">
          ${'★'.repeat(5).split('').map((s, i) => `<span data-star="${i + 1}" style="color:#444" onmouseover="MakonAPI._hoverStar(${i + 1})" onmouseout="MakonAPI._unhoverStar()" onclick="MakonAPI._selectStar(${i + 1})">${s}</span>`).join('')}
        </div>
        <textarea id="review-text" placeholder="Напишите ваше мнение..." style="width:100%;min-height:60px;background:rgba(255,255,255,0.08);border:1px solid #333;border-radius:8px;color:#fff;padding:8px;resize:vertical"></textarea>
        <button onclick="MakonAPI._sendReview('${movieId || ''}','${seriesId || ''}')" style="margin-top:8px;padding:8px 24px;background:#6bf1f6;color:#0a0a14;border:none;border-radius:8px;cursor:pointer;font-weight:600">Отправить</button>
      </div>
    `;
    el.insertAdjacentHTML('afterbegin', formHtml);
  };

  let _selectedRating = 0;
  MakonAPI._hoverStar = function(n) {
    document.querySelectorAll('#review-stars span').forEach((s, i) => {
      s.style.color = i < n ? '#6bf1f6' : '#444';
    });
  };
  MakonAPI._unhoverStar = function() {
    document.querySelectorAll('#review-stars span').forEach((s, i) => {
      s.style.color = i < _selectedRating ? '#6bf1f6' : '#444';
    });
  };
  MakonAPI._selectStar = function(n) {
    _selectedRating = n;
    MakonAPI._unhoverStar();
  };
  MakonAPI._sendReview = function(movieId, seriesId) {
    if (_selectedRating === 0) { showToast('Выберите оценку'); return; }
    const text = document.getElementById('review-text')?.value || '';
    MakonAPI.submitReview({
      movieId: movieId || undefined,
      seriesId: seriesId || undefined,
      rating: _selectedRating,
      text,
    });
    _selectedRating = 0;
  };

  // ═══ MULTI-PROFILES ═══

  MakonAPI.loadProfiles = function() {
    const uid = UID();
    if (!uid) return Promise.resolve([]);
    return api(`/api/users/${uid}/profiles`);
  };

  MakonAPI.createProfile = function(name, isKids) {
    const uid = UID();
    if (!uid) return;
    return apiPost(`/api/users/${uid}/profiles`, { name, isKids: !!isKids })
      .then(p => {
        if (p.error) { showToast(p.error); return; }
        showToast('Профиль создан');
        return p;
      });
  };

  MakonAPI.deleteProfile = function(profileId) {
    const uid = UID();
    if (!uid) return;
    return apiDelete(`/api/users/${uid}/profiles/${profileId}`)
      .then(() => showToast('Профиль удалён'));
  };

  // Render profiles page from API
  MakonAPI.renderProfiles = function() {
    MakonAPI.loadProfiles().then(profiles => {
      const grid = document.querySelector('#page-profiles .profiles-grid, .profile-list');
      if (!grid || !profiles) return;

      grid.innerHTML = profiles.map(p => `
        <div class="profile-card" onclick="MakonAPI.selectProfile('${p.id}')">
          <div class="profile-av">${p.avatarUrl ? `<img src="${p.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : `<span>${(p.name || '?')[0]}</span>`}</div>
          <div class="profile-name">${p.name}</div>
          ${p.isKids ? '<div class="profile-badge">Детский</div>' : ''}
        </div>
      `).join('') + `
        <div class="profile-card profile-add" onclick="MakonAPI.promptNewProfile()">
          <div class="profile-av"><span>+</span></div>
          <div class="profile-name">Добавить</div>
        </div>
      `;
    });
  };

  MakonAPI.selectProfile = function(profileId) {
    localStorage.setItem('makontv_profile_id', profileId);
    go('home');
    showToast('Профиль выбран');
  };

  MakonAPI.promptNewProfile = function() {
    const name = prompt('Имя профиля:');
    if (!name) return;
    const isKids = confirm('Это детский профиль?');
    MakonAPI.createProfile(name, isKids).then(() => MakonAPI.renderProfiles());
  };

  // ═══ REFERRAL ═══

  MakonAPI.loadReferral = function() {
    const uid = UID();
    if (!uid) return;

    api(`/api/users/${uid}/referral`).then(data => {
      // Update referral page
      const codeEl = document.querySelector('.ref-code');
      if (codeEl) codeEl.textContent = data.referralCode || 'Не назначен';

      const linkEl = document.querySelector('.ref-link');
      if (linkEl) linkEl.textContent = data.referralLink || '';

      const countEl = document.querySelector('.ref-count');
      if (countEl) countEl.textContent = data.invitedCount || '0';

      const daysEl = document.querySelector('.ref-days');
      if (daysEl) daysEl.textContent = `+${data.rewardDaysTotal || 0} дней`;

      // Copy button
      const copyBtn = document.querySelector('.ref-copy');
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(data.referralLink || '').then(() => showToast('Ссылка скопирована!'));
        };
      }
    }).catch(() => {});
  };

  MakonAPI.applyReferralCode = function(code) {
    const uid = UID();
    if (!uid) { openAuth(); return; }

    apiPost(`/api/users/${uid}/referral/apply`, { code })
      .then(r => {
        if (r.error) { showToast(r.error); return; }
        showToast(r.message || 'Код применён!');
      });
  };

  // ═══ DOWNLOADS ═══

  MakonAPI.loadDownloads = function() {
    const uid = UID();
    if (!uid) return;

    api(`/api/users/${uid}/downloads`).then(items => {
      const grid = document.querySelector('#page-downloads .dl-grid, .downloads-list');
      if (!grid) return;

      if (!items || items.length === 0) {
        grid.innerHTML = '<div class="empty"><div class="empty-title">Нет загрузок</div><div class="empty-desc">Скачанные фильмы и серии появятся здесь</div></div>';
        return;
      }

      grid.innerHTML = items.map(d => {
        const size = d.fileSize ? `${(d.fileSize / 1024 / 1024).toFixed(0)} МБ` : '';
        const title = d.type === 'episode'
          ? `${d.seriesTitle} · С${d.seasonNumber}:${d.title}`
          : d.title;
        return `<div class="dl-item">
          <div class="dl-info"><div class="dl-title">${title}</div><div class="dl-size">${size}</div></div>
          <button class="dl-del" onclick="MakonAPI.removeDownload('${d.downloadId}')">✕</button>
        </div>`;
      }).join('');
    });
  };

  MakonAPI.trackDownload = function(movieId, episodeId, fileSize) {
    const uid = UID();
    if (!uid) return;
    apiPost(`/api/users/${uid}/downloads`, { movieId, episodeId, fileSize });
  };

  MakonAPI.removeDownload = function(downloadId) {
    const uid = UID();
    if (!uid) return;
    apiDelete(`/api/users/${uid}/downloads/${downloadId}`)
      .then(() => { showToast('Загрузка удалена'); MakonAPI.loadDownloads(); });
  };

  // ═══ WATCH PROGRESS AUTO-SAVE ═══

  let _progressInterval = null;

  MakonAPI.startProgressTracking = function(movieId, episodeId) {
    if (_progressInterval) clearInterval(_progressInterval);

    _progressInterval = setInterval(() => {
      const uid = UID();
      if (!uid) return;

      const video = document.querySelector('video');
      if (!video || video.paused) return;

      apiPost(`/api/users/${uid}/history`, {
        movieId: movieId || undefined,
        episodeId: episodeId || undefined,
        progressSec: Math.floor(video.currentTime),
        durationSec: Math.floor(video.duration || 0),
      }).catch(() => {}); // silent fail
    }, 30000); // every 30 seconds
  };

  MakonAPI.stopProgressTracking = function() {
    if (_progressInterval) {
      clearInterval(_progressInterval);
      _progressInterval = null;
    }
  };

  // ═══ HOOK INTO go() for page-specific loads ═══

  const _origGo = window.go;
  window.go = function(page) {
    _origGo(page);

    // Page-specific data loads
    if (page === 'referral') MakonAPI.loadReferral();
    if (page === 'downloads') MakonAPI.loadDownloads();
    if (page === 'profiles') MakonAPI.renderProfiles();
    if (page === 'library') {
      MakonAPI.loadFavorites().then(favs => {
        if (favs && favs.length > 0) {
          const grid = document.getElementById('lib-grid');
          if (grid) {
            grid.innerHTML = favs.map((f, i) =>
              `<div class="pc" onclick="MakonAPI.goDetail('${f.type === 'series' ? 'series-detail' : 'detail'}','${f.slug || ''}')">
                <div class="pc-img"><div class="pc-poster ${PG(i)}"></div><div class="pc-ov"><div class="play-c">${IC.play}</div></div></div>
                <div class="pc-info"><div class="pc-title">${f.title}</div></div>
              </div>`
            ).join('');
          }
        }
      });
    }
  };

  console.log('✅ MakonTV User Actions Bridge loaded');

})();
