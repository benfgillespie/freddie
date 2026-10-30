// Newsletter sign-ups: send to Mailchimp quietly and show a thank-you on the page itself.
// If anything goes wrong it falls back to the normal Mailchimp page in a new tab.
(function () {
  var forms = document.querySelectorAll('form[action*="list-manage.com"]');
  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var email = form.querySelector('input[name="EMAIL"]');
      if (!email || !email.value) return;
      e.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      var label = button ? button.innerHTML : '';
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }

      var cb = 'gfpSignup' + Date.now();
      var script = document.createElement('script');
      var finished = false;

      function fallback() {
        if (finished) return;
        finished = true;
        cleanup();
        if (button) { button.disabled = false; button.innerHTML = label; }
        form.target = '_blank';
        form.submit();
      }
      function cleanup() { delete window[cb]; if (script.parentNode) script.parentNode.removeChild(script); clearTimeout(timer); }
      function show(message, good) {
        var note = document.createElement('p');
        note.className = 'nl-thanks' + (good ? '' : ' nl-thanks-error');
        note.setAttribute('role', 'status');
        note.innerHTML = (good && window.gfpWave ? gfpWave.markup('thanks-wave', 'draw') : '') + message;
        form.parentNode.insertBefore(note, form);
        form.hidden = true;
        form.dispatchEvent(new CustomEvent('gfp:subscribed', { bubbles: true }));
      }

      window[cb] = function (res) {
        if (finished) return;
        finished = true;
        cleanup();
        if (res && res.result === 'success') {
          show('<strong>You&rsquo;re in.</strong> Check your inbox for a message from us and confirm your email address.', true);
        } else {
          var msg = (res && res.msg ? res.msg : '').replace(/<a[^>]*>.*?<\/a>/gi, '').replace(/^\d+ - /, '');
          if (/already subscribed/i.test(msg)) {
            show('<strong>You&rsquo;re already on the list.</strong> Nothing more to do.', true);
          } else {
            if (button) { button.disabled = false; button.innerHTML = label; }
            var old = form.parentNode.querySelector('.nl-thanks-error');
            if (old) old.remove();
            var err = document.createElement('p');
            err.className = 'nl-thanks nl-thanks-error';
            err.textContent = 'That didn’t go through. Check the email address and try again.';
            form.parentNode.insertBefore(err, form);
          }
        }
      };
      var timer = setTimeout(fallback, 8000);
      script.onerror = fallback;

      var params = [];
      for (var i = 0; i < form.elements.length; i++) {
        var f = form.elements[i];
        if (f.name) params.push(encodeURIComponent(f.name) + '=' + encodeURIComponent(f.value));
      }
      var base = form.action.replace('/subscribe/post?', '/subscribe/post-json?');
      script.src = base + '&' + params.join('&') + '&c=' + cb;
      document.body.appendChild(script);
    });
  });
})();
