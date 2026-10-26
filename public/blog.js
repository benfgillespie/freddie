// Blog list (/blog) and single post (/blog-post?post=slug) pages.
// Posts are listed in blog/posts.json (newest first); each post's writing lives in
// blog/<slug>.html. Posts marked "draft": true only show in the local preview.
(function () {
  const isPreview = ['localhost', '127.0.0.1'].includes(location.hostname);

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatDate(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function postUrl(post) {
    return '/blog-post.html?post=' + encodeURIComponent(post.slug);
  }

  const posts = fetch('/blog/posts.json')
    .then(res => {
      if (!res.ok) throw new Error('Blog fetch failed: ' + res.status);
      return res.json();
    })
    .then(all => all.filter(p => isPreview || !p.draft));

  // ---- Foil Mag article: flick through the spreads, open full screen to zoom in and read ----
  // <div class="mag" data-dir="/img/blog/foil-mag/<slug>" data-pages="4" data-title="...">
  // expects page-1.jpg (on-page size) and page-1-full.jpg (sharp enough to read when zoomed).
  function magazine(el) {
    const dir = el.dataset.dir, total = Number(el.dataset.pages), title = el.dataset.title || 'Foil Mag';
    const src = (n, full) => `${dir}/page-${n}${full ? '-full' : ''}.jpg`;
    const pages = Array.from({ length: total }, (_, i) => i + 1);
    let page = 1;

    el.innerHTML = `
      <div class="mag-stage" title="Open full screen to zoom in and read">
        <img src="${src(1)}" alt="${escapeHtml(title)}, page 1 of ${total}">
        <button class="mag-arrow prev" aria-label="Previous pages">&lsaquo;</button>
        <button class="mag-arrow next" aria-label="Next pages">&rsaquo;</button>
      </div>
      <div class="mag-bar"><span class="mag-count"></span><button class="mag-zoom-btn">&#128269; Full screen &amp; zoom to read</button></div>
      <div class="mag-thumbs">${pages.map(n => `<button aria-label="Page ${n}"><img src="${src(n)}" alt="" loading="lazy"></button>`).join('')}</div>`;

    const stage = el.querySelector('.mag-stage'), img = stage.querySelector('img');
    const prev = stage.querySelector('.prev'), next = stage.querySelector('.next');
    const thumbs = el.querySelectorAll('.mag-thumbs button');

    function show(n) {
      page = Math.min(Math.max(n, 1), total);
      img.src = src(page);
      img.alt = `${title}, page ${page} of ${total}`;
      prev.disabled = page === 1;
      next.disabled = page === total;
      el.querySelector('.mag-count').textContent = `Page ${page} of ${total}`;
      thumbs.forEach((t, i) => t.classList.toggle('on', i + 1 === page));
      if (page < total) new Image().src = src(page + 1);
    }

    prev.addEventListener('click', e => { e.stopPropagation(); show(page - 1); });
    next.addEventListener('click', e => { e.stopPropagation(); show(page + 1); });
    thumbs.forEach((t, i) => t.addEventListener('click', () => show(i + 1)));
    el.querySelector('.mag-zoom-btn').addEventListener('click', () => openReader());

    // Swipe sideways on a phone to turn the page, tap to open full screen
    let startX = null;
    stage.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { show(page + (dx < 0 ? 1 : -1)); e.preventDefault(); }
    });
    stage.addEventListener('click', () => openReader());

    function openReader() {
      const reader = document.createElement('div');
      reader.className = 'mag-reader';
      reader.innerHTML = `
        <div class="mag-reader-bar">
          <button class="prev" aria-label="Previous pages">&lsaquo;</button>
          <button class="next" aria-label="Next pages">&rsaquo;</button>
          <span class="count"></span>
          <button class="out" aria-label="Zoom out">&minus;</button>
          <button class="in" aria-label="Zoom in">+</button>
          <button class="close">&#10005; Close</button>
        </div>
        <div class="mag-view"><img alt=""></div>
        <div class="mag-reader-tip">Tap or click the page to zoom in, then drag to move around.</div>`;
      document.body.appendChild(reader);
      document.body.style.overflow = 'hidden';

      const view = reader.querySelector('.mag-view'), big = view.querySelector('img');
      const steps = [1, 1.75, 2.5, 3.5];
      let zoom = 0, ratio = 1191 / 780;

      function fitWidth() { return Math.min(view.clientWidth, view.clientHeight * ratio); }

      // Zoom keeping the spot under the finger/cursor (or the middle) where it is
      function setZoom(z, x, y) {
        zoom = Math.min(Math.max(z, 0), steps.length - 1);
        const before = big.getBoundingClientRect();
        const vr = view.getBoundingClientRect();
        if (x == null) { x = vr.left + vr.width / 2; y = vr.top + vr.height / 2; }
        const fx = before.width ? (x - before.left) / before.width : 0.5;
        const fy = before.height ? (y - before.top) / before.height : 0.5;
        big.style.width = Math.round(fitWidth() * steps[zoom]) + 'px';
        const after = big.getBoundingClientRect();
        view.scrollLeft += after.left + fx * after.width - x;
        view.scrollTop += after.top + fy * after.height - y;
        view.classList.toggle('zoomed', zoom > 0);
        reader.querySelector('.out').disabled = zoom === 0;
        reader.querySelector('.in').disabled = zoom === steps.length - 1;
      }

      function go(n) {
        show(n);
        reader.querySelector('.prev').disabled = page === 1;
        reader.querySelector('.next').disabled = page === total;
        reader.querySelector('.count').textContent = `Page ${page} of ${total}`;
        big.alt = img.alt;
        big.src = src(page);              // quick version first, then swap in the sharp one
        const sharp = new Image(), want = page;
        sharp.onload = () => { if (page === want) big.src = sharp.src; };
        sharp.src = src(page, true);
        setZoom(0);
        view.scrollTo(0, 0);
      }

      // Drag with the mouse to move around a zoomed page (fingers scroll it natively)
      let drag = null, moved = false;
      view.addEventListener('pointerdown', e => {
        moved = false;
        if (e.pointerType !== 'mouse') return;
        drag = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      });
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      function onMove(e) {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; view.classList.add('dragging'); }
        view.scrollLeft -= dx; view.scrollTop -= dy;
        drag = { x: e.clientX, y: e.clientY };
      }
      function onUp() { drag = null; view.classList.remove('dragging'); }

      view.addEventListener('click', e => {
        if (moved) return;
        if (e.target !== big) { if (zoom === 0) close(); return; }
        setZoom(zoom === steps.length - 1 ? 0 : zoom + 1, e.clientX, e.clientY);
      });

      function onKey(e) {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight' && page < total) go(page + 1);
        else if (e.key === 'ArrowLeft' && page > 1) go(page - 1);
        else if (e.key === '+' || e.key === '=') setZoom(zoom + 1);
        else if (e.key === '-') setZoom(zoom - 1);
      }
      function onResize() { setZoom(zoom); }
      document.addEventListener('keydown', onKey);
      window.addEventListener('resize', onResize);

      function close() {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        reader.remove();
        document.body.style.overflow = '';
      }

      reader.querySelector('.prev').addEventListener('click', () => go(page - 1));
      reader.querySelector('.next').addEventListener('click', () => go(page + 1));
      reader.querySelector('.in').addEventListener('click', () => setZoom(zoom + 1));
      reader.querySelector('.out').addEventListener('click', () => setZoom(zoom - 1));
      reader.querySelector('.close').addEventListener('click', close);
      go(page);
    }

    show(1);
  }

  // ---- List page ----
  const list = document.getElementById('blogList');
  if (list) {
    posts.then(all => {
      if (!all.length) {
        list.innerHTML = '<div class="blog-empty"><h3>Nothing here yet</h3>' +
          '<p>The first posts are on their way. In the meantime, have a read of the ' +
          '<a href="/newsletter.html">newsletters</a> or <a href="/episodes.html">have a little listen</a>.</p></div>';
        return;
      }
      list.innerHTML = all.map(post => `
        <a class="post-card" href="${postUrl(post)}">
          <div class="post-card-media">
            ${post.image ? `<img src="${escapeHtml(post.image)}" alt="" loading="lazy">` : ''}
            ${post.draft ? '<div class="num">Draft</div>' : ''}
            ${post.foilmag ? '<span class="foilmag-tag">As featured in Foiling Magazine</span>' : ''}
          </div>
          <div class="post-card-body">
            <span class="issue-date">${formatDate(post.date)}${post.author ? ' · ' + escapeHtml(post.author) : ''}</span>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.excerpt || '')}</p>
            <span class="read-more">Read post &rarr;</span>
          </div>
        </a>`).join('');
    }).catch(err => {
      console.error(err);
      list.innerHTML = '<p class="posts-status">We couldn&rsquo;t load the posts just now.</p>';
    });
  }

  // ---- Single post page ----
  const article = document.getElementById('post');
  if (article) {
    const slug = new URLSearchParams(location.search).get('post');
    posts.then(async all => {
      const index = all.findIndex(p => p.slug === slug);
      const post = all[index];
      if (!post) {
        document.getElementById('postTitle').textContent = 'Post not found';
        document.getElementById('postBody').innerHTML = '<p><a href="/blog.html">See all the posts &rarr;</a></p>';
        return;
      }
      const body = await fetch('/blog/' + encodeURIComponent(post.slug) + '.html').then(r => (r.ok ? r.text() : ''));
      document.title = post.title + ' | The Generic Foiling Podcast';
      document.getElementById('postMeta').textContent = formatDate(post.date) + (post.author ? ' · ' + post.author : '');
      document.getElementById('postTitle').textContent = post.title;
      // Foil Mag posts open on the magazine itself, so they skip the big top photo
      if (post.image && !post.foilmag) {
        const fig = document.getElementById('postImage');
        fig.querySelector('img').src = post.image;
        fig.hidden = false;
      }
      document.getElementById('postBody').innerHTML = body;
      document.querySelectorAll('#postBody .mag').forEach(magazine);

      // Photo strips inside a post scroll sideways with the arrows
      document.querySelectorAll('#postBody .post-gallery').forEach(g => {
        const track = g.querySelector('.gallery-track');
        g.querySelectorAll('.gallery-arrow').forEach(b => b.addEventListener('click', () => {
          const dir = Number(b.dataset.dir);
          const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 5;
          if (dir > 0 && atEnd) track.scrollTo({ left: 0, behavior: 'smooth' });
          else track.scrollBy({ left: dir * (track.querySelector('.gallery-item').offsetWidth + 24), behavior: 'smooth' });
        }));
      });

      // List is newest first, so "newer" is the one before this in the list
      const newer = all[index - 1];
      const older = all[index + 1];
      document.getElementById('postNav').innerHTML =
        (older ? `<a class="older" href="${postUrl(older)}"><span>&larr; Older</span>${escapeHtml(older.title)}</a>` : '<span></span>') +
        (newer ? `<a class="newer" href="${postUrl(newer)}"><span>Newer &rarr;</span>${escapeHtml(newer.title)}</a>` : '<span></span>');
    }).catch(err => {
      console.error(err);
      document.getElementById('postBody').innerHTML = '<p class="posts-status">We couldn&rsquo;t load this post just now.</p>';
    });
  }
})();
