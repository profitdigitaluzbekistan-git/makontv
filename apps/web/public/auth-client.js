/**
 * MakonTV Auth Client
 *
 * Manages JWT tokens, auto-refresh, and user state.
 * Loaded after api-client.js + user-actions.js.
 *
 * Replaces localStorage userId hack with real auth.
 */
(function() {
  'use strict';

  const API = window.MAKONTV_API_URL || '';
  const TOKEN_KEY = 'makontv_access_token';
  const REFRESH_KEY = 'makontv_refresh_token';
  const USER_KEY = 'makontv_user';

  // ═══ TOKEN STORAGE ═══

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getRefreshToken() { return localStorage.getItem(REFRESH_KEY); }

  function setTokens(access, refresh) {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  }

  function clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('makontv_user_id');
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  }

  function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem('makontv_user_id', user.id);
    if (user.language) localStorage.setItem('makontv_lang', user.language);
  }

  // ═══ AUTH API ═══

  // Refresh lock to prevent concurrent refresh attempts
  var _refreshPromise = null;

  async function authFetch(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API}${path}`, { ...opts, headers });

    // Auto-refresh on 401
    if (res.status === 401 && getRefreshToken()) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${getToken()}`;
        return fetch(`${API}${path}`, { ...opts, headers });
      }
    }

    return res;
  }

  async function refreshTokens() {
    // Use lock to prevent concurrent refresh calls
    if (_refreshPromise) return _refreshPromise;

    _refreshPromise = _doRefresh();
    try { return await _refreshPromise; }
    finally { _refreshPromise = null; }
  }

  async function _doRefresh() {
    const rt = getRefreshToken();
    if (!rt) return false;

    try {
      const res = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (res.ok) {
        const data = await res.json();
        setTokens(data.accessToken, data.refreshToken);
        return true;
      }
    } catch {}

    // Refresh failed — don't clear tokens aggressively,
    // let the caller decide (user might just have a network issue)
    return false;
  }

  // ═══ REGISTER ═══

  MakonAPI.register = async function(email, password, name, referralCode) {
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, referralCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка регистрации');
        return null;
      }

      // Clear old session before setting new
      clearTokens();
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      MakonAPI.setUser(data.user.id);
      onAuthChange(true);
      showToast('Добро пожаловать в MakonTV!');
      return data.user;
    } catch (err) {
      showToast('Ошибка сети');
      return null;
    }
  };

  // ═══ LOGIN ═══

  MakonAPI.login = async function(email, password) {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка входа');
        return null;
      }

      // Clear old session before setting new
      clearTokens();
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      MakonAPI.setUser(data.user.id);
      onAuthChange(true);
      showToast('С возвращением!');
      return data.user;
    } catch (err) {
      showToast('Ошибка сети');
      return null;
    }
  };

  // ═══ GOOGLE LOGIN ═══

  MakonAPI.loginWithGoogle = async function(googleToken) {
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: googleToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка входа через Google');
        return null;
      }

      // Clear old session before setting new
      clearTokens();
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      MakonAPI.setUser(data.user.id);
      onAuthChange(true);
      showToast('Добро пожаловать!');
      return data.user;
    } catch (err) {
      showToast('Ошибка сети');
      return null;
    }
  };

  window.doGoogleLogin = function() {
    const clientId = window.GOOGLE_CLIENT_ID;
    if (!clientId) {
      showToast('Google Sign-In не настроен');
      return;
    }

    if (typeof google === 'undefined' || !google.accounts) {
      showToast('Google Sign-In загружается, попробуйте ещё раз');
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (response.credential) {
          const user = await MakonAPI.loginWithGoogle(response.credential);
          if (user) {
            closeAuth();
          }
        }
      },
    });

    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap unavailable — render hidden Google button and auto-click it
        let container = document.getElementById('g_id_signin_tmp');
        if (!container) {
          container = document.createElement('div');
          container.id = 'g_id_signin_tmp';
          container.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
          document.body.appendChild(container);
        }
        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
        });
        // Click the rendered iframe/button
        setTimeout(() => {
          const btn = container.querySelector('[role="button"], iframe');
          if (btn) btn.click();
        }, 100);
      }
    });
  };

  // ═══ LOGOUT ═══

  MakonAPI.logout = function() {
    clearTokens();
    MakonAPI.clearUser();
    onAuthChange(false);
    go('home');
    showToast('Вы вышли из аккаунта');
  };

  // ═══ GET CURRENT USER ═══

  MakonAPI.getMe = async function() {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await authFetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        setUser(user);
        return user;
      }
    } catch {}
    return getUser();
  };

  // ═══ CHANGE PASSWORD ═══

  MakonAPI.changePassword = async function(currentPassword, newPassword) {
    const res = await authFetch('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (res.ok) { showToast('Пароль изменён'); return true; }
    showToast(data.error || 'Ошибка'); return false;
  };

  // ═══ SUBSCRIPTION ═══

  MakonAPI.checkout = async function(planSlug, period) {
    const res = await authFetch('/api/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ planSlug, period: period || 'monthly' }),
    });
    const data = await res.json();
    if (data.status === 'activated') {
      showToast(data.message);
      onAuthChange(true); // refresh UI state
      return data;
    }
    if (data.paymentUrls) {
      // Show payment options
      return data;
    }
    if (data.error) showToast(data.error);
    return data;
  };

  MakonAPI.cancelSubscription = async function() {
    const res = await authFetch('/api/subscriptions/cancel', { method: 'POST' });
    const data = await res.json();
    showToast(data.message || 'Подписка отменена');
    onAuthChange(true);
    return data;
  };

  MakonAPI.getSubscriptionStatus = async function() {
    const res = await authFetch('/api/subscriptions/status');
    return res.ok ? res.json() : null;
  };

  // ═══ UI STATE SYNC ═══

  function onAuthChange(loggedIn) {
    // Update global state
    window.isAuth = loggedIn;
    window.isSub = false;

    // Toggle profile guest/auth views
    var profGuest = document.getElementById('profGuest');
    var profAuth = document.getElementById('profAuth');
    if (profGuest) profGuest.style.display = loggedIn ? 'none' : '';
    if (profAuth) profAuth.style.display = loggedIn ? '' : 'none';

    if (loggedIn) {
      const user = getUser();
      if (user) {
        window.isSub = user.subscriptionStatus === 'active';
      }
      // Update nav + profile UI with cached user data first
      updateUIForUser(user);
      // Update plans buttons
      if (typeof updatePlans === 'function') updatePlans();
      // Then fetch fresh data from API
      loadProfileData();
      MakonAPI.loadNotifications();
      MakonAPI.loadFavorites();
    } else {
      // Reset to guest
      setS('guest');
      // Reset nav
      var authBtn = document.getElementById('navAuth');
      var navAv = document.getElementById('navAv');
      var navPrem = document.getElementById('navPrem');
      if (authBtn) authBtn.style.display = '';
      if (navAv) navAv.style.display = 'none';
      if (navPrem) navPrem.style.display = 'none';
    }
  }

  function getUserDisplayName(user) {
    if (!user) return '';
    if (user.name) {
      if (typeof user.name === 'object') return user.name.ru || user.name.uz || user.email || '';
      return user.name;
    }
    return user.email || '';
  }

  function getUserInitial(user) {
    var name = getUserDisplayName(user);
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  function updateUIForUser(user) {
    if (!user) return;
    var isPremium = user.subscriptionStatus === 'active';

    // Nav: hide "Войти", show avatar
    var authBtn = document.getElementById('navAuth');
    var navAv = document.getElementById('navAv');
    var navPrem = document.getElementById('navPrem');
    if (authBtn) authBtn.style.display = 'none';
    if (navAv) { navAv.style.display = ''; navAv.textContent = getUserInitial(user); }
    if (navPrem) navPrem.style.display = isPremium ? '' : 'none';

    // Profile card
    var profAvatar = document.getElementById('profAvatar');
    var profName = document.getElementById('profName');
    var profEmail = document.getElementById('profEmail');
    var profPlan = document.getElementById('profPlan');
    var profSubText = document.getElementById('profSubText');
    var profSubVal = document.getElementById('profSubVal');

    if (profAvatar) {
      if (user.avatarUrl) {
        profAvatar.innerHTML = '<img src="' + user.avatarUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
      } else {
        profAvatar.textContent = getUserInitial(user);
      }
    }
    if (profName) profName.textContent = getUserDisplayName(user);
    if (profEmail) profEmail.textContent = user.email || '';
    if (profPlan) {
      profPlan.textContent = isPremium ? 'Premium' : 'Бесплатный';
      profPlan.className = 'prof-plan ' + (isPremium ? 'premium' : 'free');
    }
    if (profSubText) profSubText.textContent = isPremium ? 'Premium — активна' : 'Бесплатный тариф';
    if (profSubVal) profSubVal.textContent = isPremium ? 'Активна' : 'Бесплатный';

    // Personal data form
    var displayName = getUserDisplayName(user);
    var nameParts = displayName.split(' ');
    var pName = document.getElementById('pName');
    var pSurname = document.getElementById('pSurname');
    var pEmail = document.getElementById('pEmail');
    var pPhone = document.getElementById('pPhone');
    var pBirth = document.getElementById('pBirth');
    var personalAvatar = document.getElementById('personalAvatar');
    if (pName) pName.value = nameParts[0] || '';
    if (pSurname) pSurname.value = nameParts.slice(1).join(' ') || '';
    if (pEmail) pEmail.value = user.email || '';
    if (pPhone) pPhone.value = user.phone || '';
    if (pBirth && user.birthDate) {
      pBirth.value = user.birthDate;
      var pBirthDisplay = document.getElementById('pBirthDisplay');
      if (pBirthDisplay) { var dp = user.birthDate.split('-'); if (dp.length === 3) pBirthDisplay.value = dp[2] + '.' + dp[1] + '.' + dp[0]; }
    }
    if (personalAvatar) {
      if (user.avatarUrl) {
        personalAvatar.innerHTML = '<img src="' + user.avatarUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
      } else {
        personalAvatar.textContent = getUserInitial(user);
      }
    }

    // Gender chips
    if (user.gender) {
      var genderMap = { 'male': 'Мужской', 'female': 'Женский' };
      var genderText = genderMap[user.gender] || 'Не указан';
      var genderChips = document.querySelectorAll('#page-personal .chip');
      genderChips.forEach(function(c) {
        c.classList.toggle('active', c.textContent.trim() === genderText);
      });
    }

    // Update isSub/isAuth flags without calling setS (avoid loop)
    window.isAuth = true;
    window.isSub = isPremium;
  }

  function loadProfileData() {
    // Fetch fresh user data from /api/auth/me
    authFetch('/api/auth/me').then(function(r) {
      if (!r.ok) return null;
      return r.json();
    }).then(function(user) {
      if (!user || user.error) return;
      // Update stored user
      setUser(user);
      window.isSub = user.subscriptionStatus === 'active';
      // Update all UI elements
      updateUIForUser(user);

      // Profiles count
      var profProfilesCount = document.getElementById('profProfilesCount');
      if (profProfilesCount) {
        var count = (user.profiles && user.profiles.length) || 0;
        profProfilesCount.textContent = count + ' ' + (count === 1 ? 'профиль' : count < 5 ? 'профиля' : 'профилей');
      }

      // Downloads count
      var userId = user.id;
      if (userId && window.MakonAPI && MakonAPI.loadDownloads) {
        MakonAPI.loadDownloads().then(function(downloads) {
          var el = document.getElementById('profDownloads');
          if (!el) return;
          var c = (downloads && downloads.length) || 0;
          el.textContent = c ? c + ' загруженных файл' + (c === 1 ? '' : c < 5 ? 'а' : 'ов') : 'Нет загрузок';
        }).catch(function() {});
      }

      // Birth date
      var pBirth = document.getElementById('pBirth');
      if (pBirth && user.birthDate) {
        pBirth.value = user.birthDate;
        var pBirthDisplay = document.getElementById('pBirthDisplay');
        if (pBirthDisplay) { var dp = user.birthDate.split('-'); if (dp.length === 3) pBirthDisplay.value = dp[2] + '.' + dp[1] + '.' + dp[0]; }
      }

    }).catch(function(err) {
      console.warn('Failed to load profile:', err.message);
    });
  }

  // ═══ SAVE PROFILE ═══
  MakonAPI.saveProfile = async function() {
    var pName = document.getElementById('pName');
    var pSurname = document.getElementById('pSurname');
    var pPhone = document.getElementById('pPhone');
    var pBirth = document.getElementById('pBirth');
    var firstName = pName ? pName.value.trim() : '';
    var lastName = pSurname ? pSurname.value.trim() : '';
    var fullName = [firstName, lastName].filter(Boolean).join(' ');

    if (!fullName) { showToast('Введите имя', 'error'); return; }

    // Get selected gender
    var genderChip = document.querySelector('#page-personal .chip.active');
    var genderMap = { 'Мужской': 'male', 'Женский': 'female', 'Не указан': null };
    var gender = genderChip ? (genderMap[genderChip.textContent.trim()] || null) : undefined;

    try {
      var res = await authFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: fullName,
          phone: pPhone ? pPhone.value.trim() || null : undefined,
          birthDate: pBirth ? pBirth.value || null : undefined,
          gender: gender,
        }),
      });
      var data = await res.json();
      if (data.ok) {
        // Update local user
        var user = getUser();
        if (user && data.user) {
          Object.assign(user, data.user);
          setUser(user);
          updateUIForUser(user);
        }
        showToast('Данные сохранены');
      } else {
        showToast(data.error || 'Ошибка сохранения', 'error');
      }
    } catch (e) {
      showToast('Ошибка сети', 'error');
    }
  };

  // ═══ UPLOAD AVATAR ═══
  MakonAPI.uploadAvatar = async function(fileInput) {
    var file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Файл слишком большой (макс. 5 МБ)', 'error'); return; }

    showToast('Загрузка фото...');
    try {
      var formData = new FormData();
      formData.append('file', file);

      var token = getToken();
      var res = await fetch(API + '/api/auth/avatar', {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        body: formData,
      });
      var data = await res.json();
      if (data.ok && data.avatarUrl) {
        var user = getUser();
        if (user) { user.avatarUrl = data.avatarUrl; setUser(user); updateUIForUser(user); }
        showToast('Фото обновлено');
      } else {
        showToast(data.error || 'Ошибка загрузки', 'error');
      }
    } catch (e) {
      showToast('Ошибка загрузки файла', 'error');
    }
    fileInput.value = '';
  };

  // Expose for external use
  MakonAPI.loadProfileData = loadProfileData;

  // ═══ HOOK INTO AUTH MODAL ═══

  // Override doLogin to use real auth
  window.doLogin = async function() {
    // Determine if register or login based on active tab
    const isRegister = document.querySelector('.auth-tab.active')?.textContent?.includes('Регистр');

    let email, password, user;

    if (isRegister) {
      email = document.getElementById('auth-email-reg')?.value;
      password = document.getElementById('auth-pass-reg')?.value;
      const name = document.getElementById('auth-name')?.value || '';
      if (!email || !password) { showToast('Введите email и пароль'); return; }
      user = await MakonAPI.register(email, password, name);
    } else {
      email = document.getElementById('auth-email')?.value;
      password = document.getElementById('auth-pass')?.value;
      if (!email || !password) { showToast('Введите email и пароль'); return; }
      user = await MakonAPI.login(email, password);
    }

    if (user) {
      closeAuth();
    }
  };

  // ═══ AUTO-INIT ═══

  // Check if user is already logged in
  const existingToken = getToken();
  if (existingToken) {
    const user = getUser();
    if (user) {
      MakonAPI.setUser(user.id);
      onAuthChange(true);

      // Verify token in background — but don't aggressively logout on failure
      // Only logout if the server explicitly returns 401 (not on network errors)
      MakonAPI.getMe().then(freshUser => {
        if (freshUser) {
          // Update UI with fresh data
          updateUIForUser(freshUser);
        }
        // Don't logout on failure — user might just have a temporary network issue
      });
    }
  }

  // Auto-refresh token every 14 minutes
  setInterval(() => {
    if (getToken()) refreshTokens();
  }, 14 * 60 * 1000);

  // Make authFetch available globally
  MakonAPI.authFetch = authFetch;

  console.log('✅ MakonTV Auth Client loaded');

})();
