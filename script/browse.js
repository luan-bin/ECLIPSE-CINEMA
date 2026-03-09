/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — browse.js
   Trang khám phá phim với filter + infinite scroll
   Phụ thuộc: config.js, auth.js
══════════════════════════════════════════════ */

// Alias
const tmdb = tmdbFetch;
const poster = posterUrl;
const backdrop = backdropUrl;
const year = releaseYear;

const browseState = {
  page: 1,
  totalPages: 1,
  loading: false,
  lastQuery: {},
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
    document.getElementById("searchResults").classList.remove("open");
  });
}

function initAuthNavbar() {
  if (!window.CinemaAuth) return;
  const session = CinemaAuth.getSession();

  if (session && CinemaAuth.isLoggedIn()) {
    const { firstName, lastName, email } = session.user;
    const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
    document.getElementById("userAvatarBtn").innerHTML = `
      <div style="width:100%;height:100%;background:var(--red);display:grid;place-items:center;
        font-family:var(--font-cond);font-size:13px;font-weight:700;color:#fff;letter-spacing:1px">
        ${initials}
      </div>`;
    document.querySelector(".user-name").textContent = `${firstName} ${lastName}`;
    document.querySelector(".user-email").textContent = email;
    document.querySelector(".logout-link").addEventListener("click", (e) => {
      e.preventDefault();
      CinemaAuth.logout();
      showToast("Đã đăng xuất. Hẹn gặp lại!");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    });
  } else {
    document.querySelector(".user-name").textContent = "Khách";
    document.querySelector(".user-email").textContent = "Chưa đăng nhập";
    document.querySelector(".user-menu-list").innerHTML = `
      <li><a href="login.html" style="color:var(--red)!important"><i class="fas fa-sign-in-alt"></i> Đăng Nhập</a></li>
      <li><a href="login.html"><i class="fas fa-user-plus"></i> Đăng Ký</a></li>`;
  }
}

// SEARCH (tái sử dụng pattern từ home/detail/watch + redirect search page)
function initSearch() {
  const btn = document.getElementById("searchBtn");
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  let timer;

  if (!btn || !input || !results) return;

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
    timer = setTimeout(() => doInlineSearch(q), 400);
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

async function doInlineSearch(query) {
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
  results.innerHTML = data.results.slice(0, 7).map((m) => `
    <div class="search-result-item" onclick="location.href='detail.html?id=${m.id}'">
      <img src="${poster(m.poster_path, "w92")}" alt="${m.title}" />
      <div class="search-result-info">
        <p>${m.title}</p>
        <span>${year(m.release_date)} &nbsp;⭐ ${m.vote_average.toFixed(1)}</span>
      </div>
    </div>`).join("");
}

// FILTERS + INFINITE SCROLL
async function loadGenresIntoSelect() {
  const select = document.getElementById("genreSelect");
  if (!select) return;
  const data = await tmdb("/genre/movie/list");
  if (!data?.genres?.length) return;
  select.innerHTML =
    `<option value="">Tất cả</option>` +
    data.genres.map((g) => `<option value="${g.id}">${g.name}</option>`).join("");
}

function initYearSelect() {
  const select = document.getElementById("yearSelect");
  const current = new Date().getFullYear();
  const start = current - 40;
  let html = `<option value="">Tất cả</option>`;
  for (let y = current; y >= start; y--) {
    html += `<option value="${y}">${y}</option>`;
  }
  select.innerHTML = html;
}

function getFilterParams() {
  const genre = document.getElementById("genreSelect").value || "";
  const yearVal = document.getElementById("yearSelect").value || "";
  const sort = document.getElementById("sortSelect").value || "popularity.desc";
  return { genre, year: yearVal, sort };
}

async function loadPage(reset = false) {
  if (browseState.loading) return;
  const grid = document.getElementById("browseGrid");
  const statusEl = document.getElementById("browseStatus");

  const { genre, year: yearFilter, sort } = getFilterParams();

  if (reset) {
    browseState.page = 1;
    grid.innerHTML = "";
    browseState.lastQuery = { genre, year: yearFilter, sort };
  }

  if (browseState.page > browseState.totalPages) {
    statusEl.textContent = "Bạn đã xem hết kết quả.";
    return;
  }

  browseState.loading = true;
  statusEl.textContent = "Đang tải phim...";

  const params = {
    sort_by: sort,
    page: browseState.page,
  };
  if (genre) params.with_genres = genre;
  if (yearFilter) params.primary_release_year = yearFilter;

  const data = await tmdb("/discover/movie", params);
  browseState.loading = false;

  if (!data) {
    statusEl.textContent = "Không thể tải dữ liệu. Vui lòng thử lại.";
    return;
  }

  browseState.totalPages = data.total_pages || 1;

  if (!data.results?.length && browseState.page === 1) {
    grid.innerHTML = `<p style="color:var(--grey);font-size:14px;padding:40px 0;text-align:center">Không có phim phù hợp với bộ lọc.</p>`;
    statusEl.textContent = "";
    document.getElementById("resultsCount").textContent = "";
    return;
  }

  appendMovies(grid, data.results);

  const from = (browseState.page - 1) * data.results.length + 1;
  const to = from + data.results.length - 1;
  document.getElementById("resultsCount").textContent =
    `Trang ${browseState.page}/${browseState.totalPages}`;

  if (browseState.page >= browseState.totalPages) {
    statusEl.textContent = "Bạn đã xem hết kết quả.";
  } else {
    statusEl.textContent = "Cuộn xuống để xem thêm…";
    browseState.page += 1;
  }
}

function appendMovies(container, movies) {
  const html = movies
    .filter((m) => m.poster_path)
    .map(
      (m) => `
    <div class="movie-card" onclick="location.href='detail.html?id=${m.id}'">
      <div class="movie-poster">
        <img src="${poster(m.poster_path)}" alt="${m.title}" loading="lazy" />
        <div class="movie-poster-overlay">
          <div class="play-btn"><i class="fas fa-play"></i></div>
        </div>
        <div class="movie-rating-badge">⭐ ${m.vote_average.toFixed(1)}</div>
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
  container.insertAdjacentHTML("beforeend", html);
}

function initInfiniteScroll() {
  window.addEventListener("scroll", () => {
    if (browseState.loading) return;
    const nearBottom =
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 400;
    if (nearBottom) {
      loadPage(false);
    }
  });
}

function initFilterApply() {
  document
    .getElementById("applyFiltersBtn")
    .addEventListener("click", () => {
      const { genre, year: yearFilter } = getFilterParams();
      const parts = [];
      if (genre) parts.push("thể loại đã chọn");
      if (yearFilter) parts.push(`năm ${yearFilter}`);
      const label = parts.length ? parts.join(", ") : "tất cả phim";
      document.getElementById("resultsTitle").textContent =
        "Kết quả – " + label;
      browseState.totalPages = 1;
      loadPage(true);
    });
}

async function init() {
  initNavbar();
  initAuthNavbar();
  initSearch();
  await loadGenresIntoSelect();
  initYearSelect();
  initFilterApply();
  initInfiniteScroll();
  // load initial
  loadPage(true);
}

document.addEventListener("DOMContentLoaded", init);

