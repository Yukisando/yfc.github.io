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
  if (carousel.closest(".post-modal")) adjustModalCaption();
}

function goToSlide(carouselId, index) {
  const carousel = document.getElementById(carouselId);
  const slides = carousel.querySelectorAll(".carousel-slide");
  const dots = carousel.querySelectorAll(".dot");

  slides.forEach((s) => s.classList.remove("active"));
  dots.forEach((d) => d.classList.remove("active"));

  slides[index].classList.add("active");
  dots[index].classList.add("active");
  if (carousel.closest(".post-modal")) adjustModalCaption();
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
let CURRENT_MODAL_INDEX = -1;

function openPostModal(post) {
  const modal = document.getElementById("postModal");
  const modalContent = document.getElementById("modalPostContent");
  CURRENT_MODAL_INDEX = ALL_POSTS.indexOf(post);

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
        <div class="post-content" title="${escapeAttr(post.content)}">${post.content}</div>
        ${imagesHtml}
    `;

  modal.style.display = "flex";
  document.body.style.overflow = "hidden"; // Prevent background scrolling
  adjustModalCaption();
}

// Escape attribute values for safe use inside an HTML attribute
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Switch caption between overlay and below depending on the active media size
function adjustModalCaption() {
  const modalContent = document.querySelector(".post-modal-content");
  if (!modalContent) return;
  const media = modalContent.querySelector(
    ".carousel-slide.active img, .carousel-slide.active video, #modalPostContent > .image-container img, #modalPostContent > .image-container video"
  );
  if (!media) {
    modalContent.classList.remove("caption-below");
    return;
  }
  const apply = () => {
    const rect = media.getBoundingClientRect();
    const w = rect.width || media.clientWidth || media.naturalWidth || media.videoWidth || 0;
    const h = rect.height || media.clientHeight || media.naturalHeight || media.videoHeight || 0;
    // If the rendered media is too small for an overlay caption, show caption below
    const small = (h && h < 320) || (w && w < 480);
    modalContent.classList.toggle("caption-below", !!small);
  };
  if (media.tagName === "VIDEO") {
    if (media.readyState >= 1) apply();
    else media.addEventListener("loadedmetadata", apply, { once: true });
  } else {
    if (media.complete && media.naturalWidth) apply();
    else media.addEventListener("load", apply, { once: true });
  }
  // Recompute on resize while the modal is open
  window.addEventListener("resize", apply, { passive: true });
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
  CURRENT_MODAL_INDEX = -1;
}

function navigateModal(direction) {
  if (CURRENT_MODAL_INDEX < 0 || !ALL_POSTS.length) return;

  // First: cycle within the current post's carousel if there is one
  const modal = document.getElementById("postModal");
  const carousel = modal && modal.querySelector(".carousel");
  if (carousel) {
    const slides = carousel.querySelectorAll(".carousel-slide");
    const currentIndex = Array.from(slides).findIndex((s) =>
      s.classList.contains("active")
    );
    const lastIndex = slides.length - 1;
    const goingForward = direction > 0;
    const goingBackward = direction < 0;
    const atEnd = goingForward && currentIndex === lastIndex;
    const atStart = goingBackward && currentIndex === 0;
    if (!atEnd && !atStart) {
      changeSlide(carousel.id, direction);
      return;
    }
    // Falling off the carousel: advance to the next/prev post.
    // The new post should start on the opposite end so navigation feels continuous.
  }

  const next = (CURRENT_MODAL_INDEX + direction + ALL_POSTS.length) % ALL_POSTS.length;
  const nextPost = ALL_POSTS[next];
  // Preload the first media (if it's an image) so the modal doesn't visibly
  // shrink to a tiny size and then grow once the new image arrives.
  const firstImageIndex = direction < 0 && nextPost.images && nextPost.images.length > 1
    ? nextPost.images.length - 1
    : 0;
  const firstSrc = nextPost.images && nextPost.images[firstImageIndex];
  const openWithStart = () => {
    openPostModal(nextPost);
    // If we navigated backward into a multi-image post, jump to its last slide
    if (direction < 0 && nextPost.images && nextPost.images.length > 1) {
      const c = document.querySelector("#postModal .carousel");
      if (c) goToSlide(c.id, nextPost.images.length - 1);
    }
  };
  if (firstSrc && !isVideoUrl(firstSrc)) {
    const preload = new Image();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      openWithStart();
    };
    preload.onload = finish;
    preload.onerror = finish;
    preload.src = firstSrc;
    setTimeout(finish, 600);
    if (preload.complete) finish();
  } else {
    openWithStart();
  }
}

// Close modal when clicking outside content
window.onclick = function (event) {
  const modal = document.getElementById("postModal");
  if (event.target === modal) {
    closePostModal();
  }
};

// Keyboard navigation for the modal
document.addEventListener("keydown", function (event) {
  const modal = document.getElementById("postModal");
  const modalOpen = modal && modal.style.display !== "none" && modal.style.display !== "";
  if (event.key === "Escape") {
    if (modalOpen) closePostModal();
    return;
  }
  if (!modalOpen) return;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    navigateModal(1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigateModal(-1);
  }
});

const SNAPSHOT_URL = "assets/snapshots/snapshot";

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

const ORIGINAL_DOC_TITLE = document.title;
function setTrackTitle(name) {
  if (name) {
    document.title = "♪ " + name;
  } else {
    document.title = ORIGINAL_DOC_TITLE;
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
      const trackName = getTrackName(PLAYLIST_TRACKS[playlistOrder[playlistIndex]]);
      showTrackToast(trackName);
      setTrackTitle(trackName);
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
    setTrackTitle(null);
  } else {
    if (!playlistAudio.src) {
      playCurrentTrack();
    } else {
      playlistAudio
        .play()
        .then(() => {
          isPlaylistPlaying = true;
          updatePlaylistUI();
          setTrackTitle(getTrackName(PLAYLIST_TRACKS[playlistOrder[playlistIndex]]));
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
    if (!isPlaylistPlaying) setTrackTitle(null);
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

// --- Character stats from in-game snapshot ---
async function fetchCharacterStats() {
  const list = document.getElementById("charStatsList");
  if (!list) return;

  try {
    const res = await fetch(SNAPSHOT_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    renderSnapshotStats(data);
  } catch (err) {
    console.warn("Snapshot fetch failed:", err);
    list.innerHTML =
      '<li class="stats-error">Could not load stats. Check the <a href="https://worldofwarcraft.blizzard.com/en-gb/character/eu/dalaran/y%C3%BCkisan" target="_blank" rel="noopener">Armory</a>.</li>';
  }
}

function fmt(n) {
  if (n === undefined || n === null || n === "") return null;
  if (typeof n === "number") return n.toLocaleString("en-US");
  return String(n);
}

// "67 (Conjured Crystal Water)" -> { count: 67, name: "Conjured Crystal Water" }
function parseCountName(s) {
  if (typeof s !== "string") return null;
  const m = s.match(/^(\d+)\s*\((.+)\)\s*$/);
  if (!m) return null;
  return { count: parseInt(m[1], 10), name: m[2] };
}

function statRow(label, value, flavor) {
  if (value === undefined || value === null || value === "") return "";
  return (
    '<li><span class="stat-label">' + label +
    '</span><span class="stat-value">' + value + '</span>' +
    (flavor ? '<span class="stat-flavor">' + flavor + '</span>' : "") +
    '</li>'
  );
}

function deathRow(label, value) {
  if (value === undefined || value === null || value === 0) return "";
  return (
    '<li><span class="stat-label">' + label +
    '</span><span class="stat-value">' + fmt(value) + '</span></li>'
  );
}

function renderSnapshotStats(d) {
  const list = document.getElementById("charStatsList");
  if (!list) return;
  const stats = d.statistics || {};
  const ch = d.character || {};
  const deaths = stats["Deaths"] || {};
  const travel = stats["Travel"] || {};
  const social = stats["Social"] || {};
  const quests = stats["Quests"] || {};
  const wealth = stats["Wealth"] || {};
  const consum = stats["Consumables"] || {};
  const creatures = stats["Creatures"] || {};
  const world = stats["World"] || {};
  const kb = stats["Killing Blows"] || {};
  const sec = stats["Secondary Skills"] || {};
  const collections = d.collections || {};
  const ach = d.achievements || {};

  // Title / sub
  const title = document.getElementById("charStatsTitle");
  const sub = document.getElementById("charStatsSub");
  if (title && ch.name) title.textContent = ch.name;
  if (sub) {
    const bits = [];
    if (ch.level) bits.push("Level " + ch.level);
    if (ch.race) bits.push(ch.race);
    if (ch.class) bits.push(ch.class);
    if (ch.guild) bits.push("⟨" + ch.guild + "⟩");
    sub.textContent = bits.join(" · ");
  }

  // --- Death hero ---
  const total = deaths["Total deaths"];
  const heroEl = document.getElementById("deathHero");
  const heroNum = document.getElementById("deathHeroNumber");
  const breakdown = document.getElementById("deathBreakdown");
  if (heroEl && total != null) {
    heroEl.hidden = false;
    heroNum.textContent = fmt(total);
    breakdown.innerHTML = [
      deathRow("Falling", deaths["Deaths from falling"]),
      deathRow("Drowning", deaths["Deaths from drowning"]),
      deathRow("Fatigue", deaths["Deaths from fatigue"]),
      deathRow("Fire & Lava", deaths["Deaths from fire and lava"]),
      deathRow("In Dungeons", deaths["Total deaths in dungeons"]),
      deathRow("In Raids", deaths["Total deaths in raids"]),
      deathRow("Rebirthed by Druids", deaths["Rebirthed by druids"]),
      deathRow("Rezzed by Priests", deaths["Resurrected by priests"]),
      deathRow("Raised by DKs", deaths["Raised by death knights"]),
      deathRow("Soulstoned", deaths["Resurrected by soulstones"]),
    ].filter(Boolean).join("");
  }

  // --- Goofy stats ---
  const goofyTitle = document.getElementById("goofyTitle");
  if (goofyTitle) goofyTitle.hidden = false;

  const elixir = parseCountName(consum["Elixir consumed most"]);
  const food = parseCountName(consum["Food eaten most"]);
  const beverage = parseCountName(consum["Beverage consumed most"]);
  const portal = parseCountName(travel["Mage portal taken most"]);

  const html = [
    statRow("Hearthed", fmt(travel["Number of times hearthed"])),
    statRow("Mage Portals", fmt(travel["Mage Portals taken"]),
      portal ? portal.name + " ×" + fmt(portal.count) : null),
    statRow("Flight Paths", fmt(travel["Flight paths taken"])),
    statRow("Summons", fmt(travel["Summons accepted"])),

    statRow("Quests Done", fmt(quests["Quests completed"])),
    statRow("Quests Abandoned", fmt(quests["Quests abandoned"])),

    statRow("Critters Killed", fmt(creatures["Critters killed"])),
    statRow("Creatures Killed", fmt(creatures["Creatures killed"])),

    statRow("Duels W / L",
      (world["Duels won"] != null && world["Duels lost"] != null)
        ? fmt(world["Duels won"]) + " / " + fmt(world["Duels lost"]) : null),

    food ? statRow("Favourite Food",
      food.name, "×" + fmt(food.count)) : "",
    beverage ? statRow("Favourite Drink",
      beverage.name, "×" + fmt(beverage.count)) : "",
    elixir ? statRow("Most-used Elixir",
      elixir.name, "×" + fmt(elixir.count)) : "",
    statRow("Healthstones", fmt(consum["Healthstones used"])),
    statRow("Bandages", fmt(consum["Bandages used"])),

    statRow("Fish Caught", fmt(sec["Fish caught"])),
    statRow("Auctions", fmt(wealth["Auctions posted"])),
    statRow("Peak Gold",
      wealth["Most gold ever owned"] ? wealth["Most gold ever owned"].split(" ")[0] + "g" : null,
      "current: " + (d.money && d.money.gold != null ? fmt(d.money.gold) + "g" : "?")),

    statRow("Mounts",
      collections.mountsCollected != null
        ? fmt(collections.mountsCollected) + " / " + fmt(collections.mountsTotal) : null),
    statRow("Pets",
      collections.petsCollected != null
        ? fmt(collections.petsCollected) + " / " + fmt(collections.petsTotal) : null),
    statRow("Toys", fmt(collections.toysCollected)),
    statRow("Achievements", fmt(ach.points)),
  ].filter(Boolean).join("");

  list.innerHTML = html || '<li class="stats-error">No stats available.</li>';

  const source = document.getElementById("statsSource");
  if (source) {
    const when = d.capturedAtIso ? new Date(d.capturedAtIso).toLocaleString() : "unknown";
    source.textContent = "Snapshot captured " + when + " · addon v" + (d.addonVersion || "?");
  }
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
