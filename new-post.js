// Modal open/close logic
function openNewPostModal() {
  document.getElementById('newPostModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function closeNewPostModal() {
  document.getElementById('newPostModal').style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('newPostForm').reset();
  document.getElementById('newPostStatus').textContent = '';
}

// Modal close on outside click
window.addEventListener('click', function(e) {
  const modal = document.getElementById('newPostModal');
  if (e.target === modal) closeNewPostModal();
});

// Responsive: modal content CSS is in styles.css

// Form handler
const form = document.getElementById('newPostForm');
if (form) {
  form.onsubmit = async function(e) {
    e.preventDefault();
    const status = document.getElementById('newPostStatus');
    status.textContent = 'Submitting…';
    const fd = new FormData(form);
    // Validate date
    if (!/^\d{2}-\d{2}-\d{4}$/.test(fd.get('date'))) {
      status.textContent = 'Date must be DD-MM-YYYY.';
      return;
    }
    // Read images as base64
    const files = fd.getAll('images');
    const images = [];
    for (const file of files) {
      if (!file || !file.type.startsWith('image/')) continue;
      images.push(await fileToDataURL(file));
    }
    if (!images.length) {
      status.textContent = 'Please select at least one image.';
      return;
    }
    // Build payload
    const payload = {
      date: fd.get('date'),
      content: fd.get('content'),
      images,
      password: fd.get('password')
    };
    // POST to GitHub Action endpoint
    try {
      const resp = await fetch('https://api.github.com/repos/Yukisando/yfc.github.io/dispatches', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.everest-preview+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: 'add-new-post',
          client_payload: { post_data: JSON.stringify(payload) }
        })
      });
      if (resp.ok) {
        status.textContent = 'Submitted! Your post will appear soon.';
        setTimeout(closeNewPostModal, 2000);
      } else {
        status.textContent = 'Error: ' + resp.status + ' (are you rate-limited?)';
      }
    } catch (err) {
      status.textContent = 'Network error.';
    }
  };
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
