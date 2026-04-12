// ════════════════════════════════════════════════════════════
//  INTERACTIONS — comportamentos disparados pelo usuário
//  Cliques, hovers, scroll triggers, modais, formulários, etc.
// ════════════════════════════════════════════════════════════

// ── FAQ accordion ────────────────────────────────────────────
document.querySelectorAll('.faq-question').forEach(function(q) {
  q.addEventListener('click', function() {
    var item   = this.closest('.faq-item');
    var isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function(i) {
      i.classList.remove('open');
    });
    if (!isOpen) item.classList.add('open');
  });
});
