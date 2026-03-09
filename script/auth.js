/* ===========================
   ECLIPSE CINEMA — auth-storage.js
   LocalStorage Manager
   =========================== */

(function (global) {
  'use strict';

  const KEYS = {
    USERS:    'eclipseCinema_users',
    SESSION:  'eclipseCinema_session',
    REMEMBER: 'eclipseCinema_remember',
  };

  /* ── Helpers ── */

  /** Lấy toàn bộ danh sách users từ localStorage */
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.USERS)) || [];
    } catch {
      return [];
    }
  }

  /** Lưu danh sách users vào localStorage */
  function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  /** Tạo ID ngẫu nhiên cho user */
  function generateId() {
    return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** Hash đơn giản (demo) — production nên dùng bcrypt phía server */
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }

  /* ── Auth API ── */

  /**
   * Đăng ký tài khoản mới
   * @param {{ firstName, lastName, email, password }} data
   * @returns {{ success: boolean, message: string, user?: object }}
   */
  function register({ firstName, lastName, email, password }) {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();

    // Kiểm tra email đã tồn tại
    if (users.find(u => u.email === normalizedEmail)) {
      return { success: false, message: 'Email này đã được đăng ký.' };
    }

    const newUser = {
      id:        generateId(),
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     normalizedEmail,
      password:  simpleHash(password),
      createdAt: new Date().toISOString(),
      avatar:    null,
    };

    users.push(newUser);
    saveUsers(users);

    // Tự động đăng nhập sau khi đăng ký
    const { password: _, ...safeUser } = newUser;
    _createSession(safeUser, false);

    return { success: true, message: 'Tài khoản đã được tạo!', user: safeUser };
  }

  /**
   * Đăng nhập
   * @param {{ email, password, remember }} data
   * @returns {{ success: boolean, message: string, user?: object }}
   */
  function login({ email, password, remember = false }) {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email === normalizedEmail);

    if (!user) {
      return { success: false, message: 'Email không tồn tại.' };
    }
    if (user.password !== simpleHash(password)) {
      return { success: false, message: 'Mật khẩu không đúng.' };
    }

    const { password: _, ...safeUser } = user;
    _createSession(safeUser, remember);

    return { success: true, message: 'Đăng nhập thành công!', user: safeUser };
  }

  /** Đăng xuất — xóa session */
  function logout() {
    localStorage.removeItem(KEYS.SESSION);
    localStorage.removeItem(KEYS.REMEMBER);
  }

  /**
   * Lấy session hiện tại (nếu còn hạn)
   * @returns {object|null}
   */
  function getSession() {
    try {
      const raw = localStorage.getItem(KEYS.SESSION);
      if (!raw) return null;
      const session = JSON.parse(raw);

      // Kiểm tra hết hạn
      if (session.expiresAt && Date.now() > session.expiresAt) {
        logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  /** Kiểm tra đã đăng nhập chưa */
  function isLoggedIn() {
    return getSession() !== null;
  }

  /**
   * Lấy thông tin "remember me" để điền sẵn form
   * @returns {{ email: string }|null}
   */
  function getRemembered() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.REMEMBER)) || null;
    } catch {
      return null;
    }
  }

  /**
   * Cập nhật thông tin profile cơ bản cho user hiện tại
   * @param {{ firstName?: string, lastName?: string, avatar?: string }} updates
   * @returns {{ success: boolean, message: string, user?: object }}
   */
  function updateProfile(updates) {
    const session = getSession();
    if (!session || !session.user) {
      return { success: false, message: 'Bạn chưa đăng nhập.' };
    }

    const users = getUsers();
    const idx = users.findIndex((u) => u.id === session.user.id);
    if (idx === -1) {
      return { success: false, message: 'Không tìm thấy tài khoản.' };
    }

    const user = users[idx];
    if (typeof updates.firstName === 'string' && updates.firstName.trim()) {
      user.firstName = updates.firstName.trim();
    }
    if (typeof updates.lastName === 'string' && updates.lastName.trim()) {
      user.lastName = updates.lastName.trim();
    }
    if (typeof updates.avatar === 'string') {
      user.avatar = updates.avatar.trim() || null;
    }

    users[idx] = user;
    saveUsers(users);

    const { password: _, ...safeUser } = user;
    _createSession(safeUser, false);

    return { success: true, message: 'Đã cập nhật hồ sơ.', user: safeUser };
  }

  /* ── Private ── */

  function _createSession(user, remember) {
    const SESSION_DURATION = remember
      ? 30 * 24 * 60 * 60 * 1000   // 30 ngày
      :       24 * 60 * 60 * 1000;  // 1 ngày

    const session = {
      user,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session));

    if (remember) {
      localStorage.setItem(KEYS.REMEMBER, JSON.stringify({ email: user.email }));
    } else {
      localStorage.removeItem(KEYS.REMEMBER);
    }
  }

  /* ── Export ── */
  global.CinemaAuth = { register, login, logout, getSession, isLoggedIn, getRemembered, updateProfile };

})(window);