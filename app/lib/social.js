// Client de l'API sociale (amis, guildes). Toutes les données viennent du serveur ; aucune valeur n'est gardée dans le navigateur.
const API = `${process.env.NEXT_PUBLIC_API_URL || ''}/social`;

async function call(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('token') : ''}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Erreur'); e.code = data.code; e.status = res.status; throw e; }
  return data;
}

export const social = {
  me: () => call('/me'),
  friends: () => call('/friends'),
  requests: () => call('/requests'),
  sendRequest: (friendCode) => call('/requests', 'POST', { friendCode }),
  accept: (id) => call(`/requests/${id}/accept`, 'POST'),
  decline: (id) => call(`/requests/${id}/decline`, 'POST'),
  cancel: (id) => call(`/requests/${id}`, 'DELETE'),
  removeFriend: (userId) => call(`/friends/${userId}`, 'DELETE'),
  blocks: () => call('/blocks'),
  block: (userId) => call('/blocks', 'POST', { userId }),
  unblock: (userId) => call(`/blocks/${userId}`, 'DELETE'),
  guild: () => call('/guild'),
  createGuild: (name, description) => call('/guilds', 'POST', { name, description }),
  joinGuild: (code) => call('/guilds/join', 'POST', { code }),
  leaveGuild: () => call('/guilds/leave', 'POST'),
  kick: (userId) => call('/guilds/kick', 'POST', { userId }),
  transfer: (userId) => call('/guilds/transfer', 'POST', { userId }),
  regenerateInvite: () => call('/guilds/invite/regenerate', 'POST'),
  disband: () => call('/guilds', 'DELETE'),
  tag: () => call('/tag'),
  changeTag: (tag) => call('/tag', 'POST', { tag }),
  tagHistory: () => call('/tag/history'),
  setProBadgeVisible: (showProBadge) => call('/privacy', 'POST', { showProBadge }),
  setProfileVisibility: (visibility) => call('/visibility', 'POST', { visibility }),
};

export const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* HTTP ou refus : repli ci-dessous */ }
  try {
    const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); document.body.removeChild(t); return ok;
  } catch { return false; }
};
