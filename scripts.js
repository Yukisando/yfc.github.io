// Cache configuration
const CACHE_NAME = "yfc-cache-v2";
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

let ALL_POSTS = [];

// World of Warcraft expansion timeline (release dates from en.wikipedia.org).
// Ordered oldest → newest. Each expansion runs until the next one releases.
const EXPANSIONS = [
  { id: "tbc",  name: "The Burning Crusade",  short: "TBC", start: "2007-01-16", color: "#5fbf3f" },
  { id: "wotlk",name: "Wrath of the Lich King",short: "WotLK",start: "2008-11-13", color: "#7ec8e3" },
  { id: "cata", name: "Cataclysm",            short: "Cata",start: "2010-12-07", color: "#d24b3a" },
  { id: "mop",  name: "Mists of Pandaria",    short: "MoP", start: "2012-09-25", color: "#3fbf8f" },
  { id: "wod",  name: "Warlords of Draenor",  short: "WoD", start: "2014-11-13", color: "#c46f2a" },
  { id: "legion",name:"Legion",               short: "Legion",start:"2016-08-30", color: "#7ed957" },
  { id: "bfa",  name: "Battle for Azeroth",   short: "BfA", start: "2018-08-14", color: "#c75450" },
  { id: "sl",   name: "Shadowlands",          short: "SL",  start: "2020-11-23", color: "#8a5cd1" },
  { id: "df",   name: "Dragonflight",         short: "DF",  start: "2022-11-28", color: "#e07a2b" },
  { id: "tww",  name: "The War Within",       short: "TWW", start: "2024-08-26", color: "#4ea1c7" },
  { id: "mn",   name: "Midnight",             short: "Midnight", start: "2026-03-02", color: "#5560b8" },
];

// Parse the post's "DD-MM-YYYY" date string into a Date.
function parsePostDate(str) {
  const [d, m, y] = String(str).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function getExpansionForDate(date) {
  const t = date.getTime();
  let chosen = EXPANSIONS[0];
  for (const exp of EXPANSIONS) {
    if (t >= new Date(exp.start).getTime()) chosen = exp;
    else break;
  }
  return chosen;
}

const BACKSTORY_FILES = {
  fr: "assets/backstory.md",
  en: "assets/backstory.en.md",
};

let activeBackstoryLanguage = "fr";
let backstorySources = {};
let backstoryGlobalHandlersBound = false;

function parseBackstoryMd(src) {
  const lines = src.split("\n");
  let out = "";
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const li = line.match(/^- (.+)/);

    if (h1) {
      if (inList) {
        out += "</ul>";
        inList = false;
      }
      out += `<h1>${h1[1]}</h1>`;
    } else if (h2) {
      if (inList) {
        out += "</ul>";
        inList = false;
      }
      out += `<h2>${h2[1]}</h2>`;
    } else if (li) {
      if (!inList) {
        out += '<ul class="backstory-traits-list">';
        inList = true;
      }
      out += `<li>${li[1]}</li>`;
    } else if (line.trim()) {
      if (inList) {
        out += "</ul>";
        inList = false;
      }
      out += `<p>${line.trim()}</p>`;
    } else if (inList) {
      out += "</ul>";
      inList = false;
    }
  }

  if (inList) out += "</ul>";
  return out;
}

function normalizeBackstoryKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractBackstoryData(md) {
  const tmp = document.createElement("div");
  tmp.innerHTML = parseBackstoryMd(md);

  const h1 = tmp.querySelector("h1");
  const title = h1 ? h1.textContent : "Backstory RP";
  const allChildren = Array.from(tmp.children);
  const firstH2Idx = allChildren.findIndex((el) => el.tagName === "H2");
  const headerPs = (firstH2Idx > -1 ? allChildren.slice(0, firstH2Idx) : allChildren)
    .filter((el) => el.tagName === "P");

  const sections = Array.from(tmp.querySelectorAll("h2")).map((heading) => {
    let contentHtml = "";
    let sibling = heading.nextElementSibling;
    while (sibling && sibling.tagName !== "H2") {
      contentHtml += sibling.outerHTML;
      sibling = sibling.nextElementSibling;
    }

    return {
      title: heading.textContent.trim(),
      key: normalizeBackstoryKey(heading.textContent),
      contentHtml,
    };
  });

  const companionsSection = sections.find((section) => (
    section.key === "compagnons" || section.key === "companions"
  ));
  const companionDetails = {};

  if (companionsSection) {
    const companionTmp = document.createElement("div");
    companionTmp.innerHTML = companionsSection.contentHtml;
    Array.from(companionTmp.querySelectorAll("p")).forEach((paragraph) => {
      const text = paragraph.textContent.trim();
      const match = text.match(/^\*\*(.+?)\s*:\*\*\s*(.+)$/);
      if (!match) return;

      const name = match[1].trim();
      companionDetails[normalizeBackstoryKey(name)] = {
        name,
        description: match[2].trim(),
      };
    });
  }

  return {
    title,
    subtitle: headerPs[0] ? headerPs[0].textContent : "",
    companionLine: headerPs[1] ? headerPs[1].textContent : "",
    sections,
    companionDetails,
  };
}

