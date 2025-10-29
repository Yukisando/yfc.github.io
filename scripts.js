async function fetchPosts() {
    try {
        const response = await fetch("posts.json");
        const posts = await response.json();
        // Reverse to show newest first (left to right, top to bottom like a comic)
        posts.reverse().forEach(createPost);
    } catch (error) {
        console.error("Error fetching posts:", error);
    }
}

function createPost(post) {
    const postElement = document.createElement("div");
    postElement.className = "post";
    
    let imagesHtml = "";
    
    if (post.images && post.images.length > 0) {
        if (post.images.length === 1) {
            // Single image - simple display
            imagesHtml = `
                <div class="image-container">
                    <div class="image-placeholder"></div>
                    <img 
                        src="${post.images[0]}" 
                        alt="post image" 
                        class="post-image lazy-load"
                        loading="lazy"
                        onload="this.classList.add('loaded')"
                    >
                </div>
            `;
        } else {
            // Multiple images - carousel
            const carouselId = `carousel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const imagesSlides = post.images.map((img, index) => `
                <div class="carousel-slide ${index === 0 ? 'active' : ''}">
                    <div class="image-container">
                        <div class="image-placeholder"></div>
                        <img 
                            src="${img}" 
                            alt="post image ${index + 1}" 
                            class="post-image lazy-load"
                            loading="lazy"
                            onload="this.classList.add('loaded')"
                        >
                    </div>
                </div>
            `).join('');
            
            imagesHtml = `
                <div class="carousel" id="${carouselId}">
                    <div class="carousel-inner">
                        ${imagesSlides}
                    </div>
                    <button class="carousel-btn prev" onclick="changeSlide('${carouselId}', -1)">❮</button>
                    <button class="carousel-btn next" onclick="changeSlide('${carouselId}', 1)">❯</button>
                    <div class="carousel-dots">
                        ${post.images.map((_, i) => `
                            <span class="dot ${i === 0 ? 'active' : ''}" onclick="goToSlide('${carouselId}', ${i})"></span>
                        `).join('')}
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
    document.getElementById("posts-container").appendChild(postElement);
}

function changeSlide(carouselId, direction) {
    const carousel = document.getElementById(carouselId);
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dots = carousel.querySelectorAll('.dot');
    
    let currentIndex = Array.from(slides).findIndex(slide => slide.classList.contains('active'));
    
    slides[currentIndex].classList.remove('active');
    dots[currentIndex].classList.remove('active');
    
    currentIndex = (currentIndex + direction + slides.length) % slides.length;
    
    slides[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');
}

function goToSlide(carouselId, index) {
    const carousel = document.getElementById(carouselId);
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dots = carousel.querySelectorAll('.dot');
    
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    
    slides[index].classList.add('active');
    dots[index].classList.add('active');
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

fetchPosts();
