const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');
const express = require('express');
const session = require('express-session');
const http = require('node:http');
const { Server } = require('socket.io');
const leoProfanity = require('leo-profanity');

const scrypt = promisify(crypto.scrypt);
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = Number(process.env.PORT) || 4173;
const dataPath = process.env.CHATROOM_DATA_PATH || path.join(__dirname, 'data', 'chatroom.json');
const avatarEffects = new Set(['none', 'glow', 'aurora', 'frost', 'sparkle', 'sunset', 'neon', 'rose', 'ocean', 'ember', 'cosmic', 'hologram', 'midnight', 'gold', 'prism', 'pulse', 'orbit', 'electric', 'glitch', 'halo', 'rainbow']);
const avatarDecorations = {
  none: { price: 0, rarity: 'Free' }, glow: { price: 100, rarity: 'Common' }, frost: { price: 150, rarity: 'Common' },
  sparkle: { price: 200, rarity: 'Common' }, sunset: { price: 250, rarity: 'Uncommon' }, neon: { price: 300, rarity: 'Uncommon' },
  rose: { price: 350, rarity: 'Uncommon' }, ocean: { price: 400, rarity: 'Rare' }, ember: { price: 450, rarity: 'Rare' },
  cosmic: { price: 500, rarity: 'Rare' }, hologram: { price: 550, rarity: 'Epic' }, midnight: { price: 600, rarity: 'Epic' },
  gold: { price: 650, rarity: 'Epic' }, prism: { price: 700, rarity: 'Epic' }, pulse: { price: 750, rarity: 'Legendary' },
  orbit: { price: 800, rarity: 'Legendary' }, electric: { price: 850, rarity: 'Legendary' }, glitch: { price: 900, rarity: 'Legendary' },
  halo: { price: 950, rarity: 'Legendary' }, rainbow: { price: 1000, rarity: 'Legendary' }, aurora: { price: 1000, rarity: 'Legendary' }
};
const profileBadges = new Set([
  'none', 'jolly', 'merry', 'ho-ho-ho', 'frosty', 'cozy', 'snowed-in', 'naughty', 'nice', 'elf',
  'artist', 'creator', 'gamer', 'music', 'bookworm', 'night-owl', 'helper', 'trailblazer', 'dreamer', 'explorer', 'legend', 'stargazer', 'good-vibes', 'plant-parent', 'pixel-pro', 'cozy-core', 'comet', 'moonbeam', 'sunshine', 'vivid', 'tiny-chaos', 'team-player', 'maker', 'storyteller', 'early-bird',
  'dragon', 'angel', 'raver', 'builder', 'rocket', 'spectral', 'spark', 'flower', 'wizard', 'sun-chaser'
]);
const sessionMiddleware = session({
  name: 'chatroom.sid',
  secret: process.env.SESSION_SECRET || 'local-chatroom-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }
});

let database = {
  users: [],
  rooms: defaultRooms(),
  messages: [],
  attachments: []
};
let pendingWrite = Promise.resolve();
const voiceParticipants = new Map();
const gifCatalog = new Map();

function defaultRooms() {
  const createdAt = new Date().toISOString();
  return [
    { id: 'general', name: 'general', type: 'text', createdAt },
    { id: 'kirkwood-schools', name: 'kirkwood schools', type: 'text', createdAt },
    { id: 'links', name: 'links', type: 'text', createdAt },
    { id: 'voice', name: 'Voice Room', type: 'voice', createdAt }
  ];
}

async function loadDatabase() {
  try {
    database = JSON.parse(await fs.readFile(dataPath, 'utf8'));
    if (!Array.isArray(database.users) || !Array.isArray(database.rooms) || !Array.isArray(database.messages)) throw new Error('Invalid database');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await persistDatabase();
  }
  let changed = false;
  for (const user of database.users) {
    if (!Number.isInteger(user.coins) || user.coins < 0) user.coins = 0;
    if (!Array.isArray(user.ownedEffects)) user.ownedEffects = ['none'];
  }
  for (const user of database.users) if (!user.banner) user.banner = null;
  if (!Array.isArray(database.attachments)) {
    database.attachments = [];
    changed = true;
  }
  for (const room of defaultRooms()) {
    if (!database.rooms.some((savedRoom) => savedRoom.id === room.id)) {
      database.rooms.push(room);
      changed = true;
    }
  }
  for (const room of database.rooms) {
    if (!room.type) {
      room.type = room.id === 'voice' ? 'voice' : 'text';
      changed = true;
    }
  }
  const configuredOwner = process.env.CHATROOM_OWNER_EMAIL?.trim().toLowerCase();
  const designatedOwner = database.users.find((user) => configuredOwner && user.email === configuredOwner)
    || database.users.find((user) => user.name.trim().toLowerCase() === 'joshua boudreau');
  if (designatedOwner) {
    for (const user of database.users) {
      const desiredRole = user.id === designatedOwner.id ? 'owner' : user.role === 'owner' ? 'member' : user.role || 'member';
      if (user.role !== desiredRole) {
        user.role = desiredRole;
        changed = true;
      }
    }
  }
  if (changed) await persistDatabase();
}

