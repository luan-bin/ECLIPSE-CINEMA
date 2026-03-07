/* ══════════════════════════════════════════════
   ECLIPSE CINEMA — detail.js
   Movie Detail Page — Full TMDB Integration
══════════════════════════════════════════════ */

// ─── CONFIG ───────────────────────────────────
const CONFIG = {
  API_KEY:    "ef29fa7a978b4e6593665f37c7b9110c",   // ← Thay bằng API key của bạn
  BASE_URL:   "https://api.themoviedb.org/3",
  IMG_BASE:   "https://image.tmdb.org/t/p",
  POSTER_W:   "w342",
  POSTER_LG:  "w500",
  BACKDROP_W: "w1280",
  PROFILE_W:  "w185",
  LANG:       "vi-VN",
};

// ─── STATE ────────────────────────────────────
const state = {
  movieId:   null,
  movie:     null,
  credits:   null,
  images:    null,
  mediaType: "backdrops",
  lightbox:  { images: [], index: 0 },
  watchlist: JSON.parse(localStorage.getItem("cineverse_watchlist") || "[]"),
  favorites: JSON.parse(localStorage.getItem("cineverse_favorites") || "[]"),
};

// ─── HELPERS ──────────────────────────────────
async function tmdb(endpoint, params = {}) {
  const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", CONFIG.API_KEY);
  url.searchParams.set("language", CONFIG.LANG);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.error("TMDB Error:", err);
    return null;
  }
}

const imgUrl  = (path, size = CONFIG.POSTER_W)   => path ? `${CONFIG.IMG_BASE}/${size}${path}` : null;
const noImg   = (w = 342, h = 513)               => `https://via.placeholder.com/${w}x${h}/161616/444?text=N%2FA`;
const poster  = (path, size = CONFIG.POSTER_W)   => imgUrl(path, size) || noImg();
const backdrop= (path)                            => imgUrl(path, CONFIG.BACKDROP_W) || "";
const profile = (path)                            => imgUrl(path, CONFIG.PROFILE_W) || noImg(185, 278);
const year    = (d) => d ? d.slice(0, 4) : "N/A";

