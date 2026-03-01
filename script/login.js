/* ===========================
   CINEMA AUTH — login.js
   =========================== */

(function () {
  'use strict';

  // ── Element refs ──
  const wrapper     = document.getElementById('panelsWrapper');
  const toRegister  = document.getElementById('toRegister');
  const toLogin     = document.getElementById('toLogin');
  const decoSwitch  = document.getElementById('decoSwitch');
  const decoMsg     = document.getElementById('decoMsg');
  const loginForm   = document.getElementById('loginForm');
  const registerForm= document.getElementById('registerForm');

  // Password toggles
  const toggleLoginPw = document.getElementById('toggleLoginPw');
  const toggleRegPw   = document.getElementById('toggleRegPw');
  const loginPassword = document.getElementById('loginPassword');
  const regPassword   = document.getElementById('regPassword');

  // Strength bar
  const pwBar = document.getElementById('pwBar');

  // ── State ──
  let isRegister = false;

  // ── Switch panels ──
  function showRegister() {
    if (isRegister) return;
    isRegister = true;
    wrapper.classList.add('show-register');
    // Update deco strip
    decoMsg.innerHTML = `
      <p>Come Back!</p>
      <small>Sign in to continue enjoying Eclipse Cinema</small>
      <button type="button" class="btn-outline" id="decoSwitch">Sign In</button>
    `;
    document.getElementById('decoSwitch').addEventListener('click', showLogin);
    document.title = 'Eclipse Cinema — Create Account';
  }

  function showLogin() {
    if (!isRegister) return;
    isRegister = false;
    wrapper.classList.remove('show-register');
    decoMsg.innerHTML = `
      <p>New here?</p>
      <small>Join millions of film lovers on Eclipse Cinema</small>
      <button type="button" class="btn-outline" id="decoSwitch">Get Started</button>
    `;
    document.getElementById('decoSwitch').addEventListener('click', showRegister);
    document.title = 'Eclipse Cinema — Sign In';
  }

  toRegister.addEventListener('click', showRegister);
  toLogin.addEventListener('click', showLogin);
  decoSwitch.addEventListener('click', showRegister);

  // ── Password visibility toggle ──
  function makeToggle(btn, input) {
    btn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.innerHTML = isHidden
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    });
  }
  makeToggle(toggleLoginPw, loginPassword);
  makeToggle(toggleRegPw, regPassword);

  // ── Password strength ──
  regPassword.addEventListener('input', () => {
    const val = regPassword.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    pwBar.className = 'pw-bar';
    if (val.length > 0) {
      pwBar.classList.add('strength-' + score);
    }
  });

  // ── Validation helpers ──
  function setError(field, show) {
    field.closest('.form-field').classList.toggle('has-error', show);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // ── Login form ──
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const email = document.getElementById('loginEmail');
    const pass  = document.getElementById('loginPassword');

    if (!isValidEmail(email.value)) { setError(email, true); valid = false; }
    else setError(email, false);

    if (pass.value.trim() === '') { setError(pass, true); valid = false; }
    else setError(pass, false);

    if (!valid) return;

    // Simulate submit
    const btn = loginForm.querySelector('.btn-primary');
    btn.classList.add('loading');
    btn.querySelector('span').textContent = 'Signing in';

    setTimeout(() => {
      btn.classList.remove('loading');
      btn.querySelector('span').textContent = 'Sign In';
      // TODO: redirect or handle response
      alert('Logged in successfully! 🎬');
    }, 1800);
  });

  // Clear errors on input
  loginForm.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => setError(input, false));
  });

  // ── Register form ──
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const firstName = document.getElementById('regFirstName');
    const lastName  = document.getElementById('regLastName');
    const email     = document.getElementById('regEmail');
    const pass      = document.getElementById('regPassword');

    if (firstName.value.trim() === '') { setError(firstName, true); valid = false; }
    else setError(firstName, false);

    if (lastName.value.trim() === '') { setError(lastName, true); valid = false; }
    else setError(lastName, false);

    if (!isValidEmail(email.value)) { setError(email, true); valid = false; }
    else setError(email, false);

    if (pass.value.length < 8) { setError(pass, true); valid = false; }
    else setError(pass, false);

    if (!valid) return;

    // Simulate submit
    const btn = registerForm.querySelector('.btn-primary');
    btn.classList.add('loading');
    btn.querySelector('span').textContent = 'Creating account';

    setTimeout(() => {
      btn.classList.remove('loading');
      btn.querySelector('span').textContent = 'Create Account';
      alert('Account created! Welcome to Eclipse Cinema 🎬');
    }, 1800);
  });

  // Clear errors on input
  registerForm.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => setError(input, false));
  });

  // ── Entrance animation ──
  document.querySelector('.auth-container').style.opacity = '0';
  document.querySelector('.auth-container').style.transform = 'translateY(16px)';
  requestAnimationFrame(() => {
    document.querySelector('.auth-container').style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    document.querySelector('.auth-container').style.opacity = '1';
    document.querySelector('.auth-container').style.transform = 'translateY(0)';
  });

})();