async function loadAvatarDecorations() {
  const directories = [
    { directory: path.join(__dirname, 'public', 'avatar-decorations'), route: 'avatar-decorations', prefix: 'classic-' },
    { directory: path.join(__dirname, 'public', 'bot-avatar-decorations'), route: 'bot-avatar-decorations', prefix: 'bot-' }
  ];
  let index = 0;
  for (const source of directories) {
    const entries = await fs.readdir(source.directory, { withFileTypes: true }).catch((error) => { if (error.code === 'ENOENT') return []; throw error; });
    const files = entries.filter((entry) => entry.isFile() && /\.png$/i.test(entry.name)).sort((first, second) => first.name.localeCompare(second.name));
    for (const entry of files) {
      const baseName = entry.name.replace(/\.png$/i, '').replace(/^\d+[-_]/, '').replace(/^\d+_/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\.(?=\w)/g, '');
      const cleanSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `decoration-${index + 1}`;
      const slug = `${source.prefix}${cleanSlug}`;
      const tier = index < 56 ? 'Common' : index < 112 ? 'Uncommon' : index < 168 ? 'Rare' : index < 224 ? 'Epic' : 'Legendary';
      const price = Math.min(1000, 100 + Math.floor(index / 28) * 100);
      avatarDecorations[slug] = { price, rarity: tier, file: entry.name, route: source.route, name: baseName };
      avatarEffects.add(slug);
      index++;
    }
  }
}

