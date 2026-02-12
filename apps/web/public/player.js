/**
 * MakonTV Video Player
 *
 * Features:
 *   - HLS.js для adaptive streaming
 *   - Quality switcher (Auto/4K/1080p/720p/480p)
 *   - Keyboard shortcuts (Space, F, M, ←→)
 *   - Picture-in-Picture
 *   - Skip intro / Skip outro
 *   - Subtitle support
 *   - Watch progress auto-save
 *   - Double-tap to seek (mobile)
 */
(function() {
  'use strict';

  let hls = null;
  let playerEl = null;
  let videoEl = null;
  let currentQuality = -1; // -1 = auto
  let qualities = [];
  let isFullscreen = false;
  let controlsTimeout = null;
  let _currentContentId = null;
  let _currentContentType = null; // 'movie' | 'episode'

  // ═══ INIT PLAYER ═══

  MakonAPI.initPlayer = function(containerId, videoUrl, opts = {}) {
    playerEl = document.getElementById(containerId);
    if (!playerEl) return;

    _currentContentId = opts.movieId || opts.episodeId || null;
    _currentContentType = opts.episodeId ? 'episode' : 'movie';

    // Build player HTML
    playerEl.innerHTML = `
      <div class="mkn-player" id="mkn-player">
        <video id="mkn-video" playsinline></video>
        
        <!-- Loading spinner -->
        <div class="mkn-loading" id="mkn-loading">
          <div class="mkn-spinner"></div>
        </div>

        <!-- Controls overlay -->
        <div class="mkn-controls" id="mkn-controls">
          <!-- Top bar -->
          <div class="mkn-top">
            <button class="mkn-btn" onclick="MakonAPI.closePlayer()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div class="mkn-title" id="mkn-title">${opts.title || ''}</div>
            <div class="mkn-top-r">
              <button class="mkn-btn" id="mkn-quality-btn" onclick="MakonAPI.toggleQualityMenu()">
                <span id="mkn-quality-label">Auto</span>
              </button>
            </div>
          </div>

          <!-- Center play -->
          <div class="mkn-center">
            <button class="mkn-btn mkn-seek-btn" onclick="MakonAPI.seek(-10)">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
            </button>
            <button class="mkn-btn mkn-play-btn" id="mkn-play" onclick="MakonAPI.togglePlay()">
              <svg viewBox="0 0 24 24" fill="currentColor" id="mkn-play-icon"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
            <button class="mkn-btn mkn-seek-btn" onclick="MakonAPI.seek(10)">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 8c2.65 0 5.05.99 6.9 2.6L22 7v9h-9l3.62-3.62C15.23 11.22 13.46 10.5 11.5 10.5c-3.54 0-6.55 2.31-7.6 5.5L1.53 15.22C2.92 11.03 6.85 8 11.5 8z"/></svg>
            </button>
          </div>

          <!-- Bottom bar -->
          <div class="mkn-bottom">
            <!-- Progress bar -->
            <div class="mkn-progress-wrap" id="mkn-progress-wrap">
              <div class="mkn-progress-bg">
                <div class="mkn-progress-buf" id="mkn-buf"></div>
                <div class="mkn-progress-fill" id="mkn-fill"></div>
              </div>
              <input type="range" class="mkn-progress-input" id="mkn-range" min="0" max="100" value="0" step="0.1"
                oninput="MakonAPI.scrub(this.value)">
            </div>
            
            <div class="mkn-bottom-row">
              <div class="mkn-time">
                <span id="mkn-current">0:00</span> / <span id="mkn-duration">0:00</span>
              </div>
              <div class="mkn-bottom-btns">
                <button class="mkn-btn" onclick="MakonAPI.toggleMute()" id="mkn-mute-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.14v7.72c1.48-.73 2.5-2.25 2.5-3.86zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </button>
                <button class="mkn-btn" onclick="MakonAPI.togglePiP()">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg>
                </button>
                <button class="mkn-btn" onclick="MakonAPI.toggleFullscreen()">
                  <svg viewBox="0 0 24 24" fill="currentColor" id="mkn-fs-icon"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Quality menu -->
        <div class="mkn-quality-menu" id="mkn-quality-menu" style="display:none">
          <div class="mkn-qm-title">Качество</div>
          <div id="mkn-quality-list"></div>
        </div>

        <!-- Skip intro button -->
        <button class="mkn-skip" id="mkn-skip" style="display:none" onclick="MakonAPI.seek(${opts.introEnd || 30} - (videoEl?.currentTime || 0))">
          Пропустить заставку →
        </button>
      </div>
    `;

    videoEl = document.getElementById('mkn-video');

    // Determine video type and load
    if (videoUrl.includes('.m3u8') || opts.type === 'hls') {
      loadHLS(videoUrl);
    } else if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      loadYouTube(videoUrl);
    } else {
      // Direct MP4
      videoEl.src = videoUrl;
      qualities = [{ label: opts.quality || 'HD', height: 0, index: -1 }];
    }

    // Event listeners
    setupEvents();

    // Auto-save progress
    if (_currentContentId) {
      MakonAPI.startProgressTracking(
        _currentContentType === 'movie' ? _currentContentId : undefined,
        _currentContentType === 'episode' ? _currentContentId : undefined
      );
    }
  };

  // ═══ HLS.js LOADING ═══

  function loadHLS(url) {
    if (typeof Hls === 'undefined') {
      // Load HLS.js dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.onload = () => initHLS(url);
      document.head.appendChild(script);
    } else {
      initHLS(url);
    }
  }

  function initHLS(url) {
    if (!Hls.isSupported()) {
      // Fallback for Safari (native HLS)
      videoEl.src = url;
      return;
    }

    hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
    });

    hls.loadSource(url);
    hls.attachMedia(videoEl);

    hls.on(Hls.Events.MANIFEST_PARSED, (e, data) => {
      qualities = data.levels.map((level, i) => ({
        label: level.height >= 2160 ? '4K' :
               level.height >= 1080 ? '1080p' :
               level.height >= 720 ? '720p' :
               level.height >= 480 ? '480p' : `${level.height}p`,
        height: level.height,
        bitrate: level.bitrate,
        index: i,
      }));
      qualities.unshift({ label: 'Авто', height: 0, index: -1 });
      buildQualityMenu();
    });

    hls.on(Hls.Events.ERROR, (e, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            break;
        }
      }
    });
  }

  function loadYouTube(url) {
    // Extract video ID
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (!match) return;

    // Replace video with iframe
    const container = document.getElementById('mkn-player');
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0"
      style="width:100%;height:100%;border:none" allowfullscreen allow="autoplay"></iframe>`;
  }

  // ═══ EVENTS ═══

  function setupEvents() {
    if (!videoEl) return;

    videoEl.addEventListener('play', () => updatePlayIcon(true));
    videoEl.addEventListener('pause', () => updatePlayIcon(false));
    videoEl.addEventListener('timeupdate', updateProgress);
    videoEl.addEventListener('loadedmetadata', () => {
      document.getElementById('mkn-duration').textContent = formatTime(videoEl.duration);
    });
    videoEl.addEventListener('waiting', () => {
      document.getElementById('mkn-loading').style.display = '';
    });
    videoEl.addEventListener('playing', () => {
      document.getElementById('mkn-loading').style.display = 'none';
    });
    videoEl.addEventListener('progress', updateBuffer);

    // Auto-hide controls
    const player = document.getElementById('mkn-player');
    player.addEventListener('mousemove', showControls);
    player.addEventListener('click', (e) => {
      if (e.target === videoEl || e.target.classList.contains('mkn-controls')) {
        MakonAPI.togglePlay();
      }
      showControls();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Skip intro detection
    videoEl.addEventListener('timeupdate', () => {
      const skip = document.getElementById('mkn-skip');
      if (skip && videoEl.currentTime > 5 && videoEl.currentTime < 35) {
        skip.style.display = '';
      } else if (skip) {
        skip.style.display = 'none';
      }
    });
  }

  function handleKeyboard(e) {
    if (!videoEl || document.activeElement?.tagName === 'INPUT') return;

    switch (e.key) {
      case ' ':
      case 'k': e.preventDefault(); MakonAPI.togglePlay(); break;
      case 'f': MakonAPI.toggleFullscreen(); break;
      case 'm': MakonAPI.toggleMute(); break;
      case 'ArrowLeft': MakonAPI.seek(-10); break;
      case 'ArrowRight': MakonAPI.seek(10); break;
      case 'ArrowUp': e.preventDefault(); videoEl.volume = Math.min(1, videoEl.volume + 0.1); break;
      case 'ArrowDown': e.preventDefault(); videoEl.volume = Math.max(0, videoEl.volume - 0.1); break;
      case 'Escape': MakonAPI.closePlayer(); break;
    }
  }

  // ═══ CONTROLS ═══

  MakonAPI.togglePlay = function() {
    if (!videoEl) return;
    if (videoEl.paused) videoEl.play();
    else videoEl.pause();
  };

  MakonAPI.seek = function(seconds) {
    if (!videoEl) return;
    videoEl.currentTime = Math.max(0, Math.min(videoEl.duration, videoEl.currentTime + seconds));
  };

  MakonAPI.scrub = function(pct) {
    if (!videoEl) return;
    videoEl.currentTime = (pct / 100) * videoEl.duration;
  };

  MakonAPI.toggleMute = function() {
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
  };

  MakonAPI.toggleFullscreen = function() {
    const player = document.getElementById('mkn-player');
    if (!player) return;

    if (!document.fullscreenElement) {
      player.requestFullscreen?.() || player.webkitRequestFullscreen?.();
      isFullscreen = true;
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
      isFullscreen = false;
    }
  };

  MakonAPI.togglePiP = function() {
    if (!videoEl) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (videoEl.requestPictureInPicture) {
      videoEl.requestPictureInPicture();
    }
  };

  MakonAPI.setQuality = function(index) {
    if (!hls) return;
    currentQuality = index;
    hls.currentLevel = index; // -1 = auto
    document.getElementById('mkn-quality-label').textContent =
      index === -1 ? 'Авто' : qualities.find(q => q.index === index)?.label || 'HD';
    document.getElementById('mkn-quality-menu').style.display = 'none';

    // Update active state
    document.querySelectorAll('.mkn-qm-item').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.index) === index);
    });
  };

  MakonAPI.toggleQualityMenu = function() {
    const menu = document.getElementById('mkn-quality-menu');
    if (menu) menu.style.display = menu.style.display === 'none' ? '' : 'none';
  };

  MakonAPI.closePlayer = function() {
    MakonAPI.stopProgressTracking();
    document.removeEventListener('keydown', handleKeyboard);
    if (hls) { hls.destroy(); hls = null; }
    if (videoEl) { videoEl.pause(); videoEl.src = ''; }
    // Navigate back
    history.back();
  };

  // ═══ UI UPDATES ═══

  function updatePlayIcon(playing) {
    const icon = document.getElementById('mkn-play-icon');
    if (!icon) return;
    icon.innerHTML = playing
      ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
      : '<polygon points="5 3 19 12 5 21 5 3"/>';
  }

  function updateProgress() {
    if (!videoEl || !videoEl.duration) return;
    const pct = (videoEl.currentTime / videoEl.duration) * 100;
    document.getElementById('mkn-fill').style.width = pct + '%';
    document.getElementById('mkn-range').value = pct;
    document.getElementById('mkn-current').textContent = formatTime(videoEl.currentTime);
  }

  function updateBuffer() {
    if (!videoEl || !videoEl.buffered.length) return;
    const pct = (videoEl.buffered.end(videoEl.buffered.length - 1) / videoEl.duration) * 100;
    document.getElementById('mkn-buf').style.width = pct + '%';
  }

  function showControls() {
    const controls = document.getElementById('mkn-controls');
    if (controls) controls.classList.add('visible');
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (controls && !videoEl?.paused) controls.classList.remove('visible');
    }, 3000);
  }

  function buildQualityMenu() {
    const list = document.getElementById('mkn-quality-list');
    if (!list) return;
    list.innerHTML = qualities.map(q =>
      `<div class="mkn-qm-item ${q.index === currentQuality ? 'active' : ''}" data-index="${q.index}"
        onclick="MakonAPI.setQuality(${q.index})">
        ${q.label}${q.bitrate ? ` <span style="opacity:.5">(${Math.round(q.bitrate / 1000)}kbps)</span>` : ''}
      </div>`
    ).join('');
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  console.log('✅ MakonTV Video Player loaded');
})();
