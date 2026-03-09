/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — profile.js
   Trang hồ sơ: xem watchlist, favorites, chỉnh sửa thông tin
══════════════════════════════════════════════ */

const tmdb = tmdbFetch;
const poster = posterUrl;
const year = releaseYear;

const profileState = {
  watchlistIds: [],
  favoriteIds: [],
};

function initNavbar() {
  const navbar = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  const avatarBtn = document.getElementById("userAvatarBtn");
  const userDD = document.getElementById("userDropdown");

  window.addEventListener("scroll", () =>
    navbar.classList.toggle("scrolled", window.scrollY > 20)
  );
  navbar.classList.add("scrolled");

  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    const open = navLinks.classList.contains("open");
    hamburger.querySelectorAll("span").forEach((s, i) => {
      if (open) {
        if (i === 0) s.style.transform = "translateY(7px) rotate(45deg)";
        if (i === 1) s.style.opacity = "0";
        if (i === 2) s.style.transform = "translateY(-7px) rotate(-45deg)";
      } else {
        s.style.transform = "";
        s.style.opacity = "";
      }
    });
  });

  avatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDD.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    userDD.classList.remove("open");
    const sr = document.getElementById("searchResults");
    if (sr) sr.classList.remove("open");
  });
}

function initAuth() {
  if (!window.CinemaAuth) return;
  const session = CinemaAuth.getSession();

  if (!session || !CinemaAuth.isLoggedIn()) {
    const hero = document.getElementById("profileHero");
    const content = document.querySelector(".profile-content");
    if (hero && content) {
      hero.innerHTML = `
        <div class="profile-card" style="justify-content: space-between; gap: 18px;">
          <div style="display:flex;align-items:center;gap:16px;">
            <div class="profile-avatar-wrap">
              <img src="https://api.dicebear.com/7.x/initials/svg?seed=Guest" alt="Guest" />
            </div>
            <div class="profile-main">
              <h1 class="profile-name">Bạn chưa đăng nhập</h1>
              <p class="profile-email">Đăng nhập để xem watchlist, yêu thích và chỉnh sửa hồ sơ.</p>
            </div>
          </div>
          <div class="profile-actions">
            <a href="login.html" class="btn-primary">
              <i class="fas fa-sign-in-alt"></i> Đăng Nhập
            </a>
          </div>
        </div>`;
      content.innerHTML = "";
    }
    if (typeof showToast === "function") {
      showToast("Vui lòng đăng nhập để truy cập hồ sơ.");
    }
    return;
  }

  const { firstName, lastName, email, createdAt, avatar } = session.user;
  const fullName = `${firstName} ${lastName}`;
  const initialsSeed = encodeURIComponent(fullName || email || "User");
  const avatarUrl =
    avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${initialsSeed}`;

  // Navbar user
  const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
  document.getElementById("userAvatarBtn").innerHTML = `
    <div style="width:100%;height:100%;background:var(--red);display:grid;place-items:center;
      font-family:var(--font-cond);font-size:13px;font-weight:700;color:#fff;letter-spacing:1px">
      ${initials}
    </div>`;
  document.querySelector(".user-name").textContent = fullName;
  document.querySelector(".user-email").textContent = email;
  const logoutLink = document.querySelector(".logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      CinemaAuth.logout();
      if (typeof showToast === "function") {
        showToast("Đã đăng xuất. Hẹn gặp lại!");
      }
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    });
  }

  // Profile hero
  document.getElementById("profileAvatar").src = avatarUrl;
  document.getElementById("profileName").textContent = fullName;
  document.getElementById("profileEmail").textContent = email;
  document.getElementById("infoEmail").textContent = email;
  document.getElementById("infoName").textContent = fullName;

  let joinedText = "Không rõ";
  if (createdAt) {
    try {
      joinedText = new Date(createdAt).toLocaleDateString("vi-VN");
    } catch {
      joinedText = createdAt;
    }
  }
  document.getElementById("infoJoined").textContent = joinedText;
  const sinceEl = document.getElementById("profileSince");
  if (sinceEl) {
    sinceEl.innerHTML = `<i class="fas fa-clock"></i> Thành viên từ ${joinedText}`;
  }

  // Prefill form
  document.getElementById("firstName").value = firstName;
  document.getElementById("lastName").value = lastName;
  document.getElementById("avatarUrl").value = avatar || "";
}

function initSearch() {
  const btn = document.getElementById("searchBtn");
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  if (!btn || !input || !results) return;
  let timer;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    input.classList.toggle("open");
    if (input.classList.contains("open")) input.focus();
  });
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) {
      results.classList.remove("open");
      results.innerHTML = "";
      return;
    }
    timer = setTimeout(() => doInlineSearchProfile(q), 400);
  });
  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = input.value.trim();
      if (q) {
        window.location.href = `search.html?q=${encodeURIComponent(q)}`;
      }
    }
  });
  results.addEventListener("click", (e) => e.stopPropagation());
}

async function doInlineSearchProfile(query) {
  const results = document.getElementById("searchResults");
  if (!query) {
    results.classList.remove("open");
    return;
  }
  results.innerHTML = `<div style="padding:14px;color:var(--grey);font-size:13px;text-align:center">Đang tìm...</div>`;
  results.classList.add("open");
  const data = await tmdb("/search/movie", { query });
  if (!data?.results?.length) {
    results.innerHTML = `<div style="padding:14px;color:var(--grey);font-size:13px;text-align:center">Không tìm thấy kết quả</div>`;
    return;
  }
  results.innerHTML = data.results
    .slice(0, 7)
    .map(
      (m) => `
    <div class="search-result-item" onclick="location.href='detail.html?id=${m.id}'">
      <img src="${poster(m.poster_path, "w92")}" alt="${m.title}" />
      <div class="search-result-info">
        <p>${m.title}</p>
        <span>${year(m.release_date)} &nbsp;⭐ ${m.vote_average.toFixed(
          1
        )}</span>
      </div>
    </div>`
    )
    .join("");
}

function initTabs() {
  const tabs = document.querySelectorAll(".profile-tab");
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      const section = tab.dataset.section;
      switchSection(section);
      if (section) {
        history.replaceState(null, "", `#${section}`);
      }
    })
  );

  const hash = location.hash.replace("#", "");
  if (hash) {
    switchSection(hash);
  }
}