async function loadGifCatalog(directory = path.join(__dirname, 'public', 'gifs'), relative = '') {
  gifCatalog.clear();
  async function visit(currentDirectory, relativeDirectory) {
    let entries;
    try { entries = await fs.readdir(currentDirectory, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const childRelative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(path.join(currentDirectory, entry.name), childRelative);
      else if (/\.gif$/i.test(entry.name)) {
        const urlPath = childRelative.split('/').map(encodeURIComponent).join('/');
        const baseName = entry.name.replace(/\.gif$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
        gifCatalog.set(urlPath, { name: baseName, urlPath });
      }
    }
  }
  await visit(directory, relative);
}

function findGif(gifId) {
  if (!gifId) return null;
  if (gifCatalog.has(gifId)) return gifCatalog.get(gifId);
  const normalized = String(gifId).toLowerCase().replace(/\.gif$/i, '');
  return [...gifCatalog.entries()].map(([, gif]) => gif).find((gif) => gif.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized.replace(/[^a-z0-9]/g, '')) || null;
}

function persistDatabase() {
  pendingWrite = pendingWrite.then(async () => {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    const temporaryPath = `${dataPath}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(database), { mode: 0o600 });
    await fs.rename(temporaryPath, dataPath);
  });
  return pendingWrite;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    bio: user.bio || '',
    avatar: user.avatar ? `/avatars/${encodeURIComponent(user.avatar)}` : null,
    avatarEffect: user.avatarEffect || 'none',
    avatarDecorationUrl: avatarDecorations[user.avatarEffect]?.file ? `/${avatarDecorations[user.avatarEffect].route || 'avatar-decorations'}/${encodeURIComponent(avatarDecorations[user.avatarEffect].file)}` : null,
    banner: user.banner ? `/banners/${encodeURIComponent(user.banner)}` : null,
    badge: user.badge || 'none',
    role: user.role || 'member',
    coins: user.role === 'owner' ? null : (Number.isInteger(user.coins) ? user.coins : 0),
    infiniteCoins: user.role === 'owner',
    ownedEffects: Array.isArray(user.ownedEffects) ? ['none', ...new Set(user.ownedEffects.filter((effect) => avatarEffects.has(effect)))] : ['none'],
    mutedUntil: user.mutedUntil || null,
    muteReason: user.muteReason || '',
    createdAt: user.createdAt
  };
}

function currentUser(request) {
  return database.users.find((user) => user.id === request.session.userId);
}

function requireUser(request, response, next) {
  const user = currentUser(request);
  if (!user) return response.status(401).json({ error: 'Please sign in to continue.' });
  request.user = user;
  next();
}

function establishSession(request, userId) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) return reject(error);
      request.session.userId = userId;
      request.session.save((saveError) => saveError ? reject(saveError) : resolve());
    });
  });
}

function isValidText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function hasBlockedLanguage(value) {
  return leoProfanity.check(value.normalize('NFKC').replace(/[\u200b-\u200f\uFEFF]/g, ''));
}

function isRoomModerator(user) {
  return user.role === 'owner' || user.role === 'moderator';
}

function formatMuteDuration(milliseconds) {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function activeMute(user) {
  return user.mutedUntil && Date.parse(user.mutedUntil) > Date.now();
}

function containsLink(value) {
  return /(?:https?:\/\/|www\.)\S+/i.test(value) || /(?:^|[\s([{])(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s]*)?/i.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function usersMentionedIn(text, authorId) {
  return database.users.filter((user) => {
    if (user.id === authorId) return false;
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])@${escapeRegExp(user.name)}(?=$|[^\\p{L}\\p{N}_])`, 'iu');
    return pattern.test(text);
  });
}

async function moderateImage(image, contentType) {
  if (!process.env.CHATROOM_IMAGE_MODERATION_URL) return { available: false, safe: false };
  const headers = { 'Content-Type': contentType };
  if (process.env.CHATROOM_IMAGE_MODERATION_KEY) headers.Authorization = `Bearer ${process.env.CHATROOM_IMAGE_MODERATION_KEY}`;
  try {
    const response = await fetch(process.env.CHATROOM_IMAGE_MODERATION_URL, { method: 'POST', headers, body: image, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { available: false, safe: false };
    const verdict = await response.json();
    return { available: true, safe: verdict.safe === true };
  } catch { return { available: false, safe: false }; }
}

function roomMessage(message) {
  if (message.userId === 'system-bot') return { ...message, user: { id: 'system-bot', name: 'BOT', role: 'system' } };
  const author = database.users.find((user) => user.id === message.userId);
  if (!author) return null;
  return { ...message, attachment: publicAttachment(message.attachmentId), user: publicUser(author) };
}

function publicAttachment(attachmentId) {
  const attachment = database.attachments.find((entry) => entry.id === attachmentId);
  return attachment ? { url: `/attachments/${attachment.id}`, contentType: attachment.contentType } : null;
}

function conversationId(firstId, secondId) {
  return [firstId, secondId].sort().join(':');
}

function dmMessage(message) {
  const author = database.users.find((user) => user.id === message.userId);
  if (!author) return null;
  return { ...message, attachment: publicAttachment(message.attachmentId), user: publicUser(author) };
}

function onlineUserIds() {
  return [...new Set([...io.sockets.sockets.values()].map((socket) => socket.userId).filter(Boolean))];
}

function broadcastPresence() {
  io.emit('presence:update', onlineUserIds());
}

function leaveVoiceRoom(socket) {
  const roomId = socket.voiceRoomId;
  if (!roomId) return;
  const participants = voiceParticipants.get(roomId);
  participants?.delete(socket.id);
  socket.leave(`voice:${roomId}`);
  socket.voiceRoomId = null;
  if (participants?.size) io.to(`voice:${roomId}`).emit('voice:participant-left', socket.id);
  else voiceParticipants.delete(roomId);
}

function trustedGateway(request) {
  if (!process.env.CHATROOM_GATEWAY_TOKEN) return process.env.NODE_ENV !== 'production';
  const supplied = Buffer.from(String(request.headers['x-chatroom-gateway-key'] || ''));
  const expected = Buffer.from(process.env.CHATROOM_GATEWAY_TOKEN);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function enforceTrustedGateway(request, response, next) {
  if (!trustedGateway(request)) return response.status(process.env.CHATROOM_GATEWAY_TOKEN ? 403 : 503).send('Chatroom is only available through the approved school network.');
  next();
}

app.disable('x-powered-by');
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(enforceTrustedGateway);
app.use('/gifs', express.static(path.join(__dirname, 'public', 'gifs'), { maxAge: '365d', immutable: true, index: false }));
app.use('/avatar-decorations', express.static(path.join(__dirname, 'public', 'avatar-decorations'), { maxAge: '30d', immutable: true, index: false }));
app.use('/bot-avatar-decorations', express.static(path.join(__dirname, 'public', 'bot-avatar-decorations'), { maxAge: '30d', immutable: true, index: false }));
app.use('/vendor', express.static(path.join(__dirname, 'public', 'vendor'), { maxAge: '30d', immutable: true, index: false }));
app.use(express.json({ limit: '16kb' }));
app.use(sessionMiddleware);

app.get('/', (request, response) => response.sendFile(path.join(__dirname, 'index.html')));
app.get('/app.js', (request, response) => response.type('application/javascript').sendFile(path.join(__dirname, 'app.js')));
app.get('/api/gifs', requireUser, (request, response) => {
  const query = String(request.query.q || '').trim().toLowerCase();
  const offset = Math.max(0, Number.parseInt(request.query.offset, 10) || 0);
  const limit = Math.min(120, Math.max(1, Number.parseInt(request.query.limit, 10) || 60));
  const gifs = [...gifCatalog.entries()].map(([id, gif]) => ({ id, name: gif.name, url: `/gifs/${gif.urlPath}` }));
  const filtered = query ? gifs.filter((gif) => `${gif.name} ${gif.id}`.toLowerCase().includes(query)) : gifs;
  response.setHeader('Cache-Control', 'private, max-age=300');
  response.json({ gifs: filtered.slice(offset, offset + limit), offset, limit, total: filtered.length });
});

app.get('/api/avatar-decorations', requireUser, (request, response) => {
  const decorations = Object.entries(avatarDecorations).filter(([, item]) => item.file).map(([id, item]) => ({ id, name: item.name || (id[0].toUpperCase() + id.slice(1)), ...item }));
  response.json({ coins: request.user.role === 'owner' ? null : (request.user.coins || 0), infiniteCoins: request.user.role === 'owner', owned: request.user.ownedEffects || ['none'], decorations });
});

app.post('/api/avatar-decorations/:effectId/buy', requireUser, async (request, response, next) => {
  try {
    const effectId = request.params.effectId;
    const decoration = avatarDecorations[effectId];
    if (!decoration) return response.status(404).json({ error: 'Decoration not found.' });
    if (effectId === 'none') return response.status(400).json({ error: 'That decoration is already free.' });
    request.user.ownedEffects ||= [];
    if (request.user.ownedEffects.includes(effectId)) return response.status(409).json({ error: 'You already own this decoration.' });
    if (request.user.role !== 'owner' && (request.user.coins || 0) < decoration.price) return response.status(402).json({ error: `You need ${decoration.price - (request.user.coins || 0)} more coins.` });
    if (request.user.role !== 'owner') request.user.coins -= decoration.price;
    request.user.ownedEffects.push(effectId);
    await persistDatabase();
    io.emit('profile:update', publicUser(request.user));
    response.json({ user: publicUser(request.user), decoration: { id: effectId, ...decoration } });
  } catch (error) { next(error); }
});

app.get('/api/me', async (request, response, next) => {
  const user = currentUser(request);
  if (user?.mutedUntil && Date.parse(user.mutedUntil) <= Date.now()) {
    user.mutedUntil = null;
    user.muteReason = null;
    try { await persistDatabase(); } catch (error) { return next(error); }
    return response.json({ user: publicUser(user), muteExpired: true });
  }
  response.json({ user: user ? publicUser(user) : null });
});

app.post('/api/signup', async (request, response, next) => {
  try {
    const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = request.body.password;
    const bio = typeof request.body.bio === 'string' ? request.body.bio.trim().slice(0, 240) : '';
    if (name.length < 1 || name.length > 60) return response.status(400).json({ error: 'Name must be between 1 and 60 characters.' });
    if (database.users.some((user) => user.name.trim().toLowerCase() === name.toLowerCase())) return response.status(409).json({ error: 'That username is already taken.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return response.status(400).json({ error: 'Enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 10 || password.length > 200) return response.status(400).json({ error: 'Use a password with at least 10 characters.' });
    if (hasBlockedLanguage(name) || (bio && hasBlockedLanguage(bio))) return response.status(400).json({ error: 'Please choose respectful profile text.' });
    if (database.users.some((user) => user.email === email)) return response.status(409).json({ error: 'An account with that email already exists.' });

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
    const configuredOwner = process.env.CHATROOM_OWNER_EMAIL?.trim().toLowerCase();
    const isOwner = configuredOwner ? configuredOwner === email : name.toLowerCase() === 'joshua boudreau';
    const user = { id: crypto.randomUUID(), name, email, bio, salt, passwordHash, role: isOwner ? 'owner' : 'member', coins: 0, ownedEffects: ['none'], createdAt: new Date().toISOString() };
    database.users.push(user);
    await persistDatabase();
    await establishSession(request, user.id);
    io.emit('user:joined', publicUser(user));
    response.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/login', async (request, response, next) => {
  try {
    const identity = typeof request.body.identity === 'string' ? request.body.identity.trim().toLowerCase() : typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';
    const user = database.users.find((entry) => entry.email === identity || entry.name.trim().toLowerCase() === identity);
    if (!user || password.length > 200) return response.status(401).json({ error: 'Email or password is incorrect.' });
    const candidate = await scrypt(password, user.salt, 64);
    if (!crypto.timingSafeEqual(candidate, Buffer.from(user.passwordHash, 'hex'))) return response.status(401).json({ error: 'Email or password is incorrect.' });
    let muteExpired = false;
    if (user.mutedUntil && Date.parse(user.mutedUntil) <= Date.now()) {
      user.mutedUntil = null;
      user.muteReason = null;
      muteExpired = true;
      await persistDatabase();
    }
    await establishSession(request, user.id);
    response.json({ user: publicUser(user), muteExpired });
  } catch (error) { next(error); }
});

app.post('/api/logout', (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie('chatroom.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    response.json({ ok: true });
  });
});

app.get('/api/users', requireUser, (request, response) => {
  response.json({ users: database.users.filter((user) => user.id !== request.user.id).map(publicUser), online: onlineUserIds() });
});

app.post('/api/users/:userId/role', requireUser, async (request, response, next) => {
  try {
    if (request.user.role !== 'owner') return response.status(403).json({ error: 'Only the Owner can manage moderators.' });
    const target = database.users.find((user) => user.id === request.params.userId);
    if (!target || target.role === 'owner') return response.status(404).json({ error: 'Member not found.' });
    const role = request.body.role;
    if (!['member', 'moderator'].includes(role)) return response.status(400).json({ error: 'Choose member or moderator.' });
    target.role = role;
    await persistDatabase();
    io.emit('profile:update', publicUser(target));
    response.json({ user: publicUser(target) });
  } catch (error) { next(error); }
});

app.post('/api/moderation/mute', requireUser, async (request, response, next) => {
  try {
    if (!isRoomModerator(request.user)) return response.status(403).json({ error: 'Only Owner and Mods can mute members.' });
    const target = database.users.find((user) => user.id === request.body.userId);
    const durationMinutes = Number(request.body.durationMinutes);
    const reason = typeof request.body.reason === 'string' ? request.body.reason.trim() : '';
    if (!target || target.id === request.user.id) return response.status(404).json({ error: 'Member not found.' });
    if (request.user.role !== 'owner' && target.role !== 'member') return response.status(403).json({ error: 'Mods can only mute regular members.' });
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) return response.status(400).json({ error: 'Mute duration must be from 1 to 1440 minutes.' });
    if (!reason || reason.length > 240 || hasBlockedLanguage(reason)) return response.status(400).json({ error: 'Enter a short, respectful moderation reason.' });
    const requestedRoom = database.rooms.find((room) => room.id === request.body.roomId && room.type !== 'voice');
    const room = requestedRoom || database.rooms.find((entry) => entry.id === 'general');
    const mutedUntil = new Date(Date.now() + durationMinutes * 60000).toISOString();
    target.mutedUntil = mutedUntil;
    target.muteReason = reason;
    const message = {
      id: crypto.randomUUID(), type: 'room', roomId: room.id, userId: 'system-bot',
      text: `${target.name} has been muted for ${formatMuteDuration(durationMinutes * 60000)} for ${reason}.`,
      replyTo: null, reactions: {}, createdAt: new Date().toISOString()
    };
    database.messages.push(message);
    await persistDatabase();
    io.to(`user:${target.id}`).emit('moderation:mute', { mutedUntil, reason });
    io.to(`room:${room.id}`).emit('room:message', roomMessage(message));
    response.json({ mutedUntil, roomId: room.id });
  } catch (error) { next(error); }
});

app.patch('/api/profile', requireUser, async (request, response, next) => {
  try {
    const { bio, avatarEffect, badge } = request.body;
    if (bio !== undefined && (typeof bio !== 'string' || bio.trim().length > 240)) return response.status(400).json({ error: 'Bio must be 240 characters or fewer.' });
    if (bio !== undefined && hasBlockedLanguage(bio)) return response.status(400).json({ error: 'Please keep your bio respectful.' });
    if (avatarEffect !== undefined && !avatarEffects.has(avatarEffect)) return response.status(400).json({ error: 'Choose a supported avatar effect.' });
    if (avatarEffect !== undefined && avatarEffect !== 'none' && request.user.role !== 'owner' && !(request.user.ownedEffects || []).includes(avatarEffect)) return response.status(403).json({ error: 'Buy this avatar decoration before using it.' });
    if (badge !== undefined && !profileBadges.has(badge)) return response.status(400).json({ error: 'Choose a supported profile badge.' });
    if (bio === undefined && avatarEffect === undefined && badge === undefined) return response.status(400).json({ error: 'There is nothing to update.' });
    if (bio !== undefined) request.user.bio = bio.trim();
    if (avatarEffect !== undefined) request.user.avatarEffect = avatarEffect;
    if (badge !== undefined) request.user.badge = badge;
    await persistDatabase();
    io.emit('profile:update', publicUser(request.user));
    response.json({ user: publicUser(request.user) });
  } catch (error) { next(error); }
});

const parseAvatar = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], limit: '50mb' });
app.post('/api/avatar', requireUser, parseAvatar, async (request, response, next) => {
  try {
    const image = request.body;
    if (!Buffer.isBuffer(image) || image.length < 16) return response.status(400).json({ error: 'Choose a valid JPG, PNG, or WebP image.' });
    let extension;
    if (image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) extension = 'jpg';
    else if (image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = 'png';
    else if (image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP') extension = 'webp';
    else if (image.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/)) extension = 'gif';
    if (!extension) return response.status(400).json({ error: 'The selected file is not a supported image.' });
    const contentType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    if (request.headers['content-type'] !== contentType) return response.status(400).json({ error: 'The image type does not match the selected file.' });
    if (process.env.CHATROOM_IMAGE_MODERATION_URL) {
      const verdict = await moderateImage(image, contentType);
      if (!verdict.available) return response.status(503).json({ error: 'Image moderation is unavailable. The image was not uploaded.' });
      if (!verdict.safe) return response.status(422).json({ error: 'This image could not be approved for Chatroom.' });
    }

    const avatarDirectory = path.join(path.dirname(dataPath), 'avatars');
    const filename = `${crypto.randomUUID()}.${extension}`;
    await fs.mkdir(avatarDirectory, { recursive: true });
    await fs.writeFile(path.join(avatarDirectory, filename), image, { flag: 'wx', mode: 0o600 });
    const previousAvatar = request.user.avatar;
    request.user.avatar = filename;
    try { await persistDatabase(); } catch (error) {
      request.user.avatar = previousAvatar;
      await fs.unlink(path.join(avatarDirectory, filename)).catch(() => {});
      throw error;
    }
    if (previousAvatar) await fs.unlink(path.join(avatarDirectory, path.basename(previousAvatar))).catch(() => {});
    io.emit('profile:update', publicUser(request.user));
    response.json({ user: publicUser(request.user) });
  } catch (error) { next(error); }
});

const parseBanner = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], limit: '50mb' });
app.post('/api/banner', requireUser, parseBanner, async (request, response, next) => {
  try {
    const image = request.body;
    if (!Buffer.isBuffer(image) || image.length < 16) return response.status(400).json({ error: 'Choose a valid banner image or GIF.' });
    let extension;
    if (image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) extension = 'jpg';
    else if (image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = 'png';
    else if (image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP') extension = 'webp';
    else if (image.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/)) extension = 'gif';
    if (!extension) return response.status(400).json({ error: 'The banner must be JPG, PNG, WebP, or GIF.' });
    const contentType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    if (request.headers['content-type'] !== contentType) return response.status(400).json({ error: 'The banner type does not match the selected file.' });
    if (process.env.CHATROOM_IMAGE_MODERATION_URL) {
      const verdict = await moderateImage(image, contentType);
      if (!verdict.available) return response.status(503).json({ error: 'Image moderation is unavailable. The banner was not uploaded.' });
      if (!verdict.safe) return response.status(422).json({ error: 'This banner could not be approved for Chatroom.' });
    }
    const directory = path.join(path.dirname(dataPath), 'banners');
    await fs.mkdir(directory, { recursive: true });
    const filename = `${crypto.randomUUID()}.${extension}`;
    await fs.writeFile(path.join(directory, filename), image, { flag: 'wx', mode: 0o600 });
    const previousBanner = request.user.banner;
    request.user.banner = filename;
    try { await persistDatabase(); } catch (error) { request.user.banner = previousBanner; await fs.unlink(path.join(directory, filename)).catch(() => {}); throw error; }
    if (previousBanner) await fs.unlink(path.join(directory, previousBanner)).catch(() => {});
    io.emit('profile:update', publicUser(request.user));
    response.json({ user: publicUser(request.user) });
  } catch (error) { next(error); }
});

app.get('/banners/:filename', requireUser, async (request, response, next) => {
  try {
    const filename = request.params.filename;
    if (!/^[0-9a-f-]+\.(jpg|png|webp|gif)$/.test(filename)) return response.sendStatus(404);
    const image = await fs.readFile(path.join(path.dirname(dataPath), 'banners', filename));
    response.setHeader('Cache-Control', 'private, max-age=3600');
    response.type(filename.endsWith('.jpg') ? 'image/jpeg' : `image/${filename.split('.').pop()}`).send(image);
  } catch (error) { if (error.code === 'ENOENT') return response.sendStatus(404); next(error); }
});

app.get('/avatars/:filename', requireUser, async (request, response, next) => {
  try {
    const filename = request.params.filename;
    if (!/^[0-9a-f-]+\.(jpg|png|webp|gif)$/.test(filename)) return response.sendStatus(404);
    const avatarPath = path.join(path.dirname(dataPath), 'avatars', filename);
    const image = await fs.readFile(avatarPath);
    const contentType = filename.endsWith('.jpg') ? 'image/jpeg' : `image/${filename.split('.').pop()}`;
    response.setHeader('Cache-Control', 'private, max-age=3600');
    response.type(contentType).send(image);
  } catch (error) { if (error.code === 'ENOENT') response.sendStatus(404); else next(error); }
});

const parseImageUpload = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], limit: '50mb' });
app.post('/api/attachments', requireUser, parseImageUpload, async (request, response, next) => {
  try {
    const image = request.body;
    if (!Buffer.isBuffer(image) || image.length < 16) return response.status(400).json({ error: 'Choose a valid JPG, PNG, or WebP image.' });
    const contentType = image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff ? 'image/jpeg'
      : image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
      : image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp'
      : image.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/) ? 'image/gif' : null;
    if (!contentType || contentType !== request.headers['content-type']) return response.status(400).json({ error: 'The selected file is not a supported image.' });
    const verdict = await moderateImage(image, contentType);
    if (!verdict.available) return response.status(503).json({ error: 'Image moderation is unavailable. The image was not uploaded.' });
    if (!verdict.safe) return response.status(422).json({ error: 'This image could not be approved for Chatroom.' });

    const id = crypto.randomUUID();
    const extension = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];
    const filename = `${id}.${extension}`;
    const directory = path.join(path.dirname(dataPath), 'attachments');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), image, { flag: 'wx', mode: 0o600 });
    const attachment = { id, filename, contentType, ownerId: request.user.id, size: image.length, createdAt: new Date().toISOString() };
    database.attachments.push(attachment);
    try { await persistDatabase(); } catch (error) {
      database.attachments.pop();
      await fs.unlink(path.join(directory, filename)).catch(() => {});
      throw error;
    }
    response.status(201).json({ id, url: `/attachments/${id}`, contentType });
  } catch (error) { next(error); }
});

