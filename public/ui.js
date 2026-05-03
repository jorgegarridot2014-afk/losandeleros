let user = null;
let juegosSeleccionados = [];

/* JUEGOS */
function toggleJuego(el) {

  let nombre = el.innerText;

  if (juegosSeleccionados.includes(nombre)) {
    juegosSeleccionados = juegosSeleccionados.filter(j => j !== nombre);
    el.classList.remove("activo");
  } else {
    juegosSeleccionados.push(nombre);
    el.classList.add("activo");
  }
}

/* LOGIN */
function login() {

  let apodo = document.getElementById("apodo").value.trim();
  let ide = document.getElementById("ide").value.trim();

  fetch("/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ apodo, ide, juegos: juegosSeleccionados })
  })
  .then(res => res.json())
  .then(data => {

    if (data.error) return alert(data.error);

    user = data;

    document.getElementById("loginPanel").style.display = "none";
    document.getElementById("menu").style.display = "block";

    alert("Tu IDE: " + user.ide);

    actualizarUI();
    aplicarModo();

    fetch("/bonus", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ apodo: user.apodo, ide: user.ide })
    })
    .then(res => res.json())
    .then(u => {
      user = u;
      actualizarUI();
    });
  });
}

/* UI (ACOINS ARRIBA DERECHA) */
function actualizarUI() {
  document.getElementById("coins").innerText = "🪙 " + user.coins;
  document.getElementById("perfilBar").innerText = "👤 " + user.apodo;
}

/* EVENTOS PRO (TUS EVENTOS EXACTOS) */
function pagina() {

  document.getElementById("pantalla").innerHTML = `

<h1 style="text-align:center;">🏆 EVENTOS</h1>

<div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding:20px;">

<div class="evento">
<pre>

════════════════════════════
🏆 LIGA MENSUAL – ANDEROS 🏆
════════════════════════════
Compite en:
Brawl Stars / Clash of Clans / Clash Royale
Gana 🪙 ANDECOINS y sube en el ranking 🔥
¡Cada evento cuenta!

════════════════════════════
🟣 BRAWL STARS
════════════════════════════
📊 PARTIDAS GANADAS
🗓️ 3–13 MAYO
Gana quien más partidas gane y publique
🥇 1º → 15 🪙
🥈 2º → 12 🪙
🥉 3º → 9 🪙
🎮 Participar → +4 🪙

────────────────────────────
⚽ 1v1 BALÓN BRAWL
🗓️ 15 MAYO
🥇 1º → 18 🪙
🥈 2º → 14 🪙
🎮 Participar → +6 🪙

════════════════════════════
🟡 CLASH OF CLANS
════════════════════════════
💪 SUPER LUCHADOR
🗓️ 6–9 MAYO
Haz +90% a mi aldea
🥇 1º → 15 🪙
🥈 2º → 12 🪙
🥉 3º → 9 🪙
🎮 Participar → +4 🪙

────────────────────────────
⚔️ 1v1
🗓️ 6 JUNIO
🥇 1º → 18 🪙
🥈 2º → 14 🪙
🎮 Participar → +6 🪙

════════════════════════════
🔵 CLASH ROYALE
════════════════════════════
🃏 1v1
🗓️ 15 MAYO
🥇 1º → 15 🪙
🥈 2º → 12 🪙
🎮 Participar → +5 🪙

════════════════════════════
🏆 PREMIOS FINALES DEL MES
════════════════════════════
🥇 1º PUESTO
🍬 Bolsa de chuches GRANDE
👑 Campeón del club

🥈 2º PUESTO
📜 Diploma

🥉 3º PUESTO
🖼️ Póster

════════════════════════════
🔥 ¿SERÁS EL CAMPEÓN DEL MES? 👑
════════════════════════════

</pre>
</div>

</div>
`;
}

/* PERFIL */
function perfil() {

  document.getElementById("pantalla").innerHTML = `
<h1 style="text-align:center;">👤 PERFIL</h1>

<div style="text-align:center;">

<p>Apodo: ${user.apodo}</p>
<p>IDE: ${user.ide}</p>
<p>Monedas: 🪙 ${user.coins}</p>
<p>Juegos: ${user.juegos.join(", ")}</p>

<input id="nuevoApodo" placeholder="Nuevo apodo">

<br><br>

<button onclick="cambiarApodo()">Cambiar apodo</button>
<button onclick="cambiarModo()">Modo oscuro/claro</button>
<button onclick="copiarIDE()">Copiar IDE</button>

</div>
`;
}

/* CAMBIAR APODO */
function cambiarApodo() {

  let nuevo = document.getElementById("nuevoApodo").value;

  fetch("/cambiarApodo", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ ide: user.ide, nuevo })
  })
  .then(res => res.json())
  .then(u => {
    user = u;
    actualizarUI();
    perfil();
  });
}

/* MODO */
function cambiarModo() {

  fetch("/modo", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ ide: user.ide })
  })
  .then(res => res.json())
  .then(u => {
    user = u;
    aplicarModo();
  });
}

function aplicarModo() {
  document.body.style.background =
    user.modo === "claro" ? "#f5f5f5" : "#000";

  document.body.style.color =
    user.modo === "claro" ? "black" : "white";
}

/* COPIAR IDE */
function copiarIDE() {
  navigator.clipboard.writeText(user.ide);
  alert("IDE copiado");
}