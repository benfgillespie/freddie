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
      if (post.image) {
        const fig = document.getElementById('postImage');
        fig.querySelector('img').src = post.image;
        fig.hidden = false;
      }
      document.getElementById('postBody').innerHTML = body;

      // PDF viewer — if this post has a pdf field, render it with PDF.js
      if (post.pdf) {
        var pdfScript = document.createElement('script');
        pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        pdfScript.onload = function () {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          var container = document.getElementById('pdf-viewer');
          if (!container) return;

          pdfjsLib.getDocument(post.pdf).promise.then(function (pdf) {
            var total = pdf.numPages;
            var canvases = [];

            // Render all pages stacked
            for (var i = 1; i <= total; i++) {
              (function (pageNum) {
                var wrap = document.createElement('div');
                wrap.className = 'pdf-canvas-wrap';
                wrap.title = 'Click to view full screen';
                var c = document.createElement('canvas');
                wrap.appendChild(c);
                container.appendChild(wrap);
                canvases[pageNum - 1] = c;

                pdf.getPage(pageNum).then(function (page) {
                  var vp = page.getViewport({ scale: 2 });
                  c.width  = vp.width;
                  c.height = vp.height;
                  c.style.width  = '100%';
                  c.style.height = 'auto';
                  page.render({ canvasContext: c.getContext('2d'), viewport: vp });
                });

                wrap.addEventListener('click', function () { openModal(pageNum); });
              })(i);
            }

            // Fullscreen modal — shows already-rendered canvases as images (no re-render)
            function openModal(startPage) {
              var mPage = startPage;
              var modal = document.createElement('div');
              modal.className = 'pdf-modal';
              modal.innerHTML =
                '<div class="pdf-modal-nav">' +
                  '<button class="pdf-modal-prev">&#8249; Prev</button>' +
                  '<span class="pdf-modal-counter">Page ' + mPage + ' of ' + total + '</span>' +
                  '<button class="pdf-modal-next">Next &#8250;</button>' +
                  '<button class="pdf-modal-close">&#10005; Close</button>' +
                '</div>' +
                '<div class="pdf-modal-canvas-wrap">' +
                  '<img class="pdf-modal-img" src="" alt="Magazine page">' +
                '</div>';
              document.body.appendChild(modal);
              document.body.style.overflow = 'hidden';

              var img    = modal.querySelector('.pdf-modal-img');
              var mCtr   = modal.querySelector('.pdf-modal-counter');
              var mPrev  = modal.querySelector('.pdf-modal-prev');
              var mNext  = modal.querySelector('.pdf-modal-next');
              var mClose = modal.querySelector('.pdf-modal-close');
              var wrap   = modal.querySelector('.pdf-modal-canvas-wrap');

              function showModal(num) {
                var c = canvases[num - 1];
                if (c) img.src = c.toDataURL();
                wrap.scrollTo(0, 0);
                mCtr.textContent = 'Page ' + num + ' of ' + total;
                mPrev.disabled = num === 1;
                mNext.disabled = num === total;
              }

              mPrev.addEventListener('click',  function () { if (mPage > 1)     showModal(--mPage); });
              mNext.addEventListener('click',  function () { if (mPage < total) showModal(++mPage); });

              function closeModal() { document.body.removeChild(modal); document.body.style.overflow = ''; }
              mClose.addEventListener('click', closeModal);
              modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
              document.addEventListener('keydown', function esc(e) {
                if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
                if (e.key === 'ArrowRight' && mPage < total) showModal(++mPage);
                if (e.key === 'ArrowLeft'  && mPage > 1)    showModal(--mPage);
              });

              showModal(mPage);
            }
          });
        };
        document.head.appendChild(pdfScript);
      }

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
