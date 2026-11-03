let user = null;
let pendingUser = null;
let modo = localStorage.getItem("modo") || "oscuro";
const API_BASE = "";
const LOCAL_ACCOUNT_KEY = "andeleros_account_";
const LAST_ACTIVE_KEY = "andeleros_last_active";
const PALABRAS_PROHIBIDAS = ["tonto", "feo", "malo", "joder", "idiota"];
const socket = typeof io !== "undefined" ? io() : null;
if (socket) {
  socket.on("admin-broadcast", (data) => {
    document.getElementById("notiText").innerText = data.user + ": " + data.message;
    hideAll();
    show("overlayNoti");
  });
  socket.on("go-hacker", () => { window.location.href = "/hacker.html"; });
  socket.on("mantenimiento", (data) => {
    const activo = data.activo;
    localStorage.setItem("andeleros_mantenimiento", activo ? "1" : "0");
    handleMantenimientoState(activo);
  });
  socket.on("ia-restringida", (data) => {
    localStorage.setItem("andeleros_ia_restringida", data.activa ? "1" : "0");
    iaRestringidaLocal = data.activa;
  });
   socket.on("imagenes", (data) => {
    localStorage.setItem("andeleros_imagenes", data.desactivadas ? "1" : "0");
  });
   socket.on("puntos-actualizados", (data) => {
     if (user && data.points !== undefined) {
       user.points = data.points;
       user.baneada = false;
       user.bloqueada = false;
       localStorage.removeItem("andeleros_baneada");
       hideBaneadaBanner();
       showPopup("🎉 <b>+40% puntos</b><br>Nuevos puntos: " + data.points + " ⭐");
       saveCurrentUserLocalData();
     }
   });
   socket.on("cuenta-baneada", (data) => {
    if (user) user.baneada = data.baneada;
    if (data.baneada) {
      localStorage.setItem("andeleros_baneada", "1");
      showBaneadaBanner();
    } else {
      localStorage.removeItem("andeleros_baneada");
      hideBaneadaBanner();
    }
  });
}

function handleMantenimientoState(activo) {
  const path = window.location.pathname;
  const isIndex = path === "/" || path === "/index.html";
  const isAdmin = path === "/admin.html";
  if (activo) {
    if (isIndex) {
      const overlay = document.getElementById("mantenimientoOverlay");
      if (overlay) { overlay.style.display = "flex"; document.body.style.overflow = "hidden"; }
    } else if (!isAdmin) {
      window.location.href = "/index.html";
    }
  } else {
    if (isIndex) {
      const overlay = document.getElementById("mantenimientoOverlay");
      if (overlay) { overlay.style.display = "none"; document.body.style.overflow = ""; }
    }
  }
}

function showBaneadaBanner(){
  const banner = document.getElementById("baneadaBanner");
  if (banner) { banner.style.display = "flex"; document.body.style.overflow = "hidden"; }
}
function hideBaneadaBanner(){
  const banner = document.getElementById("baneadaBanner");
  if (banner) { banner.style.display = "none"; document.body.style.overflow = ""; }
}

const mantenimientoLS = localStorage.getItem("andeleros_mantenimiento");
if (mantenimientoLS === "1") {
  handleMantenimientoState(true);
}
if (localStorage.getItem("andeleros_baneada") === "1") {
  showBaneadaBanner();
}

let iaRestringidaLocal = localStorage.getItem("andeleros_ia_restringida") === "1";

