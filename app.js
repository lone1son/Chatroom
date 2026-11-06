const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const avatarColors = ['av-green', 'av-blue', 'av-purple', 'av-coral', 'av-yellow'];
const emojiOptions = ['👍', '❤️', '😂', '🎉', '👀', '✨'];
const fontAwesomeIcons = {
  'messages-square': 'fa-comments', 'arrow-right': 'fa-arrow-right', 'lock-keyhole': 'fa-lock', 'shield-check': 'fa-shield-halved', 'arrow-left': 'fa-arrow-left',
  'panel-left-close': 'fa-angles-left', 'panel-left-open': 'fa-bars', 'chevrons-up-down': 'fa-up-down', plus: 'fa-plus', search: 'fa-magnifying-glass', ellipsis: 'fa-ellipsis',
  smile: 'fa-face-smile', 'arrow-up': 'fa-arrow-up', x: 'fa-xmark', 'message-circle': 'fa-message', pencil: 'fa-pen', sparkles: 'fa-wand-magic-sparkles', 'image-up': 'fa-image',
  reply: 'fa-reply', 'smile-plus': 'fa-face-smile', 'user-round': 'fa-user', 'log-out': 'fa-right-from-bracket'
};
const iconFallbacks = {
  'messages-square': '▰', 'arrow-right': '→', 'lock-keyhole': '▣', 'shield-check': '✓', 'arrow-left': '←',
  'panel-left-close': '−', 'panel-left-open': '☰', 'chevrons-up-down': '↕', plus: '+', search: '⌕', ellipsis: '···',
  smile: '☺', 'arrow-up': '↑', x: '×', 'message-circle': '◌', pencil: '✎', sparkles: '✦', 'image-up': '▧',
  reply: '↩', 'smile-plus': '☺+', 'user-round': '●', 'log-out': '↪'
};
const badgeLabels = {
  none: 'No badge', jolly: 'Jolly', merry: 'Merry', 'ho-ho-ho': 'Ho Ho Ho', frosty: 'Frosty', cozy: 'Cozy', 'snowed-in': 'Snowed In', naughty: 'Naughty', nice: 'Nice', elf: 'Elf',
  artist: 'Artist', creator: 'Creator', gamer: 'Gamer', music: 'Music Lover', bookworm: 'Bookworm', 'night-owl': 'Night Owl', helper: 'Helper', trailblazer: 'Trailblazer', dreamer: 'Dreamer', explorer: 'Explorer', legend: 'Legend', stargazer: 'Stargazer', 'good-vibes': 'Good Vibes', 'plant-parent': 'Plant Parent', 'pixel-pro': 'Pixel Pro', 'cozy-core': 'Cozy Core', comet: 'Comet', moonbeam: 'Moonbeam', sunshine: 'Sunshine', vivid: 'Vivid', 'tiny-chaos': 'Tiny Chaos', 'team-player': 'Team Player', maker: 'Maker', storyteller: 'Storyteller', 'early-bird': 'Early Bird',
  dragon: 'Dragon', angel: 'Angel', raver: 'Raver', builder: 'Builder', rocket: 'Rocket', spectral: 'Spectral', spark: 'Spark', flower: 'Flower', wizard: 'Wizard', 'sun-chaser': 'Sun Chaser',
};
const spookyAdjectives = [
  'Phantom', 'Cursed', 'Haunted', 'Midnight', 'Cryptic', 'Eerie', 'Bloodmoon', 'Shadow', 'Sinister', 'Graveyard',
  'Vampire', 'Witchbound', 'Zombie', 'Spectral', 'Dread', 'Hollow', 'Darkwood', 'Moonlit', 'Creeping', 'Ghostly'
];
const spookySubjects = [
  'Whisper', 'Lantern', 'Reaper', 'Skull', 'Wraith', 'Werewolf', 'Bat', 'Spirit', 'Pumpkin', 'Raven',
  'Candle', 'Crypt', 'Fang', 'Tomb', 'Hound', 'Fog', 'Mirror', 'Bell', 'Hex', 'Nightmare'
];
for (let badgeNumber = 1; badgeNumber <= 300; badgeNumber++) {
  const adjective = spookyAdjectives[(badgeNumber - 1) % spookyAdjectives.length];
  const subject = spookySubjects[Math.floor((badgeNumber - 1) / spookyAdjectives.length) % spookySubjects.length];
  badgeLabels[`animated-${String(badgeNumber).padStart(3, '0')}`] = `${adjective} ${subject} ${badgeNumber}`;
}
const effectLabels = {
  none: 'None', glow: 'Glow', aurora: 'Aurora', frost: 'Frost', sparkle: 'Sparkle', sunset: 'Sunset', neon: 'Neon', rose: 'Rose', ocean: 'Ocean', ember: 'Ember', cosmic: 'Cosmic', hologram: 'Hologram', midnight: 'Midnight', gold: 'Gold', prism: 'Prism', pulse: 'Pulse', orbit: 'Orbit', electric: 'Electric', glitch: 'Glitch', halo: 'Halo', rainbow: 'Rainbow'
};
let currentUser = null;
let socket = null;
let rooms = [];
let users = [];
let onlineIds = [];
let activeContext = { type: 'room', id: 'general' };
let messageCache = new Map();
let replyTarget = null;
let searchQuery = '';
let loginMode = false;
let verificationEmail = '';
let profileUser = null;
let toastTimer;
let selectedAvatarFile = null;
let avatarPreviewUrl = null;
let selectedAvatarEffect = 'none';
let selectedBadge = 'none';
let pendingExternalUrl = null;
let muteTimerInterval;
let voiceRoomId = null;
let voiceRingRoomId = null;
let localVoiceStream = null;
let voiceIceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
let selectedChatImage = null;
let selectedGifId = null;
let gifCatalog = [];
let pendingDecorationId = null;
let pendingPurchaseType = 'decoration';
let selectedBannerFile = null;
let bannerPreviewUrl = null;
let decorationCatalog = [];
let ownedEffects = ['none'];
let coinBalance = 0;
let mentionQueryStart = null;
let mentionedRoomId = null;
let typingTimer = null;
let unreadDmIds = new Set();
let dmPeerIds = new Set();
let friendData = { friends: [], incoming: [], outgoing: [] };
const typingUsers = new Map();
const voiceConnections = new Map();
const voiceUsers = new Map();

function colorForUser(userId) {
  let hash = 0;
  for (const character of String(userId)) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Something went wrong.');
    error.requiresEmailVerification = result.requiresEmailVerification === true;
    error.email = result.email;
    throw error;
  }
  return result;
}

function refreshIcons() {
  document.querySelectorAll('i[data-lucide]').forEach((icon) => {
    const iconName = icon.dataset.lucide;
    const fontAwesomeStyles = $('#fontAwesomeStyles');
    icon.textContent = '';
    icon.classList.remove('icon-fallback');
    if (fontAwesomeStyles?.sheet && fontAwesomeIcons[iconName]) {
      icon.classList.add('fa-solid', fontAwesomeIcons[iconName]);
    } else {
      icon.classList.remove('fa-solid', ...Object.values(fontAwesomeIcons));
      icon.classList.add('icon-fallback');
      icon.textContent = iconFallbacks[iconName] || '•';
    }
  });
}

