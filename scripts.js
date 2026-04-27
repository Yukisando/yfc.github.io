// Cache configuration
const CACHE_NAME = "yfc-cache-v1";
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

let ALL_POSTS = [];

async function fetchPosts() {
  try {
    let posts = getCachedData("posts");
    if (!posts) {
      const response = await fetch("posts.json");
      posts = await response.json();
      setCachedData("posts", posts);
    }
    // Newest first
    ALL_POSTS = posts.slice().reverse();
    ALL_POSTS.forEach(createPost);
    initDashboard();
  } catch (error) {
    console.error("Error fetching posts:", error);
    initDashboard();
  }
}

// Simple cache management
function getCachedData(key) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  const now = Date.now();

  if (now - timestamp > CACHE_DURATION) {
    localStorage.removeItem(key);
    return null;
  }

  return data;
}

function setCachedData(key, data) {
  const cacheObject = {
    data: data,
    timestamp: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(cacheObject));
}

// Helper function to detect if URL is a video
function isVideoUrl(url) {
  const videoExtensions = [".mp4", ".webm", ".mov"];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some((ext) => lowerUrl.includes(ext));
}

// Helper function to create media element (image or video)
function createMediaElement(src, index, isLazy = true) {
  const isVideo = isVideoUrl(src);

  if (isVideo) {
    return `
            <video
                src="${src}"
                class="post-image lazy-load"
                ${isLazy ? 'loading="lazy"' : ""}
                loop
                muted
                autoplay
                playsinline
                onloadeddata="this.classList.add('loaded'); this.previousElementSibling.classList.add('hidden');"
            ></video>
        `;
  } else {
    return `
            <img
                src="${src}"
                alt="post image ${index}"
                class="post-image lazy-load"
                ${isLazy ? 'loading="lazy"' : ""}
                onload="this.classList.add('loaded'); this.previousElementSibling.classList.add('hidden');"
            >
        `;
  }
}

