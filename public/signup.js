// Newsletter sign-ups: send to our own sign-up check (which passes real ones on to Mailchimp) and show a thank-you on the page itself.
// If anything goes wrong it falls back to a normal form post in a new tab.
(function () {
  var forms = document.querySelectorAll('form[action="/api/subscribe"]');
  var loaded = Date.now();
  forms.forEach(function (form) {
    // when the page opened: sign-ups that arrive within a couple of seconds are bots
    var t = document.createElement('input');
    t.type = 'hidden'; t.name = 't'; t.value = loaded;
    form.appendChild(t);

    form.addEventListener('submit', function (e) {
      var email = form.querySelector('input[name="EMAIL"]');
      if (!email || !email.value) return;
      e.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      var label = button ? button.innerHTML : '';
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }

      function show(message, good) {
        var note = document.createElement('p');
        note.className = 'nl-thanks' + (good ? '' : ' nl-thanks-error');
        note.setAttribute('role', 'status');
        note.innerHTML = (good && window.gfpWave ? gfpWave.markup('thanks-wave', 'draw') : '') + message;
        form.parentNode.insertBefore(note, form);
        form.hidden = true;
        form.dispatchEvent(new CustomEvent('gfp:subscribed', { bubbles: true }));
      }
      function fail(msg) {
        if (button) { button.disabled = false; button.innerHTML = label; }
        var old = form.parentNode.querySelector('.nl-thanks-error');
        if (old) old.remove();
        var err = document.createElement('p');
        err.className = 'nl-thanks nl-thanks-error';
        err.textContent = msg || 'That didn’t go through. Check the email address and try again.';
        form.parentNode.insertBefore(err, form);
      }
      function fallback() {
        if (button) { button.disabled = false; button.innerHTML = label; }
        form.target = '_blank';
        form.submit();
      }

      var data = {};
      for (var i = 0; i < form.elements.length; i++) {
        var f = form.elements[i];
        if (f.name) data[f.name] = f.value;
      }
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: ctl ? ctl.signal : undefined
      }).then(function (r) { return r.json(); }).then(function (res) {
        clearTimeout(timer);
        if (res && res.result === 'success') {
          show('<strong>You&rsquo;re in.</strong> Check your inbox for a message from us and confirm your email address.', true);
          return;
        }
        var msg = (res && res.msg ? res.msg : '').replace(/<a[^>]*>.*?<\/a>/gi, '').replace(/^\d+ - /, '');
        if (/already subscribed/i.test(msg)) {
          show('<strong>You&rsquo;re already on the list.</strong> Nothing more to do.', true);
        } else if (/quick|a while|too many/i.test(msg)) {
          fail(msg);
        } else {
          fail();
        }
      }).catch(function () { clearTimeout(timer); fallback(); });
    });
  });
})();