function switchSection(sectionId) {
  document
    .querySelectorAll(".profile-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".profile-section")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelector(`#section-${sectionId}`)
    ?.classList.add("active");
  document
    .querySelector(`.profile-tab[data-section="${sectionId}"]`)
    ?.classList.add("active");
}

async function loadCollections() {
  profileState.watchlistIds = Storage.get("cineverse_watchlist");
  profileState.favoriteIds = Storage.get("cineverse_favorites");

  document.getElementById("statWatchlist").textContent =
    profileState.watchlistIds.length;
  document.getElementById("statFavorites").textContent =
    profileState.favoriteIds.length;
  const total =
    profileState.watchlistIds.length + profileState.favoriteIds.length;
  const statsEl = document.getElementById("profileStats");
  if (statsEl) {
    statsEl.innerHTML = `<i class="fas fa-film"></i> ${total} phim trong thư viện`;
  }

  await Promise.all([loadList("watchlist"), loadList("favorites")]);
}

async function loadList(type) {
  const ids =
    type === "watchlist"
      ? profileState.watchlistIds
      : profileState.favoriteIds;
  const gridId = type === "watchlist" ? "watchlistGrid" : "favoritesGrid";
  const emptyId = type === "watchlist" ? "watchlistEmpty" : "favoritesEmpty";
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid || !empty) return;

  grid.innerHTML = "";

  if (!ids.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  grid.innerHTML = Array(ids.length)
    .fill('<div class="skeleton skeleton-card"></div>')
    .join("");

  try {
    const movies = await Promise.all(
      ids.map((id) => tmdb(`/movie/${id}`))
    );
    const valid = movies.filter(Boolean);
    grid.innerHTML = renderMovieCards(valid);
  } catch {
    grid.innerHTML =
      '<p style="color:var(--grey);font-size:13px;padding:16px 0;">Không thể tải danh sách phim.</p>';
  }
}

function renderMovieCards(movies) {
  return movies
    .filter((m) => m && m.id)
    .map(
      (m) => `
    <div class="movie-card" onclick="location.href='detail.html?id=${m.id}'">
      <div class="movie-poster">
        <img src="${poster(m.poster_path)}" alt="${m.title}" loading="lazy" />
        <div class="movie-poster-overlay">
          <div class="play-btn"><i class="fas fa-play"></i></div>
        </div>
        <div class="movie-rating-badge">⭐ ${
          m.vote_average ? m.vote_average.toFixed(1) : "N/A"
        }</div>
      </div>
      <div class="movie-info">
        <p class="movie-title">${m.title}</p>
        <div class="movie-meta">
          <span class="movie-year">${year(m.release_date)}</span>
        </div>
      </div>
    </div>`
    )
    .join("");
}

function initProfileForm() {
  const form = document.getElementById("profileForm");
  if (!form || !window.CinemaAuth) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const avatarUrl = document.getElementById("avatarUrl").value.trim();

    const result = CinemaAuth.updateProfile({
      firstName,
      lastName,
      avatar: avatarUrl,
    });

    if (typeof showToast === "function") {
      showToast(result.message);
    }

    if (result.success && result.user) {
      initAuth();
    }
  });
}

async function init() {
  initNavbar();
  initSearch();
  initAuth();
  initTabs();
  initProfileForm();
  await loadCollections();
}

document.addEventListener("DOMContentLoaded", init);