function createPost(post) {
  const postElement = document.createElement("div");
  postElement.className = "post";

  let imagesHtml = "";

  if (post.images && post.images.length > 0) {
    if (post.images.length === 1) {
      // Single media - simple display (image or video)
      imagesHtml = `
                <div class="image-container">
                    <div class="image-placeholder"></div>
                    ${createMediaElement(post.images[0], 1)}
                </div>
            `;
    } else {
      // Multiple media - carousel (images or videos)
      const carouselId = `carousel-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const imagesSlides = post.images
        .map(
          (img, index) => `
                <div class="carousel-slide ${index === 0 ? "active" : ""}">
                    <div class="image-container">
                        <div class="image-placeholder"></div>
                        ${createMediaElement(img, index + 1)}
                    </div>
                </div>
            `
        )
        .join("");

      imagesHtml = `
                <div class="carousel" id="${carouselId}">
                    <div class="carousel-inner">
                        ${imagesSlides}
                    </div>
                    <button class="carousel-btn prev" onclick="event.stopPropagation(); changeSlide('${carouselId}', -1)">❮</button>
                    <button class="carousel-btn next" onclick="event.stopPropagation(); changeSlide('${carouselId}', 1)">❯</button>
                    <div class="carousel-dots">
                        ${post.images
                          .map(
                            (_, i) => `
                            <span class="dot ${
                              i === 0 ? "active" : ""
                            }" onclick="event.stopPropagation(); goToSlide('${carouselId}', ${i})"></span>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `;
    }
  }

  postElement.innerHTML = `
        <h3>${post.date}</h3>
        <div class="post-content">${post.content}</div>
        ${imagesHtml}
    `;

  // Add click handler to open modal AFTER setting innerHTML
  postElement.addEventListener("click", function (e) {
    // Don't open modal if clicking on carousel controls
    if (
      e.target.classList.contains("carousel-btn") ||
      e.target.classList.contains("dot") ||
      e.target.tagName === "BUTTON"
    ) {
      return;
    }
    // Don't open modal on mobile (screens smaller than 600px)
    if (window.innerWidth < 600) {
      return;
    }
    openPostModal(post);
  });

  document.getElementById("posts-container").appendChild(postElement);
}

function changeSlide(carouselId, direction) {
  const carousel = document.getElementById(carouselId);
  const slides = carousel.querySelectorAll(".carousel-slide");
  const dots = carousel.querySelectorAll(".dot");

  let currentIndex = Array.from(slides).findIndex((slide) =>
    slide.classList.contains("active")
  );

  slides[currentIndex].classList.remove("active");
  dots[currentIndex].classList.remove("active");

  currentIndex = (currentIndex + direction + slides.length) % slides.length;

  slides[currentIndex].classList.add("active");
  dots[currentIndex].classList.add("active");
}

function goToSlide(carouselId, index) {
  const carousel = document.getElementById(carouselId);
  const slides = carousel.querySelectorAll(".carousel-slide");
  const dots = carousel.querySelectorAll(".dot");

  slides.forEach((s) => s.classList.remove("active"));
  dots.forEach((d) => d.classList.remove("active"));

  slides[index].classList.add("active");
  dots[index].classList.add("active");
}

function scrollToPosition() {
  const scrollTop =
    window.innerHeight + window.scrollY >= document.body.offsetHeight
      ? 0
      : document.body.scrollHeight;
  window.scrollTo({ top: scrollTop, behavior: "smooth" });
}

window.addEventListener("scroll", function () {
  const button = document.getElementById("scrollButton");
  if (!button) return;
  // Hide on home view
  if (document.body.classList.contains("view-home")) {
    button.classList.remove("visible");
    return;
  }
  const atBottom =
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 4;
  button.classList.toggle("at-bottom", atBottom);

  // Show only when there's meaningful scroll distance available
  const canScroll = document.body.offsetHeight > window.innerHeight + 200;
  const scrolled = window.scrollY > 200;
  if (canScroll && (scrolled || atBottom)) {
    button.classList.add("visible");
  } else {
    button.classList.remove("visible");
  }
});

// Modal functions
function openPostModal(post) {
  const modal = document.getElementById("postModal");
  const modalContent = document.getElementById("modalPostContent");

  let imagesHtml = "";

  if (post.images && post.images.length > 0) {
    if (post.images.length === 1) {
      imagesHtml = `
                <div class="image-container">
                    <div class="image-placeholder"></div>
                    ${createMediaElement(post.images[0], 1, false)}
                </div>
            `;
    } else {
      const carouselId = `modal-carousel-${Date.now()}`;
      const imagesSlides = post.images
        .map(
          (img, index) => `
                <div class="carousel-slide ${index === 0 ? "active" : ""}">
                    <div class="image-container">
                        <div class="image-placeholder"></div>
                        ${createMediaElement(img, index + 1, false)}
                    </div>
                </div>
            `
        )
        .join("");

      imagesHtml = `
                <div class="carousel" id="${carouselId}">
                    <div class="carousel-inner">
                        ${imagesSlides}
                    </div>
                    <button class="carousel-btn prev" onclick="changeSlide('${carouselId}', -1)">❮</button>
                    <button class="carousel-btn next" onclick="changeSlide('${carouselId}', 1)">❯</button>
                    <div class="carousel-dots">
                        ${post.images
                          .map(
                            (_, i) => `
                            <span class="dot ${
                              i === 0 ? "active" : ""
                            }" onclick="goToSlide('${carouselId}', ${i})"></span>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `;
    }
  }

  modalContent.innerHTML = `
        <h3>${post.date}</h3>
        <div class="post-content">${post.content}</div>
        ${imagesHtml}
    `;

  modal.style.display = "block";
  document.body.style.overflow = "hidden"; // Prevent background scrolling
}

function closePostModal() {
  const modal = document.getElementById("postModal");
  const modalContent = document.getElementById("modalPostContent");

  // Pause all videos in modal before closing
  const videos = modalContent.querySelectorAll("video");
  videos.forEach((video) => {
    video.pause();
    video.currentTime = 0;
  });

  modal.style.display = "none";
  document.body.style.overflow = "auto"; // Re-enable scrolling
}

// Close modal when clicking outside content
window.onclick = function (event) {
  const modal = document.getElementById("postModal");
  if (event.target === modal) {
    closePostModal();
  }
};

// Close modal with Escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closePostModal();
  }
});

fetchPosts();

// ==========================
// Playlist + welcome chime
// ==========================
const PLAYLIST_REPO = "Yukisando/yfc.github.io";
const PLAYLIST_DIR = "assets/playlist";
const PLAYLIST_BRANCH = "main";

// Fallback list (used if the GitHub API is unreachable / rate-limited)
const PLAYLIST_FALLBACK = [
  "assets/playlist/04. Elwynn Forest.mp3",
  "assets/playlist/30. Tavern- The Alliance (Lion's Pride).mp3",
  "assets/playlist/31. Capital of the Humans.mp3",
  "assets/playlist/58. Dun Morogh.mp3",
  "assets/playlist/68. Elwynn Forest.mp3",
];

const AUDIO_EXTS = [".mp3", ".ogg", ".wav", ".m4a", ".aac", ".flac", ".webm"];
const PLAYLIST_CACHE_KEY = "yfc-playlist";
const PLAYLIST_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

let PLAYLIST_TRACKS = [];
const WELCOME_CHIME = "assets/69. Quest Complete.mp3";

const playlistAudio = new Audio();
playlistAudio.preload = "none";
playlistAudio.volume = 0.5;

let playlistOrder = [];
let playlistIndex = 0;
let isPlaylistPlaying = false;

