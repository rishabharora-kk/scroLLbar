/** Optional headings navigation in an accessible native modal bottom sheet. */
export function mountContents(core) {
  const { host } = core;
  const button = document.createElement('button');
  button.className = 'is-contents-button';
  button.type = 'button';
  button.textContent = 'Contents';
  button.setAttribute('aria-haspopup', 'dialog');
  const sheet = document.createElement('dialog');
  sheet.className = 'is-contents-sheet';
  sheet.setAttribute('aria-label', 'Document contents');
  sheet.innerHTML = '<div class="is-contents-heading"><strong>Contents</strong><button type="button" aria-label="Close contents">×</button></div><div class="is-contents-list"></div>';
  const list = sheet.querySelector('.is-contents-list');
  const closeButton = sheet.querySelector('.is-contents-heading button');
  host.append(button);
  document.body.append(sheet);
  button.addEventListener('click', () => { if (!sheet.open) { sheet.showModal(); closeButton.focus(); } });
  closeButton.addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener('close', () => button.focus());
  let current = -1, prevHeadings = null;
  function build(state) {
    list.replaceChildren();
    const minLevel = Math.min(4, ...state.headings.map(h => h.level));
    state.headings.forEach((heading, index) => {
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.className = 'is-contents-item';
      entry.style.paddingInlineStart = `${16 + Math.max(0, heading.level - minLevel) * 14}px`;
      entry.textContent = heading.title;
      entry.addEventListener('click', () => { core.jump(heading.top - core.getState().stickyOffset); sheet.close(); });
      list.append(entry);
    });
  }
  function highlight(state) {
    if (state.index === current) return;
    current = state.index;
    Array.from(list.children).forEach((child, i) => {
      child.classList.toggle('is-current', i === current);
      if (i === current) child.setAttribute('aria-current', 'location');
      else child.removeAttribute('aria-current');
    });
  }
  const off = core.on((event, state) => {
    if (event === 'measure' && state.headings !== prevHeadings) {
      prevHeadings = state.headings; current = -1; build(state); highlight(state);
    }
    if (event === 'render') highlight(state);
  });
  const state = core.getState(); build(state); highlight(state);
  return () => { off(); if (sheet.open) sheet.close(); sheet.remove(); button.remove(); };
}