function buildCompanionBadges(companionLine, companionDetails) {
  return companionLine
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\S+)\s+(.+)$/);
      const icon = match ? match[1] : "";
      const name = match ? match[2] : part;
      const key = normalizeBackstoryKey(name);
      const tooltip = companionDetails[key] ? companionDetails[key].description : name;

      return `<div class="companion-chip">` +
        `<button type="button" class="companion-badge companion-badge-button" data-companion="${key}" aria-expanded="false">` +
        `${icon ? `<span class="companion-badge-icon" aria-hidden="true">${icon}</span>` : ""}` +
        `<span>${name}</span>` +
        `</button>` +
        `<div class="companion-tooltip" role="tooltip">${tooltip}</div>` +
      `</div>`;
    })
    .join("");
}

function renderBackstoryCard(section, extraClass = "") {
  return `<div class="backstory-card${extraClass}">` +
    `<div class="backstory-card-title">${section.title}</div>` +
    `${section.contentHtml}` +
  `</div>`;
}

function renderMergedBackstoryCard(sections) {
  const content = sections.map((section, index) => {
    const separatorClass = index ? " backstory-card-section-separated" : "";
    return `<div class="backstory-card-section${separatorClass}">` +
      `<div class="backstory-card-title">${section.title}</div>` +
      `${section.contentHtml}` +
    `</div>`;
  }).join("");

  return `<div class="backstory-card">${content}</div>`;
}

function buildBackstoryCards(sections) {
  const cards = [];
  let mergedCompanionStories = [];

  const flushMergedCompanionStories = () => {
    if (!mergedCompanionStories.length) return;
    cards.push(renderMergedBackstoryCard(mergedCompanionStories));
    mergedCompanionStories = [];
  };

  sections.forEach((section, index) => {
    const isCompanions = section.key === "compagnons" || section.key === "companions";
    const isMartin = section.key.startsWith("martin");
    const isBob = section.key.startsWith("bob");
    const isHabits = section.key === "habitudes et passions" || section.key === "habits and passions";

    if (isCompanions) return;

    if (isMartin || isBob) {
      mergedCompanionStories.push(section);
      return;
    }

    flushMergedCompanionStories();

    let extraClass = "";
    if (isHabits) extraClass += " backstory-card-span-2";
    cards.push(renderBackstoryCard(section, extraClass));
  });

  flushMergedCompanionStories();
  return cards.join("");
}

function closeBackstoryTooltips(root = document.getElementById("backstory")) {
  if (!root) return;

  root.querySelectorAll(".companion-chip.is-open").forEach((chip) => {
    chip.classList.remove("is-open");
    const button = chip.querySelector(".companion-badge-button");
    if (button) button.setAttribute("aria-expanded", "false");
  });
}

function bindBackstoryInteractions() {
  const root = document.getElementById("backstory");
  if (!root || root.dataset.bound === "true") return;

  root.dataset.bound = "true";
  root.addEventListener("click", (event) => {
    const languageButton = event.target.closest(".backstory-lang-button");
    if (languageButton) {
      const nextLanguage = languageButton.dataset.lang;
      if (nextLanguage && nextLanguage !== activeBackstoryLanguage && backstorySources[nextLanguage]) {
        activeBackstoryLanguage = nextLanguage;
        renderBackstoryTile();
      }
      return;
    }

    const companionButton = event.target.closest(".companion-badge-button");
    if (!companionButton) {
      closeBackstoryTooltips(root);
      return;
    }

    event.preventDefault();
    const chip = companionButton.closest(".companion-chip");
    const wasOpen = chip && chip.classList.contains("is-open");
    closeBackstoryTooltips(root);

    if (chip && !wasOpen) {
      chip.classList.add("is-open");
      companionButton.setAttribute("aria-expanded", "true");
    }
  });

  if (backstoryGlobalHandlersBound) return;

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#backstory")) closeBackstoryTooltips();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeBackstoryTooltips();
  });

  backstoryGlobalHandlersBound = true;
}

