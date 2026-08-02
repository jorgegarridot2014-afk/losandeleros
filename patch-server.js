const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const start = s.indexOf('function lobbyNotify() {');
const afterClose = s.indexOf('s.emit("match-found", { room });\n  }\n  setTimeout(() => {', start);
const end = s.indexOf('\n};', afterClose) + 3;

console.log('start', start, 'end', end, 'len', end - start);

const oldBlock = s.slice(start, end);
console.log('has old:', oldBlock.includes('function lobbyNotify()'));

const newBlock = `function lobbyNotify() {
  if (!lobby) return;
  for (const id of lobby.sockets) {
    const sock = io.sockets.sockets.get(id);
    if (sock) sock.emit("lobby-update", { count: lobby.sockets.size });
  }
}

function joinLobby(socket, suggestedRoom) {
  if (!lobby) {
    lobby = {
      room: (suggestedRoom || "ANDE_" + Math.random().toString(36).substring(2, 8).toUpperCase()),
      sockets: new Set()
    };
  }
  lobby.sockets.add(socket.id);
  lobbyNotify();
  if (lobby.sockets.size >= 4) closeLobby(true);
}

function leaveLobby(socket) {
  if (!lobby) return;
  lobby.sockets.delete(socket.id);
  if (lobby.sockets.size === 0) lobby = null;
}

function closeLobby(force) {
  if (!lobby) return;
  if (!force && lobby.sockets.size < 1) { lobby = null; return; }
  const room = lobby.room;
  const ids = [...lobby.sockets];
  lobby = null;
  shooterRoomMeta[room] = { started: true };
  if (!shooterRooms[room]) shooterRooms[room] = new Map();
  let delivered = 0;
  for (const id of ids) {
    const sock = io.sockets.sockets.get(id);
    if (!sock) continue;
    sock.join(room);
    sock.emit("match-found", { room });
    delivered++;
  }
  console.log("[LOBBY] close room=" + room + " delivered=" + delivered + " of " + ids.length);
}`;

s = s.slice(0, start) + newBlock + s.slice(end);
fs.writeFileSync('server.js', s);
console.log('OK patched server.js');
