// Newsletter list (/newsletter) and single issue (/newsletter-issue?issue=N) pages.
// Issues come from /api/newsletters, which reads the Mailchimp archive.
(function () {
  const ARCHIVE_URL = 'https://us12.campaign-archive.com/home/?u=0a5fd5ca7498cd5715ccaa6bc&id=929e2eace3';

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatDate(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function issueTitle(issue) {
    return issue.title || 'Generic Foiling Newsletter #' + issue.number;
  }

  function issueUrl(issue) {
    return '/newsletter-issue.html?issue=' + issue.number;
  }

  function failed(el) {
    el.innerHTML = '<p class="posts-status">We couldn&rsquo;t load the newsletters just now. ' +
      '<a href="' + ARCHIVE_URL + '" target="_blank" rel="noopener">Read them on Mailchimp instead &rarr;</a></p>';
  }

  const issues = fetch('/api/newsletters').then(res => {
    if (!res.ok) throw new Error('Newsletter fetch failed: ' + res.status);
    return res.json();
  });

  // ---- List page ----
  const list = document.getElementById('issueList');
  if (list) {
    issues.then(all => {
      list.innerHTML = all.map(issue => `
        <a class="post-card" href="${issueUrl(issue)}">
          <div class="post-card-media">
            ${issue.image ? `<img src="${escapeHtml(issue.image)}" alt="" loading="lazy">` : ''}
            <div class="num">#${issue.number}</div>
          </div>
          <div class="post-card-body">
            <span class="issue-date">${formatDate(issue.date)}</span>
            <h3>${escapeHtml(issueTitle(issue))}</h3>
            <p>${escapeHtml(issue.excerpt)}</p>
            <span class="read-more">Read issue &rarr;</span>
          </div>
        </a>`).join('');
    }).catch(err => { console.error(err); failed(list); });
  }

  // ---- Single issue page ----
  const post = document.getElementById('post');
  if (post) {
    const wanted = Number(new URLSearchParams(location.search).get('issue'));
    issues.then(all => {
      const index = wanted ? all.findIndex(i => i.number === wanted) : 0;
      const issue = all[index];
      if (!issue) {
        document.getElementById('postTitle').textContent = 'Issue not found';
        document.getElementById('postBody').innerHTML = '<p><a href="/newsletter.html">See all the newsletters &rarr;</a></p>';
        return;
      }
      document.title = issueTitle(issue) + ' | The Generic Foiling Podcast';
      document.getElementById('postMeta').textContent = 'Issue #' + issue.number + ' · ' + formatDate(issue.date);
      document.getElementById('postTitle').textContent = issueTitle(issue);
      document.getElementById('postBody').innerHTML = issue.html;

      // List is newest first, so "newer" is the one before this in the list
      const newer = all[index - 1];
      const older = all[index + 1];
      document.getElementById('postNav').innerHTML =
        (older ? `<a class="older" href="${issueUrl(older)}"><span>&larr; Older</span>${escapeHtml(issueTitle(older))}</a>` : '<span></span>') +
        (newer ? `<a class="newer" href="${issueUrl(newer)}"><span>Newer &rarr;</span>${escapeHtml(issueTitle(newer))}</a>` : '<span></span>');
    }).catch(err => { console.error(err); failed(document.getElementById('postBody')); });
  }
})();