function linkifyText(text) {
  const pattern = /https?:\/\/[^\s<]+|www\.[^\s<]+|(?<![@\w.-])(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s<]*)?/gi;
  let output = '';
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    let rawUrl = match[0];
    let trailing = '';
    while (/[.,!?;:)\]]$/.test(rawUrl)) {
      trailing = rawUrl.slice(-1) + trailing;
      rawUrl = rawUrl.slice(0, -1);
    }
    let destination;
    try {
      destination = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
      if (!['http:', 'https:'].includes(destination.protocol)) continue;
    } catch { continue; }
    output += `${escapeHTML(text.slice(cursor, match.index))}<a href="${escapeHTML(destination.href)}" data-external-url="${escapeHTML(destination.href)}">${escapeHTML(rawUrl)}</a>${escapeHTML(trailing)}`;
    cursor = match.index + match[0].length;
  }
  return output + escapeHTML(text.slice(cursor));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMentions(text) {
  const html = linkifyText(text);
  const mentionableUsers = [currentUser, ...users].filter(Boolean).sort((first, second) => second.name.length - first.name.length);
  if (!mentionableUsers.length) return html;
  const names = mentionableUsers.map((user) => escapeRegExp(escapeHTML(user.name))).join('|');
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])(@(?:${names}))(?=$|[^\\p{L}\\p{N}_])`, 'giu');
  return html.replace(/(<[^>]*>|[^<]+)/g, (segment) => {
    if (segment.startsWith('<')) return segment;
    return segment.replace(pattern, '$1<span class="mention">$2</span>');
  });
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

function showAuth(screen) {
  $('#authShell').hidden = false;
  $('#appShell').hidden = true;
  $('#welcomeScreen').hidden = screen !== 'welcome';
  $('#createScreen').hidden = screen !== 'create';
  $('#verificationScreen').hidden = screen !== 'verification';
  refreshIcons();
}

function setAuthMode(isLogin) {
  loginMode = isLogin;
  $('#formTitle').textContent = isLogin ? 'Welcome back.' : 'Create your account.';
  $('#formCopy').textContent = isLogin ? 'Sign in and pick up the conversation.' : 'Create your account and join the conversation.';
  $('#bioField').hidden = isLogin;
  $('#bioInput').required = false;
  $('#nameField').hidden = isLogin;
  $('#nameInput').required = !isLogin;
  $('#passwordInput').autocomplete = isLogin ? 'current-password' : 'new-password';
  $('#emailInput').type = isLogin ? 'text' : 'email';
  $('#emailInput').name = isLogin ? 'identity' : 'email';
  $('#emailInput').placeholder = isLogin ? 'Username or email' : 'you@example.com';
  $('#submitAccount').innerHTML = isLogin ? 'Sign in <i data-lucide="arrow-right"></i>' : 'Create account <i data-lucide="arrow-right"></i>';
  $('#formSwitch').innerHTML = isLogin
    ? 'New to Obsidian Chat? <button id="formLogin" class="text-button" type="button">Create an account</button>'
    : 'Already have an account? <button id="formLogin" class="text-button" type="button">Sign in</button>';
  $('#formLogin').addEventListener('click', () => setAuthMode(!loginMode));
  $('#formError').textContent = '';
  refreshIcons();
}

function profileById(userId) {
  return userId === currentUser.id ? currentUser : users.find((user) => user.id === userId);
}

function renderPeople() {
  const host = $('#peopleList');
  if (!users.length) {
    host.innerHTML = '<li class="empty-person">No other members yet.</li>';
    return;
  }
  host.innerHTML = users.map((user) => `<li><button class="person-button${activeContext.type === 'dm' && activeContext.id === user.id ? ' active' : ''}" data-person="${escapeHTML(user.id)}">${avatarMarkup(user)}<span class="person-copy"><span class="person-name">${escapeHTML(user.name)}${badgeMarkup(user)}</span><span class="person-status ${onlineIds.includes(user.id) ? 'is-online' : ''}">${onlineIds.includes(user.id) ? 'Online' : 'Offline'}</span></span><span class="person-arrow">›</span></button></li>`).join('');
}

function renderDirectMessages() {
  const host = $('#dmList');
  if (!host) return;
  const peers = users.filter((user) => user.id !== currentUser?.id && dmPeerIds.has(user.id));
  host.innerHTML = peers.length
    ? peers.map((peer) => `<li><button class="dm-button${activeContext.type === 'dm' && activeContext.id === peer.id ? ' active' : ''}" data-dm="${escapeHTML(peer.id)}">${avatarMarkup(peer)}<span class="dm-name">${escapeHTML(peer.name)}</span>${unreadDmIds.has(peer.id) ? '<span class="dm-unread-dot" aria-label="Unread message"></span>' : ''}</button></li>`).join('')
    : '<li class="empty-person">No direct messages yet.</li>';
  host.querySelectorAll('[data-dm]').forEach((button) => {
    button.addEventListener('click', () => {
      const peer = profileById(button.dataset.dm);
      if (peer) openDirect(peer);
    });
  });
}

function renderSidebar() {
  const textRooms = rooms.filter((room) => room.type !== 'voice');
  const voiceRooms = rooms.filter((room) => room.type === 'voice');
  $('#channelList').innerHTML = textRooms.map((room) => `<li><button class="channel-button${activeContext.type === 'room' && activeContext.id === room.id ? ' active' : ''}" data-channel="${escapeHTML(room.id)}"><span class="channel-hash">#</span><span class="channel-name">${escapeHTML(room.name)}</span></button></li>`).join('');
  $('#voiceList').innerHTML = voiceRooms.map((room) => `<li><button class="channel-button${activeContext.type === 'voice' && activeContext.id === room.id ? ' active' : ''}" data-voice-room="${escapeHTML(room.id)}"><span class="channel-hash"><i class="fa-solid fa-volume-high"></i></span><span class="channel-name">${escapeHTML(room.name)}</span></button></li>`).join('');
  renderPeople();
  renderDirectMessages();
  document.querySelectorAll('[data-channel]').forEach((button) => button.addEventListener('click', () => openRoom(button.dataset.channel)));
  document.querySelectorAll('[data-voice-room]').forEach((button) => button.addEventListener('click', () => openVoiceRoom(button.dataset.voiceRoom)));
  document.querySelectorAll('[data-person]').forEach((button) => button.addEventListener('click', () => {
    const user = profileById(button.dataset.person);
    if (user) openProfile(user);
  }));
  refreshIcons();
}

function updateMentionSuggestions() {
  const input = $('#messageInput');
  const cursor = input.selectionStart;
  const prefix = input.value.slice(0, cursor);
  const match = prefix.match(/(?:^|\s)@([^\s@]*)$/);
  const suggestions = $('#mentionSuggestions');
  if (!match) {
    mentionQueryStart = null;
    suggestions.hidden = true;
    return;
  }
  const query = match[1].toLowerCase();
  mentionQueryStart = cursor - query.length - 1;
  const candidates = users.filter((user) => user.name.toLowerCase().includes(query)).slice(0, 8);
  if (!candidates.length) {
    suggestions.hidden = true;
    return;
  }
  suggestions.innerHTML = candidates.map((user) => `<button class="mention-option" type="button" role="option" data-mention-user="${escapeHTML(user.id)}">${avatarMarkup(user)}<span class="mention-option-name">${escapeHTML(user.name)}${badgeMarkup(user)}</span><span class="mention-option-hint">@mention</span></button>`).join('');
  suggestions.hidden = false;
}

function contextKey(context = activeContext) {
  return `${context.type}:${context.id}`;
}

function messagesFor(context = activeContext) {
  return messageCache.get(contextKey(context)) || [];
}

function avatarMarkup(user, extraClass = '') {
  const photo = user.avatar ? `<img src="${escapeHTML(user.avatar)}" alt="">` : `<span class="avatar-initials">${escapeHTML(initials(user.name))}</span>`;
  const decoration = user.avatarDecorationUrl ? `<img class="avatar-decoration-overlay" src="${escapeHTML(user.avatarDecorationUrl)}" alt="" loading="eager" decoding="sync">` : '';
  return `<span class="person-avatar avatar-shell ${colorForUser(user.id)} ${extraClass}" data-effect="${escapeHTML(user.avatarEffect || 'none')}">${photo}${decoration}</span>`;
}

function badgeMarkup(user) {
  if (user.role === 'owner') return '<span class="profile-badge role-owner">Owner</span>';
  if (user.role === 'moderator') return '<span class="profile-badge role-moderator">Mod</span>';
  const badge = user.badge || 'none';
  return badge === 'none' || !badgeLabels[badge] ? '' : `<span class="profile-badge badge-${escapeHTML(badge)}">${escapeHTML(badgeLabels[badge])}</span>`;
}

function renderOwnAvatar(user) {
  const avatar = $('#profileAvatar');
  const railAvatar = $('#serverProfileButton');
  if (railAvatar) railAvatar.innerHTML = avatarMarkup(user);

  const photo = user.avatar ? `<img src="${escapeHTML(user.avatar)}" alt="">` : `<span class="avatar-initials">${escapeHTML(initials(user.name))}</span>`;
  avatar.innerHTML = photo;
  avatar.dataset.effect = user.avatarEffect || 'none';
  avatar.classList.add('avatar-shell');
  $('#profileBadge').innerHTML = badgeMarkup(user);
}

function renderMessage(message, messages) {
  const author = message.user || { id: '', name: 'Unknown', bio: '' };
  const reply = message.replyTo ? messages.find((candidate) => candidate.id === message.replyTo) : null;
  const reactions = message.reactions || {};
  const reactionMarkup = Object.entries(reactions).filter(([, ids]) => ids.length).map(([emoji, ids]) => `<button class="reaction${ids.includes(currentUser.id) ? ' selected' : ''}" data-react="${escapeHTML(emoji)}" data-message-id="${escapeHTML(message.id)}" aria-label="React ${escapeHTML(emoji)}">${escapeHTML(emoji)} ${ids.length}</button>`).join('');
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt));
  const decorationStyle = author.bannerDecorationUrl ? ` style="--message-decoration: url('${escapeHTML(author.bannerDecorationUrl)}')"` : '';
  return `<article class="message${author.bannerDecorationUrl ? ' decorated-message' : ''}" data-message-id="${escapeHTML(message.id)}"${decorationStyle}>
    <button class="message-avatar-button" data-user="${escapeHTML(author.id)}" aria-label="Open ${escapeHTML(author.name)} profile">${avatarMarkup(author)}</button>
    <div class="message-body">
      <div class="message-meta"><span class="message-author-group">${author.role === 'system' ? '<span class="message-author">BOT</span>' : `<button class="message-author" data-user="${escapeHTML(author.id)}">${escapeHTML(author.name)}</button>`}${badgeMarkup(author)}</span><span class="message-time">${escapeHTML(time)}</span></div>
      ${reply ? `<blockquote class="reply-quote"><strong>${escapeHTML(reply.user?.name || 'Member')}</strong> &nbsp;${escapeHTML(reply.text.slice(0, 150))}</blockquote>` : ''}
      <p class="message-text">${highlightMentions(message.text)}</p>
      ${message.gifUrl ? `<img class="message-image gif-message" src="${escapeHTML(message.gifUrl)}" alt="GIF shared in chat" loading="lazy" decoding="async">` : ''}
      ${message.attachment?.url ? `<img class="message-image chat-attachment" src="${escapeHTML(message.attachment.url)}" alt="Image shared in chat" loading="lazy" decoding="async" draggable="false" onerror="this.hidden=true">` : ''}
      ${reactionMarkup ? `<div class="message-reactions">${reactionMarkup}</div>` : ''}
    </div>
    <div class="message-actions">
      <button class="message-action" data-action="emoji" data-message-id="${escapeHTML(message.id)}" aria-label="React with emoji" title="React"><i data-lucide="smile-plus"></i></button>
      <button class="message-action" data-action="reply" data-message-id="${escapeHTML(message.id)}" aria-label="Reply to message" title="Reply"><i data-lucide="reply"></i></button>
      <div class="emoji-picker" data-picker="${escapeHTML(message.id)}" hidden>${emojiOptions.map((emoji) => `<button type="button" data-pick-emoji="${emoji}" data-message-id="${escapeHTML(message.id)}" aria-label="React ${emoji}">${emoji}</button>`).join('')}</div>
    </div>
  </article>`;
}

