import { exceedsBackThreshold } from '../math.mjs';

export function mountBackChip(core) {
  const button = document.createElement('button');
  button.className = 'is-back-chip';
  button.type = 'button';
  core.host.append(button);
  let origin = null, timer = 0;
  const hide = () => { origin = null; button.classList.remove('is-back-visible'); clearTimeout(timer); };
  button.addEventListener('click', () => {
    if (origin === null) return;
    const target = origin;
    hide();
    core.jump(target, core.getState().scrollTop, 'back');
  });
  const off = core.on((event, data) => {
    if (event !== 'jump' || data.cause === 'back') return;
    if (!exceedsBackThreshold(data.origin, data.target, data.viewport, core.options.backThreshold)) return;
    origin = data.origin;
    button.textContent = `Back to ${data.section}`;
    button.classList.add('is-back-visible');
    clearTimeout(timer);
    timer = setTimeout(hide, core.options.backTimeoutMs);
  });
  return () => { off(); hide(); button.remove(); };
}