function isAudioFile(name) {
  const lower = name.toLowerCase();
  return AUDIO_EXTS.some((ext) => lower.endsWith(ext));
}

async function loadPlaylistTracks() {
  // Try cached list first
  try {
    const cached = JSON.parse(localStorage.getItem(PLAYLIST_CACHE_KEY) || "null");
    if (
      cached &&
      Array.isArray(cached.data) &&
      cached.data.length > 0 &&
      Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL
    ) {
      PLAYLIST_TRACKS = cached.data;
    }
  } catch (_) {}

  // Refresh from GitHub Contents API
  try {
    const url = `https://api.github.com/repos/${PLAYLIST_REPO}/contents/${PLAYLIST_DIR}?ref=${PLAYLIST_BRANCH}`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.ok) {
      const items = await res.json();
      const tracks = items
        .filter((it) => it.type === "file" && isAudioFile(it.name))
        .map((it) => `${PLAYLIST_DIR}/${it.name}`)
        .sort();
      if (tracks.length > 0) {
        PLAYLIST_TRACKS = tracks;
        localStorage.setItem(
          PLAYLIST_CACHE_KEY,
          JSON.stringify({ data: tracks, timestamp: Date.now() })
        );
      }
    }
  } catch (err) {
    console.warn("Playlist directory listing failed, using fallback:", err);
  }

  if (PLAYLIST_TRACKS.length === 0) PLAYLIST_TRACKS = PLAYLIST_FALLBACK.slice();

  reshuffle();
}

function reshuffle() {
  playlistOrder = PLAYLIST_TRACKS.map((_, i) => i).sort(
    () => Math.random() - 0.5
  );
  playlistIndex = 0;
}

function getTrackName(path) {
  const file = path.split("/").pop() || path;
  return decodeURIComponent(file).replace(/\.[^.]+$/, "");
}

function updatePlaylistUI() {
  const btn = document.getElementById("playlistPlayPause");
  if (!btn) return;
  if (isPlaylistPlaying) {
    btn.classList.add("playing");
    btn.title = "Pause playlist";
  } else {
    btn.classList.remove("playing");
    btn.title = "Play playlist";
  }
}

let trackToastTimer = null;
function showTrackToast(name) {
  const toast = document.getElementById("trackToast");
  if (!toast) return;
  toast.textContent = "♪ " + name;
  toast.classList.add("visible");
  if (trackToastTimer) clearTimeout(trackToastTimer);
  trackToastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 3500);
}

function loadCurrentTrack() {
  const src = PLAYLIST_TRACKS[playlistOrder[playlistIndex]];
  playlistAudio.src = encodeURI(src);
}

function playCurrentTrack() {
  if (PLAYLIST_TRACKS.length === 0) return;
  loadCurrentTrack();
  playlistAudio
    .play()
    .then(() => {
      isPlaylistPlaying = true;
      updatePlaylistUI();
      showTrackToast(getTrackName(PLAYLIST_TRACKS[playlistOrder[playlistIndex]]));
    })
    .catch((err) => {
      console.warn("Playlist play blocked:", err);
      isPlaylistPlaying = false;
      updatePlaylistUI();
    });
}

function togglePlaylist() {
  if (PLAYLIST_TRACKS.length === 0) return;
  if (isPlaylistPlaying) {
    playlistAudio.pause();
    isPlaylistPlaying = false;
    updatePlaylistUI();
  } else {
    if (!playlistAudio.src) {
      playCurrentTrack();
    } else {
      playlistAudio
        .play()
        .then(() => {
          isPlaylistPlaying = true;
          updatePlaylistUI();
        })
        .catch((err) => console.warn("Playlist resume blocked:", err));
    }
  }
}

function nextTrack() {
  if (PLAYLIST_TRACKS.length === 0) return;
  playlistIndex = (playlistIndex + 1) % playlistOrder.length;
  // Reshuffle when looping back to start
  if (playlistIndex === 0) reshuffle();
  playCurrentTrack();
}

playlistAudio.addEventListener("ended", nextTrack);
playlistAudio.addEventListener("pause", () => {
  if (!playlistAudio.ended) {
    isPlaylistPlaying = !playlistAudio.paused;
    updatePlaylistUI();
  }
});

// Chime played when user opens the gallery.
function playGalleryChime() {
  try {
    const chime = new Audio(encodeURI(WELCOME_CHIME));
    chime.volume = 0.6;
    const attempt = chime.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => {});
    }
  } catch (_) {}
}

updatePlaylistUI();
loadPlaylistTracks();

// ==========================
// Dashboard, routing, stats
// ==========================
function isImageUrl(url) {
  const exts = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
  const lower = (url || "").toLowerCase();
  return exts.some((e) => lower.includes(e));
}