function renderBackstoryTile() {
  const source = backstorySources[activeBackstoryLanguage] || backstorySources.fr;
  const target = document.getElementById("backstory") || document.getElementById("backstoryTile");
  if (!source || !target) return;

  const data = extractBackstoryData(source);
  const cards = buildBackstoryCards(data.sections);
  const companionBadges = buildCompanionBadges(data.companionLine, data.companionDetails);
  const languageToggle = Object.keys(backstorySources).length > 1
    ? `<div class="backstory-lang-toggle" role="group" aria-label="Backstory language">` +
        `<button type="button" class="backstory-lang-button${activeBackstoryLanguage === "fr" ? " is-active" : ""}" data-lang="fr">FR</button>` +
        `<button type="button" class="backstory-lang-button${activeBackstoryLanguage === "en" ? " is-active" : ""}" data-lang="en">EN</button>` +
      `</div>`
    : "";

  target.outerHTML = `<div class="bento-tile bento-backstory" id="backstory">` +
    `<div class="backstory-top">` +
      `<div class="backstory-top-bar">` +
        `<div><h2>${data.title}</h2><p class="bento-sub">${data.subtitle}</p></div>` +
        `${languageToggle}` +
      `</div>` +
      `<div class="backstory-companions-row">${companionBadges}</div>` +
    `</div>` +
    `<div class="backstory-grid">${cards}</div>` +
  `</div>`;

  bindBackstoryInteractions();
}

Promise.allSettled(Object.entries(BACKSTORY_FILES).map(async ([language, path]) => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return [language, await response.text()];
}))
  .then((results) => {
    results.forEach((result) => {
      if (result.status !== "fulfilled") return;
      const [language, source] = result.value;
      backstorySources[language] = source;
    });

    if (backstorySources.fr) renderBackstoryTile();
  })
  .catch(() => {});

async function fetchPosts() {
  try {
    // Always revalidate with the server — GitHub Pages uses ETags so the
    // browser only re-downloads posts.json when it actually changes.
    const response = await fetch("posts.json", { cache: "no-cache" });
    const posts = await response.json();
    // Newest first
    ALL_POSTS = posts.slice().reverse();
    // Tag each post with its expansion
    ALL_POSTS.forEach((p) => {
      p._date = parsePostDate(p.date);
      p._expansion = getExpansionForDate(p._date);
    });
    renderGallery();
    initDashboard();
  } catch (error) {
    console.error("Error fetching posts:", error);
    initDashboard();
  }
}

