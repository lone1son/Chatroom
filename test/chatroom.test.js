const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { test } = require('node:test');
const { io } = require('socket.io-client');

function waitForEvent(socket, eventName, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, 5000);
    function onEvent(value) {
      if (!predicate(value)) return;
      clearTimeout(timer);
      socket.off(eventName, onEvent);
      resolve(value);
    }
    socket.on(eventName, onEvent);
  });
}

function emitAck(socket, eventName, payload) {
  return new Promise((resolve, reject) => {
    const acknowledge = (error, result) => {
      if (error) reject(error);
      else if (result?.error) reject(new Error(result.error));
      else resolve(result);
    };
    if (payload === undefined) socket.timeout(5000).emit(eventName, acknowledge);
    else socket.timeout(5000).emit(eventName, payload, acknowledge);
  });
}

test('authenticated people can chat and DM in real time', { timeout: 30000 }, async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'chatroom-test-'));
  const dataPath = path.join(directory, 'database.json');
  const portProbe = http.createServer();
  portProbe.listen(0, '127.0.0.1');
  await once(portProbe, 'listening');
  const port = portProbe.address().port;
  await new Promise((resolve, reject) => portProbe.close((error) => error ? reject(error) : resolve()));
  let moderationChecks = 0;
  const moderationServer = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      moderationChecks += 1;
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ safe: !Buffer.concat(chunks).includes(Buffer.from('REJECT')) }));
    });
  });
  moderationServer.listen(0, '127.0.0.1');
  await once(moderationServer, 'listening');
  const moderationUrl = `http://127.0.0.1:${moderationServer.address().port}/moderate`;
  const url = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), CHATROOM_DATA_PATH: dataPath, SESSION_SECRET: 'test-only-session-secret', CHATROOM_IMAGE_MODERATION_URL: moderationUrl, CHATROOM_OWNER_EMAIL: 'alice@example.test' },
    stdio: 'ignore'
  });
  const sockets = [];

  t.after(async () => {
    sockets.forEach((socket) => socket.disconnect());
    server.kill('SIGTERM');
    await once(server, 'exit').catch(() => {});
    await new Promise((resolve) => moderationServer.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });

  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/me`);
      if (response.ok) { ready = true; break; }
    } catch { /* The child server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(ready, true, 'server should start');

  async function signup(name, email) {
    const response = await fetch(`${url}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: 'a-long-test-password', bio: `${name} bio` })
    });
    assert.equal(response.status, 201);
    const cookie = response.headers.getSetCookie()[0].split(';')[0];
    return { ...(await response.json()).user, cookie };
  }

  const alice = await signup('Alice Real', 'alice@example.test');
  const bob = await signup('Bob Real', 'bob@example.test');
  const charlie = await signup('Charlie Real', 'charlie@example.test');
  const loginResponse = await fetch(`${url}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@example.test', password: 'a-long-test-password' })
  });
  assert.equal(loginResponse.status, 200);
  assert.equal((await (await fetch(`${url}/api/me`, { headers: { Cookie: loginResponse.headers.getSetCookie()[0].split(';')[0] } })).json()).user.name, 'Alice Real');
  assert.equal((await fs.readFile(dataPath, 'utf8')).includes('a-long-test-password'), false);

  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(20)]);
  const attachmentResponse = await fetch(`${url}/api/attachments`, {
    method: 'POST',
    headers: { Cookie: alice.cookie, 'Content-Type': 'image/png' },
    body: png
  });
  assert.equal(attachmentResponse.status, 201);
  const attachment = await attachmentResponse.json();
  const attachmentImage = await fetch(`${url}${attachment.url}`, { headers: { Cookie: alice.cookie } });
  assert.equal(attachmentImage.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await attachmentImage.arrayBuffer()), png);
  const rejectedImage = Buffer.concat([png, Buffer.from('REJECT')]);
  const rejectedUpload = await fetch(`${url}/api/attachments`, { method: 'POST', headers: { Cookie: alice.cookie, 'Content-Type': 'image/png' }, body: rejectedImage });
  assert.equal(rejectedUpload.status, 422);

  const avatarResponse = await fetch(`${url}/api/avatar`, {
    method: 'POST',
    headers: { Cookie: alice.cookie, 'Content-Type': 'image/png' },
    body: png
  });
  assert.equal(avatarResponse.status, 200);
  const avatar = (await avatarResponse.json()).user.avatar;
  const imageResponse = await fetch(`${url}${avatar}`, { headers: { Cookie: alice.cookie } });
  assert.equal(imageResponse.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), png);

  const profileResponse = await fetch(`${url}/api/profile`, {
    method: 'PATCH',
    headers: { Cookie: alice.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bio: 'Updated Alice bio', badge: 'dragon' })
  });
  const profile = (await profileResponse.json()).user;

  assert.equal(profile.badge, 'dragon');
  assert.equal(profile.bio, 'Updated Alice bio');
  const ownerEffectResponse = await fetch(`${url}/api/profile`, {
    method: 'PATCH', headers: { Cookie: alice.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatarEffect: 'bot-hugh-the-rainbow' })
  });
  assert.equal(ownerEffectResponse.status, 200);
  assert.equal((await ownerEffectResponse.json()).user.avatarEffect, 'bot-hugh-the-rainbow');

  const resumedLogin = await fetch(`${url}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@example.test', password: 'a-long-test-password' })
  });
  const resumedUser = (await resumedLogin.json()).user;
  assert.equal(resumedUser.avatar, avatar);

  assert.equal(resumedUser.badge, 'dragon');
  assert.equal(moderationChecks, 3);

  const directoryResponse = await fetch(`${url}/api/users`, { headers: { Cookie: alice.cookie } });
  const directoryData = await directoryResponse.json();
  assert.deepEqual(directoryData.users.map((user) => user.id).sort(), [bob.id, charlie.id].sort());
  assert.equal(directoryData.users[0].bio, 'Bob Real bio');

  const historyResponse = await fetch(`${url}/api/messages?room=general`, { headers: { Cookie: alice.cookie } });
  assert.deepEqual((await historyResponse.json()).messages, []);
  const roomsResponse = await fetch(`${url}/api/rooms`, { headers: { Cookie: alice.cookie } });
  assert.ok((await roomsResponse.json()).rooms.some((room) => room.id === 'links'));

  function connect(user) {
    const socket = io(url, { extraHeaders: { Cookie: user.cookie }, reconnection: false });
    sockets.push(socket);
    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });
  }
  const aliceSocket = await connect(alice);
  const bobPresence = waitForEvent(aliceSocket, 'presence:update');
  const bobSocket = await connect(bob);
  assert.ok((await bobPresence).includes(bob.id));
  const charliePresence = waitForEvent(aliceSocket, 'presence:update');
  const charlieSocket = await connect(charlie);
  assert.ok((await charliePresence).includes(charlie.id));
  await Promise.all([emitAck(aliceSocket, 'room:join', 'general'), emitAck(bobSocket, 'room:join', 'general'), emitAck(charlieSocket, 'room:join', 'general')]);

  const roomDelivery = waitForEvent(bobSocket, 'room:message');
  const firstMessage = await emitAck(aliceSocket, 'room:send', { roomId: 'general', text: 'Hello from a real account.' });
  assert.equal((await roomDelivery).id, firstMessage.message.id);
  assert.equal(firstMessage.message.user.name, 'Alice Real');
  await assert.rejects(emitAck(aliceSocket, 'room:send', { roomId: 'general', text: 'fuck' }), /respectful/);

  const reactionDelivery = waitForEvent(aliceSocket, 'message:reaction');
  await emitAck(bobSocket, 'message:react', { messageId: firstMessage.message.id, emoji: '👋' });
  assert.deepEqual((await reactionDelivery).reactions['👋'], [bob.id]);

  const replyDelivery = waitForEvent(bobSocket, 'room:message', (message) => message.replyTo === firstMessage.message.id);
  await emitAck(aliceSocket, 'room:send', { roomId: 'general', text: 'This is a threaded reply.', replyTo: firstMessage.message.id });
  assert.equal((await replyDelivery).text, 'This is a threaded reply.');
  const mentionNotification = waitForEvent(bobSocket, 'mention:notification');
  const mentionMessage = await emitAck(aliceSocket, 'room:send', { roomId: 'general', text: 'Hey @Bob Real, are you there?' });
  assert.deepEqual(mentionMessage.message.mentions, [bob.id]);
  assert.equal((await mentionNotification).roomName, 'general');
  await assert.rejects(emitAck(aliceSocket, 'room:send', { roomId: 'general', text: 'https://example.test' }), /Please send links in #links/);
  await Promise.all([emitAck(aliceSocket, 'room:join', 'links'), emitAck(bobSocket, 'room:join', 'links')]);
  const linkDelivery = waitForEvent(bobSocket, 'room:message');
  const sharedLink = await emitAck(aliceSocket, 'room:send', { roomId: 'links', text: 'A useful page: https://example.test/guide' });
  assert.equal((await linkDelivery).id, sharedLink.message.id);
  await emitAck(charlieSocket, 'room:join', 'links');
  await assert.rejects(emitAck(charlieSocket, 'room:send', { roomId: 'links', text: 'I cannot post here.' }), /Only Owner and Mods Can Send Messages Here/);

  const promoteResponse = await fetch(`${url}/api/users/${bob.id}/role`, {
    method: 'POST',
    headers: { Cookie: alice.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'moderator' })
  });
  assert.equal((await promoteResponse.json()).user.role, 'moderator');
  const forbiddenPromotion = await fetch(`${url}/api/users/${alice.id}/role`, {
    method: 'POST',
    headers: { Cookie: bob.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'moderator' })
  });
  assert.equal(forbiddenPromotion.status, 403);

  const muteNotice = waitForEvent(charlieSocket, 'moderation:mute');
  const muteResponse = await fetch(`${url}/api/moderation/mute`, {
    method: 'POST',
    headers: { Cookie: bob.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: charlie.id, durationMinutes: 1, reason: 'Repeated disruption', roomId: 'general' })
  });
  assert.equal(muteResponse.status, 200);
  assert.ok(Date.parse((await muteNotice).mutedUntil) > Date.now());
  await assert.rejects(emitAck(charlieSocket, 'room:send', { roomId: 'general', text: 'I am muted.' }), /You are muted/);
  const muteHistory = await fetch(`${url}/api/messages?room=general`, { headers: { Cookie: alice.cookie } });
  assert.ok((await muteHistory.json()).messages.some((message) => message.user.name === 'BOT' && /Charlie Real has been muted/.test(message.text)));

  const ringNotification = waitForEvent(bobSocket, 'voice:ring');
  await emitAck(aliceSocket, 'voice:join', 'voice');
  assert.equal((await ringNotification).roomId, 'voice');
  const joinedNotice = waitForEvent(aliceSocket, 'voice:participant-joined');
  const bobVoice = await emitAck(bobSocket, 'voice:join', 'voice');
  assert.equal(bobVoice.participants[0].user.name, 'Alice Real');
  assert.equal((await joinedNotice).user.name, 'Bob Real');
  const voiceSignal = waitForEvent(bobSocket, 'voice:signal');
  await emitAck(aliceSocket, 'voice:signal', { to: bobSocket.id, signal: { description: { type: 'offer', sdp: 'test-sdp' } } });
  assert.equal((await voiceSignal).from, aliceSocket.id);
  await emitAck(aliceSocket, 'voice:leave');

  await Promise.all([emitAck(aliceSocket, 'dm:join', bob.id), emitAck(bobSocket, 'dm:join', alice.id)]);
  const dmDelivery = waitForEvent(bobSocket, 'dm:message');
  const directMessage = await emitAck(aliceSocket, 'dm:send', { peerId: bob.id, text: 'A private hello.' });
  assert.equal((await dmDelivery).id, directMessage.message.id);
  assert.equal(directMessage.message.user.name, 'Alice Real');
  const gifDelivery = waitForEvent(bobSocket, 'dm:message', (message) => Boolean(message.gifUrl));
  const gifMessage = await emitAck(aliceSocket, 'dm:send', { peerId: bob.id, text: '', gifId: 'yay' });
  assert.equal((await gifDelivery).id, gifMessage.message.id);
  assert.equal(gifMessage.message.gifUrl, '/gifs/Approved/yay.gif');

  const savedHistory = await fetch(`${url}/api/messages?room=general`, { headers: { Cookie: alice.cookie } });
  const messages = (await savedHistory.json()).messages.filter((message) => message.user?.role !== 'system');
  assert.equal(messages.length, 4);
  assert.deepEqual(messages[0].reactions['👋'], [bob.id]);
  assert.equal(messages[1].replyTo, messages[0].id);
  const linkHistory = await fetch(`${url}/api/messages?room=links`, { headers: { Cookie: alice.cookie } });
  assert.equal((await linkHistory.json()).messages[0].text, 'A useful page: https://example.test/guide');
  const bobOffline = waitForEvent(aliceSocket, 'presence:update');
  bobSocket.disconnect();
  assert.ok(!(await bobOffline).includes(bob.id));
});