function dayIndex() {
  // Stable per-day integer (UTC)
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function pickScreenshotOfTheDay() {
  if (!ALL_POSTS.length) return null;
  // Build flat list of (post, image) for image-only entries
  const candidates = [];
  ALL_POSTS.forEach((p) => {
    (p.images || []).forEach((src) => {
      if (isImageUrl(src)) candidates.push({ post: p, src });
    });
  });
  if (!candidates.length) return null;
  return candidates[dayIndex() % candidates.length];
}

function renderScreenshotOfTheDay() {
  const img = document.getElementById("sotdImage");
  if (!img) return;
  const pick = pickScreenshotOfTheDay();
  if (!pick) return;
  img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
  img.src = pick.src;
}

function renderPostCount() {
  const el = document.getElementById("postCount");
  if (el) el.textContent = ALL_POSTS.length;
}

// --- Routing ---
function applyRoute() {
  const hash = (location.hash || "").toLowerCase();
  const isGallery = hash.startsWith("#/gallery");
  document.body.classList.toggle("view-gallery", isGallery);
  document.body.classList.toggle("view-home", !isGallery);
  // Reset scroll on view change
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  // Hide scroll button when on home (no need)
  const sb = document.getElementById("scrollButton");
  if (sb && !isGallery) sb.classList.remove("visible");
}
window.addEventListener("hashchange", applyRoute);

// --- Character stats via Raider.IO (CORS-friendly, no auth) ---
const STATS_CACHE_KEY = "yfc-char-stats";
const STATS_CACHE_TTL = 1000 * 60 * 60 * 6; // 6h

async function fetchCharacterStats() {
  const list = document.getElementById("charStatsList");
  const source = document.getElementById("statsSource");
  if (!list) return;

  // Try cache first
  try {
    const cached = JSON.parse(localStorage.getItem(STATS_CACHE_KEY) || "null");
    if (cached && cached.data && Date.now() - cached.timestamp < STATS_CACHE_TTL) {
      renderStats(cached.data);
    }
  } catch (_) {}

  try {
    const url =
      "https://raider.io/api/v1/characters/profile" +
      "?region=eu&realm=dalaran&name=" +
      encodeURIComponent("Yükisan") +
      "&fields=gear,mythic_plus_scores_by_season:current,raid_progression,guild,covenant,active_spec_name";
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    localStorage.setItem(
      STATS_CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
    renderStats(data);
    if (source) source.textContent = "Live data via Raider.IO · updated " + new Date().toLocaleString();
  } catch (err) {
    console.warn("Stats fetch failed:", err);
    if (!list.querySelector("li:not(.stats-loading)")) {
      list.innerHTML =
        '<li class="stats-error">Could not load live stats. Check the <a href="https://worldofwarcraft.blizzard.com/en-gb/character/eu/dalaran/y%C3%BCkisan" target="_blank" rel="noopener">Armory</a>.</li>';
    }
  }
}

function statRow(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return (
    '<li><span class="stat-label">' +
    label +
    '</span><span class="stat-value">' +
    value +
    "</span></li>"
  );
}

function bestRaidProgress(rp) {
  if (!rp || typeof rp !== "object") return null;
  // Pick the most recent raid (last key)
  const keys = Object.keys(rp);
  if (!keys.length) return null;
  const key = keys[keys.length - 1];
  const r = rp[key];
  const name = key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  return { name, summary: r.summary || "" };
}

function renderStats(d) {
  const list = document.getElementById("charStatsList");
  if (!list) return;

  const ilvl = d.gear && d.gear.item_level_equipped;
  const mScore =
    d.mythic_plus_scores_by_season &&
    d.mythic_plus_scores_by_season[0] &&
    d.mythic_plus_scores_by_season[0].scores &&
    d.mythic_plus_scores_by_season[0].scores.all;
  const raid = bestRaidProgress(d.raid_progression);
  const guild = d.guild && d.guild.name;
  const spec = d.active_spec_name;
  const cls = d.class;
  const race = d.race;

  const html = [
    statRow("Item Level", ilvl ? Math.round(ilvl) : null),
    statRow("Mythic+ Score", mScore ? Math.round(mScore) : null),
    raid ? statRow(raid.name, raid.summary) : "",
    statRow("Spec", spec && cls ? spec + " " + cls : spec || cls),
    statRow("Race", race),
    statRow("Guild", guild),
  ]
    .filter(Boolean)
    .join("");

  list.innerHTML =
    html ||
    '<li class="stats-error">No stats available.</li>';
}

function initDashboard() {
  renderScreenshotOfTheDay();
  renderPostCount();
  fetchCharacterStats();
  applyRoute();

  // Play chime when user opens the gallery tile
  const galleryTile = document.getElementById("screenshotOfTheDay");
  if (galleryTile) {
    galleryTile.addEventListener("click", playGalleryChime);
  }
}