app.get('/attachments/:id', requireUser, async (request, response, next) => {
  try {
    const attachment = database.attachments.find((entry) => entry.id === request.params.id);
    if (!attachment) return response.sendStatus(404);
    const image = await fs.readFile(path.join(path.dirname(dataPath), 'attachments', attachment.filename));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    response.setHeader('Cache-Control', 'private, max-age=3600');
    response.type(attachment.contentType).send(image);
  } catch (error) { if (error.code === 'ENOENT') response.sendStatus(404); else next(error); }
});

app.get('/api/rooms', requireUser, (request, response) => response.json({ rooms: database.rooms }));

app.get('/api/voice-config', requireUser, (request, response) => {
  try {
    const configured = process.env.CHATROOM_ICE_SERVERS;
    const iceServers = configured ? JSON.parse(configured) : [{ urls: 'stun:stun.l.google.com:19302' }];
    if (!Array.isArray(iceServers) || iceServers.some((server) => !server || typeof server.urls !== 'string' && !Array.isArray(server.urls))) throw new Error('Invalid ICE server configuration');
    response.json({ iceServers });
  } catch (error) {
    console.error('Invalid CHATROOM_ICE_SERVERS configuration:', error.message);
    response.status(503).json({ error: 'Voice calling is not configured.' });
  }
});