function renderMessages() {
  const messages = messagesFor();
  const filtered = messages.filter((message) => `${message.user?.name || ''} ${message.text}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const container = $('#messages');
  container.innerHTML = `<div class="date-divider">${activeContext.type === 'room' ? 'ROOM CONVERSATION' : 'DIRECT MESSAGE'}</div>${filtered.length ? filtered.map((message) => renderMessage(message, messages)).join('') : `<p class="empty-state">${searchQuery ? 'No messages match that search.' : 'No messages yet. Start the conversation.'}</p>`}`;
  scrollMessagesToBottom(container);
  refreshIcons();
}

function mergeMessages(history, liveMessages) {
  const messagesById = new Map(history.map((message) => [message.id, message]));
  for (const message of liveMessages) {
    if (!messagesById.has(message.id)) messagesById.set(message.id, message);
  }
  return [...messagesById.values()].sort((first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt));
}

function scrollMessagesToBottom(container = $('#messages')) {
  if (!container) return;
  const scroll = () => {
    container.scrollTop = container.scrollHeight;
    try { container.scrollTo({ top: container.scrollHeight, behavior: 'auto' }); } catch {}
  };
  scroll();
  requestAnimationFrame(scroll);
  requestAnimationFrame(() => requestAnimationFrame(scroll));
  setTimeout(scroll, 50);
}

function joinSocketRoom(eventName, roomId) {
  if (!socket?.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(eventName, roomId, (error, result) => {
      if (error) return reject(new Error('Live connection failed while opening this conversation.'));
      if (result?.error) return reject(new Error(result.error));
      resolve();
    });
  });
}

function updateTypingStatus() {
  let activeTypers = [];
  if (activeContext.type === 'room') {
    for (const [key, user] of typingUsers) {
      if (key.startsWith(`room:${activeContext.id}:`) && user.id !== currentUser.id) activeTypers.push(user);
    }
  } else if (activeContext.type === 'dm') {
    for (const [key, user] of typingUsers) {
      if (key.startsWith(`dm:${activeContext.id}:`) && user.id !== currentUser.id) activeTypers.push(user);
    }
  }
  activeTypers = [...new Map(activeTypers.map((user) => [user.id, user])).values()];
  const indicator = $('#typingIndicator');
  if (!activeTypers.length) {
    if (indicator) indicator.hidden = true;
    setContextHeader();
    return;
  }
  const names = activeTypers.slice(0, 2).map((user) => user.name).join(' and ');
  $('#chatSubtitle').textContent = `${names} ${activeTypers.length === 1 ? 'is' : 'are'} typing...`;
  if (indicator) {
    indicator.hidden = false;
    indicator.innerHTML = `<span>${escapeHTML(names)} ${activeTypers.length === 1 ? 'is' : 'are'} typing</span><span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>`;
  }
}

function renderOnline() {
  const onlineUsers = onlineIds.map(profileById).filter(Boolean);
  $('#onlineCount').textContent = onlineUsers.length;
  $('#peopleSummary').textContent = `${users.length + 1} registered ${users.length === 0 ? 'member' : 'members'}.`;
  $('#onlineMembers').innerHTML = onlineUsers.length
    ? onlineUsers.map((user) => `<button class="online-row profile-trigger" data-user="${escapeHTML(user.id)}">${avatarMarkup(user)}<span>${escapeHTML(user.name)}</span><i class="online-indicator"></i></button>`).join('')
    : '<p class="room-footer">No one else is online right now.</p>';
  document.querySelectorAll('#onlineMembers [data-user]').forEach((button) => button.addEventListener('click', () => {
    const user = profileById(button.dataset.user);
    if (user) openProfile(user);
  }));
  const onlineInRoom = onlineUsers.slice(0, 3);
  $('#memberStack').innerHTML = `${onlineInRoom.map((user) => `<button class="profile-trigger" data-user="${escapeHTML(user.id)}" title="${escapeHTML(user.name)}">${avatarMarkup(user)}</button>`).join('')}<span class="member-count">${onlineUsers.length} online</span>`;
  document.querySelectorAll('#memberStack [data-user]').forEach((button) => button.addEventListener('click', () => {
    const user = profileById(button.dataset.user);
    if (user) openProfile(user);
  }));
}

function setReply(message) {
  replyTarget = message;
  const preview = $('#replyPreview');
  preview.hidden = !message;
  if (message) {
    preview.innerHTML = `<span>Replying to <strong>${escapeHTML(message.user?.name || 'member')}</strong>: ${escapeHTML(message.text.slice(0, 100))}</span><button type="button" id="cancelReply" aria-label="Cancel reply"><i data-lucide="x"></i></button>`;
    $('#cancelReply').addEventListener('click', () => setReply(null));
  }
  refreshIcons();
  if (message) $('#messageInput').focus();
}

function setContextHeader() {
  if (activeContext.type === 'room') {
    const room = rooms.find((item) => item.id === activeContext.id);
    $('#chatTitle').innerHTML = `<span>#</span> ${escapeHTML(room?.name || activeContext.id)}`;
    $('#chatSubtitle').textContent = activeContext.id === 'links' ? 'Share useful links with the whole room.' : 'A room for real-time conversation.';
    $('#messageInput').placeholder = `Message # ${room?.name || activeContext.id}`;
  } else if (activeContext.type === 'voice') {
    const room = rooms.find((item) => item.id === activeContext.id);
    $('#chatTitle').textContent = room?.name || 'Voice Room';
    $('#chatSubtitle').textContent = 'Live voice conversation';
    $('#messageInput').placeholder = 'Voice room';
  } else {
    const peer = profileById(activeContext.id);
    $('#chatTitle').textContent = peer?.name || 'Direct message';
    $('#chatSubtitle').textContent = 'Private conversation';
    $('#messageInput').placeholder = `Message ${peer?.name || ''}`;
  }
}

async function openRoom(roomId) {
  if (voiceRoomId) leaveVoiceRoom();
  activeContext = { type: 'room', id: roomId };
  searchQuery = '';
  setReply(null);
  setContextHeader();
  $('#voicePanel').hidden = true;
  $('#messages').hidden = false;
  $('#composerWrap').hidden = false;
  animateChatView();
  renderSidebar();
  $('#sidebar').classList.remove('open');
  $('#messages').innerHTML = '<p class="empty-state">Loading conversation…</p>';
  try {
    await joinSocketRoom('room:join', roomId);
    const result = await api(`/api/messages?room=${encodeURIComponent(roomId)}`);
    if (activeContext.type !== 'room' || activeContext.id !== roomId) return;
    messageCache.set(contextKey(), mergeMessages(result.messages, messageCache.get(contextKey()) || []));
    renderMessages();
  } catch (error) { showToast(error.message); }
}

async function openDirect(peer) {
  if (voiceRoomId) leaveVoiceRoom();
  activeContext = { type: 'dm', id: peer.id };
  dmPeerIds.add(peer.id);
  unreadDmIds.delete(peer.id);
  renderDirectMessages();
  searchQuery = '';
  setReply(null);
  setContextHeader();
  $('#voicePanel').hidden = true;
  $('#messages').hidden = false;
  $('#composerWrap').hidden = false;
  animateChatView();
  renderSidebar();
  $('#sidebar').classList.remove('open');
  $('#messages').innerHTML = '<p class="empty-state">Loading conversation…</p>';
  try {
    await joinSocketRoom('dm:join', peer.id);
    const result = await api(`/api/dms/${encodeURIComponent(peer.id)}`);
    if (activeContext.type !== 'dm' || activeContext.id !== peer.id) return;
    messageCache.set(contextKey(), mergeMessages(result.messages, messageCache.get(contextKey()) || []));
    renderMessages();
  } catch (error) { showToast(error.message); }
}

function renderVoiceMembers() {
  const self = currentUser ? [{ id: 'self', user: currentUser }] : [];
  const peers = [...voiceUsers.entries()].map(([socketId, user]) => ({ id: socketId, user }));
  $('#voiceMembers').innerHTML = [...self, ...peers].map(({ id, user }) => `<span class="voice-member">${avatarMarkup(user)}<span>${escapeHTML(user.name)}${id === 'self' ? ' (you)' : ''}</span></span>`).join('') || '<span>No one is in the call yet.</span>';
  $('#voiceStatus').textContent = voiceRoomId ? 'You are connected. Keep this tab open to stay in the call.' : peers.length ? `${peers.length} ${peers.length === 1 ? 'person is' : 'people are'} in this call.` : 'Start a call or join the room.';
  $('#callVoiceButton').hidden = Boolean(voiceRoomId);
  $('#joinVoiceButton').hidden = Boolean(voiceRoomId) || peers.length === 0;
  $('#leaveVoiceButton').hidden = !voiceRoomId;
  $('#muteMicButton').hidden = !voiceRoomId;
  $('#callVoiceButton').hidden = Boolean(voiceRoomId) || peers.length > 0;
  $('#joinVoiceButton').hidden = Boolean(voiceRoomId) || peers.length === 0;
}

function sendVoiceSignal(peerSocketId, signal) {
  if (!socket?.connected || !voiceRoomId) return;
  socket.emit('voice:signal', { to: peerSocketId, signal });
}

function createVoicePeer(peerSocketId, initiator) {
  if (voiceConnections.has(peerSocketId)) return voiceConnections.get(peerSocketId);
  const connection = new RTCPeerConnection({ iceServers: voiceIceServers });
  voiceConnections.set(peerSocketId, connection);
  for (const track of localVoiceStream?.getTracks() || []) connection.addTrack(track, localVoiceStream);
  connection.onicecandidate = (event) => { if (event.candidate) sendVoiceSignal(peerSocketId, { candidate: event.candidate }); };
  connection.ontrack = (event) => {
    let audio = document.querySelector(`[data-voice-audio="${CSS.escape(peerSocketId)}"]`);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.dataset.voiceAudio = peerSocketId;
      $('#remoteAudios').append(audio);
    }
    audio.srcObject = event.streams[0];
  };
  connection.onconnectionstatechange = () => {
    if (['failed', 'closed'].includes(connection.connectionState)) {
      connection.close();
      voiceConnections.delete(peerSocketId);
    }
  };
  if (initiator) connection.createOffer().then((offer) => connection.setLocalDescription(offer)).then(() => sendVoiceSignal(peerSocketId, { description: connection.localDescription })).catch(() => showToast('Could not start a voice connection.'));
  return connection;
}

async function joinVoiceRoom(roomId) {
  if (voiceRoomId) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    showToast('Voice calls need a supported browser and microphone access.');
    return;
  }
  try {
    const voiceConfig = await api('/api/voice-config');
    voiceIceServers = voiceConfig.iceServers;
    localVoiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    socket.emit('voice:join', roomId, (result) => {
      if (result?.error) {
        localVoiceStream.getTracks().forEach((track) => track.stop());
        localVoiceStream = null;
        showToast(result.error);
        return;
      }
      voiceRoomId = roomId;
      voiceUsers.clear();
      for (const participant of result.participants) {
        voiceUsers.set(participant.socketId, participant.user);
        createVoicePeer(participant.socketId, false);
      }
      renderVoiceMembers();
    });
  } catch (error) {
    localVoiceStream?.getTracks().forEach((track) => track.stop());
    localVoiceStream = null;
    showToast(error.name === 'NotAllowedError' ? 'Allow microphone access to join the call.' : 'Could not join the voice call.');
  }
}

