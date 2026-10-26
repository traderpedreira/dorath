/* DORATH — consulta de regras. Camada independente: sem ações de partida ou Supabase. */
(() => {
  'use strict';
  const board = document.getElementById('board');
  if (!board) return;
  const nav = document.querySelector('.dv4-nav');
  const movement = document.getElementById('movement');
  if (!nav || !movement) return;

  // Os quatro arquivos homologados devem ser publicados em sites/regras/.
  // Não se substitui conteúdo ausente por regras reconstruídas.
  const cards = [
    { label: 'Carta 1', path: 'regras/guia-rapido-1.webp' },
    { label: 'Carta 2', path: 'regras/guia-rapido-2.webp' },
    { label: 'Carta 3', path: 'regras/guia-rapido-3.webp' }
  ];
  const manualPath = 'regras/livro-de-regras.pdf';
  const make = (tag, cls, label) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (label) el.textContent = label;
    return el;
  };
  const button = make('button', '', 'ⓘ Regras');
  button.type = 'button';
  button.dataset.dorathRules = 'true';
  button.className = 'dv4-more-extra dorath-rules-menu';
  const syncMenu = () => { if (nav.classList.contains('dv4-more-open')) { if (!nav.contains(button)) nav.append(button); } else button.remove(); };
  new MutationObserver(syncMenu).observe(nav, {attributes:true, attributeFilter:['class']});
  syncMenu();

  const dialog = make('dialog', 'dorath-rules-dialog');
  dialog.setAttribute('aria-label', 'Regras do DORATH');
  dialog.innerHTML = '<div class="dorath-rules-head"><strong>Regras · DORATH</strong><button type="button" class="dorath-rules-close" aria-label="Fechar regras">✕</button></div><div class="dorath-rules-choices" role="tablist" aria-label="Tipo de consulta"><button type="button" data-rules-view="guide" role="tab">Guia rápido</button><button type="button" data-rules-view="manual" role="tab">Livro de regras</button></div><div class="dorath-rules-body"></div>';
  document.body.append(dialog);
  const body = dialog.querySelector('.dorath-rules-body');
  let selected = 0;
  let previousFocus = null;

  function unavailable(container, filename) {
    const msg = make('p', 'dorath-rules-unavailable', 'Arquivo homologado ainda não publicado: ' + filename);
    container.replaceChildren(msg);
  }
  function showCard(index) {
    selected = Math.max(0, Math.min(cards.length - 1, index));
    const item = cards[selected];
    const holder = make('div', 'dorath-rules-card');
    const img = document.createElement('img');
    img.alt = 'Guia rápido · ' + item.label;
    img.loading = 'lazy';
    img.onerror = () => unavailable(holder, item.path);
    holder.append(img);
    img.src = item.path;
    const controls = make('div', 'dorath-rules-pager');
    const prev = make('button', '', '← Anterior');
    prev.type = 'button'; prev.disabled = selected === 0;
    prev.onclick = () => showCard(selected - 1);
    const count = make('span', '', (selected + 1) + ' de ' + cards.length);
    const next = make('button', '', 'Próxima →');
    next.type = 'button'; next.disabled = selected === cards.length - 1;
    next.onclick = () => showCard(selected + 1);
    controls.append(prev, count, next);
    const manual = make('button', 'dorath-rules-inline', 'Ver livro de regras');
    manual.type = 'button'; manual.onclick = () => setView('manual');
    body.replaceChildren(holder, controls, manual);
  }
  async function showManual() {
    const holder = make('div', 'dorath-rules-manual');
    const iframe = document.createElement('iframe');
    iframe.title = 'Livro de regras do DORATH';
    iframe.loading = 'lazy';
    const link = make('a', '', 'Abrir manual em outra aba');
    link.href = manualPath; link.target = '_blank'; link.rel = 'noopener';
    holder.append(iframe, link);
    body.replaceChildren(holder);
    try {
      const response = await fetch(manualPath, { method: 'HEAD' });
      if (!response.ok || body.firstChild !== holder) {
        if (!response.ok && body.firstChild === holder) unavailable(body, manualPath);
        return;
      }
      iframe.src = manualPath;
    } catch {
      if (body.firstChild === holder) unavailable(body, manualPath);
    }
  }
  function setView(view) {
    dialog.querySelectorAll('[data-rules-view]').forEach(btn => {
      const active = btn.dataset.rulesView === view;
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    });
    if (view === 'manual') showManual();
    else showCard(selected);
  }
  function open(view) {
    previousFocus = document.activeElement;
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else if (typeof dialog.showModal !== 'function') dialog.setAttribute('open', '');
    setView(view);
  }
  function close() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    previousFocus?.focus?.();
  }
  button.addEventListener('click', () => open('guide'));
  dialog.querySelector('.dorath-rules-close').addEventListener('click', close);
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
  dialog.addEventListener('close', () => previousFocus?.focus?.());
  dialog.querySelectorAll('[data-rules-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.rulesView)));

  const help = make('button', 'dorath-rules-help', '!');
  help.type = 'button'; help.title = 'Consultar guia rápido';
  help.setAttribute('aria-label', 'Consultar guia rápido do DORATH');
  help.addEventListener('click', () => open('guide'));
  // O conteúdo do painel Jogar é renderizado novamente durante a partida.
  // O observador mantém exclusivamente o botão, sem alterar ações do jogo.
  function syncHelp() {
    const title = movement.querySelector('h3, h2');
    if (title && help.parentNode !== title) title.append(help);
    else if (!title && help.parentNode) help.remove();
  }
  const observer = new MutationObserver(syncHelp);
  observer.observe(movement, {childList:true,subtree:true});
  syncHelp();
})();