app.post('/api/rooms', requireUser, async (request, response, next) => {
  try {
    const name = typeof request.body.name === 'string' ? request.body.name.trim().toLowerCase().replace(/\s+/g, '-') : '';
    if (!/^[a-z0-9][a-z0-9-]{0,30}$/.test(name)) return response.status(400).json({ error: 'Use 1–31 letters, numbers, or hyphens for a room name.' });
    if (database.rooms.some((room) => room.id === name)) return response.status(409).json({ error: 'That room already exists.' });
    const room = { id: name, name, createdAt: new Date().toISOString() };
    database.rooms.push(room);
    await persistDatabase();
    io.emit('room:created', room);
    response.status(201).json({ room });
  } catch (error) { next(error); }
});

app.get('/api/messages', requireUser, (request, response) => {
  const roomId = String(request.query.room || '');
  if (!database.rooms.some((room) => room.id === roomId && room.type !== 'voice')) return response.status(404).json({ error: 'Room not found.' });
  const messages = database.messages.filter((message) => message.type === 'room' && message.roomId === roomId).slice(-100).map(roomMessage).filter(Boolean);
  response.json({ messages });
});

app.get('/api/dms/:userId', requireUser, (request, response) => {
  const peer = database.users.find((user) => user.id === request.params.userId);
  if (!peer || peer.id === request.user.id) return response.status(404).json({ error: 'Person not found.' });
  const id = conversationId(request.user.id, peer.id);
  const messages = database.messages.filter((message) => message.type === 'dm' && message.conversationId === id).slice(-100).map(dmMessage).filter(Boolean);
  response.json({ messages, peer: publicUser(peer) });
});

