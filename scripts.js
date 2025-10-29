async function fetchPosts() {
    try {
        const response = await fetch("posts.json");
        const posts = await response.json();
        // Reverse to show newest first (left to right, top to bottom)
        posts.reverse().forEach(createPost);
    } catch (error) {
        console.error("Error fetching posts:", error);
    }
}

function createPost(post) {
    const postElement = document.createElement("div");
    postElement.className = "post";
    
    let imagesHtml = "";
    post.images.forEach((img, index) => {
        // Create a container for each image with blur placeholder
        imagesHtml += `
            <div class="image-container">
                <div class="image-placeholder"></div>
                <img 
                    src="${img}" 
                    alt="post image" 
                    class="post-image lazy-load"
                    loading="lazy"
                    onload="this.classList.add('loaded')"
                >
            </div>
        `;
    });
    
    postElement.innerHTML = `
        <h3>${post.date}</h3>
        <div class="post-content">${post.content}</div>
        <div class="images-grid">${imagesHtml}</div>
    `;
    document.getElementById("posts-container").appendChild(postElement);
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
