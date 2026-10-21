// Turns episode titles into open.spotify.com links (which open the Spotify app where it's
// installed). Episodes Spotify doesn't list on the show page fall back to the show itself.
const SPOTIFY_SHOW_URL = 'https://open.spotify.com/show/7wBQo7HwIbwXE8NncFk25z';

function normaliseTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Resolves to a function: title -> Spotify URL
const spotifyLinks = fetch('/api/spotify')
  .then(res => (res.ok ? res.json() : { episodes: [] }))
  .catch(() => ({ episodes: [] }))
  .then(data => {
    const byTitle = new Map(data.episodes.map(ep => [normaliseTitle(ep.title), 'https://open.spotify.com/episode/' + ep.id]));
    return title => byTitle.get(normaliseTitle(title)) || SPOTIFY_SHOW_URL;
  });