function leaveVoiceRoom() {
  if (voiceRoomId && socket?.connected) socket.emit('voice:leave');
  for (const connection of voiceConnections.values()) connection.close();
  voiceConnections.clear();
  localVoiceStream?.getTracks().forEach((track) => track.stop());
  localVoiceStream = null;
  voiceUsers.clear();
  voiceRoomId = null;
  $('#remoteAudios').replaceChildren();
  renderVoiceMembers();
}

function openVoiceRoom(roomId) {
  activeContext = { type: 'voice', id: roomId };
  setContextHeader();
  animateChatView();
  renderSidebar();
  $('#sidebar').classList.remove('open');
  $('#voicePanel').hidden = false;
  $('#messages').hidden = true;
  $('#composerWrap').hidden = true;
  voiceUsers.clear();
  if (socket?.connected) socket.emit('voice:peek', roomId, (result) => {
    if (result?.error) { showToast(result.error); return; }
    voiceUsers = new Map(result.participants.map((participant) => [participant.socketId, participant.user]));
    renderVoiceMembers();
  });
  renderVoiceMembers();
}

async function refreshFriendState() {
  try { friendData = await api('/api/friends'); } catch { friendData = { friends: [], incoming: [], outgoing: [] }; }
}

function updateProfileFriendActions(user) {
  const friendRequestButton = $('#friendRequestButton');
  const friendResponseActions = $('#friendResponseActions');
  friendRequestButton.hidden = user.id === currentUser.id;
  friendRequestButton.disabled = false;
  friendResponseActions.hidden = true;
  const isFriend = friendData.friends.some((friend) => friend.id === user.id);
  const incoming = friendData.incoming.some((friend) => friend.id === user.id);
  const outgoing = friendData.outgoing.some((friend) => friend.id === user.id);
  if (isFriend) {
    friendRequestButton.hidden = true;
  } else if (incoming) {
    friendRequestButton.hidden = true;
    friendResponseActions.hidden = false;
  } else {
    friendRequestButton.textContent = outgoing ? 'Request Sent' : 'Add Friend';
    friendRequestButton.disabled = outgoing;
  }
}

async function openProfile(user) {
  profileUser = user;
  const banner = $('#modalBanner');
  if (user.banner) {
    banner.hidden = false;
    banner.innerHTML = `<img src="${escapeHTML(user.banner)}" alt="Profile banner" decoding="async">`;
  } else {
    banner.hidden = true;
    banner.innerHTML = '';
  }
  $('#modalAvatar').innerHTML = avatarMarkup(user, 'profile-avatar-image');
  $('#modalName').textContent = user.name;
  $('#modalBadge').innerHTML = badgeMarkup(user);
  $('#modalFriends').textContent = `${Number(user.friendCount || 0).toLocaleString()} friend${user.friendCount === 1 ? '' : 's'} · ${Number(user.warningCount || 0)} warning${user.warningCount === 1 ? '' : 's'}`;
  $('#modalBio').textContent = user.bio || 'This person hasn’t added a bio yet.';
  $('#modalError').textContent = '';
  $('#bioEditor').hidden = true;
  $('#bannerEditor').hidden = true;
  $('#saveBioButton').hidden = true;
  $('#modalBio').hidden = false;
  $('#profileView').hidden = false;
  $('#customizerView').hidden = true;
  $('#messageUserButton').hidden = user.id === currentUser.id;
  $('#editBioButton').hidden = user.id !== currentUser.id;
  $('#customizeAvatarButton').hidden = user.id !== currentUser.id;
  $('#promoteUserButton').hidden = currentUser.role !== 'owner' || user.id === currentUser.id || user.role === 'owner';
  $('#promoteUserButton').textContent = user.role === 'moderator' ? 'Remove Mod' : 'Make Mod';
  $('#muteUserButton').hidden = !['owner', 'moderator'].includes(currentUser.role) || user.id === currentUser.id || user.role === 'owner' || (currentUser.role === 'moderator' && user.role === 'moderator');
  $('#saveBioButton').hidden = true;
  await refreshFriendState();
  try {
    const userList = await api('/api/users');
    const freshUser = user.id === currentUser?.id
      ? currentUser
      : userList.users.find((entry) => entry.id === user.id) || null;
    if (freshUser) {
      profileUser = freshUser;
      user = freshUser;
      $('#modalFriends').textContent = `${Number(freshUser.friendCount || 0).toLocaleString()} friend${freshUser.friendCount === 1 ? '' : 's'} · ${Number(freshUser.warningCount || 0)} warning${freshUser.warningCount === 1 ? '' : 's'}`;
    }
  } catch {}
  updateProfileFriendActions(user);
  if (!$('#profileDialog').open) $('#profileDialog').showModal();
  refreshIcons();
}

function renderStudioPreview() {
  if ($('#coinBalance')) $('#coinBalance').textContent = coinBalance === Infinity ? '∞' : coinBalance.toLocaleString();
  const selectedDecoration = decorationCatalog.find((decoration) => decoration.id === selectedAvatarEffect);
  const previewUser = {
    ...currentUser,
    avatar: avatarPreviewUrl || currentUser.avatar,
    avatarEffect: selectedAvatarEffect,
    avatarDecorationUrl: selectedDecoration?.file ? `/${selectedDecoration.route || 'avatar-decorations'}/${encodeURIComponent(selectedDecoration.file)}` : null,
    badge: selectedBadge
  };
  $('#avatarPreview').innerHTML = avatarMarkup(previewUser, 'studio-avatar');
  document.querySelectorAll('[data-effect-choice]').forEach((button) => {
    button.classList.toggle('active', button.dataset.effectChoice === selectedAvatarEffect);
  });
  document.querySelectorAll('[data-badge-choice]').forEach((button) => {
    button.classList.toggle('active', button.dataset.badgeChoice === selectedBadge);
  });
}

async function equipDecoration(effectId) {
  selectedAvatarEffect = effectId;
  renderStudioPreview();
  try {
    const result = await api('/api/profile', { method: 'PATCH', body: JSON.stringify({ avatarEffect: effectId }) });
    currentUser = result.user;
    renderOwnAvatar(currentUser);
    renderSidebar();
    renderOnline();
    renderMessages();
    showToast(effectId === 'none' ? 'Decoration removed.' : `${decorationCatalog.find((item) => item.id === effectId)?.name || 'Decoration'} equipped.`);
  } catch (error) { $('#customizerError').textContent = error.message; }
}

function openDecorationPurchase(effectId) {
  pendingPurchaseType = 'decoration';
  pendingDecorationId = effectId;
  const decoration = decorationCatalog.find((item) => item.id === effectId);
  const owned = ownedEffects.includes(effectId);
  const isOwner = currentUser?.role === 'owner';
  $('#decorationBuyPreview').src = decoration?.file ? `/${decoration.route || 'avatar-decorations'}/${encodeURIComponent(decoration.file)}` : '';
  $('#decorationBuyPreview').hidden = !decoration?.file;
  $('#decorationBuyRarity').textContent = decoration?.rarity ? `${decoration.rarity.toUpperCase()} DECORATION` : 'FREE DECORATION';
  const itemName = decoration?.name || 'Remove decoration';
  $('#decorationBuyTitle').textContent = itemName;
  $('#decorationBuyCoins').textContent = isOwner ? '∞ Owner coins' : `Your coins: ${coinBalance.toLocaleString()}`;
  $('#decorationBuyStatus').textContent = owned || isOwner || effectId === 'none'
    ? 'Ready to equip on your avatar.'
    : coinBalance >= decoration.price ? `You can buy this for ${decoration.price} coins.` : `You need ${decoration.price - coinBalance} more coins.`;
  $('#decorationBuyConfirm').textContent = owned || isOwner || effectId === 'none'
    ? `Use ${itemName}`
    : coinBalance >= decoration.price
      ? `Get ${itemName} · ${decoration.price}`
      : `${itemName} · Need coins`;
  $('#decorationBuyConfirm').disabled = !owned && !isOwner && effectId !== 'none' && coinBalance < decoration.price;
  if (!$('#decorationBuyDialog').open) $('#decorationBuyDialog').showModal();
}

async function confirmDecorationPurchase() {
  if (pendingPurchaseType === 'badge') {
    const badgeId = pendingDecorationId;
    closeDecorationAction();
    try {
      const result = await api('/api/profile', { method: 'PATCH', body: JSON.stringify({ badge: badgeId }) });
      currentUser = result.user;
      selectedBadge = badgeId;
      renderOwnAvatar(currentUser);
      renderSidebar();
      renderMessages();
      showToast(badgeId === 'none' ? 'Badge removed.' : `${badgeLabels[badgeId]} equipped.`);
    } catch (error) { $('#customizerError').textContent = error.message; }
    return;
  }
  const effectId = pendingDecorationId;
  if (!effectId) return;
  const owned = ownedEffects.includes(effectId);
  const isOwner = currentUser?.role === 'owner';
  closeDecorationAction();
  if (effectId === 'none' || owned || isOwner) {
    await equipDecoration(effectId);
    return;
  }
  try {
    const result = await api(`/api/avatar-decorations/${encodeURIComponent(effectId)}/buy`, { method: 'POST' });
    coinBalance = result.user.infiniteCoins ? Infinity : result.user.coins;
    ownedEffects = result.user.infiniteCoins ? [...new Set([...result.user.ownedEffects, ...decorationCatalog.map((item) => item.id)])] : result.user.ownedEffects;
    currentUser = result.user;
    await equipDecoration(effectId);
  } catch (error) { $('#customizerError').textContent = error.message; }
}

function closeDecorationAction() {
  pendingDecorationId = null;
  pendingPurchaseType = 'decoration';
  const dialog = $('#decorationBuyDialog');
  if (dialog?.open) dialog.close();
}
window.closeDecorationAction = closeDecorationAction;

