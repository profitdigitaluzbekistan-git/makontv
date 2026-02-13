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

    // Refresh failed — logout
    clearTokens();
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

    if (loggedIn) {
      const user = getUser();
      if (user) {
        window.isSub = user.subscriptionStatus === 'active';
      }
      MakonAPI.loadNotifications();
      MakonAPI.loadFavorites();
    }

    // Update nav UI
    updateNavForAuth(loggedIn);
  }

  function updateNavForAuth(loggedIn) {
    // Profile nav item
    const profileLink = document.querySelector('.nav-link[data-page="profile"]');
    const authBtn = document.querySelector('.auth-trigger');

    if (loggedIn) {
      const user = getUser();
      if (profileLink) profileLink.style.display = '';
      if (authBtn) authBtn.style.display = 'none';

      // Update profile page data
      const nameEl = document.querySelector('#page-profile .profile-name');
      if (nameEl && user) nameEl.textContent = user.name?.ru || user.email;

      const emailEl = document.querySelector('#page-profile .profile-email');
      if (emailEl && user) emailEl.textContent = user.email;

      const subEl = document.querySelector('#page-profile .profile-sub');
      if (subEl && user) subEl.textContent = user.subscriptionStatus === 'active' ? 'Premium' : 'Бесплатный';
    } else {
      if (authBtn) authBtn.style.display = '';
    }
  }

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

      // Verify token in background
      MakonAPI.getMe().then(freshUser => {
        if (!freshUser) {
          clearTokens();
          onAuthChange(false);
        }
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