io.engine.use(sessionMiddleware);
io.use((socket, next) => {
  if (!trustedGateway(socket.request)) return next(new Error('Chatroom is only available through the approved school network.'));
  const user = database.users.find((entry) => entry.id === socket.request.session?.userId);
  if (!user) return next(new Error('Authentication required.'));
  socket.userId = user.id;
  next();
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  broadcastPresence();

  socket.on('room:join', (roomId, acknowledge = () => {}) => {
    if (!database.rooms.some((room) => room.id === roomId && room.type !== 'voice')) return acknowledge({ error: 'Room not found.' });
    socket.join(`room:${roomId}`);
    acknowledge({ ok: true });
  });

  socket.on('voice:join', (roomId, acknowledge = () => {}) => {
    const room = database.rooms.find((entry) => entry.id === roomId && entry.type === 'voice');
    const user = database.users.find((entry) => entry.id === socket.userId);
    if (!room) return acknowledge({ error: 'Voice room not found.' });
    if (activeMute(user)) return acknowledge({ error: 'You cannot join voice while muted.' });
    leaveVoiceRoom(socket);
    let participants = voiceParticipants.get(roomId);
    if (!participants) {
      participants = new Map();
      voiceParticipants.set(roomId, participants);
    }
    const existing = [...participants.entries()].map(([socketId, userId]) => ({ socketId, user: publicUser(database.users.find((entry) => entry.id === userId)) }));
    participants.set(socket.id, socket.userId);
    socket.voiceRoomId = roomId;
    socket.join(`voice:${roomId}`);
    socket.to(`voice:${roomId}`).emit('voice:participant-joined', { socketId: socket.id, user: publicUser(user) });
    if (existing.length === 0) {
      for (const recipient of database.users) {
        if (recipient.id !== socket.userId) io.to(`user:${recipient.id}`).emit('voice:ring', { roomId, roomName: room.name, caller: publicUser(user), participants: [...participants.entries()].map(([socketId, userId]) => ({ socketId, user: publicUser(database.users.find((entry) => entry.id === userId)) })) });
      }
    }
    acknowledge({ participants: existing });
  });

  socket.on('voice:peek', (roomId, acknowledge = () => {}) => {
    if (!database.rooms.some((room) => room.id === roomId && room.type === 'voice')) return acknowledge({ error: 'Voice room not found.' });
    const participants = [...(voiceParticipants.get(roomId) || new Map()).entries()].map(([socketId, userId]) => ({ socketId, user: publicUser(database.users.find((entry) => entry.id === userId)) }));
    acknowledge({ participants });
  });

  socket.on('voice:signal', (payload, acknowledge = () => {}) => {
    const roomId = socket.voiceRoomId;
    const participants = voiceParticipants.get(roomId);
    const recipientId = payload?.to;
    if (!roomId || !participants?.has(socket.id) || !participants.has(recipientId) || !payload?.signal) return acknowledge({ error: 'Voice connection is no longer available.' });
    io.to(recipientId).emit('voice:signal', { from: socket.id, signal: payload.signal });
    acknowledge({ ok: true });
  });

  socket.on('voice:leave', (acknowledge = () => {}) => {
    leaveVoiceRoom(socket);
    acknowledge({ ok: true });
  });

  socket.on('room:send', async (payload, acknowledge = () => {}) => {
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    const roomId = String(payload?.roomId || '');
    const author = database.users.find((user) => user.id === socket.userId);
    const attachment = database.attachments.find((entry) => entry.id === payload?.attachmentId && entry.ownerId === socket.userId);
    if (roomId === 'links' && !isRoomModerator(author)) return acknowledge({ error: 'Only Owner and Mods Can Send Messages Here.' });
    if (activeMute(author)) return acknowledge({ error: `You are muted until ${author.mutedUntil}.` });
    const gif = findGif(payload?.gifId);
    if ((!isValidText(text, 3000) && !attachment && !gif) || text.length > 3000 || (text && hasBlockedLanguage(text)) || !socket.rooms.has(`room:${roomId}`)) return acknowledge({ error: 'Message could not be sent. Please keep it respectful.' });
    if (roomId !== 'links' && text && containsLink(text)) return acknowledge({ error: 'Please send links in #links.' });
    if (roomId === 'voice') return acknowledge({ error: 'Voice rooms do not accept text messages.' });
    const mentionedUsers = usersMentionedIn(text, socket.userId);
    const message = { id: crypto.randomUUID(), type: 'room', roomId, userId: socket.userId, text, mentions: mentionedUsers.map((user) => user.id), attachmentId: attachment?.id || null, gifUrl: gif ? `/gifs/${gif.urlPath}` : null, replyTo: typeof payload.replyTo === 'string' ? payload.replyTo : null, reactions: {}, createdAt: new Date().toISOString() };
    author.coins = (author.coins || 0) + 10;
    database.messages.push(message);
    try { await persistDatabase(); } catch { database.messages.pop(); author.coins -= 10; return acknowledge({ error: 'Message could not be saved.' }); }
    io.emit('profile:update', publicUser(author));
    const output = roomMessage(message);
    io.to(`room:${roomId}`).emit('room:message', output);
    const room = database.rooms.find((entry) => entry.id === roomId);
    for (const mentionedUser of mentionedUsers) {
      io.to(`user:${mentionedUser.id}`).emit('mention:notification', { roomId, roomName: room?.name || roomId, messageId: message.id, sender: publicUser(database.users.find((user) => user.id === socket.userId)) });
    }
    acknowledge({ ok: true, message: output });
  });

  socket.on('typing:start', (payload = {}) => {
    const user = database.users.find((entry) => entry.id === socket.userId);
    if (!user) return;
    if (payload.type === 'room' && socket.rooms.has(`room:${payload.id}`)) {
      socket.to(`room:${payload.id}`).emit('typing:update', { type: 'room', id: payload.id, user: publicUser(user), typing: true });
    } else if (payload.type === 'dm') {
      const peer = database.users.find((entry) => entry.id === payload.id);
      if (!peer) return;
      const conversation = conversationId(socket.userId, peer.id);
      if (socket.rooms.has(`dm:${conversation}`)) socket.to(`dm:${conversation}`).emit('typing:update', { type: 'dm', id: peer.id, user: publicUser(user), typing: true });
    }
  });

  socket.on('typing:stop', (payload = {}) => {
    const user = database.users.find((entry) => entry.id === socket.userId);
    if (!user) return;
    if (payload.type === 'room' && socket.rooms.has(`room:${payload.id}`)) {
      socket.to(`room:${payload.id}`).emit('typing:update', { type: 'room', id: payload.id, user: publicUser(user), typing: false });
    } else if (payload.type === 'dm') {
      const peer = database.users.find((entry) => entry.id === payload.id);
      if (!peer) return;
      const conversation = conversationId(socket.userId, peer.id);
      if (socket.rooms.has(`dm:${conversation}`)) socket.to(`dm:${conversation}`).emit('typing:update', { type: 'dm', id: peer.id, user: publicUser(user), typing: false });
    }
  });

  socket.on('message:react', async (payload, acknowledge = () => {}) => {
    const message = database.messages.find((entry) => entry.id === payload?.messageId);
    const emoji = typeof payload?.emoji === 'string' ? payload.emoji : '';
    const destination = message?.type === 'room' ? `room:${message.roomId}` : `dm:${message?.conversationId}`;
    if (!message || !socket.rooms.has(destination) || [...emoji].length > 8) return acknowledge({ error: 'Reaction could not be added.' });
    const users = message.reactions[emoji] || [];
    message.reactions[emoji] = users.includes(socket.userId) ? users.filter((id) => id !== socket.userId) : [...users, socket.userId];
    if (!message.reactions[emoji].length) delete message.reactions[emoji];
    try { await persistDatabase(); } catch { return acknowledge({ error: 'Reaction could not be saved.' }); }
    const update = { messageId: message.id, reactions: message.reactions };
    io.to(destination).emit('message:reaction', update);
    acknowledge({ ok: true });
  });

  socket.on('dm:join', (peerId, acknowledge = () => {}) => {
    const peer = database.users.find((user) => user.id === peerId);
    if (!peer || peer.id === socket.userId) return acknowledge({ error: 'Person not found.' });
    const id = conversationId(socket.userId, peer.id);
    socket.join(`dm:${id}`);
    acknowledge({ ok: true });
  });

  socket.on('dm:send', async (payload, acknowledge = () => {}) => {
    const peer = database.users.find((user) => user.id === payload?.peerId);
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    const author = database.users.find((user) => user.id === socket.userId);
    const attachment = database.attachments.find((entry) => entry.id === payload?.attachmentId && entry.ownerId === socket.userId);
    if (activeMute(author)) return acknowledge({ error: `You are muted until ${author.mutedUntil}.` });
    const gif = findGif(payload?.gifId);
    if (!peer || peer.id === socket.userId || (!isValidText(text, 3000) && !attachment && !gif) || text.length > 3000 || (text && hasBlockedLanguage(text))) return acknowledge({ error: 'Message could not be sent. Please keep it respectful.' });
    const id = conversationId(socket.userId, peer.id);
    if (!socket.rooms.has(`dm:${id}`)) return acknowledge({ error: 'Open this conversation before sending a message.' });
    const message = { id: crypto.randomUUID(), type: 'dm', conversationId: id, userId: socket.userId, recipientId: peer.id, text, attachmentId: attachment?.id || null, gifUrl: gif ? `/gifs/${gif.urlPath}` : null, replyTo: typeof payload.replyTo === 'string' ? payload.replyTo : null, reactions: {}, createdAt: new Date().toISOString() };
    author.coins = (author.coins || 0) + 10;
    database.messages.push(message);
    try { await persistDatabase(); } catch { database.messages.pop(); author.coins -= 10; return acknowledge({ error: 'Message could not be saved.' }); }
    io.emit('profile:update', publicUser(author));
    const output = dmMessage(message);
    io.to(`dm:${id}`).emit('dm:message', output);
    io.to(`user:${peer.id}`).emit('dm:notification', { user: publicUser(database.users.find((user) => user.id === socket.userId)), message: output });
    acknowledge({ ok: true, message: output });
  });

  socket.on('disconnect', () => {
    leaveVoiceRoom(socket);
    broadcastPresence();
  });
});

app.use((error, request, response, next) => {
  console.error(error);
  if (response.headersSent) return next(error);
  response.status(500).json({ error: 'Something went wrong. Please try again.' });
});

loadDatabase().then(async () => {
  await loadAvatarDecorations();
  await loadGifCatalog();
  server.listen(port, '0.0.0.0', () => {
    console.log(`Chatroom is listening on http://localhost:${port}`);
  });
}).catch((error) => {
  console.error('Could not load chatroom data:', error);
  process.exitCode = 1;
});