// Render gallery posts grouped by expansion, with section headers and a
// timeline slider for quick navigation.
function renderGallery() {
  const container = document.getElementById("posts-container");
  if (!container) return;
  container.innerHTML = "";

  // Build groups in DOM order (newest → oldest, since ALL_POSTS is reversed)
  const groups = [];
  let current = null;
  ALL_POSTS.forEach((post) => {
    if (!current || current.exp.id !== post._expansion.id) {
      current = { exp: post._expansion, posts: [] };
      groups.push(current);
    }
    current.posts.push(post);
  });

  groups.forEach((g) => {
    const header = document.createElement("div");
    header.className = "exp-section-header";
    header.id = "exp-section-" + g.exp.id;
    header.dataset.expId = g.exp.id;
    header.style.setProperty("--exp-color", g.exp.color);
    const first = g.posts[g.posts.length - 1]._date;
    const last = g.posts[0]._date;
    const fmt = (d) =>
      d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    const range = first.getTime() === last.getTime() ? fmt(first) : fmt(first) + " – " + fmt(last);
    header.innerHTML = `
      <span class="exp-section-dot"></span>
      <span class="exp-section-name">${g.exp.name}</span>
      <span class="exp-section-range">${range} · ${g.posts.length} post${g.posts.length === 1 ? "" : "s"}</span>
    `;
    container.appendChild(header);
    g.posts.forEach(createPost);
  });

  buildExpansionSlider(groups);
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

  postElement.dataset.search = (post.date + " " + post.content).toLowerCase();
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

// Expansion timeline state (declared early so cache-hit synchronous path
// through fetchPosts → renderGallery → buildExpansionSlider can access it).
var EXP_GROUPS = [];           // [{ exp, posts }] in DOM order (newest → oldest)
var EXP_SLIDER_DRAGGING = false;
var EXP_SCROLL_RAF = 0;

fetchPosts();
initGallerySearch();

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
  renderDashTrackList();
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
  // Dashboard play/pause button
  const dashBtn = document.getElementById("dashPlayPause");
  if (dashBtn) {
    dashBtn.classList.toggle("playing", isPlaylistPlaying);
    dashBtn.title = isPlaylistPlaying ? "Pause playlist" : "Play playlist";
  }
  // Floating player
  const fp = document.getElementById("floatingPlayer");
  const fpBtn = document.getElementById("floatingPlayPause");
  if (fp) {
    const onHome = document.body.classList.contains("view-home");
    fp.classList.toggle("visible", isPlaylistPlaying && !onHome);
    fp.classList.toggle("playing", isPlaylistPlaying);
  }
  if (fpBtn) {
    fpBtn.title = isPlaylistPlaying ? "Pause" : "Play";
  }
  // Highlight active track in the dashboard track list
  const currentTrackIdx = PLAYLIST_TRACKS.length ? playlistOrder[playlistIndex] : -1;
  document.querySelectorAll(".bento-tracklist-item").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.trackIdx) === currentTrackIdx);
  });
}

function updateNowPlayingName(name) {
  const dashName = document.getElementById("dashTrackName");
  if (dashName) dashName.textContent = name || "—";
  const fpName = document.getElementById("floatingTrackName");
  if (fpName) fpName.textContent = name ? "\u266a " + name : "\u266a";
}

function stopPlaylist() {
  playlistAudio.pause();
  isPlaylistPlaying = false;
  updatePlaylistUI();
  setTrackTitle(null);
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
      const trackName = getTrackName(PLAYLIST_TRACKS[playlistOrder[playlistIndex]]);
      updatePlaylistUI();
      updateNowPlayingName(trackName);
      setTrackTitle(trackName);
      showTrackToast(trackName);
      // Scroll the active track into view in the dashboard list
      const activeItem = document.querySelector(".bento-tracklist-item.active");
      if (activeItem) activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
          const trackName = getTrackName(PLAYLIST_TRACKS[playlistOrder[playlistIndex]]);
          updatePlaylistUI();
          updateNowPlayingName(trackName);
          setTrackTitle(trackName);
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

function prevTrack() {
  if (PLAYLIST_TRACKS.length === 0) return;
  playlistIndex = (playlistIndex - 1 + playlistOrder.length) % playlistOrder.length;
  playCurrentTrack();
}

function renderDashTrackList() {
  const list = document.getElementById("dashTrackList");
  if (!list) return;
  list.innerHTML = "";
  PLAYLIST_TRACKS.forEach((path, idx) => {
    const li = document.createElement("li");
    li.className = "bento-tracklist-item";
    li.dataset.trackIdx = idx;
    li.textContent = getTrackName(path);
    li.addEventListener("click", () => {
      // Find this track index in the shuffled order; if not found, play directly
      const orderIdx = playlistOrder.indexOf(idx);
      if (orderIdx !== -1) {
        playlistIndex = orderIdx;
      } else {
        // Insert at current position
        playlistOrder.splice(playlistIndex, 0, idx);
      }
      playCurrentTrack();
    });
    list.appendChild(li);
  });
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

// ==========================
// Random emotes (yuki button)
// ==========================
const EMOTES_DIR = "assets/emotes";
const EMOTES_CACHE_KEY = "yfc-emotes-v2";
const EMOTES_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

let EMOTE_TRACKS = [];
let emoteOrder = [];
let emoteIndex = 0;
let currentEmoteAudio = null;

function reshuffleEmotes() {
  emoteOrder = EMOTE_TRACKS.map((_, i) => i).sort(() => Math.random() - 0.5);
  emoteIndex = 0;
}


async function loadEmoteTracks() {
  // Cached list first
  try {
    const cached = JSON.parse(localStorage.getItem(EMOTES_CACHE_KEY) || "null");
    if (
      cached &&
      Array.isArray(cached.data) &&
      cached.data.length > 0 &&
      Date.now() - cached.timestamp < EMOTES_CACHE_TTL
    ) {
      EMOTE_TRACKS = cached.data;
      reshuffleEmotes();
    }
  } catch (_) {}

  // Refresh from GitHub Contents API
  try {
    const url = `https://api.github.com/repos/${PLAYLIST_REPO}/contents/${EMOTES_DIR}?ref=${PLAYLIST_BRANCH}`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.ok) {
      const items = await res.json();
      const tracks = items
        .filter((it) => it.type === "file" && isAudioFile(it.name))
        .map((it) => `${EMOTES_DIR}/${it.name}`)
        .sort();
      if (tracks.length > 0) {
        EMOTE_TRACKS = tracks;
        reshuffleEmotes();
        localStorage.setItem(
          EMOTES_CACHE_KEY,
          JSON.stringify({ data: tracks, timestamp: Date.now() })
        );
      }
    }
  } catch (err) {
    console.warn("Emote directory listing failed:", err);
  }
}


function playRandomEmote() {
  if (!EMOTE_TRACKS.length) {
    // Try to (re)load and retry once
    loadEmoteTracks().then(() => {
      if (EMOTE_TRACKS.length) playRandomEmote();
    });
    return;
  }
  // Stop a previous emote so they don't overlap when spammed
  if (currentEmoteAudio) {
    try { currentEmoteAudio.pause(); } catch (_) {}
    currentEmoteAudio = null;
  }
  if (!emoteOrder.length || emoteIndex >= emoteOrder.length) {
    reshuffleEmotes();
  }
  const src = EMOTE_TRACKS[emoteOrder[emoteIndex]];
  emoteIndex = (emoteIndex + 1) % emoteOrder.length;
  try {
    const audio = new Audio(encodeURI(src));
    audio.volume = 0.7;
    currentEmoteAudio = audio;
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch((err) => console.warn("Emote play blocked:", err));
    }
  } catch (err) {
    console.warn("Emote play failed:", err);
  }
}

