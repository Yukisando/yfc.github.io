window.addEventListener('resize', function () {
    var width = window.innerWidth;
    var title = document.getElementById('title');
    if (width <= 767) {
        title.textContent = 'Yükisan F.C';
    } else {
        title.textContent = 'Yükisan Fan Club';
    }
});

async function fetchPosts() {
    try {
        const response = await fetch("posts.json");
        const posts = await response.json();
        posts.forEach(createPost);
    } catch (error) {
        console.error("Error fetching posts:", error);
    }
}

function createPost(post) {
    const postElement = document.createElement("div");
    postElement.className = "post";
    let imagesHtml = "";
    post.images.forEach((img) => {
        imagesHtml += `<img src="${img}" alt="post image">`;
    });
    postElement.innerHTML = `
        <h3>${post.date}</h3>
        <div>${post.content}</div>
        <div>${imagesHtml}</div>
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