// Episode pages: the same bottom play bar as the Episodes page (see episodes.js), for the one episode on the page.
(function () {
  var btn = document.getElementById('epPlay');
  var bar = document.getElementById('playerBar');
  if (!btn || !bar) return;
  var SPEEDS = [1, 1.25, 1.5, 2];
  var ep = { audio: btn.dataset.audio, title: btn.dataset.title, image: btn.dataset.image, tag: btn.dataset.tag };
  var audio = new Audio();
  audio.preload = 'none';
  var playBtn = document.getElementById('playerPlay');
  var seek = document.getElementById('playerSeek');
  var timeEl = document.getElementById('playerTime');
  var durEl = document.getElementById('playerDuration');
  var speedBtn = document.getElementById('playerSpeed');
  var started = false, seeking = false;
  // remember where each listener stopped (in their own browser only)
  var KEY = 'gfpResume:' + ep.audio, resumeAt = 0, lastSave = 0;
  function load() { try { return Number(localStorage.getItem(KEY)) || 0; } catch (e) { return 0; } }
  function save(t) { try { if (t > 10) localStorage.setItem(KEY, String(Math.floor(t))); else localStorage.removeItem(KEY); } catch (e) {} }
  function clearSaved() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function formatTime(secs) {
    secs = Math.max(0, Math.floor(secs || 0));
    var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  function refresh() {
    if (started && !audio.paused) btn.innerHTML = '&#10074;&#10074; Pause';
    else if (!started && resumeAt > 10) btn.innerHTML = '&#9654; Resume from ' + formatTime(resumeAt);
    else if (started && audio.currentTime > 10) btn.innerHTML = '&#9654; Resume';
    else btn.innerHTML = '&#9654; Play episode';
  }
  resumeAt = load();
  refresh();
  function toggle() {
    if (!started) {
      started = true;
      audio.src = ep.audio;
      bar.hidden = false;
      document.body.classList.add('has-player');
      document.getElementById('playerArt').src = ep.image || '';
      document.getElementById('playerTag').textContent = ep.tag;
      document.getElementById('playerTitle').textContent = ep.title;
      document.getElementById('playerDownload').href = ep.audio;
      durEl.textContent = '…';
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: ep.title, artist: 'The Generic Foiling Podcast', album: ep.tag,
          artwork: ep.image ? [{ src: ep.image, sizes: '1400x1400' }] : []
        });
      }
      if (resumeAt > 10) {
        audio.addEventListener('loadedmetadata', function jump() { audio.removeEventListener('loadedmetadata', jump); if (resumeAt < audio.duration - 30) audio.currentTime = resumeAt; }, { once: true });
      }
      audio.play();
    } else {
      audio.paused ? audio.play() : audio.pause();
    }
  }
  function skip(secs) {
    if (!audio.duration) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + secs));
  }

  audio.addEventListener('play', function () { playBtn.innerHTML = '&#10074;&#10074;'; playBtn.setAttribute('aria-label', 'Pause'); refresh(); });
  audio.addEventListener('ended', clearSaved);
  window.addEventListener('pagehide', function () { if (started && audio.currentTime > 0 && !audio.ended) save(audio.currentTime); });
  audio.addEventListener('pause', function () {
    if (started && audio.currentTime > 0 && !audio.ended) save(audio.currentTime); playBtn.innerHTML = '&#9654;'; playBtn.setAttribute('aria-label', 'Play'); refresh(); });
  audio.addEventListener('loadedmetadata', function () { durEl.textContent = formatTime(audio.duration); });
  audio.addEventListener('timeupdate', function () {
    if (started && audio.currentTime > 0 && Date.now() - lastSave > 4000) { lastSave = Date.now(); save(audio.currentTime); }
    if (seeking || !audio.duration) return;
    seek.value = (audio.currentTime / audio.duration) * 1000;
    timeEl.textContent = formatTime(audio.currentTime);
  });
  btn.addEventListener('click', toggle);
  playBtn.addEventListener('click', toggle);
  bar.querySelectorAll('.player-skip').forEach(function (b) { b.addEventListener('click', function () { skip(Number(b.dataset.skip)); }); });
  seek.addEventListener('input', function () { seeking = true; if (audio.duration) timeEl.textContent = formatTime((seek.value / 1000) * audio.duration); });
  seek.addEventListener('change', function () { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; seeking = false; });
  speedBtn.addEventListener('click', function () {
    var next = SPEEDS[(SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length];
    audio.playbackRate = next;
    speedBtn.textContent = next + '×';
  });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('seekbackward', function () { skip(-15); });
    navigator.mediaSession.setActionHandler('seekforward', function () { skip(30); });
  }
})();