updatePlaylistUI();
loadPlaylistTracks();
loadEmoteTracks();

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

// --- Gallery search ---
function filterGallery(query) {
  const container = document.getElementById("posts-container");
  const slider = document.getElementById("expansionSlider");
  const countEl = document.getElementById("gallerySearchCount");
  if (!container) return;

  const q = query.trim().toLowerCase();

  if (!q) {
    // Show everything
    container.querySelectorAll(".post").forEach((p) => (p.hidden = false));
    container.querySelectorAll(".exp-section-header").forEach((h) => (h.hidden = false));
    if (slider) slider.hidden = false;
    if (countEl) countEl.hidden = true;
    return;
  }

  // Hide slider while filtering
  if (slider) slider.hidden = true;

  let matchCount = 0;
  container.querySelectorAll(".post").forEach((p) => {
    const match = (p.dataset.search || "").includes(q);
    p.hidden = !match;
    if (match) matchCount++;
  });

  // Hide section headers with no visible posts
  container.querySelectorAll(".exp-section-header").forEach((header) => {
    let sibling = header.nextElementSibling;
    let hasVisible = false;
    while (sibling && !sibling.classList.contains("exp-section-header")) {
      if (sibling.classList.contains("post") && !sibling.hidden) {
        hasVisible = true;
        break;
      }
      sibling = sibling.nextElementSibling;
    }
    header.hidden = !hasVisible;
  });

  if (countEl) {
    countEl.textContent = matchCount === 0
      ? "No results"
      : matchCount === 1 ? "1 result" : `${matchCount} results`;
    countEl.hidden = false;
  }
}

