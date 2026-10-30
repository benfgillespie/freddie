// Shop and product pages: product cards / the single product view (with sold-out
// sizes/colours), the basket drawer and checkout.
// Products, stock and postage come from /api/shop; the basket is kept in this browser.
(function () {
  const KEY = 'gfp-basket';
  const grid = document.getElementById('productGrid');
  const detail = document.getElementById('productPage');
  const drawer = document.getElementById('basket');
  const countEl = document.querySelector('.cart-count');
  let products = [];
  let shipping = [];
  let basket = [];
  let bumpPending = false;
  try { basket = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { basket = []; }

  const money = pence => '£' + (pence / 100).toFixed(2).replace(/\.00$/, '');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const variantKey = (p, choice) => Object.keys(p.options).map(n => choice[n]).join('|');
  const stockFor = (p, choice) => p.stock[variantKey(p, choice)] || 0;
  const label = (p, choice) => Object.keys(p.options).map(n => choice[n]).join(' / ');
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(basket)); } catch (e) {} };
  const inBasket = (id, choice) => basket.find(i => i.id === id && variantKey(products.find(p => p.id === id), i.choice) === variantKey(products.find(p => p.id === id), choice));

  const productUrl = p => '/product.html?id=' + encodeURIComponent(p.id);

  // ---- Product cards (shop page) ----
  function firstAvailable(p) {
    const names = Object.keys(p.options);
    const combos = names.reduce((acc, n) => acc.flatMap(c => p.options[n].map(v => ({ ...c, [n]: v }))), [{}]);
    return combos.find(c => stockFor(p, c) > 0) || combos[0];
  }

  function renderProducts() {
    grid.innerHTML = products.map(p => {
      const soldOut = !Object.values(p.stock).some(n => n > 0);
      return `
        <article class="product js-product${soldOut ? ' is-sold-out' : ''}" data-id="${esc(p.id)}">
          <a class="product-media" href="${productUrl(p)}">
            <img class="main-photo" src="${esc(p.images[0])}" alt="${esc(p.name)}" width="600" height="650" loading="lazy">
            ${hoverPhoto(p) ? `<img class="hover-photo" src="${esc(hoverPhoto(p))}" alt="">` : ''}
            ${soldOut ? '<div class="num">Sold out</div>' : ''}
            ${p.images.length > 1 ? `<span class="photo-count">${p.images.length} photos</span>` : ''}
          </a>
          <div class="product-body">
            <div class="product-top">
              <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
              <span class="product-price">${money(p.price)}</span>
            </div>
            <p>${esc(p.description)}</p>
            <a class="more-link" href="${productUrl(p)}">More details &amp; photos &rarr;</a>
            ${buyControls(p)}
          </div>
        </article>`;
    }).join('');
    grid.querySelectorAll('.js-product').forEach(wire);
  }

  // The photo that fades in when you hover a card: a worn shot for the tee cut-outs,
  // otherwise the next photo (never the size guide)
  function hoverPhoto(p) {
    const others = p.images.filter(src => src !== p.images[0] && !src.includes('size-guide'));
    const cutout = src => src.endsWith('.webp');
    return cutout(p.images[0]) ? others.find(src => !cutout(src)) : (others.find(cutout) || others[0]);
  }

  // Colour circles and S/M/L/XL buttons, stock note and Add to basket button (cards and product page)
  const SIZE_LABEL = { Small: 'S', Medium: 'M', Large: 'L', 'X Large': 'XL' };
  const SWATCH = { Blue: '#4a5c93', Black: '#151515', Lilac: '#b9a6d6', Chocolate: '#5a3a28', Charcoal: '#3a3a3c', Navy: '#1f2a44', Burgundy: '#6b1f2a' };

  function buyControls(p) {
    return `
      <div class="product-options">
        ${Object.entries(p.options).map(([name, values]) => `
          <div class="option-group" data-option="${esc(name)}" data-value="">
            <span class="option-label">${esc(name)}<b class="option-picked"></b></span>
            <div class="option-choices">${values.map(v => name === 'Colour'
              ? `<button type="button" class="opt opt-colour" data-v="${esc(v)}" style="--swatch:${SWATCH[v] || '#888'}" aria-label="${esc(v)}" title="${esc(v)}"></button>`
              : `<button type="button" class="opt opt-size" data-v="${esc(v)}" aria-label="${esc(v)}">${esc(SIZE_LABEL[v] || v)}</button>`).join('')}</div>
          </div>`).join('')}
      </div>
      <div class="stock-note" aria-live="polite"></div>
      <button type="button" class="btn-gold add-btn">Add to basket</button>`;
  }

  function wire(card) {
    const p = products.find(x => x.id === card.dataset.id);
    const start = firstAvailable(p);
    card.querySelectorAll('.option-group').forEach(g => {
      g.dataset.value = start[g.dataset.option];
      g.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
        g.dataset.value = b.dataset.v;
        refresh(card, p); showColour(card, p);
      }));
    });
    card.querySelector('.add-btn').addEventListener('click', () => add(card, p));
    refresh(card, p);
    showColour(card, p);
  }

  // Picking a colour swaps in the photo of that colour, if there is one
  function showColour(card, p) {
    const src = (p.colourPhotos || {})[choiceOf(card).Colour];
    if (!src) return;
    if (detail && detail.contains(card)) showPhoto(src);
    else card.closest('.product').querySelector('.product-media .main-photo').src = src;
  }

  function showPhoto(src) {
    const main = document.getElementById('mainPhoto');
    if (main.getAttribute('src') !== src) { main.src = src; main.classList.remove('swap'); void main.offsetWidth; main.classList.add('swap'); }
    detail.querySelectorAll('.product-thumbs button').forEach(b => b.classList.toggle('active', b.dataset.src === src));
  }

  // ---- Single product page ----
  function renderDetail() {
    const p = products.find(x => x.id === new URLSearchParams(location.search).get('id'));
    if (!p) {
      detail.innerHTML = '<p class="posts-status">We couldn&rsquo;t find that one. <a href="/shop.html">See everything in the shop &rarr;</a></p>';
      return;
    }
    document.title = p.name + ' | The Generic Foiling Podcast';
    if (window.gfpSeo) gfpSeo({ title: document.title, description: p.description, image: p.images[0] });
    const soldOut = !Object.values(p.stock).some(n => n > 0);
    detail.innerHTML = `
      <div class="product-gallery">
        <div class="product-main-photo">
          <img src="${esc(p.images[0])}" alt="${esc(p.name)}" id="mainPhoto">
          ${soldOut ? '<div class="num">Sold out</div>' : ''}
        </div>
        ${p.images.length > 1 ? `<div class="product-thumbs">${p.images.map((src, i) => `
          <button type="button" class="${i ? '' : 'active'}" data-src="${esc(src)}" aria-label="Photo ${i + 1}"><img src="${esc(src)}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="product-info js-product" data-id="${esc(p.id)}">
        <h1>${esc(p.name)}</h1>
        <div class="product-price">${money(p.price)}</div>
        <p class="product-description">${esc(p.description)}</p>
        ${p.fit ? `<p class="product-fit"><strong>Fit:</strong> ${esc(p.fit)}</p>` : ''}
        ${buyControls(p)}
        <p class="product-postage">Postage from £3.50 in the UK. We also post to Europe, the USA, Australia and New Zealand. <a href="/shop-terms.html">Postage &amp; returns</a></p>
      </div>`;
    detail.querySelectorAll('.product-thumbs button').forEach(b => b.addEventListener('click', () => showPhoto(b.dataset.src)));
    setupZoom(p);
    wire(detail.querySelector('.js-product'));
  }

  // Click the big photo to blow it up full screen; click again to zoom right in, then drag or swipe to look around
  function setupZoom(p) {
    const main = document.getElementById('mainPhoto');
    const many = p.images.length > 1;
    const box = document.createElement('div');
    box.className = 'zoombox';
    box.hidden = true;
    box.innerHTML = `
      <button type="button" class="zoombox-close" aria-label="Close">&times;</button>
      ${many ? '<button type="button" class="zoombox-arrow prev" aria-label="Previous photo">&lsaquo;</button><button type="button" class="zoombox-arrow next" aria-label="Next photo">&rsaquo;</button>' : ''}
      <div class="zoombox-scroll"><img alt=""></div>
      <p class="zoombox-hint">Tap the photo to zoom in</p>`;
    document.body.appendChild(box);
    const scroll = box.querySelector('.zoombox-scroll');
    const img = box.querySelector('img');
    const hint = box.querySelector('.zoombox-hint');
    let index = 0;

    function show(i) {
      index = (i + p.images.length) % p.images.length;
      scroll.classList.remove('zoomed');
      hint.textContent = 'Tap the photo to zoom in';
      img.src = p.images[index];
      img.alt = p.name;
    }
    function open() {
      show(Math.max(0, p.images.indexOf(main.getAttribute('src'))));
      box.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function close() {
      box.hidden = true;
      document.body.style.overflow = '';
      showPhoto(p.images[index]);
    }
    function toggleZoom(e) {
      const rect = img.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width, fy = (e.clientY - rect.top) / rect.height;
      const zoomed = scroll.classList.toggle('zoomed');
      hint.textContent = zoomed ? 'Drag or swipe to look around. Tap to zoom out' : 'Tap the photo to zoom in';
      if (zoomed) {
        scroll.scrollLeft = fx * img.offsetWidth - scroll.clientWidth / 2;
        scroll.scrollTop = fy * img.offsetHeight - scroll.clientHeight / 2;
      }
    }

    main.addEventListener('click', open);
    main.tabIndex = 0;
    main.setAttribute('role', 'button');
    main.setAttribute('aria-label', 'Enlarge photo');
    main.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    img.addEventListener('click', toggleZoom);
    scroll.addEventListener('click', e => { if (e.target === scroll) close(); });
    box.querySelector('.zoombox-close').addEventListener('click', close);
    if (many) {
      box.querySelector('.prev').addEventListener('click', () => show(index - 1));
      box.querySelector('.next').addEventListener('click', () => show(index + 1));
    }
    document.addEventListener('keydown', e => {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (many && e.key === 'ArrowLeft') show(index - 1);
      else if (many && e.key === 'ArrowRight') show(index + 1);
    });

    // Drag to look around when zoomed in (touch screens just swipe)
    let drag = null;
    scroll.addEventListener('mousedown', e => {
      if (!scroll.classList.contains('zoomed')) return;
      drag = { x: e.clientX, y: e.clientY, l: scroll.scrollLeft, t: scroll.scrollTop, moved: false };
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      scroll.scrollLeft = drag.l - dx;
      scroll.scrollTop = drag.t - dy;
    });
    window.addEventListener('mouseup', () => {
      if (drag && drag.moved) { img.addEventListener('click', stopOnce, { capture: true, once: true }); }
      drag = null;
    });
    function stopOnce(e) { e.stopImmediatePropagation(); }
  }

  function choiceOf(card) {
    return Object.fromEntries(Array.from(card.querySelectorAll('.option-group')).map(g => [g.dataset.option, g.dataset.value]));
  }

  // Mark each option sold out given the other choices, and update the note and button
  function refresh(card, p) {
    const choice = choiceOf(card);
    card.querySelectorAll('.option-group').forEach(g => {
      g.querySelectorAll('.opt').forEach(b => {
        const n = stockFor(p, { ...choice, [g.dataset.option]: b.dataset.v });
        b.classList.toggle('out', !n);
        b.classList.toggle('active', b.dataset.v === g.dataset.value);
        b.setAttribute('aria-pressed', b.dataset.v === g.dataset.value ? 'true' : 'false');
      });
      g.querySelector('.option-picked').textContent = g.dataset.option === 'Colour' ? ': ' + g.dataset.value : '';
    });
    const left = stockFor(p, choice) - ((inBasket(p.id, choice) || {}).qty || 0);
    const note = card.querySelector('.stock-note');
    const btn = card.querySelector('.add-btn');
    if (stockFor(p, choice) === 0) { note.textContent = 'Sold out'; note.className = 'stock-note out'; }
    else if (left <= 0) { note.textContent = 'All we’ve got is in your basket'; note.className = 'stock-note out'; }
    else if (stockFor(p, choice) === 1) { note.textContent = 'Last one!'; note.className = 'stock-note low'; }
    else { note.textContent = ''; note.className = 'stock-note'; }
    btn.disabled = left <= 0;
    btn.textContent = stockFor(p, choice) === 0 ? 'Sold out' : 'Add to basket';
  }

  function add(card, p) {
    const choice = choiceOf(card);
    const line = inBasket(p.id, choice);
    if (line) line.qty += 1; else basket.push({ id: p.id, choice, qty: 1 });
    save();
    renderBasket();
    refresh(card, p);
    openBasket();
    bumpPending = true;
  }

  // ---- Basket drawer ----
  const regionSelect = drawer.querySelector('#basketRegion');
  const message = drawer.querySelector('.basket-message');

  function renderBasket() {
    basket = basket.filter(i => products.some(p => p.id === i.id));
    const count = basket.reduce((n, i) => n + i.qty, 0);
    countEl.textContent = count || '';
    const list = drawer.querySelector('.basket-items');
    if (!count) {
      list.innerHTML = '<p class="basket-empty">Your basket&rsquo;s empty.</p>';
      drawer.querySelector('.basket-summary').hidden = true;
      return;
    }
    drawer.querySelector('.basket-summary').hidden = false;
    list.innerHTML = basket.map((i, n) => {
      const p = products.find(x => x.id === i.id);
      return `
        <div class="basket-line">
          <img src="${esc(p.images[0])}" alt="">
          <div>
            <strong>${esc(p.name)}</strong>
            <span>${esc(label(p, i.choice))}</span>
            <div class="qty">
              <button type="button" data-n="${n}" data-d="-1" aria-label="One fewer">&minus;</button>
              <span>${i.qty}</span>
              <button type="button" data-n="${n}" data-d="1" aria-label="One more"${i.qty >= stockFor(p, i.choice) ? ' disabled' : ''}>+</button>
            </div>
          </div>
          <span class="basket-price">${money(p.price * i.qty)}</span>
        </div>`;
    }).join('');
    const subtotal = basket.reduce((t, i) => t + products.find(p => p.id === i.id).price * i.qty, 0);
    const region = shipping.find(r => r.id === regionSelect.value) || shipping[0];
    const postage = count >= 3 ? region.large : region.small;
    drawer.querySelector('.basket-subtotal').textContent = money(subtotal);
    drawer.querySelector('.basket-postage').textContent = money(postage);
    drawer.querySelector('.basket-total').textContent = money(subtotal + postage);
  }

  drawer.querySelector('.basket-items').addEventListener('click', e => {
    const b = e.target.closest('button[data-n]');
    if (!b) return;
    const line = basket[Number(b.dataset.n)];
    line.qty += Number(b.dataset.d);
    if (line.qty <= 0) basket.splice(Number(b.dataset.n), 1);
    save();
    renderBasket();
    document.querySelectorAll('.js-product').forEach(card => refresh(card, products.find(x => x.id === card.dataset.id)));
  });
  regionSelect.addEventListener('change', renderBasket);

  function openBasket() { drawer.hidden = false; document.body.classList.add('basket-open'); message.textContent = ''; }
  function closeBasket() { drawer.hidden = true; document.body.classList.remove('basket-open'); if (bumpPending) setTimeout(bumpCount, 150); }
  // The basket number bounces after adding; if the basket drawer is covering it, it bounces once the drawer closes
  function bumpCount() { bumpPending = false; countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); }
  document.querySelector('.cart-btn').addEventListener('click', openBasket);
  drawer.querySelector('.basket-close').addEventListener('click', closeBasket);
  drawer.addEventListener('click', e => { if (e.target === drawer) closeBasket(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) closeBasket(); });

  drawer.querySelector('.checkout-btn').addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Opening checkout…';
    message.textContent = '';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: basket, region: regionSelect.value }),
      });
      const data = await res.json();
      if (data.url) { location.href = data.url; return; }
      message.textContent = data.error || 'Something went wrong. Please try again.';
    } catch (err) {
      message.textContent = 'Something went wrong. Please try again.';
    }
    btn.disabled = false;
    btn.textContent = 'Checkout';
  });

  // Coming back from Stripe
  const order = new URLSearchParams(location.search).get('order');
  const banner = document.getElementById('orderBanner');
  if (!banner) { /* product page */ } else if (order === 'thanks') {
    basket = []; save();
    const popup = document.getElementById('orderThanks');
    const closeThanks = () => { popup.hidden = true; history.replaceState(null, '', location.pathname); };
    popup.hidden = false;
    popup.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeThanks));
    popup.addEventListener('click', e => { if (e.target === popup) closeThanks(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !popup.hidden) closeThanks(); });
  } else if (order === 'cancelled') {
    banner.textContent = 'No worries, your basket’s still here whenever you’re ready.';
    banner.hidden = false;
  }

  fetch('/api/shop')
    .then(r => r.json())
    .then(data => {
      products = data.products;
      shipping = data.shipping;
      regionSelect.innerHTML = shipping.map(r => `<option value="${esc(r.id)}">${esc(r.label)}</option>`).join('');
      if (grid) renderProducts();
      if (detail) renderDetail();
      renderBasket();
      if (location.hash === '#basket') openBasket();
    })
    .catch(err => {
      console.error(err);
      (grid || detail).innerHTML = '<p class="posts-status">We couldn&rsquo;t load the shop just now. Please try again in a bit.</p>';
    });
})();