async function renderBannerDecorations() {
  const grid = $('#bannerDecorationOptions');
  if (!grid) return;
  grid.innerHTML = '<p class="upload-hint">Loading banner decorations...</p>';
  try {
    const gifs = [];
    let offset = 0;
    let total = 0;
    do {
      const result = await api(`/api/gifs?limit=120&offset=${offset}`);
      gifs.push(...result.gifs);
      total = result.total;
      offset += result.gifs.length;
      if (result.gifs.length === 0) break;
    } while (gifs.length < total);
    const animated = await api('/api/banner-decorations');
    const animatedMarkup = animated.decorations.map((decoration) => `<button class="banner-decoration-option" type="button" data-banner-decoration="${escapeHTML(decoration.id)}" data-banner-type="animated" title="Use ${escapeHTML(decoration.name)}"><img src="${escapeHTML(decoration.url)}" alt="${escapeHTML(decoration.name)}" loading="eager" decoding="sync"><span>${escapeHTML(decoration.name)}</span></button>`).join('');
    grid.innerHTML = animatedMarkup + gifs.map((gif) => `<button class="banner-decoration-option" type="button" data-banner-decoration="${escapeHTML(gif.id)}" data-banner-type="gif" title="Use ${escapeHTML(gif.name)}"><img src="${escapeHTML(gif.url)}" alt="${escapeHTML(gif.name)}" loading="eager" decoding="sync"><span>${escapeHTML(gif.name)}</span></button>`).join('') || '<p class="upload-hint">No banner decorations available.</p>';
    grid.querySelectorAll('[data-banner-decoration]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const result = button.dataset.bannerType === 'animated'
          ? await api(`/api/banner/decoration/${encodeURIComponent(button.dataset.bannerDecoration)}`, { method: 'POST', body: '{}' })
          : await api('/api/banner/gif', { method: 'POST', body: JSON.stringify({ gifId: button.dataset.bannerDecoration }) });
        currentUser = result.user;
        grid.querySelectorAll('[data-banner-decoration]').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        renderOwnAvatar(currentUser);
        renderSidebar();
        showToast(`${button.title.replace(/^Use /, '')} banner decoration equipped.`);
      } catch (error) { $('#customizerError').textContent = error.message; }
      finally { button.disabled = false; }
    }));
  } catch (error) { grid.innerHTML = `<p class="upload-hint">${escapeHTML(error.message)}</p>`; }
}

