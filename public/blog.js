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