test('image uploads fail closed without a moderation service', { timeout: 15000 }, async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'chatroom-image-policy-'));
  const probe = http.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  const url = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'development', CHATROOM_GATEWAY_TOKEN: '', CHATROOM_IMAGE_MODERATION_URL: '', CHATROOM_DATA_PATH: path.join(directory, 'database.json'), SESSION_SECRET: 'test-image-policy-secret' },
    stdio: 'ignore'
  });
  t.after(async () => {
    server.kill('SIGTERM');
    await once(server, 'exit').catch(() => {});
    await fs.rm(directory, { recursive: true, force: true });
  });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(`${url}/api/me`)).ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(ready, true);
  const signup = await fetch(`${url}/api/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Image Test', email: 'image@example.test', password: 'a-long-image-test-password' })
  });
  const cookie = signup.headers.getSetCookie()[0].split(';')[0];
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(20)]);
  const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(20)]);
  const attachment = await fetch(`${url}/api/attachments`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'image/png' }, body: png });
  const avatar = await fetch(`${url}/api/avatar`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'image/png' }, body: png });
  const gifAvatar = await fetch(`${url}/api/avatar`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'image/gif' }, body: gif });
  assert.equal(attachment.status, 503);
  assert.equal(avatar.status, 200);
  assert.equal(gifAvatar.status, 200);
});

test('production requires the trusted school gateway', { timeout: 15000 }, async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'chatroom-gateway-policy-'));
  const probe = http.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  const url = `http://127.0.0.1:${port}`;
  const gatewayKey = 'test-gateway-secret';
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production', CHATROOM_GATEWAY_TOKEN: gatewayKey, CHATROOM_DATA_PATH: path.join(directory, 'database.json'), SESSION_SECRET: 'test-gateway-session-secret' },
    stdio: 'ignore'
  });
  t.after(async () => {
    server.kill('SIGTERM');
    await once(server, 'exit').catch(() => {});
    await fs.rm(directory, { recursive: true, force: true });
  });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(`${url}/api/me`)).status === 403) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(ready, true);
  assert.equal((await fetch(`${url}/api/me`)).status, 403);
  assert.equal((await fetch(`${url}/api/me`, { headers: { 'X-Chatroom-Gateway-Key': gatewayKey } })).status, 200);
});