document.querySelectorAll('[data-customization-category]').forEach((button) => button.addEventListener('click', () => {
  const category = button.dataset.customizationCategory;
  document.querySelectorAll('[data-customization-category]').forEach((tab) => {
    const active = tab.dataset.customizationCategory === category;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('[data-customization-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.customizationPanel !== category;
  });
}));

async function openAvatarStudio() {
  selectedAvatarEffect = currentUser.avatarEffect || 'none';
  selectedBadge = currentUser.badge || 'none';
  selectedAvatarFile = null;
  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  avatarPreviewUrl = null;
  $('#customizerError').textContent = '';
  $('#profileView').hidden = true;
  $('#customizerView').hidden = false;
  try {
    const shop = await api('/api/avatar-decorations');
    decorationCatalog = shop.decorations;
    coinBalance = shop.infiniteCoins ? Infinity : shop.coins;
    ownedEffects = shop.infiniteCoins ? [...new Set([...shop.owned, ...shop.decorations.map((decoration) => decoration.id)])] : shop.owned;
  } catch (error) { $('#customizerError').textContent = error.message; }
  $('#effectOptions').innerHTML = decorationCatalog.map((decoration) => {
    const owned = ownedEffects.includes(decoration.id);
    const active = decoration.id === selectedAvatarEffect;
    const framePreview = decoration.file ? `<img class="effect-frame-preview" src="/${decoration.route || 'avatar-decorations'}/${encodeURIComponent(decoration.file)}" alt="" loading="eager" decoding="sync">` : `<span class="effect-swatch ${decoration.id}"></span>`;
    return `<button class="effect-option${active ? ' active' : ''}" type="button" data-effect-choice="${decoration.id}" data-owned="${owned}">${framePreview}<span>${escapeHTML(decoration.name)}</span><small>${owned ? 'Owned' : `${decoration.price} · ${decoration.rarity}`}</small></button>`;
  }).join('');
  $('#badgeOptions').innerHTML = Object.entries(badgeLabels).map(([badge, label]) => `<button class="badge-option${badge === selectedBadge ? ' active' : ''}" type="button" data-badge-choice="${badge}">${badge === 'none' ? label : `<span class="profile-badge badge-${badge}">${label}</span>`}</button>`).join('');
  document.querySelectorAll('[data-effect-choice]').forEach((button) => button.addEventListener('click', () => openDecorationPurchase(button.dataset.effectChoice)));
  document.querySelectorAll('[data-badge-choice]').forEach((button) => button.addEventListener('click', () => {
    pendingPurchaseType = 'badge';
    pendingDecorationId = button.dataset.badgeChoice;
    const badgeId = button.dataset.badgeChoice;
    $('#decorationBuyPreview').hidden = true;
    $('#decorationBuyRarity').textContent = 'PROFILE BADGE';
    $('#decorationBuyTitle').textContent = badgeLabels[badgeId] || 'Badge';
    const isAnimatedBadge = badgeId.startsWith('animated-');
    const badgePrice = 1500 + (Number(badgeId.replace('animated-', '').replace(/^0+/, '') || '0') || 0) * 10;
    const owned = badgeId === 'none' || currentUser?.ownedBadges?.includes(badgeId);
    const canBuy = currentUser?.role === 'owner' || owned || (coinBalance >= badgePrice);
    $('#decorationBuyCoins').textContent = currentUser?.role === 'owner' ? '∞ Owner coins' : `Your coins: ${Number(coinBalance || 0).toLocaleString()}`;
    $('#decorationBuyStatus').textContent = !isAnimatedBadge || owned || currentUser?.role === 'owner'
      ? 'Ready to equip on your name.'
      : canBuy ? `This Halloween badge costs ${badgePrice} coins.` : `You need ${badgePrice - coinBalance} more coins.`;
    $('#decorationBuyConfirm').textContent = !isAnimatedBadge || owned || currentUser?.role === 'owner'
      ? 'Equip'
      : `Get badge · ${badgePrice}`;
    $('#decorationBuyConfirm').disabled = !canBuy;
    if (!$('#decorationBuyDialog').open) $('#decorationBuyDialog').showModal();
  }));
  renderBannerDecorations();
  renderStudioPreview();
  refreshIcons();
}

function animateChatView() {
  const view = $('.chat-main');
  view.classList.remove('view-enter');
  void view.offsetWidth;
  view.classList.add('view-enter');
}

function closeProfileDialog() {
  const dialog = $('#profileDialog');
  if (!dialog?.open) return;
  try {
    dialog.close();
  } catch {
    dialog.removeAttribute('open');
  }
}

window.chatroomProfileAction = function chatroomProfileAction(action, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (action === 'close') {
    closeProfileDialog();
  } else if (action === 'edit-bio' && currentUser) {
    startBioEditor();
  } else if (action === 'avatar-shop' && currentUser) {
    openAvatarStudio().catch((error) => {
      $('#customizerError').textContent = error.message;
      showToast(error.message);
    });
  }
  return false;
};

function openSocket() {
  socket = io({ reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 500, reconnectionDelayMax: 5000 });
  socket.on('connect', () => {
    if (activeContext.type === 'room') socket.emit('room:join', activeContext.id, (result) => { if (result?.error) showToast(result.error); });
    else if (activeContext.type === 'dm') socket.emit('dm:join', activeContext.id, (result) => { if (result?.error) showToast(result.error); });
    showToast('Connected live');
  });
  socket.on('disconnect', () => showToast('Connection lost. Reconnecting...'));
  socket.on('connect_error', () => showToast('Live connection failed. Please sign in again.'));
  socket.on('user:joined', (user) => {
    if (user.id === currentUser.id || users.some((entry) => entry.id === user.id)) return;
    users.push(user);
    renderSidebar();
    renderOnline();
    showToast(`${user.name} joined Obsidian Chat`);
  });
  socket.on('typing:update', ({ type, id, user, typing }) => {
    const key = `${type}:${id}:${user.id}`;
    if (typing) typingUsers.set(key, user);
    else typingUsers.delete(key);
    updateTypingStatus();
  });
  socket.on('room:message', (message) => {
    const key = `room:${message.roomId}`;
    const list = messageCache.get(key) || [];
    if (!list.some((item) => item.id === message.id)) list.push(message);
    messageCache.set(key, list);
    if (activeContext.type === 'room' && activeContext.id === message.roomId) renderMessages();
  });
  socket.on('dm:message', (message) => {
    const peerId = message.user.id === currentUser.id ? message.recipientId : message.user.id;
    dmPeerIds.add(peerId);
    const key = `dm:${peerId}`;
    const list = messageCache.get(key) || [];
    if (!list.some((item) => item.id === message.id)) list.push(message);
    messageCache.set(key, list);
    if (activeContext.type === 'dm' && activeContext.id === peerId) {
      unreadDmIds.delete(peerId);
      renderMessages();
    } else if (message.user.id !== currentUser.id) {
      unreadDmIds.add(peerId);
    }
    renderSidebar();
  });
  socket.on('dm:notification', ({ user, message }) => {
    const peerId = user.id;
    dmPeerIds.add(peerId);
    const key = `dm:${peerId}`;
    const list = messageCache.get(key) || [];
    if (!list.some((item) => item.id === message.id)) list.push(message);
    messageCache.set(key, list);
    if (!(activeContext.type === 'dm' && activeContext.id === peerId)) {
      unreadDmIds.add(peerId);
      showToast(`New message from ${user.name}`);
      renderSidebar();
    }
  });
  socket.on('friend:request', ({ user }) => {
    refreshFriendState().then(() => {
      if (profileUser?.id === user.id) updateProfileFriendActions(profileUser);
    });
    showToast(`${user.name} sent you a friend request`);
  });
  socket.on('friend:accepted', ({ user }) => {
    refreshFriendState();
    showToast(`${user.name} accepted your friend request`);
  });
  socket.on('friend:declined', ({ user }) => {
    refreshFriendState();
    showToast(`${user.name} declined your friend request`);
  });
  socket.on('mention:notification', ({ roomId, roomName, sender }) => {
    mentionedRoomId = roomId;
    $('#mentionNoticeText').textContent = `${sender.name} mentioned you in #${roomName}`;
    $('#mentionNotice').hidden = false;
  });
  socket.on('message:reaction', ({ messageId, reactions }) => {
    for (const list of messageCache.values()) {
      const message = list.find((item) => item.id === messageId);
      if (message) message.reactions = reactions;
    }
    renderMessages();
  });
  socket.on('presence:update', (ids) => {
    onlineIds = ids;
    renderPeople();
    renderOnline();
  });
  socket.on('profile:update', (user) => {
    if (user.id === currentUser.id) currentUser = user;
    users = users.map((entry) => entry.id === user.id ? user : entry);
    for (const list of messageCache.values()) {
      for (const message of list) if (message.user?.id === user.id) message.user = user;
    }
    if (profileUser?.id === user.id) {
      profileUser = user;
      $('#modalAvatar').innerHTML = avatarMarkup(user, 'profile-avatar-image');
      const banner = $('#modalBanner');
      if (user.banner) { banner.hidden = false; banner.innerHTML = `<img src="${escapeHTML(user.banner)}" alt="Profile banner" decoding="async">`; } else { banner.hidden = true; banner.innerHTML = ''; }
      $('#modalName').textContent = user.name;
      $('#modalBadge').innerHTML = badgeMarkup(user);
      $('#modalFriends').textContent = `${Number(user.friendCount || 0).toLocaleString()} friend${user.friendCount === 1 ? '' : 's'} · ${Number(user.warningCount || 0)} warning${user.warningCount === 1 ? '' : 's'}`;
      $('#modalBio').textContent = user.bio || 'This person hasn’t added a bio yet.';
      if (!$('#customizerView').hidden) renderStudioPreview();
    }
    if (user.id === currentUser.id) renderOwnAvatar(user);
    renderSidebar();
    renderMessages();
  });
  socket.on('moderation:mute', ({ mutedUntil, reason }) => showMuteScreen(mutedUntil, reason));
  socket.on('moderation:warning', ({ warningCount, warningLimit, mutedUntil }) => {
    showToast(mutedUntil ? `BOT: Warning ${warningCount}/${warningLimit}. You were automatically muted for 10 minutes.` : `BOT: Warning ${warningCount}/${warningLimit}.`);
  });
  socket.on('voice:ring', ({ roomId, roomName, participants = [] }) => {
    voiceRingRoomId = roomId;
    voiceUsers = new Map(participants.map((participant) => [participant.socketId, participant.user]));
    $('#voiceNoticeText').textContent = `A call started in ${roomName}.`;
    $('#voiceNotice').hidden = false;
  });
  socket.on('voice:participant-joined', ({ socketId, user }) => {
    voiceUsers.set(socketId, user);
    if (voiceRoomId) createVoicePeer(socketId, true);
    renderVoiceMembers();
  });
  socket.on('voice:participant-left', (socketId) => {
    voiceConnections.get(socketId)?.close();
    voiceConnections.delete(socketId);
    voiceUsers.delete(socketId);
    document.querySelector(`[data-voice-audio="${CSS.escape(socketId)}"]`)?.remove();
    renderVoiceMembers();
  });
  socket.on('voice:signal', async ({ from, signal }) => {
    const connection = createVoicePeer(from, false);
    try {
      if (signal.description) {
        await connection.setRemoteDescription(signal.description);
        if (signal.description.type === 'offer') {
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          sendVoiceSignal(from, { description: connection.localDescription });
        }
      } else if (signal.candidate) await connection.addIceCandidate(signal.candidate);
    } catch { showToast('Could not establish the voice connection.'); }
  });
  socket.on('room:created', (room) => {
    if (!rooms.some((entry) => entry.id === room.id)) rooms.push(room);
    renderSidebar();
  });
}

async function enterChat(user, muteExpired = false) {
  currentUser = user;
  dmPeerIds = new Set();
  await refreshFriendState();
  $('#profileName').textContent = user.name;
  renderOwnAvatar(user);
  $('#authShell').hidden = true;
  $('#appShell').hidden = false;
  messageCache = new Map();
  try {
    const [roomResult, userResult, dmResult] = await Promise.all([api('/api/rooms'), api('/api/users'), api('/api/dms')]);
    rooms = roomResult.rooms;
    users = userResult.users;
    onlineIds = userResult.online;
    dmPeerIds = new Set((dmResult.conversations || []).map((entry) => entry.peer.id));
    renderSidebar();
    renderOnline();
    openSocket();
    await openRoom(rooms[0]?.id || 'general');
    if (user.mutedUntil && Date.parse(user.mutedUntil) > Date.now()) showMuteScreen(user.mutedUntil, user.muteReason);
    else if (muteExpired) showToast('Your mute has ended. This is your warning.');
  } catch (error) {
    showToast(error.message);
    await leaveChat(false);
  }
}

async function leaveChat(callServer = true) {
  if (socket) socket.disconnect();
  socket = null;
  if (callServer) await api('/api/logout', { method: 'POST' }).catch(() => {});
  currentUser = null;
  rooms = [];
  users = [];
  onlineIds = [];
  messageCache.clear();
  clearInterval(muteTimerInterval);
  $('#muteScreen').hidden = true;
  showAuth('welcome');
}

function showMuteScreen(mutedUntil, reason = '') {
  if (voiceRoomId) leaveVoiceRoom();
  $('#appShell').hidden = true;
  $('#authShell').hidden = true;
  $('#muteScreen').hidden = false;
  $('#muteReason').textContent = reason ? `Reason: ${reason}` : 'A moderator paused your messages.';
  clearInterval(muteTimerInterval);
  const updateTimer = async () => {
    const remaining = Math.max(0, Date.parse(mutedUntil) - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    $('#muteCountdown').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    if (remaining > 0) return;
    clearInterval(muteTimerInterval);
    const result = await api('/api/me').catch(() => null);
    currentUser = result?.user || currentUser;
    $('#muteScreen').hidden = true;
    $('#appShell').hidden = false;
    showToast('Your mute has ended. This is your warning.');
  };
  updateTimer();
  muteTimerInterval = setInterval(updateTimer, 1000);
}

$('#startSignup').addEventListener('click', () => {
  setAuthMode(false);
  showAuth('create');
});
$('#welcomeLogin').addEventListener('click', () => {
  setAuthMode(true);
  showAuth('create');
});
$('#backWelcome').addEventListener('click', () => showAuth('welcome'));
$('#accountForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = { password: $('#passwordInput').value };
  if (!loginMode) {
    body.email = $('#emailInput').value.trim();
    body.name = $('#nameInput').value.trim();
    body.bio = $('#bioInput').value.trim();
  } else body.identity = $('#emailInput').value.trim();
  try {
    $('#submitAccount').disabled = true;
    const result = await api(loginMode ? '/api/login' : '/api/signup', { method: 'POST', body: JSON.stringify(body) });
    if (result.requiresEmailVerification) {
      verificationEmail = result.email || body.email || '';
      $('#verificationCopy').textContent = `Enter the 6-digit code sent to ${verificationEmail}.`;
      if (result.verificationCode) $('#verificationCodeInput').value = result.verificationCode;
      showAuth('verification');
      return;
    }
    await enterChat(result.user, result.muteExpired);
  } catch (error) {
    $('#formError').textContent = error.message;
    if (error.requiresEmailVerification) {
      verificationEmail = error.email || $('#emailInput').value.trim();
      $('#verificationCopy').textContent = `Enter the 6-digit code sent to ${verificationEmail}.`;
      showAuth('verification');
    }
  } finally {
    $('#submitAccount').disabled = false;
  }
});

$('#verificationBack').addEventListener('click', () => {
  $('#verificationCodeInput').value = '';
  setAuthMode(true);
  showAuth('create');
});

$('#verificationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    $('#verifyEmailButton').disabled = true;
    const result = await api('/api/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email: verificationEmail, code: $('#verificationCodeInput').value.trim() })
    });
    await enterChat(result.user, false);
  } catch (error) {
    $('#verificationError').textContent = error.message;
  } finally {
    $('#verifyEmailButton').disabled = false;
  }
});

$('#resendVerification').addEventListener('click', async () => {
  try {
    $('#resendVerification').disabled = true;
    const result = await api('/api/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: verificationEmail })
    });
    $('#verificationError').textContent = 'A new verification code was sent.';
    if (result.verificationCode) $('#verificationCodeInput').value = result.verificationCode;
  } catch (error) {
    $('#verificationError').textContent = error.message;
  } finally {
    $('#resendVerification').disabled = false;
  }
});

$('#messageForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#messageInput');
  const text = input.value.trim();
  if ((!text && !selectedChatImage && !selectedGifId) || !socket?.connected) {
    if (text || selectedChatImage || selectedGifId) showToast('Reconnecting. Your message has not been sent.');
    return;
  }
  if (activeContext.type === 'voice') return;
  if (activeContext.type === 'room' && activeContext.id !== 'links' && linkifyText(text) !== escapeHTML(text)) {
    showToast('Please send links in #links.');
    return;
  }
  $('#mentionSuggestions').hidden = true;
  let attachmentId = null;
  if (selectedChatImage) {
    try {
      const attachment = await api('/api/attachments', { method: 'POST', headers: { 'Content-Type': selectedChatImage.type }, body: selectedChatImage });
      attachmentId = attachment.id;
    } catch (error) {
      showToast(error.message);
      return;
    }
  }
  const payload = { text, attachmentId, gifId: selectedGifId, replyTo: replyTarget?.id || null };
  const eventName = activeContext.type === 'room' ? 'room:send' : 'dm:send';
  if (activeContext.type === 'room') payload.roomId = activeContext.id;
  else payload.peerId = activeContext.id;
  socket.emit(eventName, payload, (result) => {
    if (result?.error) { showToast(result.error); return; }
    input.value = '';
    clearTimeout(typingTimer);
    socket.emit('typing:stop', activeContext);
    selectedChatImage = null;
    selectedGifId = null;
    $('#gifPicker').hidden = true;
    $('#imageInput').value = '';
    setReply(null);
  });
});

