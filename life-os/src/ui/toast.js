// Transient confirmations with an optional action (used for Undo).

import { esc } from '../util.js';

let host = null;
let timer = null;

export function toast(message, { action = null, kind = '', ms = 2600 } = {}) {
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast';
    host.setAttribute('role', 'status');
    document.body.appendChild(host);
  }
  host.className = 'toast ' + kind;
  host.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) host.querySelector('button').onclick = () => { hide(); action.fn(); };
  requestAnimationFrame(() => host.classList.add('show'));
  clearTimeout(timer);
  timer = setTimeout(hide, action ? Math.max(ms, 5000) : ms);
}

function hide() {
  if (host) host.classList.remove('show');
}
