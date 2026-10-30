// Episodes page (/episodes): every episode from the podcast feed, playable right here.
// One shared player bar sits at the bottom of the screen so listening carries on while
// people search and scroll.
(function () {
  const PER_PAGE = 12;
  const DEFAULT_ARTWORK_FOCUS = 25;
  const SPEEDS = [1, 1.25, 1.5, 2];
  // Most-played episode numbers, best first. The Top 10 button shows once this is filled in.
  const TOP_TEN = [36, 128, 142, 38, 60, 101, 143, 40, 136, 114];

  const grid = document.getElementById('episodeGrid');
  const search = document.getElementById('epSearch');
  const count = document.getElementById('epCount');
  const moreBtn = document.getElementById('loadMoreBtn');

  let episodes = [];
  let order = 'newest';
  let view = 'all';
  let shown = 0;
  let current = null; // episode loaded in the player

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function shorten(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, text.lastIndexOf(' ', max)).replace(/[\s,.;:–—-]+$/, '') + '…';
  }

  function formatTime(secs) {
    secs = Math.max(0, Math.floor(secs || 0));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }

  // "01:28:39" -> "1 hr 28 min"
  function friendlyDuration(d) {
    const parts = d.split(':').map(Number);
    if (parts.some(isNaN)) return '';
    while (parts.length < 3) parts.unshift(0);
    const [h, m] = parts;
    return (h ? h + ' hr ' : '') + m + ' min';
  }


  // Same rule the server uses to name each episode page
  function episodeSlug(raw) {
    return raw.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/, '');
  }

  function parseEpisode(item, i, focus) {
    const raw = item.querySelector('title')?.textContent.trim() || '';
    // Titles look like "155 - Guest - Topic"; split off the number for the badge
    const m = raw.match(/^(\d+)\s*[-–—:]\s*(.*)$/);
    const tmp = document.createElement('div');
    tmp.innerHTML = item.querySelector('description')?.textContent || '';
    const desc = tmp.textContent.replace(/([.!?])(?=[A-Z])/g, '$1 ').replace(/\s+/g, ' ').trim();
    const image = item.getElementsByTagNameNS('*', 'image')[0]?.getAttribute('href') || '';
    const pubDate = item.querySelector('pubDate')?.textContent;
    return {
      id: i,
      slug: episodeSlug(raw),
      number: m ? m[1] : null,
      title: (m ? m[2] : raw).replace(/\s+-\s+/g, ' — '),
      description: shorten(desc, 150),
      searchText: (raw + ' ' + desc).toLowerCase(),
      image,
      focus: focus[image.split('/').pop()] ?? DEFAULT_ARTWORK_FOCUS,
      date: pubDate ? new Date(pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      duration: friendlyDuration(item.getElementsByTagNameNS('*', 'duration')[0]?.textContent || ''),
      audio: item.querySelector('enclosure')?.getAttribute('url') || '',
    };
  }

  function label(ep) {
    return ep.number ? 'Episode ' + ep.number : 'Bonus episode';
  }

  function matching() {
    const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    let list = episodes.filter(ep => words.every(w => ep.searchText.includes(w)));
    if (view === 'top') {
      return TOP_TEN.map(n => list.find(ep => ep.number === String(n))).filter(Boolean);
    }
    return order === 'oldest' ? list.slice().reverse() : list;
  }

  function card(ep, i) {
    const rank = view === 'top' ? '<span class="ep-rank">No. ' + (shown + i + 1) + ' most played</span>' : '';
    const playing = current === ep && !audio.paused;
    return `
      <article class="ep-card ep-playable${current === ep ? ' is-current' : ''}" data-id="${ep.id}">
        <button type="button" class="ep-card-media" data-play="${ep.id}" aria-label="Play ${escapeHtml(label(ep))}">
          <img src="${escapeHtml(ep.image)}" alt="" loading="lazy" style="object-position: center ${ep.focus}%;">
          <div class="num">${ep.number || 'Bonus'}</div>
          <span class="ep-play-icon" aria-hidden="true">${playing ? '&#10074;&#10074;' : '&#9654;&#xFE0E;'}</span>
        </button>
        <div class="ep-card-body">
          <div class="ep-meta">${rank}${ep.date}${ep.duration ? ' &middot; ' + ep.duration : ''}</div>
          <h3><a href="/episode/${ep.slug}">${escapeHtml(ep.title)}</a></h3>
          <p>${escapeHtml(ep.description)}</p>
          <div class="ep-actions">
            <button type="button" class="ep-play-btn" data-play="${ep.id}">${playing ? '&#10074;&#10074; Pause' : '&#9654;&#xFE0E; Play episode'}</button>
            <a class="ep-read" href="/episode/${ep.slug}">Read more &rarr;</a>
          </div>
        </div>
      </article>`;
  }

  function render(reset) {
    const list = matching();
    if (reset) { grid.innerHTML = ''; shown = 0; }
    const next = list.slice(shown, shown + PER_PAGE);
    grid.insertAdjacentHTML('beforeend', next.map(card).join(''));
    shown += next.length;
    moreBtn.hidden = shown >= list.length;
    if (!list.length) grid.innerHTML = '<p class="posts-status">No episodes match that. Try another word.</p>';
    count.textContent = search.value.trim()
      ? list.length + (list.length === 1 ? ' episode' : ' episodes') + ' found'
      : '';
  }

  // Update just the play/pause state on the cards already on screen
  function refreshCards() {
    grid.querySelectorAll('.ep-playable').forEach(el => {
      const isCurrent = current && Number(el.dataset.id) === current.id;
      const playing = isCurrent && !audio.paused;
      el.classList.toggle('is-current', !!isCurrent);
      el.querySelector('.ep-play-icon').innerHTML = playing ? '&#10074;&#10074;' : '&#9654;&#xFE0E;';
      el.querySelector('.ep-play-btn').innerHTML = playing ? '&#10074;&#10074; Pause' : '&#9654;&#xFE0E; Play episode';
    });
  }

  // ---- Player ----
  const audio = new Audio();
  audio.preload = 'none';
  const bar = document.getElementById('playerBar');
  const playBtn = document.getElementById('playerPlay');
  const seek = document.getElementById('playerSeek');
  const timeEl = document.getElementById('playerTime');
  const durEl = document.getElementById('playerDuration');
  const speedBtn = document.getElementById('playerSpeed');
  let seeking = false;

  function play(ep) {
    if (current === ep) {
      audio.paused ? audio.play() : audio.pause();
      return;
    }
    current = ep;
    audio.src = ep.audio;
    audio.play();
    bar.hidden = false;
    document.body.classList.add('has-player');
    document.getElementById('playerArt').src = ep.image;
    document.getElementById('playerTag').textContent = label(ep);
    document.getElementById('playerTitle').textContent = ep.title;
    document.getElementById('playerDownload').href = ep.audio;
    timeEl.textContent = '0:00';
    durEl.textContent = '…';
    seek.value = 0;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: ep.title,
        artist: 'The Generic Foiling Podcast',
        album: label(ep),
        artwork: ep.image ? [{ src: ep.image, sizes: '1400x1400' }] : [],
      });
    }
    refreshCards();
  }

  function skip(secs) {
    if (!audio.duration) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + secs));
  }

  audio.addEventListener('play', () => { playBtn.innerHTML = '&#10074;&#10074;'; playBtn.setAttribute('aria-label', 'Pause'); refreshCards(); });
  audio.addEventListener('pause', () => { playBtn.innerHTML = '&#9654;&#xFE0E;'; playBtn.setAttribute('aria-label', 'Play'); refreshCards(); });
  audio.addEventListener('loadedmetadata', () => { durEl.textContent = formatTime(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    if (seeking || !audio.duration) return;
    seek.value = (audio.currentTime / audio.duration) * 1000;
    timeEl.textContent = formatTime(audio.currentTime);
  });

  playBtn.addEventListener('click', () => { if (current) play(current); });
  bar.querySelectorAll('.player-skip').forEach(b => b.addEventListener('click', () => skip(Number(b.dataset.skip))));
  seek.addEventListener('input', () => {
    seeking = true;
    if (audio.duration) timeEl.textContent = formatTime((seek.value / 1000) * audio.duration);
  });
  seek.addEventListener('change', () => {
    if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration;
    seeking = false;
  });
  speedBtn.addEventListener('click', () => {
    const next = SPEEDS[(SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length];
    audio.playbackRate = next;
    speedBtn.textContent = next + '×';
  });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('seekbackward', () => skip(-15));
    navigator.mediaSession.setActionHandler('seekforward', () => skip(30));
  }

  // ---- Page wiring ----
  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-play]');
    if (!btn) return;
    const ep = episodes.find(x => x.id === Number(btn.dataset.play));
    if (ep) play(ep);
  });

  moreBtn.addEventListener('click', () => render(false));

  let searchTimer;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => render(true), 150);
  });

  const orderSelect = document.getElementById('epOrder');
  orderSelect.addEventListener('change', () => { order = orderSelect.value; render(true); });

  document.querySelectorAll('.ep-sort button').forEach(b => b.addEventListener('click', () => {
    view = b.dataset.view;
    document.querySelectorAll('.ep-sort button').forEach(x => x.classList.toggle('active', x === b));
    orderSelect.hidden = view === 'top'; // the top ten is in its own order
    render(true);
  }));
  document.getElementById('topTenBtn').hidden = !TOP_TEN.length;

  async function load() {
    try {
      const [res, focus] = await Promise.all([
        fetch('/api/rss'),
        fetch('/artwork-focus.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})),
      ]);
      if (!res.ok) throw new Error('Feed fetch failed: ' + res.status);
      const xml = new DOMParser().parseFromString(await res.text(), 'text/xml');
      episodes = Array.from(xml.querySelectorAll('item')).map((item, i) => parseEpisode(item, i, focus)).filter(ep => ep.audio);
      const newest = episodes.find(ep => ep.number);
      if (newest) document.getElementById('epEyebrow').textContent = newest.number + ' episodes and counting';
      render(true);
    } catch (err) {
      console.error('RSS fetch error:', err);
      grid.innerHTML = '<p class="posts-status">We couldn&rsquo;t load the episodes just now. ' +
        '<a href="https://open.spotify.com/show/7wBQo7HwIbwXE8NncFk25z" target="_blank" rel="noopener">Listen on Spotify instead &rarr;</a></p>';
    }
  }

  load();
})();