$('#messageInput').addEventListener('input', () => {
  updateMentionSuggestions();
  if (!socket?.connected || activeContext.type === 'voice') return;
  const context = { ...activeContext };
  socket.emit('typing:start', context);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit('typing:stop', context), 1200);
});
$('#messageInput').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') $('#mentionSuggestions').hidden = true;
});
$('#mentionSuggestions').addEventListener('click', (event) => {
  const option = event.target.closest('[data-mention-user]');
  const user = option && users.find((entry) => entry.id === option.dataset.mentionUser);
  if (!user || mentionQueryStart === null) return;
  const input = $('#messageInput');
  const cursor = input.selectionStart;
  input.value = `${input.value.slice(0, mentionQueryStart)}@${user.name} ${input.value.slice(cursor)}`;
  const nextCursor = mentionQueryStart + user.name.length + 2;
  input.setSelectionRange(nextCursor, nextCursor);
  $('#mentionSuggestions').hidden = true;
  input.focus();
});

$('#messages').addEventListener('click', (event) => {
  const externalLink = event.target.closest('[data-external-url]');
  if (externalLink) {
    event.preventDefault();
    const destination = new URL(externalLink.dataset.externalUrl);
    if (!['http:', 'https:'].includes(destination.protocol)) return;
    pendingExternalUrl = destination.href;
    $('#externalLinkAddress').textContent = destination.href;
    $('#externalLinkAddress').href = destination.href;
    $('#linkWarningDialog').showModal();
    return;
  }
  const profileButton = event.target.closest('[data-user]');
  if (profileButton) {
    const user = profileById(profileButton.dataset.user);
    if (user) openProfile(user);
    return;
  }
  const reaction = event.target.closest('[data-react]');
  if (reaction) {
    socket?.emit('message:react', { messageId: reaction.dataset.messageId, emoji: reaction.dataset.react }, (result) => { if (result?.error) showToast(result.error); });
    return;
  }
  const action = event.target.closest('[data-action]');
  if (!action) return;
  const message = messagesFor().find((item) => item.id === action.dataset.messageId);
  if (!message) return;
  if (action.dataset.action === 'reply') setReply(message);
  if (action.dataset.action === 'emoji') {
    document.querySelectorAll('.emoji-picker').forEach((picker) => { if (picker.dataset.picker !== message.id) picker.hidden = true; });
    const picker = document.querySelector(`[data-picker="${CSS.escape(message.id)}"]`);
    picker.hidden = !picker.hidden;
  }
  const emojiButton = event.target.closest('[data-pick-emoji]');
  if (emojiButton) {
    socket?.emit('message:react', { messageId: emojiButton.dataset.messageId, emoji: emojiButton.dataset.pickEmoji }, (result) => { if (result?.error) showToast(result.error); });
  }
});

$('#workspaceButton').addEventListener('click', () => {
  $('#channelList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#sidebar').classList.remove('open');
  if (window.innerWidth <= 760) $('#sidebar').classList.add('open');
});

document.querySelectorAll('a.brand').forEach((brand) => {
  brand.addEventListener('click', (event) => {
    event.preventDefault();
    if (currentUser) openRoom('general');
  });
});

