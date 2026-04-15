// ════════════════════════════════════════════════════════════
//  ANIMATION — sequências que rodam automaticamente
//  Sem dependência de input do usuário.
//
//  Contém:
//  · LED Strip (duas fileiras de bolinhas com rastro de luz)
//  · Sequência narrativa de transmissão (typeAndCenter,
//    stayAlive, dissolveRight, lockProcess, cipherSequence)
//  · buildPontasSVG (linha "de ponta · a · a ponta")
// ════════════════════════════════════════════════════════════


// ── LED STRIP ────────────────────────────────────────────────
//  Dot: 3px. Gap: 3px. Rows: dinâmico via altura do ícone.
//  Rastro: pico de brilho segue o texto com LAG de atraso.
// ─────────────────────────────────────────────────────────────
(function () {

  var DOT    = 3;
  var GAP    = 3;
  var SLOT   = DOT + GAP;
  var ROW_Y  = SLOT;
  var BASE   = 0.18;
  var PEAK   = 0.85;
  var RISE   = 0.18;
  var DECAY  = 0.016;
  var SPREAD = 2;
  var LAG    = 10;

  function measureIconHeight() {
    var icon = document.querySelector('.transmission-node-icon--device');
    return icon ? icon.offsetHeight : 56;
  }

  function makeLedLine(id) {
    var wrap = document.getElementById(id);
    if (!wrap) return { move: function(){}, reset: function(){}, setColor: function(){} };

    var iconH  = measureIconHeight();
    wrap.parentElement.style.height = iconH + 'px';
    var ROWS   = Math.floor(iconH / SLOT) + 1;
    var W      = wrap.offsetWidth || 300;
    var N      = Math.floor(W / SLOT);
    var cx0    = (W - (N - 1) * SLOT) / 2;
    var midY   = iconH / 2;
    var totalH = (ROWS - 1) * ROW_Y;
    var startY = midY - totalH / 2;

    var op   = [];
    var dots = [];
    var cur  = -1;

    for (var r = 0; r < ROWS; r++) {
      var rowY = startY + r * ROW_Y;
      dots.push([]);
      for (var i = 0; i < N; i++) {
        if (r === 0) op.push(BASE);
        var x = cx0 + i * SLOT;
        var d = document.createElement('div');
        d.className = 'led-dot';
        d.style.left = x + 'px';
        d.style.top  = rowY + 'px';
        wrap.appendChild(d);
        dots[r].push(d);
      }
    }

    (function loop() {
      var trail = cur >= 0 ? cur - LAG : -1;
      for (var i = 0; i < N; i++) {
        var target = BASE;
        if (trail >= 0) {
          var dist = i - trail;
          if (dist >= -SPREAD && dist <= SPREAD) {
            var g = Math.exp(-0.5 * Math.pow(dist / (SPREAD * 0.6), 2));
            target = BASE + (PEAK - BASE) * g;
          }
        }
        op[i] = op[i] < target
          ? Math.min(op[i] + RISE,  target)
          : Math.max(op[i] - DECAY, BASE);
        var v = op[i].toFixed(3);
        for (var r = 0; r < ROWS; r++) dots[r][i].style.opacity = v;
      }
      requestAnimationFrame(loop);
    })();

    function pxToIdx(xPx) {
      return Math.min(Math.max(Math.round((xPx - cx0) / SLOT), 0), N - 1);
    }

    function setColor(rose) {
      for (var r = 0; r < ROWS; r++)
        for (var i = 0; i < N; i++)
          dots[r][i].classList.toggle('led-dot--rose', rose);
    }

    return {
      move:     function(xPx)  { cur = pxToIdx(xPx); },
      reset:    function()     { cur = -1; },
      setColor: function(rose) { setColor(rose); }
    };
  }

  function init() {
    window._lineLeft  = makeLedLine('svg-line-left');
    window._lineRight = makeLedLine('svg-line-right');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

})();


// ── SEQUÊNCIA NARRATIVA DE TRANSMISSÃO ───────────────────────
//
//  1. Texto digita com ease-in (translateX: começa recuado,
//     chega centralizado entre os dois ícones). Para legível.
//  2. Fica "vivo" ~1.6s (drift sutil para direita).
//  3. Ease-out em X + fade de opacidade em direção ao cadeado.
//  4. Cadeado processa (cor azul→roxo, scanner, pulso).
//  5. Linha direita: mesmo conceito — texto cifrado.
//  6. Servidor recebe. LOOP.
//
//  LED tracking: rAF contínuo em cada fase — lê a posição real
//  do elemento via getBoundingClientRect() a cada frame.
// ─────────────────────────────────────────────────────────────
(function () {

  var _isMobile    = window.innerWidth < 768;
  var PLAIN_TEXT   = _isMobile ? 'dados do paciente'            : 'informações confidenciais do paciente';
  var CIPHER_TEXT  = _isMobile ? 'xK9#mP2$qR7!bL4&Zv8'         : 'aX7#Km2$qR9!pL4&Zv8@nW3%eJ6*fT1^bY5';
  var CHAR_PLAIN   = _isMobile ? 14                             : 28;
  var CHAR_CIPHER  = _isMobile ? 14                             : 22;
  var ALIVE_MS     = 1600;
  var DISSOLVE_MS  = 480;

  var _trackingRaf = null;

  function qs(sel) { return document.querySelector(sel); }

  function textNode(el, cursor) {
    var n = null;
    el.childNodes.forEach(function (c) { if (c.nodeType === 3) n = c; });
    if (!n) { n = document.createTextNode(''); el.insertBefore(n, cursor); }
    return n;
  }

  function triggerAnim(el, cls, ms, cb) {
    if (!el) { cb && cb(); return; }
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); cb && cb(); }, ms);
  }

  // Tracking contínuo via rAF: lê o centro real do texto a cada frame
  function startTracking(el, lineEl, lineCtrl) {
    if (_trackingRaf) cancelAnimationFrame(_trackingRaf);
    var lineRect = lineEl ? lineEl.getBoundingClientRect() : null;
    var lineLeft = lineRect ? lineRect.left : 0;
    var lineW    = lineEl  ? lineEl.offsetWidth : 200;
    var running  = true;

    function loop() {
      if (!running) return;
      var elRect = el.getBoundingClientRect();
      var cx = (elRect.left + elRect.right) / 2 - lineLeft;
      cx = Math.max(0, Math.min(lineW, cx));
      lineCtrl.move(cx);
      _trackingRaf = requestAnimationFrame(loop);
    }
    _trackingRaf = requestAnimationFrame(loop);

    return function stop() {
      running = false;
      cancelAnimationFrame(_trackingRaf);
      _trackingRaf = null;
    };
  }

  // ── FASE 1 — digita e desliza para o centro ────────────────
  function typeAndCenter(elId, text, charMs, lineCtrl, cb) {
    var el = document.getElementById(elId);
    if (!el) { cb && cb(); return; }

    var lineEl = el.closest('.transmission-line');
    var lineW  = lineEl ? lineEl.offsetWidth : 200;
    var cursor = el.querySelector('.tw-cursor');
    var tn     = textNode(el, cursor);

    tn.textContent = text;
    var fullW = el.offsetWidth;
    tn.textContent = '';

    var startX  = 4;
    var centerX = (lineW - fullW) / 2;
    var typeMs  = text.length * charMs;

    el._centerX = centerX;
    el._lineW   = lineW;

    el.style.opacity    = '1';
    el.style.transition = 'none';
    el.style.left       = '0';
    el.style.transform  = 'translateY(-50%) translateX(' + startX + 'px) scale(1)';
    void el.offsetWidth;

    el.style.transition = 'transform ' + typeMs + 'ms cubic-bezier(0.25, 0, 0.58, 1)';
    el.style.transform  = 'translateY(-50%) translateX(' + centerX + 'px) scale(1.15)';

    var stopTracking = startTracking(el, lineEl, lineCtrl);

    cursor.classList.add('active');
    var i = 0;
    function step() {
      if (i < text.length) {
        tn.textContent += text[i++];
        setTimeout(step, charMs);
      } else {
        cursor.classList.remove('active');
        setTimeout(function () {
          el.style.transition = 'none';
          el.style.transform  = 'translateY(-50%) translateX(' + centerX + 'px) scale(1.15)';
          void el.offsetWidth;
          stopTracking();
          cb && cb();
        }, 80);
      }
    }
    step();
  }

  // ── FASE 2 — drift vivo ────────────────────────────────────
  function stayAlive(elId, lineCtrl, cb) {
    var el = document.getElementById(elId);
    if (!el) { setTimeout(cb, ALIVE_MS); return; }

    var lineEl  = el.closest('.transmission-line');
    var centerX = el._centerX || 0;
    var lineW   = el._lineW   || 200;
    var driftX  = centerX + lineW * 0.03;

    el._driftX = driftX;

    el.style.transition = 'transform ' + ALIVE_MS + 'ms cubic-bezier(0.25, 0, 0.58, 1)';
    el.style.transform  = 'translateY(-50%) translateX(' + driftX + 'px) scale(1.15)';

    var stopTracking = startTracking(el, lineEl, lineCtrl);

    setTimeout(function () {
      stopTracking();
      cb && cb();
    }, ALIVE_MS);
  }

  // ── FASE 3 — dissolve para a direita ──────────────────────
  function dissolveRight(elId, lineCtrl, cb) {
    var el = document.getElementById(elId);
    if (!el) { cb && cb(); return; }

    var lineEl  = el.closest('.transmission-line');
    var fromX   = el._driftX !== undefined ? el._driftX : (el._centerX || 0);
    var elLineW = el._lineW  || 200;
    var destX   = fromX + elLineW * 0.45;

    el.style.transition = 'none';
    el.style.transform  = 'translateY(-50%) translateX(' + fromX + 'px) scale(1.15)';
    el.style.opacity    = '1';
    void el.offsetWidth;

    el.style.transition = 'transform ' + DISSOLVE_MS + 'ms cubic-bezier(0.42, 0, 1, 1),'
                        + 'opacity '   + DISSOLVE_MS + 'ms cubic-bezier(0.42, 0, 1, 1)';
    el.style.transform  = 'translateY(-50%) translateX(' + destX + 'px) scale(1)';
    el.style.opacity    = '0';

    var stopTracking = startTracking(el, lineEl, lineCtrl);

    setTimeout(function () {
      stopTracking();
      lineCtrl.reset();
      el.style.transition = 'none';
      el.style.opacity    = '1';
      el.style.transform  = 'translateY(-50%) translateX(0px) scale(1)';
      el._centerX = undefined;
      el._driftX  = undefined;
      var cursor = el.querySelector('.tw-cursor');
      textNode(el, cursor).textContent = '';
      void el.offsetWidth;
      cb && cb();
    }, DISSOLVE_MS + 60);
  }

  // ── FASE 4 — cadeado processa ──────────────────────────────
  //
  //  T+0ms    zoom in (scale 1→1.28) + absorb color (azul)
  //  T+120ms  ícone faz fade a 12% de opacidade
  //  T+220ms  scanner varre de cima para baixo
  //  T+700ms  ícone volta — criptografado
  //  T+820ms  zoom out suave de volta ao normal
  //  T+960ms  anel de pulso expande e some
  //  T+1180ms limpa classes, cb()
  // ─────────────────────────────────────────────────────────
  function lockProcess(cb) {
    var icon    = qs('.transmission-node-icon--lock');
    var svg     = qs('.tnode-lock .lock-svg');
    var scanner = qs('.lock-scanner');
    var glow    = qs('.lock-scanner-glow');
    var pulse   = qs('.lock-pulse');

    icon.classList.add('lock-zoom', 'lock-absorb');

    setTimeout(function () {
      svg.classList.add('lock-hidden');
    }, 120);

    setTimeout(function () {
      scanner.classList.add('scanning');
      glow.classList.add('scanning');
    }, 220);

    setTimeout(function () {
      svg.classList.remove('lock-hidden');
      svg.setAttribute('stroke', '#A835F0');
      var dot = svg.querySelector('circle');
      if (dot) dot.setAttribute('fill', '#A835F0');
    }, 700);

    setTimeout(function () {
      icon.classList.remove('lock-zoom', 'lock-absorb');
      icon.classList.add('lock-done');
    }, 820);

    setTimeout(function () {
      triggerAnim(pulse, 'anim-ring', 900, null);
    }, 960);

    setTimeout(function () {
      icon.classList.remove('lock-done');
      scanner.classList.remove('scanning');
      glow.classList.remove('scanning');
      void scanner.offsetWidth;
      cb && cb();
    }, 1180);
  }

  // ── FASE 5 — linha cifrada ─────────────────────────────────
  function cipherSequence(cb) {
    window._lineRight.setColor(true);
    typeAndCenter('tw-cipher', CIPHER_TEXT, CHAR_CIPHER, window._lineRight, function () {
      stayAlive('tw-cipher', window._lineRight, function () {
        dissolveRight('tw-cipher', window._lineRight, function () {
          window._lineRight.setColor(false);
          cb();
        });
      });
    });
  }

  // ── Sequência principal (loop) ─────────────────────────────
  function run() {
    typeAndCenter('tw-plain', PLAIN_TEXT, CHAR_PLAIN, window._lineLeft, function () {
      stayAlive('tw-plain', window._lineLeft, function () {
        triggerAnim(qs('.tnode-device .transmission-node-icon'), 'anim-push', 700, null);
        triggerAnim(document.getElementById('sweep-device'), 'sweep-ltr', 560, null);
        dissolveRight('tw-plain', window._lineLeft, function () {
          lockProcess(function () {
            cipherSequence(function () {
              triggerAnim(qs('.tnode-server .transmission-node-icon'), 'anim-receive', 600, null);
              triggerAnim(document.getElementById('sweep-server'), 'sweep-rtl', 560, null);
              setTimeout(run, 500);
            });
          });
        });
      });
    });
  }

  // ── PONTAS SVG ─────────────────────────────────────────────
  //  Desenha a linha "de ponta · a · a ponta" alinhada aos ícones.
  //  Gerado em JS para que os centros dos nós sejam medidos após layout.
  // ─────────────────────────────────────────────────────────
  function buildPontasSVG() {
    var row        = document.getElementById('pontas-row');
    var visual     = document.querySelector('.transmission-visual');
    var nodeDevice = document.querySelector('.tnode-device');
    var nodeLock   = document.querySelector('.tnode-lock');
    var nodeServer = document.querySelector('.tnode-server');
    if (!row || !visual || !nodeDevice || !nodeLock || !nodeServer) return;

    var rowRect  = row.getBoundingClientRect();
    var devRect  = nodeDevice.getBoundingClientRect();
    var lockRect = nodeLock.getBoundingClientRect();
    var srvRect  = nodeServer.getBoundingClientRect();

    var devCX  = (devRect.left  + devRect.right)  / 2 - rowRect.left;
    var lockCX = (lockRect.left + lockRect.right) / 2 - rowRect.left;
    var srvCX  = (srvRect.left  + srvRect.right)  / 2 - rowRect.left;
    var W      = rowRect.width;
    var H      = 18;
    var cy     = H / 2;

    var leftPontaCX  = (devCX  + lockCX) / 2;
    var rightPontaCX = (lockCX + srvCX)  / 2;

    var textGray = 'rgba(58,79,106,0.70)';
    var rose     = 'rgba(58,79,106,0.70)';
    var line     = 'rgba(122,144,173,0.30)';

    var aSize      = 4;
    var pontaHalfW = 28;
    var aHalfW     = 6;
    var lpGap      = pontaHalfW + 12;
    var rpGap      = pontaHalfW + 12;
    var aGap       = aHalfW    + 12;

    var svg = '<svg class="pontas-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">'

      + '<line x1="' + (devCX+6)             + '" y1="' + cy + '" x2="' + (leftPontaCX-lpGap)  + '" y2="' + cy + '" stroke="' + line + '" stroke-width="1"/>'
      + '<line x1="' + (leftPontaCX+lpGap)   + '" y1="' + cy + '" x2="' + (lockCX-aGap)         + '" y2="' + cy + '" stroke="' + line + '" stroke-width="1"/>'
      + '<line x1="' + (lockCX+aGap)         + '" y1="' + cy + '" x2="' + (rightPontaCX-rpGap)  + '" y2="' + cy + '" stroke="' + line + '" stroke-width="1"/>'
      + '<line x1="' + (rightPontaCX+rpGap)  + '" y1="' + cy + '" x2="' + (srvCX-6)             + '" y2="' + cy + '" stroke="' + line + '" stroke-width="1"/>'

      + '<polyline points="' + (devCX+2+aSize) + ',' + (cy-aSize) + ' ' + (devCX+2) + ',' + cy + ' ' + (devCX+2+aSize) + ',' + (cy+aSize) + '" fill="none" stroke="' + line + '" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'

      + '<text x="' + leftPontaCX  + '" y="' + (cy+4) + '" text-anchor="middle" font-family="DM Sans,sans-serif"   font-size="12" fill="' + textGray + '">de ponta</text>'
      + '<text x="' + lockCX       + '" y="' + (cy+4) + '" text-anchor="middle" font-family="Comfortaa,cursive"    font-size="12" font-weight="700" fill="' + rose + '">a</text>'
      + '<text x="' + rightPontaCX + '" y="' + (cy+4) + '" text-anchor="middle" font-family="DM Sans,sans-serif"   font-size="12" fill="' + textGray + '">a ponta</text>'

      + '<polyline points="' + (srvCX-2-aSize) + ',' + (cy-aSize) + ' ' + (srvCX-2) + ',' + cy + ' ' + (srvCX-2-aSize) + ',' + (cy+aSize) + '" fill="none" stroke="' + line + '" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'

      + '</svg>';

    row.innerHTML = svg;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(run, 50);
      setTimeout(buildPontasSVG, 80);
    });
  } else {
    setTimeout(run, 50);
    setTimeout(buildPontasSVG, 80);
  }

})();
