// Thin scrolling banner of listener reviews, shown above the newsletter band on every page.
// Quotes are word-for-word snippets of real Apple Podcasts / Podcast Addict reviews.
(function () {
  const REVIEWS = [
    ['Better than therapy', 'MattOnFoil'],
    ['The #1 foiling podcast out there!', 'Foilzy'],
    ['Supremely mediocre, but weirdly addictive', 'Salcombe Foiler'],
    ['Foil frothage with a Brit twist', 'Fergfoiler'],
    ['The way it should be', 'Tholowell'],
    ['Wang related ramblings to help me through the day', 'Flc123'],
    ['Really great coverage of everything foiling', 'FluidFoiling'],
    ['Could do with more updates on Freddie’s love life', 'Alibizzle10'],
    ['Funny as hell', 'sikobarry321'],
    ['Random chat just like you have with your mates after a session', 'Guyze'],
    ['Real people chatting to real people', 'Karlcad'],
    ['Quality foil related chit chat', 'Thornebot'],
    ['I need more!', 'Guyze'],
  ];

  const band = document.getElementById('reviews');
  if (!band) return;

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const items = REVIEWS.map(([quote, who]) =>
    `<span class="ticker-item"><span class="ticker-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> &ldquo;${esc(quote)}&rdquo; <span class="ticker-who">${esc(who)}</span></span>`
  ).join('');

  // Two copies back to back so the loop runs on without a gap
  band.innerHTML = `
    <a class="ticker" href="https://podcasts.apple.com/us/podcast/the-generic-foiling-podcast/id1637901696" target="_blank" rel="noopener" aria-label="Listener reviews on Apple Podcasts">
      <div class="ticker-run">${items}<span aria-hidden="true">${items}</span></div>
    </a>`;
})();
