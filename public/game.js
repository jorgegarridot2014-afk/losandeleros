let socket;
let players = {};
let bullets = [];

let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");

let keys = {};

function initGame(name) {

  socket = io();
  socket.emit("login", name);

  document.onkeydown = e => keys[e.key] = true;
  document.onkeyup = e => keys[e.key] = false;

  canvas.onclick = e => shoot(e.clientX, e.clientY);

  setInterval(() => {
    let dx = 0, dy = 0;

    if (keys["w"]) dy -= 1;
    if (keys["s"]) dy += 1;
    if (keys["a"]) dx -= 1;
    if (keys["d"]) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      const speed = 3;
      dx = (dx / length) * speed;
      dy = (dy / length) * speed;
    }

    socket.emit("move", { x: dx, y: dy });
  }, 30);

  socket.on("state", data => {
    players = data.players;
    bullets = data.bullets;
    draw();
  });
}

function shoot(x, y) {

  let rect = canvas.getBoundingClientRect();
  let mx = x - rect.left;
  let my = y - rect.top;

  let p = players[socket.id];
  if (!p) return;

  let dx = mx - p.x;
  let dy = my - p.y;

  let len = Math.sqrt(dx * dx + dy * dy);

  socket.emit("shoot", {
    x: dx / len,
    y: dy / len
  });
}

function draw() {

  ctx.clearRect(0, 0, 800, 500);

  // agua
  ctx.fillStyle = "blue";
  ctx.globalAlpha = 0.4 + Math.sin(Date.now()/200)/10;
  ctx.fillRect(500, 100, 200, 200);
  ctx.globalAlpha = 1;

  // muro
  ctx.fillStyle = "green";
  ctx.fillRect(100, 100, 200, 50);

  // jugadores
  Object.entries(players).forEach(([id, p]) => {
    ctx.fillStyle = id === socket.id ? "cyan" : "red";
    ctx.fillRect(p.x, p.y, 20, 20);

    ctx.fillStyle = "white";
    ctx.fillText(p.name, p.x, p.y - 15);
    ctx.fillText("❤️ " + p.hp, p.x, p.y - 5);
    ctx.fillText("🔫 " + p.ammo, p.x, p.y + 30);
    ctx.fillText("🪙 " + p.coins, p.x, p.y + 45);
  });

  // balas
  ctx.fillStyle = "yellow";
  bullets.forEach(b => {
    ctx.fillRect(b.x, b.y, 5, 5);
  });
}