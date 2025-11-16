// Cache configuration
const CACHE_NAME = "yfc-cache-v1";
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

async function fetchPosts() {
  try {
    // Try to get cached data first
    const cachedData = getCachedData("posts");
    if (cachedData) {
      cachedData.reverse().forEach(createPost);
      return;
    }

    const response = await fetch("posts.json");
    const posts = await response.json();

    // Cache the posts data
    setCachedData("posts", posts);

    // Reverse to show newest first (left to right, top to bottom like a comic)
    posts.reverse().forEach(createPost);
  } catch (error) {
    console.error("Error fetching posts:", error);
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
  button.innerHTML =
    window.innerHeight + window.scrollY >= document.body.offsetHeight
      ? "⬆"
      : "⬇";
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