$('#newRoomButton').addEventListener('click', async () => {
  const name = prompt('Name the room');
  if (!name?.trim()) return;
  try {
    const result = await api('/api/rooms', { method: 'POST', body: JSON.stringify({ name }) });
    if (!rooms.some((room) => room.id === result.room.id)) rooms.push(result.room);
    renderSidebar();
    await openRoom(result.room.id);
  } catch (error) { showToast(error.message); }
});
$('#searchButton').addEventListener('click', () => {
  const query = prompt('Search this conversation', searchQuery);
  if (query === null) return;
  searchQuery = query.trim();
  renderMessages();
});
$('#emojiButton').addEventListener('click', () => { $('#messageInput').value += '✨'; $('#messageInput').focus(); });
$('#imageButton').addEventListener('click', () => $('#imageInput').click());
$('#gifButton').addEventListener('click', async () => {
  const picker = $('#gifPicker');
  picker.hidden = !picker.hidden;
  if (!picker.hidden) {
    if (!picker.querySelector('#gifSearch')) picker.innerHTML = '<input id="gifSearch" class="gif-search" type="search" placeholder="Search all GIFs..." autocomplete="off"><div id="gifGrid" class="gif-grid"></div>';
    try {
      gifCatalog = (await api('/api/gifs?limit=60')).gifs;
      renderGifPicker();
      $('#gifSearch')?.focus();
    } catch (error) { showToast(error.message); }
  }
});
function renderGifPicker(query = '') {
  const normalized = query.trim().toLowerCase();
  const matches = normalized ? gifCatalog.filter((gif) => `${gif.name} ${gif.id}`.toLowerCase().includes(normalized)).slice(0, 120) : gifCatalog.slice(0, 60);
  $('#gifGrid').innerHTML = matches.length ? matches.map((gif) => `<button type="button" data-gif-id="${escapeHTML(gif.id)}"><img src="${escapeHTML(gif.url)}" alt="${escapeHTML(gif.name)}" loading="lazy" decoding="async"><span>${escapeHTML(gif.name)}</span></button>`).join('') : '<p class="empty-state">No GIFs match that search.</p>';
}
let gifSearchTimer;
$('#gifPicker').addEventListener('input', (event) => {
  if (event.target.id !== 'gifSearch') return;
  clearTimeout(gifSearchTimer);
  const query = event.target.value;
  if (!query.trim()) {
    renderGifPicker();
    return;
  }
  gifSearchTimer = setTimeout(async () => {
    try {
      gifCatalog = (await api(`/api/gifs?q=${encodeURIComponent(query.trim())}&limit=120`)).gifs;
      renderGifPicker(query);
    } catch (error) { showToast(error.message); }
  }, 180);
});
$('#gifPicker').addEventListener('click', (event) => {
  const option = event.target.closest('[data-gif-id]');
  if (!option) return;
  selectedGifId = option.dataset.gifId;
  $('#gifPicker').hidden = true;
  $('#messageForm').requestSubmit();
});
$('#imageInput').addEventListener('change', () => {
  const file = $('#imageInput').files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 50 * 1024 * 1024) {
    showToast('Choose a JPG, PNG, WebP, or GIF up to 50 MB.');
    $('#imageInput').value = '';
    return;
  }
  selectedChatImage = file;
  showToast(`Selected ${file.name}. It will be scanned before posting.`);
});
$('#menuButton').addEventListener('click', () => {
  if (window.innerWidth <= 760) {
    $('#sidebar').classList.toggle('open');
  } else {
    $('#appShell').classList.toggle('sidebar-hidden');
  }
});
$('#closeSidebar').addEventListener('click', () => {
  if (window.innerWidth <= 760) $('#sidebar').classList.remove('open');
  else $('#appShell').classList.add('sidebar-hidden');
});
$('#signOutButton').addEventListener('click', () => leaveChat());
$('#ownProfileButton').addEventListener('click', () => openProfile(currentUser));
$('#serverHomeButton').addEventListener('click', () => openRoom('general'));
$('#serverRoomButton').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
  if (window.innerWidth > 760) openRoom(activeContext.type === 'room' ? activeContext.id : 'general');
});
$('#serverPeopleButton').addEventListener('click', () => {
  $('#sidebar').classList.add('open');
  $('#peopleList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#serverProfileButton').addEventListener('click', () => openProfile(currentUser));
$('#closeProfile').addEventListener('click', closeProfileDialog);
$('#editBioButton').addEventListener('click', () => {
  if (currentUser) startBioEditor();
});
$('#customizeAvatarButton').addEventListener('click', () => {
  if (!currentUser) return;
  openAvatarStudio().catch((error) => {
    $('#customizerError').textContent = error.message;
    showToast(error.message);
  });
});
$('#closeDecorationBuy').addEventListener('click', closeDecorationAction);
$('#decorationBuyCancel').addEventListener('click', closeDecorationAction);
$('#decorationBuyConfirm').addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  confirmDecorationPurchase();
});
$('#decorationBuyDialog').addEventListener('click', (event) => { if (event.target === $('#decorationBuyDialog')) $('#decorationBuyDialog').close(); });
$('#messageUserButton').addEventListener('click', () => {
  if (!profileUser || profileUser.id === currentUser.id) return;
  const peer = profileUser;
  closeProfileDialog();
  openDirect(peer);
});
$('#friendRequestButton').addEventListener('click', async () => {
  if (!profileUser || profileUser.id === currentUser.id || $('#friendRequestButton').disabled) return;
  try {
    await api(`/api/friends/${encodeURIComponent(profileUser.id)}/request`, { method: 'POST', body: '{}' });
    await refreshFriendState();
    updateProfileFriendActions(profileUser);
    showToast(`Friend request sent to ${profileUser.name}`);
  } catch (error) { $('#modalError').textContent = error.message; }
});
$('#acceptFriendButton').addEventListener('click', async () => {
  if (!profileUser) return;
  try {
    await api(`/api/friends/${encodeURIComponent(profileUser.id)}/accept`, { method: 'POST', body: '{}' });
    await refreshFriendState();
    updateProfileFriendActions(profileUser);
    profileUser.friendCount = (profileUser.friendCount || 0) + 1;
    $('#modalFriends').textContent = `${profileUser.friendCount} friends · ${Number(profileUser.warningCount || 0)} warnings`;
    showToast(`You are now friends with ${profileUser.name}`);
  } catch (error) { $('#modalError').textContent = error.message; }
});
$('#declineFriendButton').addEventListener('click', async () => {
  if (!profileUser) return;
  try {
    await api(`/api/friends/${encodeURIComponent(profileUser.id)}/decline`, { method: 'POST', body: '{}' });
    await refreshFriendState();
    updateProfileFriendActions(profileUser);
    showToast('Friend request declined');
  } catch (error) { $('#modalError').textContent = error.message; }
});
$('#promoteUserButton').addEventListener('click', async () => {
  if (!profileUser) return;
  const role = profileUser.role === 'moderator' ? 'member' : 'moderator';
  try {
    const result = await api(`/api/users/${encodeURIComponent(profileUser.id)}/role`, { method: 'POST', body: JSON.stringify({ role }) });
    profileUser = result.user;
    users = users.map((user) => user.id === result.user.id ? result.user : user);
    for (const list of messageCache.values()) for (const message of list) if (message.user?.id === result.user.id) message.user = result.user;
    openProfile(profileUser);
    renderSidebar();
    renderMessages();
  } catch (error) { $('#modalError').textContent = error.message; }
});
$('#muteUserButton').addEventListener('click', async () => {
  if (!profileUser) return;
  const durationMinutes = Number(prompt('Mute duration in minutes (1-1440)', '10'));
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) return;
  const reason = prompt('Reason for the mute');
  if (!reason?.trim()) return;
  try {
    const result = await api('/api/moderation/mute', {
      method: 'POST',
      body: JSON.stringify({ userId: profileUser.id, durationMinutes, reason, roomId: activeContext.type === 'room' ? activeContext.id : 'general' })
    });
    $('#profileDialog').close();
    showToast(`Mute applied. BOT posted in #${result.roomId}.`);
  } catch (error) { $('#modalError').textContent = error.message; }
});
$('#callVoiceButton').addEventListener('click', () => joinVoiceRoom(activeContext.id));
$('#joinVoiceButton').addEventListener('click', () => joinVoiceRoom(activeContext.id));
$('#leaveVoiceButton').addEventListener('click', leaveVoiceRoom);
$('#muteMicButton').addEventListener('click', () => {
  const tracks = localVoiceStream?.getAudioTracks() || [];
  const shouldEnable = tracks.some((track) => !track.enabled);
  tracks.forEach((track) => { track.enabled = shouldEnable; });
  $('#muteMicButton').textContent = shouldEnable ? 'Mute mic' : 'Unmute mic';
});
$('#voiceNoticeJoin').addEventListener('click', () => {
  if (!voiceRingRoomId) return;
  const roomId = voiceRingRoomId;
  $('#voiceNotice').hidden = true;
  openVoiceRoom(roomId);
  joinVoiceRoom(roomId);
});
$('#voiceNoticeIgnore').addEventListener('click', () => {
  $('#voiceNotice').hidden = true;
  voiceRingRoomId = null;
});
$('#mentionNoticeOpen').addEventListener('click', () => {
  if (!mentionedRoomId) return;
  const roomId = mentionedRoomId;
  mentionedRoomId = null;
  $('#mentionNotice').hidden = true;
  openRoom(roomId);
});
$('#mentionNoticeDismiss').addEventListener('click', () => {
  mentionedRoomId = null;
  $('#mentionNotice').hidden = true;
});
$('#backToProfile').addEventListener('click', () => {
  $('#customizerView').hidden = true;
  $('#profileView').hidden = false;
  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  avatarPreviewUrl = null;
  selectedAvatarFile = null;
});
$('#chooseAvatarButton').addEventListener('click', () => $('#avatarFile').click());
$('#avatarFile').addEventListener('change', () => {
  const file = $('#avatarFile').files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 50 * 1024 * 1024) {
    $('#customizerError').textContent = 'Choose a JPG, PNG, WebP, or GIF up to 50 MB.';
    $('#avatarFile').value = '';
    return;
  }
  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  selectedAvatarFile = file;
  avatarPreviewUrl = URL.createObjectURL(file);
  $('#customizerError').textContent = '';
  renderStudioPreview();
});
$('#saveAvatarButton').addEventListener('click', async () => {
  const button = $('#saveAvatarButton');
  button.disabled = true;
  $('#customizerError').textContent = '';
  try {
    if (selectedAvatarFile) {
      const upload = await api('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': selectedAvatarFile.type },
        body: selectedAvatarFile
      });
      currentUser = upload.user;
    }
    const result = await api('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffect: selectedAvatarEffect, badge: selectedBadge })
    });
    currentUser = result.user;
    users = users.map((user) => user.id === currentUser.id ? currentUser : user);
    for (const list of messageCache.values()) {
      for (const message of list) if (message.user?.id === currentUser.id) message.user = currentUser;
    }
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    avatarPreviewUrl = null;
    selectedAvatarFile = null;
    renderOwnAvatar(currentUser);
    renderSidebar();
    renderOnline();
    renderMessages();
    openProfile(currentUser);
    showToast('Your look is saved.');
  } catch (error) {
    $('#customizerError').textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
function startBioEditor() {
  $('#bioEditor').value = currentUser.bio || '';
  $('#bioEditor').hidden = false;
  $('#bannerEditor').hidden = false;
  $('#modalBio').hidden = true;
  $('#editBioButton').hidden = true;
  $('#customizeAvatarButton').hidden = true;
  $('#messageUserButton').hidden = true;
  $('#saveBioButton').hidden = false;
  $('#bioEditor').focus();
}
async function browseBannerAnimations() {
  const grid = $('#bannerAnimationGrid');
  grid.hidden = !grid.hidden;
  if (!grid.hidden && !grid.children.length) {
    try {
      let gifs = [];
      let offset = 0;
      let total = 0;
      do {
        const result = await api(`/api/gifs?limit=120&offset=${offset}`);
        gifs.push(...result.gifs);
        total = result.total;
        offset += result.gifs.length;
      } while (gifs.length < total && offset > 0 && gifs.length % 120 === 0);
      if (!gifs.length) {
        grid.innerHTML = '<p class="upload-hint">No banner animations available.</p>';
        return;
      }
      grid.innerHTML = gifs.map((gif) => `<button class="banner-animation-option" type="button" data-banner-gif="${escapeHTML(gif.id)}" title="Use ${escapeHTML(gif.name)}"><img src="${escapeHTML(gif.url)}" alt="${escapeHTML(gif.name)}" loading="eager" decoding="sync"><span>${escapeHTML(gif.name)}</span></button>`).join('');
      grid.querySelectorAll('[data-banner-gif]').forEach((button) => button.addEventListener('click', async () => {
        try {
          const upload = await api('/api/banner/gif', { method: 'POST', body: JSON.stringify({ gifId: button.dataset.bannerGif }) });
          currentUser = upload.user;
          $('#modalBanner').hidden = false;
          $('#modalBanner').innerHTML = `<img src="${escapeHTML(currentUser.banner)}" alt="Profile banner">`;
          selectedBannerFile = null;
          grid.hidden = true;
          showToast('Banner animation saved.');
        } catch (error) { $('#modalError').textContent = error.message; }
      }));
    } catch (error) { $('#modalError').textContent = error.message; }
  }
}

window.chatroomBannerAction = function chatroomBannerAction(action, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (action === 'choose-file') {
    $('#bannerFile')?.click();
  } else if (action === 'browse-animations') {
    browseBannerAnimations().catch((error) => { if ($('#modalError')) $('#modalError').textContent = error.message; });
  }
  return false;
};
$('#chooseBannerButton').addEventListener('click', (event) => {
  window.chatroomBannerAction('choose-file', event);
});
$('#browseBannerAnimations').addEventListener('click', (event) => {
  window.chatroomBannerAction('browse-animations', event);
});
$('#bannerFile').addEventListener('change', () => {
  const file = $('#bannerFile').files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 50 * 1024 * 1024) {
    $('#modalError').textContent = 'Choose a JPG, PNG, WebP, or GIF banner up to 50 MB.';
    $('#bannerFile').value = '';
    return;
  }
  if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
  selectedBannerFile = file;
  bannerPreviewUrl = URL.createObjectURL(file);
  $('#modalBanner').hidden = false;
  $('#modalBanner').innerHTML = `<img src="${escapeHTML(bannerPreviewUrl)}" alt="Banner preview">`;
  $('#modalError').textContent = '';
});
$('#saveBioButton').addEventListener('click', async () => {
  try {
    if (selectedBannerFile) {
      const upload = await api('/api/banner', { method: 'POST', headers: { 'Content-Type': selectedBannerFile.type }, body: selectedBannerFile });
      currentUser = upload.user;
      selectedBannerFile = null;
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
      bannerPreviewUrl = null;
      $('#bannerEditor').hidden = true;
    }
    const result = await api('/api/profile', { method: 'PATCH', body: JSON.stringify({ bio: $('#bioEditor').value }) });
    currentUser = result.user;
    renderOwnAvatar(currentUser);
    openProfile(currentUser);
  } catch (error) { $('#modalError').textContent = error.message; }
});
$('#profileDialog').addEventListener('click', (event) => {
  if (event.target === $('#profileDialog')) closeProfileDialog();
});

$('#goBackButton').addEventListener('click', () => {
  pendingExternalUrl = null;
  $('#linkWarningDialog').close();
});
$('#goToSiteButton').addEventListener('click', () => {
  if (pendingExternalUrl) window.open(pendingExternalUrl, '_blank', 'noopener,noreferrer');
  pendingExternalUrl = null;
  $('#linkWarningDialog').close();
});
$('#linkWarningDialog').addEventListener('click', (event) => {
  if (event.target === $('#linkWarningDialog')) {
    pendingExternalUrl = null;
    $('#linkWarningDialog').close();
  }
});

const messagesObserver = new MutationObserver(() => scrollMessagesToBottom());
const messagesNode = $('#messages');
if (messagesNode) {
  messagesObserver.observe(messagesNode, { childList: true, subtree: true });
  messagesNode.addEventListener('load', (event) => {
    if (event.target instanceof HTMLImageElement || event.target instanceof HTMLVideoElement) scrollMessagesToBottom(messagesNode);
  }, true);
  if ('ResizeObserver' in window) new ResizeObserver(() => scrollMessagesToBottom(messagesNode)).observe(messagesNode);
}

async function preloadAvatarDecorations() {
  try {
    const shop = await api('/api/avatar-decorations');
    shop.decorations.forEach((decoration) => {
      if (!decoration.file) return;
      const image = new Image();
      image.decoding = 'sync';
      image.src = `/${decoration.route || 'avatar-decorations'}/${encodeURIComponent(decoration.file)}`;
    });
  } catch {}
}

(async function boot() {
  try {
    const result = await api('/api/me');
    if (result.user) await enterChat(result.user, result.muteExpired);
    else showAuth('welcome');
  } catch { showAuth('welcome'); }
  preloadAvatarDecorations();
  refreshIcons();
})();
