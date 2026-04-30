// Modal open/close logic
function openNewPostModal() {
  document.getElementById('newPostModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
  // Pre-fill date with today
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const today = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  const dateInput = document.getElementById('newPostDate');
  if (dateInput) dateInput.value = today;
  // Reset file count
  const fileCount = document.getElementById('fileCount');
  if (fileCount) fileCount.textContent = '';
}
function closeNewPostModal() {
  document.getElementById('newPostModal').style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('newPostForm').reset();
  document.getElementById('newPostStatus').textContent = '';
  const fileCount = document.getElementById('fileCount');
  if (fileCount) fileCount.textContent = '';
}

// Modal close on outside click
window.addEventListener('click', function(e) {
  const modal = document.getElementById('newPostModal');
  if (e.target === modal) closeNewPostModal();
});

// Date picker logic
function showDatePicker(input) {
  // Create a hidden native date input
  let picker = document.getElementById('hiddenDatePicker');
  if (!picker) {
    picker = document.createElement('input');
    picker.type = 'date';
    picker.id = 'hiddenDatePicker';
    picker.style.position = 'absolute';
    picker.style.opacity = 0;
    picker.style.pointerEvents = 'none';
    document.body.appendChild(picker);
    picker.addEventListener('change', function() {
      if (picker.value) {
        const [y, m, d] = picker.value.split('-');
        input.value = `${d}-${m}-${y}`;
      }
    });
  }
  // Set picker value to current input value
  const val = input.value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (val) picker.value = `${val[3]}-${val[2]}-${val[1]}`;
  picker.focus();
  picker.click();
}

// File input: show file count
const imgInput = document.getElementById('newPostImages');
if (imgInput) {
  imgInput.addEventListener('change', function() {
    const fileCount = document.getElementById('fileCount');
    if (fileCount) {
      fileCount.textContent = imgInput.files.length ? `${imgInput.files.length} file(s) selected` : '';
    }
  });
}

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
    // POST to Vercel function endpoint
    try {
      const resp = await fetch('https://project-mtfzm.vercel.app/api/new-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        status.textContent = 'Submitted! Your post will appear soon.';
        setTimeout(closeNewPostModal, 2000);
      } else {
        const data = await resp.json().catch(() => ({}));
        status.textContent = 'Error: ' + (data.error || resp.status);
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
