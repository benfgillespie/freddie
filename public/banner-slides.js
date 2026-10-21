// Cross-fades through the photos in each top banner, with arrows and dots to flick
// between them. Extra photos load once the page has finished loading. Visitors who
// prefer reduced motion get the controls but no automatic cycling.
(function () {
  const SECONDS_PER_PHOTO = 12;
  const autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.banner-hero').forEach(banner => {
    const slides = Array.from(banner.querySelectorAll('.banner-img'));
    if (slides.length < 2) return;

    const load = img => { if (img.dataset.src && !img.getAttribute('src')) img.src = img.dataset.src; };
    window.addEventListener('load', () => slides.forEach(load));

    // Controls: ‹ • • • • • ›
    const controls = document.createElement('div');
    controls.className = 'banner-controls';
    controls.innerHTML =
      '<button type="button" class="banner-arrow" data-step="-1" aria-label="Previous photo">&lsaquo;</button>' +
      slides.map((_, i) => `<button type="button" class="banner-dot" data-index="${i}" aria-label="Show photo ${i + 1}"></button>`).join('') +
      '<button type="button" class="banner-arrow" data-step="1" aria-label="Next photo">&rsaquo;</button>';
    banner.appendChild(controls);
    const dots = Array.from(controls.querySelectorAll('.banner-dot'));

    let current = 0;
    let timer = null;

    function show(index) {
      const next = (index + slides.length) % slides.length;
      load(slides[next]);
      slides[current].classList.remove('active');
      slides[next].classList.add('active');
      dots[current].classList.remove('active');
      dots[next].classList.add('active');
      dots.forEach((dot, i) => dot.setAttribute('aria-current', i === next ? 'true' : 'false'));
      current = next;
    }

    function restartTimer() {
      if (!autoplay) return;
      clearInterval(timer);
      timer = setInterval(() => {
        if (document.hidden) return;
        const next = slides[(current + 1) % slides.length];
        // Wait for a photo that hasn't finished downloading yet
        if (!next.complete || !next.naturalWidth) return;
        show(current + 1);
      }, SECONDS_PER_PHOTO * 1000);
    }

    controls.addEventListener('click', e => {
      const button = e.target.closest('button');
      if (!button) return;
      if (button.dataset.index) show(Number(button.dataset.index));
      else show(current + Number(button.dataset.step));
      restartTimer(); // give them the full time on the photo they picked
    });

    dots[0].classList.add('active');
    dots[0].setAttribute('aria-current', 'true');
    restartTimer();
  });
})();
