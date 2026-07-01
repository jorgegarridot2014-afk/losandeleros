let user = null;
let pendingUser = null;
let modo = localStorage.getItem("modo") || "oscuro";
const API_BASE = "";
const LOCAL_ACCOUNT_KEY = "andeleros_account_";
const LAST_ACTIVE_KEY = "andeleros_last_active";
const PALABRAS_PROHIBIDAS = ["tonto", "feo", "malo", "joder", "idiota"];
const socket = io();
socket.on("admin-broadcast", (data) => { alert(data.user + ": " + data.message); });
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
  if(src.endsWith(".png")){ return src.replace(/\.png$/, ".svg"); }
  return src;
}
function mergeLocalAccountData(account){
  if(!account || !account.ide) return account;
  const local = getLocalAccountData(account.ide);
  const foto = normalizeFoto(local.foto || account.foto || "pfp/p1.svg");
  return { ...account, ...local, foto, aceptado: local.aceptado === true || account.aceptado === true, noMostrar: local.noMostrar === true || account.noMostrar === true };
}
function saveCurrentUserLocalData(){
  if(!user || !user.ide) return;
  localStorage.setItem(LAST_ACTIVE_KEY, user.ide);
  saveLocalAccountData(user.ide, { ide: user.ide, apodo: user.apodo, foto: normalizeFoto(user.foto), aceptado: user.aceptado === true, noMostrar: user.noMostrar === true });
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
  if (!user && lastIde) { await loginSavedAccount(lastIde, true); if (user) return; }
  go();
});
function hideAll(){ [ "menu","crear","login","setup","privacidad", "panel","perfil","menuJugar","overlayNoti" ].forEach(id=>{ document.getElementById(id)?.classList.add("hidden"); }); }
function show(id){ document.getElementById(id)?.classList.remove("hidden"); }
function updateBar(){
  const logged = user && user.ide && user.aceptado;
  document.getElementById("btnModo").style.display = "inline-block";
  document.getElementById("btnMusica").style.display = "inline-block";
  document.getElementById("btnJugar").style.display = logged ? "inline-block":"none";
  document.getElementById("btnPerfil").style.display = logged ? "inline-block":"none";
  document.getElementById("btnNoti").style.display = logged ? "inline-block":"none";
  document.getElementById("btnTienda").style.display = logged ? "inline-block":"none";
}
function go(){
  document.body.className = modo;
  hideAll();
  updateBar();
  renderCuentas();
  const estado = document.getElementById("estado");
  if(!user || !user.ide){ estado.innerText = "No logueado"; show("menu"); return; }
  user = mergeLocalAccountData(user);
  if (user.aceptado) { saveCurrentUserLocalData(); }
  estado.innerText = "Logueado como " + user.apodo + " (" + user.ide + ")";
  abrirPanel();
}
async function crearCuenta(){
  const apodo = document.getElementById("apodo").value.trim();
  if(!apodo) return alert("Escribe apodo");
  if(esMalsonante(apodo)){ return alert("El apodo contiene palabras no permitidas"); }
  try {
    const resCuentas = await fetch(`${API_BASE}/cuentas`);
    let cuentasActuales = [];
    if(resCuentas.ok) cuentasActuales = await resCuentas.json(); else throw new Error("Servidor no responde");
    if(cuentasActuales.length >= 50) { return alert("El servidor está lleno. Contacta con el admin."); }
    user = { apodo: apodo, foto: "pfp/p1.svg", aceptado: false };
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
    const res = await fetch(`${API_BASE}/crear`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apodo: user.apodo, foto: user.foto, aceptado: true, noMostrar: true }) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Error en el servidor al crear cuenta");
    user = data;
    saveCurrentUserLocalData();
    go();
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
    if (user.aceptado) { saveCurrentUserLocalData(); go(); } else { abrirSetup(); }
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
function abrirPanel(){ hideAll(); show("panel"); document.getElementById("pApodo").innerText = user.apodo; }
function verPerfil(){
  hideAll(); show("perfil");
  document.getElementById("pfApodo").innerText = user.apodo; document.getElementById("pfId").innerText = user.ide;
  const contenedorFotos = document.querySelector("#perfil .fotos");
  if(contenedorFotos){ contenedorFotos.innerHTML = ""; for(let i=1; i<=6; i++){ const img = document.createElement("img"); img.src = `pfp/p${i}.svg`; img.onclick = () => setFoto(img.src); contenedorFotos.appendChild(img); } }
  actualizarFoto();
}
function actualizarFoto(){ const img = document.getElementById("fotoPerfil"); if(img){ img.src = normalizeFoto(user.foto || "pfp/p1.svg") + "?t=" + Date.now(); } }
async function setFoto(src){
  if(!user || !user.ide) return;
  const fotoNormalizada = normalizeFoto(src);
  try { await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foto: fotoNormalizada }) }); user.foto = fotoNormalizada; saveCurrentUserLocalData(); actualizarFoto(); } catch(err) { console.error("Error al guardar foto:", err); }
}
async function loginSavedAccount(ide, silent = false) {
  if(!ide) return;
  try {
    const res = await fetch(`${API_BASE}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ide }) });
    const data = await res.json();
    if (!res.ok) { localStorage.removeItem(LOCAL_ACCOUNT_KEY + ide); if (localStorage.getItem(LAST_ACTIVE_KEY) === ide) localStorage.removeItem(LAST_ACTIVE_KEY); if (!silent) alert(data.error || "Esta cuenta ya no existe en el servidor"); renderCuentas(); return; }
    user = mergeLocalAccountData(data); saveCurrentUserLocalData(); go();
  } catch (err) { console.error("Error en login automático:", err); alert("Error de conexión con el servidor"); }
}
function logout(){ localStorage.removeItem(LAST_ACTIVE_KEY); user = null; go(); }
function irMision2() { if (!user || !user.ide) return alert("Carl Briss: '¿Quién eres? Identifícate antes de intentar acceder al núcleo.'"); if (!user.missionCarlBriss1) { return alert("Carl Briss: 'Acceso denegado. Debes completar el Protocolo de Iniciación (Misión 1) antes de acceder al nivel 2.'"); } window.location.href = `mario%20bross/2.html?ide=${encodeURIComponent(user.ide)}&apodo=${encodeURIComponent(user.apodo)}&points=${user.points || 0}&m2=${user.missionCarlBriss2 || false}`; }
function abrirJugar(){ hideAll(); show("menuJugar"); }
function cerrarJugar(){ go(); }
function irPensamiento(){ window.location.href = "scratch.html"; }
function irMinijuegos(){ window.location.href = "mantenimiento.html"; }
function irEscape(){ window.location.href = "https://darkterminal.onrender.com/"; }
function irQuiz(){ window.location.href = "/quizzes/quiz.html"; }
function irTrivialPlayers(){ window.location.href = "/quizzes/trivialplayers.html"; }
function irQuizIndividual(){ window.location.href = "/quizzes/quiz.html"; }
function irMisterio(){ if (!user || !user.ide) return alert("Carl Briss: 'Identifícate antes de entrar al Protocolo Origen.'"); window.location.href = `/mario%20bross/game.html?ide=${encodeURIComponent(user.ide)}&apodo=${encodeURIComponent(user.apodo)}&points=${user.points || 0}&m1=${user.missionCarlBriss1 || false}&m2=${user.missionCarlBriss2 || false}`; }
function irLab(){ window.location.href = "https://elementlab.onrender.com/"; }
function irMundo(){ window.location.href = "/quizzes/quizmundo.html"; }
function irAdmin(){ window.location.href = "/admin.html"; }
function abrirNoti(){ hideAll(); show("overlayNoti"); document.getElementById("notiText").innerText = "🔔 ya hay nuevos minijuegos disponibles"; }
function cerrarNoti(){ go(); }
function checkMision2() { if (!user) return; if (user.missionCarlBriss2) { alert("Carl Briss dice: 'Buen trabajo con el Protocolo Sombra, el sistema está estable.'"); } else if (user.missionCarlBriss1) { irMision2(); } else { alert("Carl Briss: 'Necesitas completar la Misión 1 primero.'"); } }
function toggleModo(){ modo = modo === "oscuro" ? "claro" : modo === "claro" ? "neon" : "oscuro"; localStorage.setItem("modo", modo); go(); }
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
    <p style="margin: 10px 0; color: #ffcc00;">💰 Precio: 500 ⭐</p>`; }
  if (hasHistory) { content += `<p style="margin: 5px 0; color: #00ff99; font-size: 13px;">✅ Quiz de Historia: Ya lo tienes</p>`; }
  else { content += `<p style="margin: 5px 0;">📜 <b>Quiz de Historia</b></p>
    <p style="margin: 5px 0; color: #aaa; font-size: 13px;">25 preguntas sobre España</p>
    <p style="margin: 10px 0; color: #ffcc00;">💰 Precio: 200 ⭐</p>`; }
  if (hasGeography) { content += `<p style="margin: 5px 0; color: #00ff99; font-size: 13px;">✅ Quiz de Geografía: Ya lo tienes</p>`; }
  else { content += `<p style="margin: 5px 0;">🌍 <b>Quiz de Geografía</b></p>
    <p style="margin: 5px 0; color: #aaa; font-size: 13px;">Preguntas por el mundo - ¡Sé el mejor explorador!</p>
    <p style="margin: 10px 0; color: #ffcc00;">💰 Precio: 700 ⭐</p>`; }
  content += `<p style="margin: 5px 0; color: #00ffcc; font-size: 12px;">Tu saldo: ${user.points || 0} ⭐</p></div>`;
  content += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
  if (hasEnglish) { content += `<button onclick="closePopup(); irQuiz()" style="width: 100%; letter-spacing: 1px;">🇬🇧 Jugar Inglés</button>`; }
  else { content += `<button onclick="buyEnglishQuiz()" style="width: 100%; letter-spacing: 1px;">COMPRAR Inglés (500⭐)</button>`; }
  if (hasHistory) { content += `<button onclick="closePopup(); irQuizIndividual()" style="width: 100%; letter-spacing: 1px;">📜 Jugar Historia</button>`; }
  else { content += `<button onclick="buyHistoryQuiz()" style="width: 100%; letter-spacing: 1px;">COMPRAR Historia (200⭐)</button>`; }
  if (hasGeography) { content += `<button onclick="closePopup(); irMundo()" style="width: 100%; letter-spacing: 1px;">🌍 Jugar Geografía</button>`; }
  else { content += `<button onclick="buyGeographyQuiz()" style="width: 100%; letter-spacing: 1px;">COMPRAR Geografía (700⭐)</button>`; }
  content += `<button onclick="closePopup()" style="width: 100%; background: #222; color: #666; letter-spacing: 1px;">Cerrar</button></div>`;
  popupText.innerHTML = content;
  popup.style.display = "flex";
}
async function buyEnglishQuiz(){
  if ((user.points || 0) < 500) { showPopup("❌ No tienes suficientes créditos.\nNecesitas 500 ⭐.\nSaldo actual: " + (user.points || 0) + " ⭐"); setTimeout(closePopup, 2000); return; }
  user.points -= 500; user.englishQuizPurchased = true;
  showPopup("✅ Compra realizada: -500 ⭐\nRedirigiendo al Quiz de Inglés...");
  saveCurrentUserLocalData();
  try { const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: user.points, englishQuizPurchased: true }) }); if (res.ok) { const data = await res.json(); user.points = data.points; } } catch(err) { console.error("Error actualizando compra:", err); }
  setTimeout(() => { window.location.href = "/quizzes/quizenglis.html"; }, 1500);
}
async function buyHistoryQuiz(){
  if ((user.points || 0) < 200) { showPopup("❌ No tienes suficientes créditos.\nNecesitas 200 ⭐.\nSaldo actual: " + (user.points || 0) + " ⭐"); setTimeout(closePopup, 2000); return; }
  user.points -= 200; user.historyQuizPurchased = true;
  showPopup("✅ Compra realizada: -200 ⭐\nRedirigiendo al Quiz de Historia...");
  saveCurrentUserLocalData();
  try { const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: user.points, historyQuizPurchased: true }) }); if (res.ok) { const data = await res.json(); user.points = data.points; } } catch(err) { console.error("Error actualizando compra:", err); }
  setTimeout(() => { window.location.href = "/quizzes/quizhistoria.html"; }, 1500);
}
async function buyGeographyQuiz(){
  if ((user.points || 0) < 700) { showPopup("❌ No tienes suficientes créditos.\nNecesitas 700 ⭐.\nSaldo actual: " + (user.points || 0) + " ⭐"); setTimeout(closePopup, 2000); return; }
  user.points -= 700; user.geographyQuizPurchased = true;
  showPopup("✅ Compra realizada: -700 ⭐\nRedirigiendo al Quiz de Geografía...");
  saveCurrentUserLocalData();
  try { const res = await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: user.points, geographyQuizPurchased: true }) }); if (res.ok) { const data = await res.json(); user.points = data.points; } } catch(err) { console.error("Error actualizando compra:", err); }
  setTimeout(() => { window.location.href = "/quizzes/quizmundo.html"; }, 1500);
}
function toggleMusica(){
  if(!audio) audio = document.getElementById("musica");
  if(!musicaActiva){ audio.src = playlist[Math.floor(Math.random()*playlist.length)]; audio.volume = 0.5; audio.play(); musicaActiva = true; } else { audio.pause(); musicaActiva = false; }
}
function showPopup(text){ document.getElementById("popupText").innerHTML = text + '<br><br><button onclick="closePopup()" style="margin-top: 10px; background: #222; color: #666;">Cerrar</button>'; document.getElementById("popup").style.display = "flex"; }
function closePopup(){ document.getElementById("popup").style.display = "none"; }