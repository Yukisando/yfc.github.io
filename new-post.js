// Modal open/close logic
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let pickerYear, pickerMonth, pickerSelected;

function openNewPostModal() {
  document.getElementById('newPostModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
  // Pre-fill date with today
  const d = new Date();
  pickerYear = d.getFullYear();
  pickerMonth = d.getMonth();
  pickerSelected = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  _applyPickerDate(pickerSelected);
  // Reset file count
  const fileCount = document.getElementById('fileCount');
  if (fileCount) fileCount.textContent = '';
  // Close calendar if open
  const cal = document.getElementById('dateCalendar');
  if (cal) cal.hidden = true;
}

function closeNewPostModal() {
  document.getElementById('newPostModal').style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('newPostForm').reset();
  document.getElementById('newPostStatus').textContent = '';
  const fileCount = document.getElementById('fileCount');
  if (fileCount) fileCount.textContent = '';
  const cal = document.getElementById('dateCalendar');
  if (cal) cal.hidden = true;
}

function _applyPickerDate(date) {
  const pad = n => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hidden = document.getElementById('newPostDate');
  if (hidden) hidden.value = `${yyyy}-${mm}-${dd}`;
  const display = document.getElementById('dateDisplayText');
  if (display) display.textContent = `${dd} ${MONTH_SHORT[date.getMonth()]} ${yyyy}`;
}

function _renderCalendar() {
  document.getElementById('calMonthYear').textContent = `${MONTH_NAMES[pickerMonth]} ${pickerYear}`;
  const today = new Date();
  const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const grid = document.getElementById('calDays');
  grid.innerHTML = '';
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('span');
    empty.className = 'cal-day cal-empty';
    grid.appendChild(empty);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day';
    btn.textContent = d;
    const isToday = today.getFullYear() === pickerYear && today.getMonth() === pickerMonth && today.getDate() === d;
    const isSel = pickerSelected && pickerSelected.getFullYear() === pickerYear && pickerSelected.getMonth() === pickerMonth && pickerSelected.getDate() === d;
    if (isToday) btn.classList.add('cal-today');
    if (isSel) btn.classList.add('cal-selected');
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      pickerSelected = new Date(pickerYear, pickerMonth, d);
      _applyPickerDate(pickerSelected);
      document.getElementById('dateCalendar').hidden = true;
    });
    grid.appendChild(btn);
  }
}

// Modal close on outside click
window.addEventListener('click', function(e) {
  const modal = document.getElementById('newPostModal');
  if (e.target === modal) closeNewPostModal();
});

// Wire up calendar on DOM ready
window.addEventListener('DOMContentLoaded', function() {
  const modalContent = document.querySelector('#newPostModal .modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', function(e) { e.stopPropagation(); });
  }

  const toggleBtn = document.getElementById('dateDisplay');
  const calendar = document.getElementById('dateCalendar');
  if (toggleBtn && calendar) {
    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      calendar.hidden = !calendar.hidden;
      if (!calendar.hidden) _renderCalendar();
    });
    document.getElementById('calPrev').addEventListener('click', function(e) {
      e.stopPropagation();
      pickerMonth--;
      if (pickerMonth < 0) { pickerMonth = 11; pickerYear--; }
      _renderCalendar();
    });
    document.getElementById('calNext').addEventListener('click', function(e) {
      e.stopPropagation();
      pickerMonth++;
      if (pickerMonth > 11) { pickerMonth = 0; pickerYear++; }
      _renderCalendar();
    });
    document.addEventListener('click', function(e) {
      const picker = document.getElementById('customDatePicker');
      if (picker && !picker.contains(e.target)) calendar.hidden = true;
    });
  }
});

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
    // Format date as DD-MM-YYYY
    let dateVal = fd.get('date');
    if (!dateVal || !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      status.textContent = 'Please pick a date.';
      return;
    }
    const [yyyy, mm, dd] = dateVal.split('-');
    const formattedDate = `${dd}-${mm}-${yyyy}`;
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
      date: formattedDate,
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