function formatDate(d) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMoney(n) {
  if (!n || n === 0) return "Chưa công bố";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatRuntime(min) {
  if (!min) return "N/A";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}g ${m}p` : `${m} phút`;
}

function escapeTitle(t) {
  return (t || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function stars(rating) {
  const n = Math.round(rating / 2);
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// ─── GET MOVIE ID FROM URL ────────────────────
function getMovieId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || params.get("movie_id");
}

// ══════════════════════════════════════════════
//  NAVBAR (shared logic)
// ══════════════════════════════════════════════
function initNavbar() {
  const navbar     = document.getElementById("navbar");
  const hamburger  = document.getElementById("hamburger");
  const navLinks   = document.getElementById("navLinks");
  const userAvatarBtn = document.getElementById("userAvatarBtn");
  const userDropdown  = document.getElementById("userDropdown");

  // Scroll effect — always scrolled on detail page but keep for consistency
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  });
  navbar.classList.add("scrolled");

  // Hamburger
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    const open = navLinks.classList.contains("open");
    hamburger.querySelectorAll("span").forEach((s, i) => {
      if (open) {
        if (i === 0) s.style.transform = "translateY(7px) rotate(45deg)";
        if (i === 1) s.style.opacity = "0";
        if (i === 2) s.style.transform = "translateY(-7px) rotate(-45deg)";
      } else {
        s.style.transform = ""; s.style.opacity = "";
      }
    });
  });

  // User dropdown
  userAvatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    userDropdown.classList.remove("open");
    document.getElementById("searchResults").classList.remove("open");
  });

  // Mobile genre dropdown toggle
  document.querySelectorAll(".dropdown-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        btn.closest(".dropdown").classList.toggle("open");
      }
    });
  });
}

// ══════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════
function initSearch() {
  const searchBtn    = document.getElementById("searchBtn");
  const searchInput  = document.getElementById("searchInput");
  const searchResults= document.getElementById("searchResults");
  let debounce;

  searchBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    searchInput.classList.toggle("open");
    if (searchInput.classList.contains("open")) searchInput.focus();
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => performSearch(searchInput.value.trim()), 400);
  });

  searchInput.addEventListener("click", (e) => e.stopPropagation());
  searchResults.addEventListener("click", (e) => e.stopPropagation());
}

async function performSearch(query) {
  const results = document.getElementById("searchResults");
  if (!query) { results.classList.remove("open"); return; }

  results.innerHTML = `<div style="padding:14px;color:var(--grey);font-size:13px;text-align:center">Đang tìm...</div>`;
  results.classList.add("open");

  const data = await tmdb("/search/movie", { query });
  if (!data || !data.results.length) {
    results.innerHTML = `<div style="padding:14px;color:var(--grey);font-size:13px;text-align:center">Không tìm thấy kết quả</div>`;
    return;
  }

  results.innerHTML = data.results.slice(0, 7).map((m) => `
    <div class="search-result-item" onclick="goToDetail(${m.id})">
      <img src="${poster(m.poster_path, "w92")}" alt="${m.title}" />
      <div class="search-result-info">
        <p>${m.title}</p>
        <span>${year(m.release_date)} &nbsp;⭐ ${m.vote_average.toFixed(1)}</span>
      </div>
    </div>
  `).join("");
}

function goToDetail(id) {
  window.location.href = `detail.html?id=${id}`;
}

// ══════════════════════════════════════════════
//  GENRES DROPDOWN
// ══════════════════════════════════════════════
async function loadGenres() {
  const data = await tmdb("/genre/movie/list");
  if (!data) return;
  const list = document.getElementById("genreList");
  list.innerHTML = data.genres.map((g) => `
    <a href="index.html#popular" class="genre-item">${g.name}</a>
  `).join("");
}

// ══════════════════════════════════════════════
//  RENDER HERO
// ══════════════════════════════════════════════
function renderHero(movie, credits) {
  document.title = `${movie.title} – Eclipse Cinema`;

  const director = credits?.crew?.find((c) => c.job === "Director");
  const heroEl   = document.getElementById("detailHero");
  const inWL     = state.watchlist.includes(movie.id);
  const inFav    = state.favorites.includes(movie.id);

  // ── Backdrop ──
  const bdWrap = document.getElementById("detailBackdrop");
  if (movie.backdrop_path) {
    const img = document.createElement("img");
    img.src = backdrop(movie.backdrop_path);
    img.alt = movie.title;
    img.onload = () => bdWrap.classList.add("loaded");
    bdWrap.innerHTML = "";
    bdWrap.appendChild(img);
  } else {
    bdWrap.innerHTML = "";
  }

  // ── Poster ──
  const posterWrap = document.getElementById("detailPoster");
  posterWrap.innerHTML = `<img src="${poster(movie.poster_path, CONFIG.POSTER_LG)}" alt="${movie.title}" loading="eager" />`;

  // ── Score Ring ──
  const score    = movie.vote_average;
  const scoreRing= document.getElementById("detailScoreRing");
  const fillCirc = document.getElementById("scoreFillCircle");
  const scoreText= document.getElementById("scoreText");
  const circumf  = 2 * Math.PI * 18; // r=18

  scoreRing.style.display = "flex";
  scoreText.textContent = score.toFixed(1);

  const offset = circumf - (score / 10) * circumf;
  fillCirc.style.strokeDasharray  = circumf;
  fillCirc.style.strokeDashoffset = circumf;

  requestAnimationFrame(() => {
    setTimeout(() => { fillCirc.style.strokeDashoffset = offset; }, 100);
  });

  if (score >= 7) fillCirc.classList.add("high");
  else if (score >= 5) fillCirc.classList.add("mid");
  else fillCirc.classList.add("low");

  // ── Runtime badge ──
  const runtime = formatRuntime(movie.runtime);
  const lang    = (movie.original_language || "").toUpperCase();
  const status  = movie.status === "Released" ? "Đã Chiếu" : (movie.status || "N/A");

  // ── Info block ──
  const infoEl = document.getElementById("detailInfo");
  infoEl.innerHTML = `
    <h1 class="detail-hero-title">${movie.title}</h1>
    ${movie.original_title && movie.original_title !== movie.title
      ? `<p class="detail-original-title">${movie.original_title}</p>`
      : ""}

    <div class="detail-badges">
      <span class="detail-badge badge-status">${status}</span>
      <span class="detail-badge badge-year">${year(movie.release_date)}</span>
      ${movie.runtime ? `<span class="detail-badge badge-runtime"><i class="fas fa-clock" style="margin-right:4px;"></i>${runtime}</span>` : ""}
      <span class="detail-badge badge-lang">${lang}</span>
    </div>

    <div class="detail-rating-row">
      <div class="detail-tmdb-score">
        <div>
          <div class="tmdb-stars">${stars(score)}</div>
          <div class="tmdb-vote-count">${movie.vote_count.toLocaleString()} đánh giá</div>
        </div>
        <div>
          <div class="tmdb-score-number">${score.toFixed(1)}</div>
          <div class="tmdb-score-label">TMDB<br>Score</div>
        </div>
      </div>
      ${movie.popularity ? `
        <div class="detail-divider"></div>
        <div class="detail-extra-scores">
          <div class="extra-score-item">
            <div class="extra-score-value">${Math.round(movie.popularity)}</div>
            <div class="extra-score-label">Popularity</div>
          </div>
        </div>
      ` : ""}
    </div>

    ${director ? `
      <div class="detail-director-row">
        <div>
          <span class="director-label">Đạo Diễn</span>
          <span class="director-name">${director.name}</span>
        </div>
      </div>
    ` : ""}

    <p class="detail-hero-overview">${movie.overview || "Chưa có mô tả tiếng Việt."}</p>

    <div class="detail-hero-actions">
      <button class="btn-primary" id="heroTrailerBtn" style="display:none">
        <i class="fab fa-youtube"></i> Xem Trailer
      </button>
      <button class="btn-secondary" onclick="scrollToTab('overview')">
        <i class="fas fa-info-circle"></i> Chi Tiết
      </button>
      <button class="btn-icon ${inWL ? "active-red" : ""}" id="watchlistBtn"
        onclick="toggleWatchlist(${movie.id}, '${escapeTitle(movie.title)}')"
        title="Thêm vào Xem Sau">
        <i class="fas fa-bookmark"></i>
      </button>
      <button class="btn-icon ${inFav ? "active-gold" : ""}" id="favoriteBtn"
        onclick="toggleFavorite(${movie.id}, '${escapeTitle(movie.title)}')"
        title="Yêu thích">
        <i class="fas fa-heart"></i>
      </button>
      <button class="btn-icon" id="shareBtn" onclick="shareMovie()" title="Chia sẻ">
        <i class="fas fa-share-alt"></i>
      </button>
    </div>
  `;

  // Animate content in
  infoEl.style.opacity = "0";
  infoEl.style.transform = "translateY(24px)";
  infoEl.style.transition = "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s";
  requestAnimationFrame(() => {
    infoEl.style.opacity = "1";
    infoEl.style.transform = "translateY(0)";
  });
}

// ══════════════════════════════════════════════
//  RENDER OVERVIEW TAB
// ══════════════════════════════════════════════
function renderOverview(movie) {
  // Tagline
  const taglineEl = document.getElementById("detailTagline");
  if (movie.tagline) {
    taglineEl.textContent = movie.tagline;
    taglineEl.style.display = "block";
  } else {
    taglineEl.style.display = "none";
  }

  // Overview
  document.getElementById("detailOverview").textContent =
    movie.overview || "Chưa có mô tả tiếng Việt.";

  // Stats sidebar
  const profit = movie.revenue && movie.budget ? movie.revenue - movie.budget : null;
  const profitClass = profit > 0 ? "green" : profit < 0 ? "red" : "";

  const statsEl = document.getElementById("detailStats");
  statsEl.innerHTML = [
    ["Ngày Phát Hành", formatDate(movie.release_date)],
    ["Thời Lượng",     formatRuntime(movie.runtime)],
    ["Ngân Sách",      formatMoney(movie.budget)],
    ["Doanh Thu",      formatMoney(movie.revenue), "gold"],
    profit !== null ? ["Lợi Nhuận", formatMoney(Math.abs(profit)), profitClass] : null,
    ["Ngôn Ngữ Gốc",   (movie.original_language || "").toUpperCase()],
    movie.imdb_id ? ["IMDb ID", movie.imdb_id] : null,
  ].filter(Boolean).map(([label, value, cls = ""]) => `
    <li class="stat-item">
      <span class="stat-label">${label}</span>
      <span class="stat-value ${cls}">${value}</span>
    </li>
  `).join("");

  // Genres
  const genresEl = document.getElementById("detailGenres");
  if (movie.genres?.length) {
    genresEl.innerHTML = movie.genres.map((g) => `
      <span class="genre-chip">${g.name}</span>
    `).join("");
  } else {
    genresEl.innerHTML = `<span style="color:var(--grey);font-size:13px">Chưa có thể loại</span>`;
  }

  // Production companies
  const prodCard = document.getElementById("productionCard");
  const prodList = document.getElementById("productionList");
  if (movie.production_companies?.length) {
    prodCard.style.display = "block";
    prodList.innerHTML = movie.production_companies.slice(0, 5).map((c) => `
      <div class="production-item">
        <div class="production-logo">
          ${c.logo_path
            ? `<img src="${imgUrl(c.logo_path, "w92")}" alt="${c.name}" />`
            : `<i class="fas fa-film logo-placeholder"></i>`
          }
        </div>
        <div>
          <div class="production-name">${c.name}</div>
          ${c.origin_country ? `<div class="production-country">${c.origin_country}</div>` : ""}
        </div>
      </div>
    `).join("");
  } else {
    prodCard.style.display = "none";
  }
}

// ══════════════════════════════════════════════
//  RENDER TRAILER
// ══════════════════════════════════════════════
function renderTrailer(videos) {
  const trailer = videos?.results?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  ) || videos?.results?.find(
    (v) => v.site === "YouTube"
  );

  if (trailer) {
    // Hero button
    const heroBtn = document.getElementById("heroTrailerBtn");
    if (heroBtn) {
      heroBtn.style.display = "inline-flex";
      heroBtn.onclick = () => {
        scrollToTab("overview");
        setTimeout(() => {
          document.getElementById("trailerCard").scrollIntoView({ behavior: "smooth" });
        }, 300);
      };
    }

    // Trailer embed in overview
    const trailerCard = document.getElementById("trailerCard");
    const trailerFrame= document.getElementById("trailerFrame");
    trailerCard.style.display = "block";
    trailerFrame.src = `https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`;
  }
}

// ══════════════════════════════════════════════
//  RENDER CAST
// ══════════════════════════════════════════════
function renderCast(credits) {
  if (!credits) return;
  const cast = credits.cast || [];
  const crew = credits.crew || [];

  // Preview in overview tab (top 6)
  const previewEl = document.getElementById("castPreview");
  if (cast.length) {
    previewEl.innerHTML = cast.slice(0, 6).map((a) => `
      <div class="cast-card">
        <div class="cast-photo">
          <img src="${profile(a.profile_path)}" alt="${a.name}" loading="lazy"
            onerror="this.src='${noImg(185, 278)}'" />
        </div>
        <div class="cast-name">${a.name}</div>
        <div class="cast-character">${a.character || ""}</div>
      </div>
    `).join("");
  } else {
    previewEl.innerHTML = `<p style="color:var(--grey);font-size:13px;grid-column:1/-1">Chưa có thông tin.</p>`;
  }

  // Full cast grid in cast tab
  const fullGrid = document.getElementById("castFullGrid");
  if (cast.length) {
    fullGrid.innerHTML = cast.slice(0, 30).map((a) => `
      <div class="cast-card">
        <div class="cast-photo">
          <img src="${profile(a.profile_path)}" alt="${a.name}" loading="lazy"
            onerror="this.src='${noImg(185, 278)}'" />
        </div>
        <div class="cast-name">${a.name}</div>
        <div class="cast-character">${a.character || ""}</div>
      </div>
    `).join("");
  }

  // Crew grid — key roles only
  const crewGrid = document.getElementById("crewGrid");
  const keyJobs  = ["Director","Producer","Executive Producer","Screenplay","Story","Director of Photography","Original Music Composer","Editor"];
  const filtered = crew.filter((c) => keyJobs.includes(c.job))
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id && x.job === c.job) === i)
    .slice(0, 18);

  if (filtered.length) {
    crewGrid.innerHTML = filtered.map((c) => `
      <div class="crew-card">
        <img class="crew-photo" src="${profile(c.profile_path)}" alt="${c.name}" loading="lazy"
          onerror="this.src='${noImg(185, 278)}'" />
        <div class="crew-info">
          <div class="crew-name">${c.name}</div>
          <div class="crew-job">${c.job}</div>
        </div>
      </div>
    `).join("");
  } else {
    crewGrid.innerHTML = `<p style="color:var(--grey);font-size:13px">Chưa có thông tin đội ngũ.</p>`;
  }
}

// ══════════════════════════════════════════════
//  RENDER KEYWORDS
// ══════════════════════════════════════════════
function renderKeywords(keywords) {
  const kws = keywords?.keywords || [];
  if (!kws.length) return;
  const card = document.getElementById("keywordsCard");
  const cont = document.getElementById("detailKeywords");
  card.style.display = "block";
  cont.innerHTML = kws.slice(0, 16).map((k) => `
    <span class="keyword-chip">${k.name}</span>
  `).join("");
}

// ══════════════════════════════════════════════
//  RENDER MEDIA
// ══════════════════════════════════════════════
function renderMedia(type = "backdrops") {
  const images = state.images;
  if (!images) return;

  const items = images[type] || [];
  const grid  = document.getElementById("mediaGrid");

  if (!items.length) {
    grid.innerHTML = `<p style="color:var(--grey);font-size:14px;padding:40px 0">Không có hình ảnh.</p>`;
    return;
  }

  const imgSize = type === "posters" ? "w342" : "w780";

  // Store for lightbox
  state.lightbox.images = items.slice(0, 24).map((img) => imgUrl(img.file_path, "original"));

  grid.innerHTML = items.slice(0, 24).map((img, i) => `
    <div class="media-item" onclick="openLightbox(${i})">
      <img src="${imgUrl(img.file_path, imgSize)}" alt="Image ${i + 1}" loading="lazy" />
      <div class="media-overlay"><i class="fas fa-expand"></i></div>
    </div>
  `).join("");
}

// Media filter tabs
document.getElementById("mediaFilter")?.addEventListener("click", (e) => {
  const tab = e.target.closest(".filter-tab");
  if (!tab) return;
  document.querySelectorAll("#mediaFilter .filter-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  state.mediaType = tab.dataset.media;
  renderMedia(state.mediaType);
});

// ══════════════════════════════════════════════
//  RENDER REVIEWS
// ══════════════════════════════════════════════
function renderReviews(reviews, movie) {
  const list   = document.getElementById("reviewsList");
  const summary= document.getElementById("scoreSummary");

  // Score summary
  const score = movie.vote_average;
  summary.innerHTML = `
    <div class="score-big">${score.toFixed(1)}</div>
    <div class="score-stars-big">${stars(score)}</div>
    <div class="score-votes">${movie.vote_count.toLocaleString()} lượt đánh giá</div>
    <div class="score-bars">
      ${[10,9,8,7,6,5,4,3,2,1].map((s) => `
        <div class="score-bar-row">
          <span class="score-bar-label">${s}</span>
          <div class="score-bar-track">
            <div class="score-bar-fill" style="width:${s <= Math.round(score) ? 100 - (Math.abs(score - s) * 30) : 10}%"></div>
          </div>
          <span class="score-bar-count"></span>
        </div>
      `).join("")}
    </div>
  `;

  const results = reviews?.results || [];
  if (!results.length) {
    list.innerHTML = `
      <div class="reviews-empty">
        <i class="fas fa-comment-slash"></i>
        Chưa có đánh giá nào cho bộ phim này.
      </div>
    `;
    return;
  }

  list.innerHTML = results.slice(0, 10).map((r, idx) => {
    const initials = (r.author || "?").slice(0, 2).toUpperCase();
    const rating   = r.author_details?.rating || null;
    const body     = r.content || "";
    const isLong   = body.length > 400;
    return `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-avatar">${initials}</div>
          <div>
            <div class="reviewer-name">${r.author}</div>
            <div class="reviewer-meta">
              <i class="fas fa-calendar"></i>
              ${formatDate(r.created_at)}
            </div>
          </div>
          ${rating ? `<span class="reviewer-score">⭐ ${rating}/10</span>` : ""}
        </div>
        <div class="review-body ${isLong ? "collapsed" : ""}" id="review-body-${idx}">
          ${body}
        </div>
        ${isLong ? `
          <div class="review-expand" onclick="toggleReview(${idx}, this)">
            Đọc thêm <i class="fas fa-chevron-down"></i>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
}

function toggleReview(idx, btn) {
  const body = document.getElementById(`review-body-${idx}`);
  body.classList.toggle("collapsed");
  const collapsed = body.classList.contains("collapsed");
  btn.innerHTML = collapsed
    ? `Đọc thêm <i class="fas fa-chevron-down"></i>`
    : `Thu gọn <i class="fas fa-chevron-up"></i>`;
}

// ══════════════════════════════════════════════
//  RENDER SIMILAR
// ══════════════════════════════════════════════
function renderSimilar(similar) {
  const movies = similar?.results?.filter((m) => m.poster_path)?.slice(0, 12);
  if (!movies?.length) return;

  const section = document.getElementById("similarSection");
  const grid    = document.getElementById("similarGrid");
  section.style.display = "block";

  grid.innerHTML = movies.map((m) => `
    <div class="movie-card" onclick="goToDetail(${m.id})">
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
    </div>
  `).join("");

  // Animate cards in
  Array.from(grid.children).forEach((card, i) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(16px)";
    card.style.transition = `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`;
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 100 + i * 50);
  });
}

// ══════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════
function initTabs() {
  const tabBtns = document.querySelectorAll(".detail-tab");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  });

  // Tab switch buttons inside cards
  document.querySelectorAll(".tab-switch-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const goto = btn.dataset.goto;
      if (goto) scrollToTab(goto);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".detail-tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));

  const activeBtn  = document.querySelector(`.detail-tab[data-tab="${tabId}"]`);
  const activePane = document.getElementById(`tab-${tabId}`);

  if (activeBtn)  activeBtn.classList.add("active");
  if (activePane) activePane.classList.add("active");

  // Lazy render media when first opened
  if (tabId === "media" && !document.getElementById("mediaGrid").children.length) {
    renderMedia(state.mediaType);
  }
}

function scrollToTab(tabId) {
  switchTab(tabId);
  const tabsBar = document.getElementById("detailTabsBar");
  const offset  = tabsBar.getBoundingClientRect().top + window.scrollY - 10;
  window.scrollTo({ top: offset, behavior: "smooth" });
}

// ══════════════════════════════════════════════
//  WATCHLIST & FAVORITES
// ══════════════════════════════════════════════
function toggleWatchlist(id, title) {
  const idx = state.watchlist.indexOf(id);
  const btn = document.getElementById("watchlistBtn");

  if (idx === -1) {
    state.watchlist.push(id);
    showToast(`🔖 Đã thêm "${title}" vào danh sách xem sau`);
    btn?.classList.add("active-red");
  } else {
    state.watchlist.splice(idx, 1);
    showToast(`✖ Đã xóa "${title}" khỏi danh sách xem sau`);
    btn?.classList.remove("active-red");
  }
  localStorage.setItem("cineverse_watchlist", JSON.stringify(state.watchlist));
}

function toggleFavorite(id, title) {
  const idx = state.favorites.indexOf(id);
  const btn = document.getElementById("favoriteBtn");

  if (idx === -1) {
    state.favorites.push(id);
    showToast(`❤️ Đã thêm "${title}" vào yêu thích`);
    btn?.classList.add("active-gold");
  } else {
    state.favorites.splice(idx, 1);
    showToast(`✖ Đã xóa "${title}" khỏi yêu thích`);
    btn?.classList.remove("active-gold");
  }
  localStorage.setItem("cineverse_favorites", JSON.stringify(state.favorites));
}

function shareMovie() {
  if (navigator.share) {
    navigator.share({
      title: document.title,
      url: window.location.href,
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast("🔗 Đã sao chép link vào clipboard!");
    });
  }
}

// ══════════════════════════════════════════════
//  LIGHTBOX
// ══════════════════════════════════════════════
function openLightbox(index) {
  state.lightbox.index = index;
  const lb     = document.getElementById("lightbox");
  const img    = document.getElementById("lightboxImg");
  const counter= document.getElementById("lightboxCounter");

  img.src = state.lightbox.images[index] || "";
  counter.textContent = `${index + 1} / ${state.lightbox.images.length}`;
  lb.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.body.style.overflow = "";
}

function lightboxNav(dir) {
  const total = state.lightbox.images.length;
  state.lightbox.index = (state.lightbox.index + dir + total) % total;
  openLightbox(state.lightbox.index);
}

document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
document.getElementById("lightboxPrev").addEventListener("click", () => lightboxNav(-1));
document.getElementById("lightboxNext").addEventListener("click", () => lightboxNav(1));
document.getElementById("lightbox").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeLightbox();
});

// ══════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ══════════════════════════════════════════════
//  BACK TO TOP
// ══════════════════════════════════════════════
function initBackToTop() {
  const btn = document.getElementById("backToTop");
  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 500);
  });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ══════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════
document.addEventListener("keydown", (e) => {
  if (document.getElementById("lightbox").classList.contains("open")) {
    if (e.key === "Escape")      closeLightbox();
    if (e.key === "ArrowLeft")   lightboxNav(-1);
    if (e.key === "ArrowRight")  lightboxNav(1);
  }
});

// ══════════════════════════════════════════════
//  ERROR PAGE
// ══════════════════════════════════════════════
function showError() {
  document.getElementById("detailHero").innerHTML = `
    <div style="
      min-height: 50vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 80px 20px;
      text-align: center;
    ">
      <i class="fas fa-film" style="font-size:60px;color:var(--black4)"></i>
      <h2 style="font-family:var(--font-display);font-size:40px;color:var(--grey)">Không Tìm Thấy Phim</h2>
      <p style="color:var(--grey);font-size:14px">ID phim không hợp lệ hoặc không tồn tại.</p>
      <a href="index.html" class="btn-primary" style="margin-top:16px">
        <i class="fas fa-arrow-left"></i> Quay Lại Trang Chủ
      </a>
    </div>
  `;
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
async function init() {
  initNavbar();
  initSearch();
  initTabs();
  initBackToTop();

  // Load genres dropdown
  loadGenres();

  // Get movie ID
  const id = getMovieId();
  if (!id) { showError(); return; }
  state.movieId = parseInt(id, 10);

  // Fetch all data in parallel
  const [movie, credits, videos, images, reviews, similar, keywords] = await Promise.all([
    tmdb(`/movie/${id}`),
    tmdb(`/movie/${id}/credits`),
    tmdb(`/movie/${id}/videos`),
    tmdb(`/movie/${id}/images`, { include_image_language: "null,en" }),
    tmdb(`/movie/${id}/reviews`),
    tmdb(`/movie/${id}/similar`),
    tmdb(`/movie/${id}/keywords`),
  ]);

  if (!movie) { showError(); return; }

  state.movie   = movie;
  state.credits = credits;
  state.images  = images;

  // Render everything
  renderHero(movie, credits);
  renderOverview(movie);
  renderTrailer(videos);
  renderCast(credits);
  renderKeywords(keywords);
  renderReviews(reviews, movie);
  renderSimilar(similar);
}

document.addEventListener("DOMContentLoaded", init);