function esMalsonante(texto) {
  const low = texto.toLowerCase();
  return PALABRAS_PROHIBIDAS.some(p => low.includes(p));
}
function limpiarCuentasLocales() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LOCAL_ACCOUNT_KEY)) localStorage.removeItem(key);
  }
}
function getLocalAccountData(ide){
  const raw = localStorage.getItem(LOCAL_ACCOUNT_KEY + ide);
  if(!raw) return {};
  try { return JSON.parse(raw); } catch(e){ return {}; }
}
function saveLocalAccountData(ide, data){
  const existing = getLocalAccountData(ide);
  localStorage.setItem(LOCAL_ACCOUNT_KEY + ide, JSON.stringify({ ...existing, ...data }));
}
function normalizeFoto(src){
  if(!src || typeof src !== "string") return "pfp/p1.svg";
  if(src.includes("http://") || src.includes("https://")) {
    const url = new URL(src);
    src = url.pathname;
    if(src.startsWith("/")) src = src.substring(1);
  }
  if(src.endsWith(".png") && src !== "pfp/p7.png"){ return src.replace(/\.png$/, ".svg"); }
  return src;
}
function mergeLocalAccountData(account){
  if(!account || !account.ide) return account;
  const local = getLocalAccountData(account.ide);
  let foto = normalizeFoto(local.foto || account.foto || "pfp/p1.svg");
  if (foto.includes("p7.svg")) foto = foto.replace("p7.svg", "p7.png");
  if (foto.includes("localhost:3000/")) foto = foto.replace("http://localhost:3000/", "");
  const compraFields = ["voxelcraftPurchased","andelerosPlus","gonjorPlus","englishQuizPurchased","historyQuizPurchased","geographyQuizPurchased","genialQuizPurchased"];
  const merged = { ...account, ...local };
  compraFields.forEach(field => {
    if (account[field] === true) merged[field] = true;
    else if (local[field] === true) merged[field] = true;
    else merged[field] = false;
  });
  return { ...merged, foto, points: account.points || 0, bloqueada: account.bloqueada || false, baneada: account.baneada || false, aceptado: local.aceptado === true || account.aceptado === true, noMostrar: local.noMostrar === true || account.noMostrar === true, lastDailyClaim: local.lastDailyClaim || account.lastDailyClaim || null };
}
function saveCurrentUserLocalData(){
  if(!user || !user.ide) return;
  localStorage.setItem(LAST_ACTIVE_KEY, user.ide);
  saveLocalAccountData(user.ide, { ide: user.ide, apodo: user.apodo, foto: normalizeFoto(user.foto), aceptado: user.aceptado === true, noMostrar: user.noMostrar === true, voxelcraftPurchased: user.voxelcraftPurchased === true, andelerosPlus: user.andelerosPlus === true, gonjorPlus: user.gonjorPlus === true, lastDailyClaim: user.lastDailyClaim || null });
}
function getPrecioFinal(base){
  if (user && user.gonjorPlus) return 0;
  if (user && user.andelerosPlus) return Math.round(base * 0.9);
  return base;
}
function reclamarPuntosDiarios(){
  if (!user || !user.ide) return;
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;
  const lastClaimStr = lastClaim ? `${lastClaim.getFullYear()}-${String(lastClaim.getMonth()+1).padStart(2,'0')}-${String(lastClaim.getDate()).padStart(2,'0')}` : null;
  if (lastClaimStr === hoyStr) return;
  if (!user.andelerosPlus && !user.gonjorPlus) return;
  let puntosGanados = 500;
  if (user.andelerosPlus || user.gonjorPlus) puntosGanados = 1000;
  user.points = (user.points || 0) + puntosGanados;
  user.lastDailyClaim = hoy.toISOString();
  showPopup(`✅ Puntos diarios: +${puntosGanados} ⭐\nSaldo actual: ${user.points} ⭐`);
  saveCurrentUserLocalData();
  fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points: user.points, lastDailyClaim: user.lastDailyClaim })
  }).then(res => { if (res.ok) return res.json(); }).then(data => { if (data && data.points) user.points = data.points; }).catch(err => console.error("Error reclamando puntos diarios:", err));
}
let audio = null;
let musicaActiva = false;
const playlist = [
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"
];
window.addEventListener("DOMContentLoaded", async () => {
  audio = document.getElementById("musica");
  const lastIde = localStorage.getItem(LAST_ACTIVE_KEY);
  const cookiesOk = localStorage.getItem('cookies_aceptadas') === 'true';
  if (cookiesOk && !user && lastIde) { await loginSavedAccount(lastIde, true); if (user) { startSplash(); return; } }
  go();
  startSplash();
});
function startSplash(){
  const splash = document.getElementById("splashOverlay");
  if (!splash) return;
  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => { splash.style.display = "none"; }, 1000);
  }, 2000);
}
function hideAll(){ [ "menu","crear","login","setup","privacidad", "panel","perfil","juegosGrid","overlayNoti","menuJugar","overlayMusica","overlayVoxelcraft","overlayModo","overlayRanking","popup" ].forEach(id=>{ document.getElementById(id)?.classList.add("hidden"); }); }
function show(id){ document.getElementById(id)?.classList.remove("hidden"); }
function updateBar(){
  const logged = user && user.ide && user.aceptado;
  const btnModo = document.getElementById("btnModo");
  const btnMusica = document.getElementById("btnMusica");
  const btnJugar = document.getElementById("btnJugar");
  const btnPerfil = document.getElementById("btnPerfil");
  const btnNoti = document.getElementById("btnNoti");
  const btnDiscord = document.getElementById("btnDiscord");
  const btnTienda = document.getElementById("btnTienda");
  const btnRanking = document.getElementById("btnRanking");
  const btnAmigos = document.getElementById("btnAmigos");
  const btnIA = document.getElementById("btnIA");
  if(btnModo) btnModo.style.display = "inline-block";
  if(btnMusica) btnMusica.style.display = "inline-block";
  if(btnJugar) btnJugar.style.display = logged ? "inline-block":"none";
  if(btnPerfil) btnPerfil.style.display = logged ? "inline-block":"none";
  if(btnNoti) btnNoti.style.display = logged ? "inline-block":"none";
  if(btnDiscord) btnDiscord.style.display = logged ? "inline-block":"none";
  if(btnTienda) btnTienda.style.display = logged ? "inline-block":"none";
  if(btnRanking) btnRanking.style.display = logged ? "inline-block":"none";
  if(btnAmigos) btnAmigos.style.display = logged ? "inline-block":"none";
  if(btnIA) btnIA.style.display = logged ? "inline-block":"none";
  const banner = document.getElementById("negativoBanner");
  if(banner){ banner.style.display = (user && user.bloqueada) ? "flex" : "none"; }
}
function go(){
  document.body.className = modo;
  hideAll();
  updateBar();
  renderCuentas();
  const estado = document.getElementById("estado");
  if(!user || !user.ide){ if(estado) estado.innerText = "No logueado"; show("menu"); return; }
  user = mergeLocalAccountData(user);
  if (user.aceptado) { saveCurrentUserLocalData(); }
  if(estado) estado.innerText = "Logueado como " + user.apodo + " (" + user.ide + ")";
  abrirPanel();
  reclamarPuntosDiarios();
}
  async function crearCuenta(){
  const apodo = document.getElementById("apodo").value.trim();
  if(!apodo) return alert("Escribe apodo");
  if(esMalsonante(apodo)){ return alert("El apodo contiene palabras no permitidas"); }
  try {
    user = { apodo: apodo, foto: "pfp/p1.svg", aceptado: false };
    user._isNew = true;
    updateBar();
    abrirSetup();
  } catch(err) { console.error("Fallo en crearCuenta:", err); alert("No se pudo conectar con el servidor."); }
}
function abrirSetup(){
  if(!user) return;
  hideAll();
  show("setup");
  document.getElementById("setupApodo").innerText = user.apodo;
  document.getElementById("setupId").innerText = user.ide || "Se generará al aceptar";
  document.getElementById("setupFoto").src = normalizeFoto(user.foto);
  const contenedor = document.querySelector("#setup .fotos");
  if(contenedor){ contenedor.innerHTML = ""; for(let i=1; i<=6; i++){ const img = document.createElement("img"); img.src = `pfp/p${i}.svg`; img.onclick = () => elegirFoto(img.src); contenedor.appendChild(img); } }
}
function elegirFoto(src){
  if(user) user.foto = normalizeFoto(src);
  document.getElementById("setupFoto").src = normalizeFoto(src);
  setTimeout(() => abrirPrivacidad(), 350);
}
function confirmarSetup(){ abrirPrivacidad(); }
function abrirPrivacidad(){ if(!user) return go(); hideAll(); show("privacidad"); }
async function aceptarPrivacidad(){
  if(!user) return go();
  try {
    let res;
    if (user._isNew) {
      res = await fetch(`${API_BASE}/crear`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apodo: user.apodo, foto: user.foto, aceptado: true, noMostrar: true }) });
    } else {
      res = await fetch(`${API_BASE}/aceptar/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foto: user.foto, noMostrar: true }) });
    }
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Error en el servidor al crear cuenta");
    delete user._isNew;
    user = data;
    saveCurrentUserLocalData();
    if (socket && socket.connected) socket.emit("auth-user", user.ide);
    go();
    reclamarPuntosDiarios();
  } catch(err){ console.error("Error en aceptación:", err); alert("Fallo al confirmar la cuenta: " + err.message); go(); }
}
function rechazarPrivacidad(){ alert("Debes aceptar la política de privacidad para crear una cuenta."); }
async function loginCuenta(){
  const ide = document.getElementById("ide").value.trim();
  if(!ide) return alert("Escribe ID");
  try {
    const res = await fetch(`${API_BASE}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ide }) });
    const data = await res.json();
    if(!res.ok){ return alert(data.error || "No existe esta cuenta"); }
    user = mergeLocalAccountData(data);
    user._isNew = false;
    if (user.baneada) {
      saveCurrentUserLocalData();
      localStorage.setItem("andeleros_baneada", "1");
      showBaneadaBanner();
      return;
    } else {
      localStorage.removeItem("andeleros_baneada");
      hideBaneadaBanner();
    }
    if (user.aceptado) { 
      saveCurrentUserLocalData();
      if (socket && socket.connected) socket.emit("auth-user", user.ide); 
      go(); 
      localStorage.removeItem('cookies_aceptadas');
      const co = document.getElementById('cookiesOverlay');
      if (co) co.style.display = 'flex';
      reclamarPuntosDiarios();
    } else { abrirSetup(); }
  } catch(err){ console.error(err); alert("Error en login"); }
}
function renderCuentas(){
  const div = document.getElementById("listaCuentas");
  if(!div) return;
  div.innerHTML = "";
  const cuentas = [];
  Object.keys(localStorage).forEach(key => {
    if(key && key.startsWith(LOCAL_ACCOUNT_KEY)){
      try { const acc = JSON.parse(localStorage.getItem(key)); if (acc && acc.aceptado) { if (!acc.ide) acc.ide = key.replace(LOCAL_ACCOUNT_KEY, ""); cuentas.push(acc); } } catch(err){ console.error("Error en cuenta:", key); }
    }
  });
  if(cuentas.length === 0) { div.innerHTML = "<p style='opacity:0.5; font-size:12px;'>No hay cuentas en este dispositivo</p>"; return; }
  div.innerHTML = "<p style='font-size:11px; opacity:0.6; margin-bottom:8px;'>Tus sesiones activas:</p>";
  cuentas.forEach(account=>{
    const row = document.createElement("div");
    row.className = "saved-account-card";
    row.setAttribute("style", "background:rgba(255,255,255,0.1); padding:10px; border-radius:10px; width:90%; cursor:pointer; display:flex; align-items:center; gap:12px; border:1px solid #555; transition: 0.2s;");
    row.onmouseenter = () => row.style.background = "rgba(255,255,255,0.2)";
    row.onmouseleave = () => row.style.background = "rgba(255,255,255,0.1)";
    const img = document.createElement("img"); img.src = normalizeFoto(account.foto); img.width = 40; img.height = 40; img.style.borderRadius = "50%"; img.style.border = "2px solid var(--color-primario, #ccc)";
    const info = document.createElement("div"); info.innerHTML = `<div style="font-weight:bold; font-size:14px;">${account.apodo}</div><div style="font-size:10px; opacity:0.6;">Toca para entrar</div>`;
    const btnOlvidar = document.createElement("div"); btnOlvidar.innerHTML = "&times;"; btnOlvidar.setAttribute("style", "margin-left:auto; font-size:20px; opacity:0.3; padding:5px; cursor:pointer;");
    btnOlvidar.onclick = (e) => { e.stopPropagation(); if(confirm(`¿Quitar a ${account.apodo} de este dispositivo?`)) { localStorage.removeItem(LOCAL_ACCOUNT_KEY + account.ide); if (localStorage.getItem(LAST_ACTIVE_KEY) === account.ide) localStorage.removeItem(LAST_ACTIVE_KEY); renderCuentas(); } };
    row.onclick = ()=>{ loginSavedAccount(account.ide); };
    row.appendChild(img); row.appendChild(info); row.appendChild(btnOlvidar); div.appendChild(row);
  });
}
function abrirPanel(){ hideAll(); show("panel"); show("juegosGrid"); document.getElementById("pApodo").innerText = user.apodo; }
function verPerfil(){
  hideAll(); show("perfil"); show("juegosGrid");
  document.getElementById("pfApodo").innerText = user.apodo; document.getElementById("pfId").innerText = user.ide;
  console.log("verPerfil - user.foto:", user.foto, "gonjorPlus:", user.gonjorPlus);
  if (user.gonjorPlus && user.foto && user.foto.includes("p7.svg")) {
    user.foto = user.foto.replace("p7.svg", "p7.png").replace("http://localhost:3000/", "");
  }
  const contenedorFotos = document.querySelector("#perfil .fotos");
  if(contenedorFotos){ 
    contenedorFotos.innerHTML = ""; 
    const total = user.gonjorPlus ? 7 : 6;
    for(let i=1; i<=total; i++){ 
      const ext = (i === 7) ? ".png" : ".svg";
      const img = document.createElement("img"); 
      img.src = `pfp/p${i}${ext}`; 
      img.onclick = () => { console.log("Clic en miniatura:", img.src); setFoto(img.src); }; 
      contenedorFotos.appendChild(img); 
    } 
    marcarFotoSeleccionada();
  }
  actualizarFoto();
  const pjEl = document.getElementById("pfPersonaje");
  if (pjEl) {
    if (user.personaje && user.personaje.nombre) {
      pjEl.innerHTML = `🎮 Personaje: <b>${user.personaje.nombre}</b> <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${user.personaje.color};vertical-align:middle;border:2px solid #fff;"></span>`;
      pjEl.style.display = "block";
    } else {
      pjEl.style.display = "none";
    }
  }
  const btnAndeleros = document.getElementById("btnComprarAndelerosPlus");
  const statusAndeleros = document.getElementById("andelerosPlusStatus");
  if (btnAndeleros) btnAndeleros.style.display = user.andelerosPlus ? "none" : "inline-block";
  if (statusAndeleros) { statusAndeleros.style.display = user.andelerosPlus ? "block" : "none"; statusAndeleros.innerHTML = `<span style="color: #00ff99;">✅ Activado en tu cuenta</span>`; }
  const circle = document.getElementById('cookiesCircle');
  if (circle) circle.style.background = localStorage.getItem('cookies_aceptadas') === 'true' ? '#00ffcc' : '#ef4444';
  const statusGonjor = document.getElementById("gonjorPlusStatus");
  if (btnGonjor) btnGonjor.style.display = user.gonjorPlus ? "none" : "inline-block";
  if (statusGonjor) { statusGonjor.style.display = user.gonjorPlus ? "block" : "none"; statusGonjor.innerHTML = `<span style="color: #00ff99;">✅ Activado en tu cuenta</span>`; }
}
function actualizarFoto(){ 
  const img = document.getElementById("fotoPerfil"); 
  if(img){ 
    const src = normalizeFoto(user.foto || "pfp/p1.svg") + "?t=" + Date.now(); 
    console.log("actualizarFoto src:", src); 
    img.src = src; 
  } 
}
async function setFoto(src){
  console.log("setFoto llamado con:", src);
  if(!user || !user.ide) return;
  const fotoNormalizada = normalizeFoto(src);
  console.log("setFoto fotoNormalizada:", fotoNormalizada, "guardando en:", user.ide);
  try { 
    const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foto: fotoNormalizada }) }); 
    console.log("setFoto respuesta:", res.status);
    user.foto = fotoNormalizada; 
    saveCurrentUserLocalData(); 
    actualizarFoto(); 
    marcarFotoSeleccionada();
  } catch(err) { console.error("Error al guardar foto:", err); }
}
function marcarFotoSeleccionada(){
  const contenedor = document.querySelector("#perfil .fotos");
  if(!contenedor || !user.foto) return;
  const fotos = contenedor.querySelectorAll("img");
  const fotoActual = normalizeFoto(user.foto);
  fotos.forEach(img => {
    const srcImg = normalizeFoto(img.src);
    if(srcImg === fotoActual) {
      img.style.border = "3px solid #00ffcc";
      img.style.borderRadius = "50%";
    } else {
      img.style.border = "none";
    }
  });
}
async function loginSavedAccount(ide, silent = false) {
  if(!ide) return;
  try {
    const res = await fetch(`${API_BASE}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ide }) });
    const data = await res.json();
    if (!res.ok) { localStorage.removeItem(LOCAL_ACCOUNT_KEY + ide); if (localStorage.getItem(LAST_ACTIVE_KEY) === ide) localStorage.removeItem(LAST_ACTIVE_KEY); if (!silent) alert(data.error || "Esta cuenta ya no existe en el servidor"); renderCuentas(); return; }
    user = mergeLocalAccountData(data); saveCurrentUserLocalData();
    if (user.baneada) {
      localStorage.setItem("andeleros_baneada", "1");
      showBaneadaBanner();
      return;
    } else {
      localStorage.removeItem("andeleros_baneada");
      hideBaneadaBanner();
    }
    if (socket && socket.connected) socket.emit("auth-user", user.ide); 
    go();
    reclamarPuntosDiarios();
  } catch (err) { console.error("Error en login automático:", err); alert("Error de conexión con el servidor"); }
}
function logout(){ localStorage.removeItem(LAST_ACTIVE_KEY); localStorage.removeItem('cookies_aceptadas'); user = null; go(); }
function setCookies(aceptar){
  const circle = document.getElementById('cookiesCircle');
  if (aceptar) {
    localStorage.setItem('cookies_aceptadas', 'true');
    if (user && user.ide) localStorage.setItem(LAST_ACTIVE_KEY, user.ide);
    const st = document.getElementById('cookiesStatus');
    if (st) st.innerText = "Auto-login activado ✅";
    if (circle) circle.style.background = '#00ffcc';
  } else {
    localStorage.removeItem('cookies_aceptadas');
    localStorage.removeItem(LAST_ACTIVE_KEY);
    const st = document.getElementById('cookiesStatus');
    if (st) st.innerText = "Auto-login desactivado. Cerrando sesión...";
    if (circle) circle.style.background = '#ef4444';
    setTimeout(() => { logout(); }, 500);
  }
}
function irMision2() { if (!user || !user.ide) return alert("Carl Briss: '¿Quién eres? Identifícate antes de intentar acceder al núcleo.'"); if (!user.missionCarlBriss1) { return alert("Carl Briss: 'Acceso denegado. Debes completar el Protocolo de Iniciación (Misión 1) antes de acceder al nivel 2.'"); } window.location.href = `mario%20bross/2.html?ide=${encodeURIComponent(user.ide)}&apodo=${encodeURIComponent(user.apodo)}&points=${user.points || 0}&m2=${user.missionCarlBriss2 || false}`; }


function irPensamiento(){ if(checkBloqueadoRedirect()) return; window.location.href = "scratch.html"; }
function irMinijuegos(){ if(checkBloqueadoRedirect()) return; window.location.href = "mantenimiento.html"; }
function irEscape(){ if(checkBloqueadoRedirect()) return; window.location.href = "scaperoom.html"; }
function irQuiz(){ window.location.href = "/quizzes/quiz.html"; }
function irTrivialPlayers(){ if(checkBloqueadoRedirect()) return; window.location.href = "/quizzes/trivialplayers.html"; }
function irQuizIndividual(){ window.location.href = "/quizzes/quiz.html"; }
function irMisterio(){ if(checkBloqueadoRedirect()) return; if (!user || !user.ide) return alert("Carl Briss: 'Identifícate antes de entrar al Protocolo Origen.'"); window.location.href = `/mario%20bross/game.html?ide=${encodeURIComponent(user.ide)}&apodo=${encodeURIComponent(user.apodo)}&points=${user.points || 0}&m1=${user.missionCarlBriss1 || false}&m2=${user.missionCarlBriss2 || false}`; }
function irLab(){ if(checkBloqueadoRedirect()) return; window.location.href = "https://elementlab.onrender.com/"; }
function irMundo(){ if(checkBloqueadoRedirect()) return; window.location.href = "/quizzes/quizmundo.html"; }
function irEventos(){ if(checkBloqueadoRedirect()) return; window.location.href = "admin.html"; }
function irAdmin(){ if(checkBloqueadoRedirect()) return; window.location.href = "/admin.html"; }
function irAjedrez(){ if(checkBloqueadoRedirect()) return; window.location.href = "ajedrez.html"; }
function irCristales(){ if(checkBloqueadoRedirect()) return; window.location.href = "calamar.html"; }
function irConecta10(){ if(checkBloqueadoRedirect()) return; window.location.href = "conecta10.html"; }
function ir3EnRaya(){ if(checkBloqueadoRedirect()) return; if (!user || !user.ide) return alert("⚠️ Necesitas iniciar sesión antes de jugar."); window.location.href = `3.html?ide=${encodeURIComponent(user.ide)}&apodo=${encodeURIComponent(user.apodo)}&points=${user.points || 0}`; }
function abrirIA(){ const o = document.getElementById('overlayIA'); if (o) o.style.display = 'flex'; }
function irCode(){ if(checkBloqueadoRedirect()) return; if (!user || !user.ide) return alert("⚠️ Necesitas iniciar sesión."); window.location.href = `code.html?ide=${encodeURIComponent(user.ide)}&apodo=${encodeURIComponent(user.apodo)}`; }
function irVallesol(){ if(checkBloqueadoRedirect()) return; window.location.href = "/vallesol.html"; }
function irAndebrawl(){ if(checkBloqueadoRedirect()) return; window.location.href = "/andebrawl/juego.html"; }
function abrirNoti(){ hideAll(); show("overlayNoti"); document.getElementById("notiText").innerText = "No hay notificaciones"; }
function cerrarNoti(){ go(); }
function abrirEntrar(){ if(!user) return; hideAll(); show("menuJugar"); }
function cerrarEntrar(){ go(); }
function cerrarJugar(){ go(); }
function checkMision2() { if (!user) return; if (user.missionCarlBriss2) { alert("Carl Briss dice: 'Buen trabajo con el Protocolo Sombra, el sistema está estable.'"); } else if (user.missionCarlBriss1) { irMision2(); } else { alert("Carl Briss: 'Necesitas completar la Misión 1 primero.'"); } }
function toggleModo(){
  hideAll();
  show("overlayModo");
}
function mostrarCrear(){ hideAll(); show("crear"); document.getElementById("apodo").value = ""; document.getElementById("apodo").focus(); }
function mostrarLogin(){ hideAll(); show("login"); document.getElementById("ide").value = ""; document.getElementById("ide").focus(); }
function volver(){ go(); }
async function eliminarCuenta(){
  if(!user || !user.ide) return alert("No hay cuenta para eliminar");
  if(!confirm(`¿Seguro que quieres borrar a ${user.apodo}? Esta acción no se puede deshacer.`)) return;
  try {
    const idADel = user.ide;
    const res = await fetch(`${API_BASE}/delete/${encodeURIComponent(idADel)}`, { method: "DELETE" });
    if(!res.ok){ const data = await res.json(); return alert(data.error || "Error eliminando cuenta"); }
    localStorage.removeItem(LOCAL_ACCOUNT_KEY + idADel); localStorage.removeItem(LAST_ACTIVE_KEY); user = null; go();
  } catch(err) { console.error(err); alert("Error eliminando cuenta"); }
}
function shop(){
  const popup = document.getElementById("popup");
  if (popup.style.display === "flex") {
    closePopup();
    return;
  }
  const popupText = document.getElementById("popupText");
  const hasEnglish = user && user.englishQuizPurchased;
  const hasHistory = user && user.historyQuizPurchased;
  const hasGeography = user && user.geographyQuizPurchased;
  let content = `<h3 style="color: #00ffcc; margin-bottom: 15px;">🏪 TIENDA</h3>
    <div style="text-align: left; background: #111; padding: 15px; border-radius: 10px; border: 1px solid #00ffcc; margin-bottom: 15px;">`;
  if (hasEnglish) { content += `<p style="margin: 5px 0; color: #00ff99; font-size: 13px;">✅ Quiz de Inglés: Ya lo tienes</p>`; }
  else { content += `<p style="margin: 5px 0;">🇬🇧 <b>Quiz de Inglés</b></p>
    <p style="margin: 5px 0; color: #aaa; font-size: 13px;">Practica tu nivel de inglés</p>
    <p style="margin: 10px 0; color: #ffcc00;">💰 Precio: ${getPrecioFinal(500)} ⭐</p>`; }
  if (hasHistory) { content += `<p style="margin: 5px 0; color: #00ff99; font-size: 13px;">✅ Quiz de Historia: Ya lo tienes</p>`; }
  else { content += `<p style="margin: 5px 0;">📜 <b>Quiz de Historia</b></p>
    <p style="margin: 5px 0; color: #aaa; font-size: 13px;">25 preguntas sobre España</p>
    <p style="margin: 10px 0; color: #ffcc00;">💰 Precio: ${getPrecioFinal(200)} ⭐</p>`; }
  if (hasGeography) { content += `<p style="margin: 5px 0; color: #00ff99; font-size: 13px;">✅ Quiz de Geografía: Ya lo tienes</p>`; }
  else { content += `<p style="margin: 5px 0;">🌍 <b>Quiz de Geografía</b></p>
    <p style="margin: 5px 0; color: #aaa; font-size: 13px;">Preguntas por el mundo - ¡Sé el mejor explorador!</p>
    <p style="margin: 10px 0; color: #ffcc00;">💰 Precio: ${getPrecioFinal(700)} ⭐</p>`; }
  content += `<p style="margin: 5px 0; color: #00ffcc; font-size: 12px;">Tu saldo: ${user.points || 0} ⭐</p></div>`;
  content += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
  if (hasEnglish) { content += `<button onclick="closePopup(); irQuiz()" style="width: 100%; letter-spacing: 1px;">🇬🇧 Jugar Inglés</button>`; }
  else { content += `<button onclick="buyEnglishQuiz()" style="width: 100%; letter-spacing: 1px;">COMPRAR Inglés (${getPrecioFinal(500)}⭐)</button>`; }
  if (hasHistory) { content += `<button onclick="closePopup(); irQuizIndividual()" style="width: 100%; letter-spacing: 1px;">📜 Jugar Historia</button>`; }
  else { content += `<button onclick="buyHistoryQuiz()" style="width: 100%; letter-spacing: 1px;">COMPRAR Historia (${getPrecioFinal(200)}⭐)</button>`; }
  if (hasGeography) { content += `<button onclick="closePopup(); irMundo()" style="width: 100%; letter-spacing: 1px;">🌍 Jugar Geografía</button>`; }
  else { content += `<button onclick="buyGeographyQuiz()" style="width: 100%; letter-spacing: 1px;">COMPRAR Geografía (${getPrecioFinal(700)}⭐)</button>`; }
  content += `<button onclick="closePopup()" style="width: 100%; background: #222; color: #666; letter-spacing: 1px;">Cerrar</button></div>`;
  popupText.innerHTML = content;
  document.getElementById("popup").classList.remove("hidden");
  popup.style.display = "flex";
}
async function buyEnglishQuiz(){
  const precio = getPrecioFinal(500);
  if ((user.points || 0) < precio) { showPopup("❌ No tienes suficientes créditos.\nNecesitas " + precio + " ⭐.\nSaldo actual: " + (user.points || 0) + " ⭐"); setTimeout(closePopup, 2000); return; }
  user.points -= precio; user.englishQuizPurchased = true;
  showPopup("✅ Compra realizada: -" + precio + " ⭐\nRedirigiendo al Quiz de Inglés...");
  saveCurrentUserLocalData();
  try { const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: user.points, englishQuizPurchased: true }) }); if (res.ok) { const data = await res.json(); user.points = data.points; } } catch(err) { console.error("Error actualizando compra:", err); }
  setTimeout(() => { window.location.href = "/quizzes/quizenglis.html"; }, 1500);
}
async function buyHistoryQuiz(){
  const precio = getPrecioFinal(200);
  if ((user.points || 0) < precio) { showPopup("❌ No tienes suficientes créditos.\nNecesitas " + precio + " ⭐.\nSaldo actual: " + (user.points || 0) + " ⭐"); setTimeout(closePopup, 2000); return; }
  user.points -= precio; user.historyQuizPurchased = true;
  showPopup("✅ Compra realizada: -" + precio + " ⭐\nRedirigiendo al Quiz de Historia...");
  saveCurrentUserLocalData();
  try { const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: user.points, historyQuizPurchased: true }) }); if (res.ok) { const data = await res.json(); user.points = data.points; } } catch(err) { console.error("Error actualizando compra:", err); }
  setTimeout(() => { window.location.href = "/quizzes/quizhistoria.html"; }, 1500);
}
async function buyGeographyQuiz(){
  const precio = getPrecioFinal(700);
  if ((user.points || 0) < precio) { showPopup("❌ No tienes suficientes créditos.\nNecesitas " + precio + " ⭐.\nSaldo actual: " + (user.points || 0) + " ⭐"); setTimeout(closePopup, 2000); return; }
  user.points -= precio; user.geographyQuizPurchased = true;
  showPopup("✅ Compra realizada: -" + precio + " ⭐\nRedirigiendo al Quiz de Geografía...");
  saveCurrentUserLocalData();
  try { const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: user.points, geographyQuizPurchased: true }) }); if (res.ok) { const data = await res.json(); user.points = data.points; } } catch(err) { console.error("Error actualizando compra:", err); }
  setTimeout(() => { window.location.href = "/quizzes/quizmundo.html"; }, 1500);
}
async function comprarAndelerosPlus(){
  const precio = 15000;
  if ((user.points || 0) < precio) { showPopup("❌ No tienes suficientes créditos.\nNecesitas " + precio + " ⭐.\nSaldo actual: " + (user.points || 0) + " ⭐"); setTimeout(closePopup, 2000); return; }
  if (user.andelerosPlus) { showPopup("✅ Ya tienes Los Andeleros Plus"); setTimeout(closePopup, 2000); return; }
  user.points -= precio; user.andelerosPlus = true;
  showPopup("✅ Compra realizada: -" + precio + " ⭐\n¡Los Andeleros Plus activado!");
  saveCurrentUserLocalData();
  try { const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: user.points, andelerosPlus: true }) }); if (res.ok) { const data = await res.json(); user.points = data.points; } } catch(err) { console.error("Error actualizando compra:", err); }
  setTimeout(closePopup, 1500);
}
async function comprarGonjorPlus(){
  const precio = 20000;
  if ((user.points || 0) < precio) { showPopup("❌ No tienes suficientes créditos.\nNecesitas " + precio + " ⭐.\nSaldo actual: " + (user.points || 0) + " ⭐"); setTimeout(closePopup, 2000); return; }
  if (user.gonjorPlus) { showPopup("✅ Ya tienes Gonjor Plus"); setTimeout(closePopup, 2000); return; }
  user.points -= precio; user.gonjorPlus = true;
  showPopup("✅ Compra realizada: -" + precio + " ⭐\n¡Gonjor Plus activado!");
  saveCurrentUserLocalData();
  try { const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: user.points, gonjorPlus: true }) }); if (res.ok) { const data = await res.json(); user.points = data.points; } } catch(err) { console.error("Error actualizando compra:", err); }
  setTimeout(closePopup, 1500);
}
function toggleMusica(){
  const m = document.getElementById("overlayMusica");
  const o = document.getElementById("overlayModo");
  if(m){ m.classList.remove("hidden"); m.style.display = ""; }
  if(o){ o.classList.add("hidden"); o.style.display = "none"; }
}
function toggleModo(){
  const o = document.getElementById("overlayModo");
  if(o){ o.classList.remove("hidden"); o.style.display = ""; }
}
function cerrarOverlayModo(){
  const o = document.getElementById("overlayModo");
  if(o){ o.classList.add("hidden"); o.style.display = "none"; }
}
function cerrarOverlayMusica(){
  const m = document.getElementById("overlayMusica");
  if(m){ m.classList.add("hidden"); m.style.display = "none"; }
}
function irVoxelcraft(){
  if (!user || !user.ide) return alert("Debes iniciar sesión para acceder a Voxelcraft.");
  if (user.voxelcraftPurchased) {
    closePopup();
    window.location.href = "minecraft.html";
    return;
  }
  const overlay = document.getElementById("overlayVoxelcraft");
  const balance = document.getElementById("voxelcraftBalance");
  const btnPagar = document.getElementById("btnPagarVoxelcraft");
  const precioVoxelcraft = getPrecioVoxelcraft();
  const textoPrecio = document.querySelector("#overlayVoxelcraft .card p:nth-child(4)");
  if (balance) balance.textContent = `Tu saldo: ${(user.points || 0)} ⭐`;
  if (textoPrecio) textoPrecio.innerHTML = `Accede al mundo de bloques por <strong>${precioVoxelcraft} ⭐</strong>.`;
  if (btnPagar) {
    btnPagar.textContent = precioVoxelcraft === 0 ? "Obtener gratis" : `Pagar ${precioVoxelcraft} ⭐`;
    btnPagar.onclick = () => pagarVoxelcraft();
  }
  if (overlay) overlay.classList.remove("hidden");
}
function getPrecioVoxelcraft(){
  if (user.gonjorPlus) return 0;
  if (user.andelerosPlus) return 250;
  return 500;
}
function cerrarOverlayVoxelcraft(){
  document.getElementById("overlayVoxelcraft").classList.add("hidden");
}
async function pagarVoxelcraft(){
  if (!user || !user.ide) return;
  const precio = getPrecioVoxelcraft();
  if ((user.points || 0) < precio) {
    alert("❌ No tienes suficientes puntos. Necesitas " + precio + " ⭐.\nSaldo actual: " + (user.points || 0) + " ⭐");
    return;
  }
  user.points -= precio;
  user.voxelcraftPurchased = true;
  saveCurrentUserLocalData();
  showPopup("✅ Compra realizada: -" + precio + " ⭐\n¡Acceso a Voxelcraft desbloqueado!");
  try {
    const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: user.points, voxelcraftPurchased: true })
    });
    if (res.ok) { const data = await res.json(); user.points = data.points; }
  } catch(err) { console.error("Error actualizando compra:", err); }
  document.getElementById("overlayVoxelcraft").classList.add("hidden");
  setTimeout(() => { window.location.href = "minecraft.html"; }, 1500);
}
function jugarVoxelcraft(){
  if (!user || !user.voxelcraftPurchased) return;
  closePopup();
  window.location.href = "minecraft.html";
}
function irAeronautica(){
  document.getElementById("overlayVoxelcraft").classList.remove("hidden");
}
function irTower(){
  if (!user || !user.ide) return alert("Debes iniciar sesión para acceder a esta sala.");
  window.location.href = "tower.html";
}
document.addEventListener("DOMContentLoaded", () => {
  const audio = document.getElementById("musica");
  if(audio){
    const playOnce = () => {
      audio.volume = 0.35;
      audio.play().catch(() => {});
      document.removeEventListener("click", playOnce);
      document.removeEventListener("touchstart", playOnce);
      document.removeEventListener("keydown", playOnce);
    };
    document.addEventListener("click", playOnce);
    document.addEventListener("touchstart", playOnce);
    document.addEventListener("keydown", playOnce);
  }
});
function closePopup(){ document.getElementById("popup").classList.add("hidden"); }

/* ================= RANKING ================= */
async function abrirRanking(){
  try {
    const res = await fetch("/ranking");
    if(!res.ok) throw new Error("Error ranking");
    const top = await res.json();
    const list = document.getElementById("rankingList");
    list.innerHTML = "";
    if(top.length === 0){
      list.innerHTML = "<p>No hay jugadores todavía.</p>";
    } else {
      top.forEach((u, i) => {
        const div = document.createElement("div");
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);";
        div.innerHTML = `<div><span style="color: #fbbf24; margin-right: 8px;">${i + 1}.</span><b>${u.apodo}</b></div><div style="color: #fb923c; font-weight:bold;">${u.points} ⭐</div>`;
        list.appendChild(div);
      });
    }
    document.getElementById("overlayRanking").classList.remove("hidden");
  } catch(err){
    console.error("Error cargando ranking:", err);
  }
}
function cerrarOverlayRanking(){
  document.getElementById("overlayRanking").classList.add("hidden");
}
function showPopup(text){
  const popup = document.getElementById("popup");
  const popupText = document.getElementById("popupText");
  if (popupText) popupText.innerHTML = text + '<br><br><button onclick="closePopup()" style="margin-top: 10px; background: #222; color: #666;">Cerrar</button>';
  if (popup) { popup.classList.remove("hidden"); popup.style.display = "flex"; }
}
function irAmigos(){ if(checkBloqueadoRedirect()) return; window.location.href = "amigos.html"; }
function irPetSimulator(){ if(checkBloqueadoRedirect()) return; window.location.href = "pet.html"; }

function checkBloqueadoRedirect(){
  if(user && (user.bloqueada || user.baneada)){
    if(user.baneada){
      localStorage.setItem("andeleros_baneada", "1");
      window.location.href = "index.html?baneada=1";
    } else {
      window.location.href = "index.html";
    }
    return true;
  }
  return false;
}

(function(){
  if(user && user.bloqueada){
    const banner = document.getElementById("negativoBanner");
    if(banner) banner.style.display = "flex";
  }
})();
function mostrarServicioNoDisponible(){ const o = document.getElementById('overlayServicioND'); if (o) o.style.display = 'flex'; }