function initGallerySearch() {
  const input = document.getElementById("gallerySearch");
  const inner = input && input.closest(".gallery-search-inner");
  const toggleBtn = document.getElementById("gallerySearchToggle");
  const clearBtn = document.getElementById("gallerySearchClear");
  if (!input) return;

  function openSearch() {
    inner && inner.classList.add("open");
    input.focus();
  }

  function clearSearch() {
    input.value = "";
    filterGallery("");
    if (clearBtn) clearBtn.hidden = true;
    inner && inner.classList.remove("open");
    input.blur();
  }

  toggleBtn && toggleBtn.addEventListener("click", () => {
    if (inner && inner.classList.contains("open")) {
      clearSearch();
    } else {
      openSearch();
    }
  });

  clearBtn && clearBtn.addEventListener("click", clearSearch);

  input.addEventListener("input", () => {
    filterGallery(input.value);
    if (clearBtn) clearBtn.hidden = !input.value;
    if (input.value && inner) inner.classList.add("open");
  });

  input.addEventListener("blur", () => {
    // Only collapse if empty
    if (!input.value && inner) {
      setTimeout(() => {
        if (!input.value) inner.classList.remove("open");
      }, 150);
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clearSearch();
      e.preventDefault();
    }
  });

  // Clear search when navigating away from gallery
  window.addEventListener("hashchange", () => {
    if (!(location.hash || "").toLowerCase().startsWith("#/gallery")) {
      clearSearch();
    }
  });
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
  // Sync floating player visibility with current view
  updatePlaylistUI();
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
    const totalRez = [
      deaths["Rebirthed by druids"],
      deaths["Revived by druids"],
      deaths["Resurrected by priests"],
      deaths["Raised by death knights"],
      deaths["Redeemed by paladins"],
      deaths["Restored by paladins"],
      deaths["Resuscitated by monks"],
      deaths["Returned by evokers"],
      deaths["Spirit returned to body by shamans"],
      deaths["Resurrected by soulstones"],
    ].reduce((sum, v) => sum + (v || 0), 0);

    breakdown.innerHTML = [
      deathRow("Falling", deaths["Deaths from falling"]),
      deathRow("Drowning", deaths["Deaths from drowning"]),
      deathRow("Fatigue", deaths["Deaths from fatigue"]),
      deathRow("Fire & Lava", deaths["Deaths from fire and lava"]),
      deathRow("In Dungeons", deaths["Total deaths in dungeons"]),
      deathRow("In Raids", deaths["Total deaths in raids"]),
      deathRow("Times Rezzed", totalRez || null),
    ].filter(Boolean).join("");
  }

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


}

// ==========================
// Expansion timeline slider
// ==========================

function buildExpansionSlider(groups) {
  EXP_GROUPS = groups;
  const slider = document.getElementById("expansionSlider");
  if (!slider || groups.length === 0) {
    if (slider) slider.hidden = true;
    return;
  }
  slider.hidden = false;
  slider.style.display = "";

  const totalPosts = groups.reduce((s, g) => s + g.posts.length, 0);
  const segmentsHtml = groups
    .map((g, i) => {
      const pct = (g.posts.length / totalPosts) * 100;
      return `<button type="button" class="exp-seg" data-idx="${i}"
        style="flex-basis:${pct}%; --exp-color:${g.exp.color}"
        aria-label="${g.exp.name}"
        title="${g.exp.name} · ${g.posts.length} post${g.posts.length === 1 ? "" : "s"}"></button>`;
    })
    .join("");

  slider.innerHTML = `
    <div class="exp-track" id="expTrack">
      <div class="exp-segments">${segmentsHtml}</div>
      <div class="exp-thumb" id="expThumb" tabindex="0" role="slider"
           aria-valuemin="0" aria-valuemax="${groups.length - 1}" aria-valuenow="0"
           aria-label="Expansion timeline"></div>
    </div>
  `;

  // Click on a segment → jump to that expansion
  slider.querySelectorAll(".exp-seg").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(btn.dataset.idx);
      scrollToExpansion(idx);
    });
  });

  const thumb = document.getElementById("expThumb");
  const track = document.getElementById("expTrack");

  const onPointerMove = (clientX) => {
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const idx = ratioToGroupIndex(ratio);
    setThumbToGroup(idx, false);
    scrollToExpansion(idx, "auto");
  };

  const startDrag = (e) => {
    EXP_SLIDER_DRAGGING = true;
    document.body.classList.add("exp-dragging");
    const move = (ev) => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      onPointerMove(x);
      ev.preventDefault();
    };
    const end = () => {
      EXP_SLIDER_DRAGGING = false;
      document.body.classList.remove("exp-dragging");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    onPointerMove(x);
    e.preventDefault();
  };
  thumb.addEventListener("mousedown", startDrag);
  thumb.addEventListener("touchstart", startDrag, { passive: false });
  track.addEventListener("mousedown", (e) => {
    if (e.target.closest(".exp-seg")) return; // segments handle their own click
    startDrag(e);
  });

  thumb.addEventListener("keydown", (e) => {
    const cur = Number(thumb.getAttribute("aria-valuenow")) || 0;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      const i = Math.max(0, cur - 1);
      setThumbToGroup(i, false);
      scrollToExpansion(i);
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      const i = Math.min(EXP_GROUPS.length - 1, cur + 1);
      setThumbToGroup(i, false);
      scrollToExpansion(i);
      e.preventDefault();
    }
  });

  // Initial sync
  setThumbToGroup(0, true);
}

