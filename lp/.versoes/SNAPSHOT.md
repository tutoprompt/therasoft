# SNAPSHOT — Therasoft Landing Page
**Data:** Abril 2026  
**Arquivo:** index.html (versão atual em /mnt/user-data/outputs/index.html)

---

## ESTADO ATUAL DA SEÇÃO DE TRANSMISSÃO

### Estrutura HTML do bloco
```
.security-transmission
  .transmission-label
    .transmission-title  → "Sigilo" (Comfortaa 20px bold)
    #pontas-row          → SVG gerado por JS (buildPontasSVG)
  .transmission-visual
    .tnode-device        → bolinha azul 68px, SVG celular 28px, #sweep-device
    .transmission-line--left  → #svg-line-left (led-strip) + #tw-plain
    .tnode-lock          → bolinha roxa 60px, .lock-svg, .lock-scanner, .lock-scanner-glow, .lock-pulse
    .transmission-line--right → #svg-line-right (led-strip) + #tw-cipher
    .tnode-server        → bolinha rosa/roxa 68px, SVG servidor 28px, #sweep-server
  .transmission-alert    → alert bar centralizada (ícone + texto 2 linhas)
```

---

## ANIMAÇÃO — sequência JS (IIFE no fim do arquivo)

### Variáveis
- `PLAIN_TEXT`  = 'informações confidenciais do paciente'
- `CIPHER_TEXT` = 'aX7#Km2$qR9!pL4&Zv8@nW3%eJ6*fT1^bY5'
- `CHAR_PLAIN`  = 28ms/char
- `CHAR_CIPHER` = 22ms/char
- `ALIVE_MS`    = 1600ms (drift)
- `DISSOLVE_MS` = 480ms
- `PROCESS_MS`  = 900ms

### Funções principais
- `typeAndCenter(elId, text, charMs, lineCtrl, cb)` — digita da esquerda, span desliza para centro (ease-in), mede fullW antes de digitar, guarda `el._centerX` e `el._lineW`
- `stayAlive(elId, lineCtrl, cb)` — drift suave +8% para direita durante ALIVE_MS, guarda `el._driftX`
- `dissolveRight(elId, lineCtrl, cb)` — parte de `_driftX`, ease-out + fade opacity, scale 1.15→1
- `lockProcess(cb)` — sequência cinematográfica do cadeado (ver abaixo)
- `cipherSequence(cb)` — igual à esquerda, usa window._lineRight
- `buildPontasSVG()` — lê getBoundingClientRect dos 3 nós, desenha SVG com segmentos, textos e chevrons

### lineCtrl
- `window._lineLeft` e `window._lineRight` controlam as led-strips (bolinha de luz nas linhas)
- Métodos: `.move(cx)`, `.reset()`, `.setColor(bool)`
- Tracking via rAF contínuo durante cada fase

---

## LOCKPROCESS — sequência cinematográfica

| T | Ação |
|---|------|
| 0ms | zoom in scale→1.28 + cor azul (.lock-zoom, .lock-absorb) |
| 120ms | ícone fade a 12% (.lock-hidden) |
| 220ms | scanner varre top→bottom (.scanning em .lock-scanner e .lock-scanner-glow) |
| 700ms | ícone volta, stroke/fill volta ao roxo #A835F0 |
| 820ms | zoom out, cor volta ao roxo (.lock-done) |
| 960ms | anel de pulso expande (.anim-ring) |
| 1180ms | limpa tudo, cb() |

---

## ÍCONES

| Nó | Tamanho bolinha | SVG | Cor fundo |
|---|---|---|---|
| Dispositivo | 68px | 28px, stroke branco 2px | gradiente azul #2B7FFF→#1A4FCC |
| Cadeado | 60px | 24px, stroke #A835F0 1.8px | rgba(168,53,240,0.10) |
| Servidor | 68px | 28px, stroke branco 2px | gradiente rosa #D446F7→#8B1FCC |

- Dispositivo e servidor têm `overflow: hidden` para o sweep
- `#sweep-device` → `sweep-ltr` (esquerda→direita) ao anim-push
- `#sweep-server` → `sweep-rtl` (direita→esquerda) ao anim-receive
- Sweep: `radial-gradient` elíptico, `filter: blur(4px)`, 130% largura

---

## PONTAS SVG (buildPontasSVG)

- Linha dividida em 4 segmentos com gaps ao redor de cada texto
- Chevron esquerdo aponta `<` (saindo do dispositivo)
- "de ponta" centralizado entre dispositivo e cadeado
- "a" centralizado sobre o cadeado (rosa, Comfortaa)
- "a ponta" centralizado entre cadeado e servidor
- Chevron direito aponta `>` (chegando no servidor)
- Font-size 9px, letter-spacing 2, sem fundo branco

---

## ALERT BAR (.transmission-alert)

- `flex-direction: column`, `align-items: center`, `text-align: center`
- Sem borda
- Ícone escudo+check 15px centralizado em cima
- `<strong>` com `display: block` para quebrar linha
- Fundo: `linear-gradient(135deg, rgba(168,53,240,0.07), rgba(43,127,255,0.05))`

---

## CORES (variáveis CSS)
```
--blue-primary:  #2B7FFF
--blue-brand:    #002ADD
--rose:          #D446F7
--text-dark:     #0F1B2D
--text-mid:      #3A4F6A
--warm-white:    #F7F8FA
```

---

## FONTES
- Comfortaa (títulos, 300/400/500/600/700)
- DM Sans (corpo, 300/400/500)

---

## PENDÊNCIAS / PRÓXIMOS PASSOS
- Revisar alinhamento desktop da seção de transmissão (grid 2 colunas)
- Avaliar se o gap dos labels das pontas precisa ajuste fino em mobile
