(function () {
  // State
  let feedbackMode = false;
  let feedbackItems = [];
  let pendingClick = null;
  let currentDetail = null;

  // DOM refs
  const toggle = document.getElementById('feedbackToggle');
  const countEl = document.getElementById('feedbackCount');
  const banner = document.getElementById('feedbackBanner');
  const doneBtn = document.getElementById('feedbackDone');
  const popup = document.getElementById('feedbackPopup');
  const textArea = document.getElementById('feedbackText');
  const cancelBtn = document.getElementById('feedbackCancel');
  const submitBtn = document.getElementById('feedbackSubmit');
  const panel = document.getElementById('feedbackPanel');
  const panelClose = document.getElementById('feedbackPanelClose');
  const panelList = document.getElementById('feedbackPanelList');
  const panelOverlay = document.getElementById('feedbackPanelOverlay');

  if (!toggle) return;

  // ---- API helpers ----
  function apiGet() {
    return fetch('/api/feedback').then(r => r.json());
  }

  function apiPost(item) {
    return fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  }

  function apiDelete(id) {
    return fetch('/api/feedback?id=' + encodeURIComponent(id), { method: 'DELETE' });
  }

  // ---- Screenshot ----
  let html2canvasLoaded = false;

  function loadHtml2Canvas() {
    if (html2canvasLoaded || window.html2canvas) { html2canvasLoaded = true; return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    s.onload = function () { html2canvasLoaded = true; };
    document.head.appendChild(s);
  }

  function captureScreenshot() {
    if (!window.html2canvas) return Promise.resolve(null);
    return html2canvas(document.body, {
      scale: 0.5,
      logging: false,
      useCORS: true,
      ignoreElements: function (el) {
        return el.classList && (
          el.classList.contains('feedback-popup') ||
          el.classList.contains('feedback-panel') ||
          el.classList.contains('feedback-panel-overlay') ||
          el.classList.contains('feedback-detail')
        );
      }
    }).then(function (canvas) {
      return canvas.toDataURL('image/jpeg', 0.5);
    }).catch(function () { return null; });
  }

  // ---- Feedback mode ----
  function enterFeedback() {
    feedbackMode = true;
    document.body.classList.add('feedback-mode');
    loadHtml2Canvas();
  }

  function exitFeedback() {
    feedbackMode = false;
    document.body.classList.remove('feedback-mode');
    hidePopup();
    closeDetail();
  }

  // ---- Toggle click: short = enter/exit mode, long-press or shift = open panel ----
  toggle.addEventListener('click', function (e) {
    if (e.shiftKey) {
      openPanel();
      return;
    }
    if (feedbackMode) {
      exitFeedback();
    } else {
      enterFeedback();
    }
  });

  // Right-click toggle to open panel
  toggle.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    openPanel();
  });

  doneBtn.addEventListener('click', function () {
    exitFeedback();
  });

  // ---- Page click in feedback mode ----
  document.addEventListener('click', function (e) {
    if (!feedbackMode) return;

    // Ignore clicks on feedback UI
    if (e.target.closest('.feedback-toggle, .feedback-banner, .feedback-popup, .feedback-pin, .feedback-detail, .feedback-panel, .feedback-panel-overlay')) return;

    e.preventDefault();
    e.stopPropagation();
    showPopup(e.pageX, e.pageY, e.clientX, e.clientY);
  }, true);

  // ---- Popup ----
  function showPopup(pageX, pageY, clientX, clientY) {
    pendingClick = { x: pageX, y: pageY };
    textArea.value = '';
    popup.classList.add('visible');

    var pw = 280, ph = 200;
    var left = clientX + 16;
    var top = clientY + 16;
    if (left + pw > window.innerWidth - 16) left = clientX - pw - 16;
    if (top + ph > window.innerHeight - 16) top = Math.max(16, clientY - ph - 16);

    popup.style.position = 'fixed';
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    textArea.focus();
  }

  function hidePopup() {
    popup.classList.remove('visible');
    pendingClick = null;
  }

  cancelBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    hidePopup();
  });

  submitBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var comment = textArea.value.trim();
    if (!comment || !pendingClick) return;

    var x = pendingClick.x;
    var y = pendingClick.y;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    captureScreenshot().then(function (screenshot) {
      var item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        page: location.pathname.replace(/\/$/, '') || '/',
        x: x,
        y: y,
        comment: comment,
        screenshot: screenshot,
        timestamp: Date.now(),
      };

      return apiPost(item).then(function () {
        feedbackItems.push(item);
        updateCount();
        renderPins();
        hidePopup();
      });
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    });
  });

  // ---- Pins ----
  function clearPins() {
    document.querySelectorAll('.feedback-pin').forEach(function (p) { p.remove(); });
  }

  function renderPins() {
    clearPins();
    var currentPage = location.pathname.replace(/\/$/, '') || '/';
    feedbackItems.forEach(function (item, i) {
      if (item.page !== currentPage) return;
      var pin = document.createElement('div');
      pin.className = 'feedback-pin';
      pin.textContent = i + 1;
      pin.style.left = item.x + 'px';
      pin.style.top = item.y + 'px';
      pin.dataset.feedbackId = item.id;
      pin.addEventListener('click', function (e) {
        e.stopPropagation();
        showDetail(item, pin);
      });
      document.body.appendChild(pin);
    });
  }

  // ---- Detail popover ----
  function showDetail(item, pinEl) {
    closeDetail();
    var detail = document.createElement('div');
    detail.className = 'feedback-detail';

    var ssHTML = '';
    if (item.screenshot) {
      ssHTML = '<img class="feedback-detail-screenshot" src="' + item.screenshot + '" alt="Screenshot">';
    }

    detail.innerHTML =
      '<button class="feedback-detail-close">&times;</button>' +
      '<div class="feedback-detail-comment">' + escapeHTML(item.comment) + '</div>' +
      '<div class="feedback-detail-time">' + new Date(item.timestamp).toLocaleString() + '</div>' +
      ssHTML;

    document.body.appendChild(detail);
    currentDetail = detail;

    // Position near pin
    var rect = pinEl.getBoundingClientRect();
    var dw = 300, dh = detail.offsetHeight || 200;
    var left = rect.right + 12;
    var top = rect.top + window.scrollY;
    if (left + dw > window.innerWidth - 16) left = rect.left - dw - 12;
    if (top + dh > window.scrollY + window.innerHeight - 16) top = Math.max(window.scrollY + 16, top - dh + 28);

    detail.style.left = left + 'px';
    detail.style.top = top + 'px';

    detail.querySelector('.feedback-detail-close').addEventListener('click', function (e) {
      e.stopPropagation();
      closeDetail();
    });
  }

  function closeDetail() {
    if (currentDetail) {
      currentDetail.remove();
      currentDetail = null;
    }
  }

  // ---- Panel ----
  function openPanel() {
    renderPanelList();
    panel.classList.add('open');
    panelOverlay.classList.add('open');
  }

  function closePanel() {
    panel.classList.remove('open');
    panelOverlay.classList.remove('open');
  }

  panelClose.addEventListener('click', closePanel);
  panelOverlay.addEventListener('click', closePanel);

  function renderPanelList() {
    if (feedbackItems.length === 0) {
      panelList.innerHTML = '<div class="feedback-panel-empty">No feedback yet.</div>';
      return;
    }
    panelList.innerHTML = feedbackItems.map(function (item, i) {
      var ssHTML = '';
      if (item.screenshot) {
        ssHTML = '<img class="feedback-item-screenshot" src="' + item.screenshot + '" alt="Screenshot">';
      }
      return '<div class="feedback-item" data-id="' + item.id + '">' +
        '<div class="feedback-item-header">' +
          '<div class="feedback-item-pin">' + (i + 1) + '</div>' +
          '<span class="feedback-item-page">' + escapeHTML(item.page) + '</span>' +
          '<span class="feedback-item-time">' + new Date(item.timestamp).toLocaleString() + '</span>' +
          '<button class="feedback-item-delete" title="Delete">&times;</button>' +
        '</div>' +
        '<div class="feedback-item-comment">' + escapeHTML(item.comment) + '</div>' +
        ssHTML +
      '</div>';
    }).join('');

    // Delete handlers
    panelList.querySelectorAll('.feedback-item-delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.closest('.feedback-item').dataset.id;
        apiDelete(id).then(function () {
          feedbackItems = feedbackItems.filter(function (it) { return it.id !== id; });
          updateCount();
          renderPins();
          renderPanelList();
        });
      });
    });
  }

  // ---- Count badge ----
  function updateCount() {
    if (feedbackItems.length > 0) {
      countEl.textContent = feedbackItems.length;
      countEl.classList.add('visible');
    } else {
      countEl.textContent = '';
      countEl.classList.remove('visible');
    }
  }

  // ---- Helpers ----
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Init: load feedback from API ----
  apiGet()
    .then(function (items) {
      feedbackItems = items || [];
      updateCount();
      renderPins();
    })
    .catch(function () {
      feedbackItems = [];
    });
})();