function ratioToGroupIndex(ratio) {
  if (!EXP_GROUPS.length) return 0;
  const total = EXP_GROUPS.reduce((s, g) => s + g.posts.length, 0);
  let acc = 0;
  for (let i = 0; i < EXP_GROUPS.length; i++) {
    const w = EXP_GROUPS[i].posts.length / total;
    if (ratio <= acc + w) return i;
    acc += w;
  }
  return EXP_GROUPS.length - 1;
}

function groupIndexToRatio(idx) {
  if (!EXP_GROUPS.length) return 0;
  const total = EXP_GROUPS.reduce((s, g) => s + g.posts.length, 0);
  let acc = 0;
  for (let i = 0; i < idx; i++) acc += EXP_GROUPS[i].posts.length / total;
  // Center of segment
  acc += EXP_GROUPS[idx].posts.length / total / 2;
  return acc;
}

function setThumbToGroup(idx, updateRange) {
  const thumb = document.getElementById("expThumb");
  const slider = document.getElementById("expansionSlider");
  if (!thumb || !slider || !EXP_GROUPS[idx]) return;
  const ratio = groupIndexToRatio(idx);
  thumb.style.left = (ratio * 100).toFixed(3) + "%";
  thumb.setAttribute("aria-valuenow", String(idx));
  thumb.style.setProperty("--exp-color", EXP_GROUPS[idx].exp.color);

  // Highlight active segment
  slider.querySelectorAll(".exp-seg").forEach((el, i) => {
    el.classList.toggle("active", i === idx);
  });

  // Update the readout
  const nameEl = slider.querySelector(".exp-current-name");
  const rangeEl = slider.querySelector(".exp-current-range");
  if (nameEl) nameEl.textContent = EXP_GROUPS[idx].exp.name;
  if (rangeEl) {
    const g = EXP_GROUPS[idx];
    const first = g.posts[g.posts.length - 1]._date;
    const last = g.posts[0]._date;
    const fmt = (d) =>
      d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    rangeEl.textContent =
      (first.getTime() === last.getTime() ? fmt(first) : fmt(first) + " – " + fmt(last)) +
      " · " + g.posts.length + " post" + (g.posts.length === 1 ? "" : "s");
  }
}

function scrollToExpansion(idx, behavior) {
  const g = EXP_GROUPS[idx];
  if (!g) return;
  const header = document.getElementById("exp-section-" + g.exp.id);
  if (!header) return;
  // Offset so the section header lands just below the sticky slider (and navbar).
  const slider = document.getElementById("expansionSlider");
  const sliderRect = slider ? slider.getBoundingClientRect() : null;
  const navOffset = sliderRect ? sliderRect.bottom + 8 : 100;
  const top = header.getBoundingClientRect().top + window.scrollY - navOffset;
  window.scrollTo({ top, behavior: behavior || "smooth" });
}

// Sync the slider thumb with the current scroll position.
function syncSliderToScroll() {
  if (EXP_SLIDER_DRAGGING || !EXP_GROUPS.length) return;
  if (!document.body.classList.contains("view-gallery")) return;
  // The active expansion is the last header whose top is above the trigger line.
  const slider = document.getElementById("expansionSlider");
  const sliderRect = slider ? slider.getBoundingClientRect() : null;
  const trigger = sliderRect ? sliderRect.bottom + 16 : 140;
  let activeIdx = 0;
  for (let i = 0; i < EXP_GROUPS.length; i++) {
    const el = document.getElementById("exp-section-" + EXP_GROUPS[i].exp.id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top;
    if (top - trigger <= 0) activeIdx = i;
    else break;
  }
  setThumbToGroup(activeIdx, true);
}

window.addEventListener(
  "scroll",
  () => {
    if (EXP_SCROLL_RAF) return;
    EXP_SCROLL_RAF = requestAnimationFrame(() => {
      EXP_SCROLL_RAF = 0;
      syncSliderToScroll();
    });
  },
  { passive: true }
);
window.addEventListener("hashchange", () => setTimeout(syncSliderToScroll, 50));
