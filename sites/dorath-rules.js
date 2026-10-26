/* DORATH — consulta de regras. Camada independente: sem ações de partida ou Supabase. */
(() => {
  'use strict';
  const board = document.getElementById('board');
  if (!board) return;
  const nav = document.querySelector('.dv4-nav');
  const movement = document.getElementById('movement');
  if (!nav || !movement) return;

  // Arquivos de consulta armazenados diretamente em sites/.
  // Não se substitui conteúdo ausente por regras reconstruídas.
  const cards = [
    { label: 'Carta 1', path: 'guia-rapido-1.png' },
    { label: 'Carta 2', path: 'guia-rapido-2.png' },
    { label: 'Carta 3', path: 'guia-rapido-3.png' }
  ];
  let manualPath = 'livro-de-regras.pdf';
  let combinedGuide = '';
  let discovered = false;
  // Descobre os nomes publicados em sites/ sem alterar o motor ou o servidor.
  // Este repositório é público; se a API estiver indisponível, há nomes locais de reserva.
  async function discoverFiles() {
    if (discovered) return;
    discovered = true;
    let names = [];
    try {
      const response = await fetch('https://api.github.com/repos/traderpedreira/dorath/contents/sites?ref=feature%2Fdorath-mobile-v4', {cache:'no-store'});
      if (response.ok) {
        const items = await response.json();
        if (Array.isArray(items)) names = items.filter(x=>x.type==='file').map(x=>x.name);
      }
    } catch (_) {}
    const lower = v=>v.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
    const isPdf = v=>/\\.pdf$/i.test(v);
    const isImage = v=>/\\.(webp|png|jpe?g)$/i.test(v);
    const sorted = names.slice().sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const manual = sorted.filter(n=>isPdf(n)&&/livro.*regras|manual.*periodo|regras.*v3[._-]?2/i.test(lower(n))).sort((a,b)=>Number(/v3[._-]?2/i.test(lower(b)))-Number(/v3[._-]?2/i.test(lower(a))))[0];
    if (manual) manualPath = encodeURIComponent(manual);
    const guidePDF = sorted.find(n=>isPdf(n)&&(/3.*cartas.*consulta|cartas.*consulta|guia.*rapido/i.test(lower(n))));
    if (guidePDF) combinedGuide=encodeURIComponent(guidePDF);
    const images=sorted.filter(n=>isImage(n)&&/guia|consulta|carta.*[123]/i.test(lower(n)));
    for (let i=0;i<3;i++) {
      const n=images.find(n=>new RegExp('(?:^|[^0-9])'+(i+1)+'(?:[^0-9]|$)').test(n))||images[i];
      if (n) cards[i].path=encodeURIComponent(n);
    }
  }
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
    img.onerror = () => {
      if (combinedGuide) {
        const fallback = document.createElement('iframe');
        fallback.title='Três cartas de consulta — documento original';
        fallback.src=combinedGuide+'#toolbar=1&view=Fit';
        fallback.style.cssText='width:100%;height:55dvh;border:0;background:white';
        holder.replaceChildren(fallback);
      } else unavailable(holder, decodeURIComponent(item.path));
    };
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
  function showManual() {
    const holder = make('div', 'dorath-rules-manual');
    const iframe = document.createElement('iframe');
    iframe.title = 'Livro de regras do DORATH';
    iframe.loading = 'eager';
    iframe.src = manualPath + '#view=FitH';
    const link = make('a', '', 'Abrir livro de regras em outra aba');
    link.href = manualPath;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'dorath-rules-external';
    link.setAttribute('aria-label', 'Abrir livro de regras em nova aba, mantendo o jogo aberto');
    holder.append(iframe, link);
    body.replaceChildren(holder);
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
  async function open(view) {
    previousFocus = document.activeElement;
    await discoverFiles();
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
