let user = null;
let pendingUser = null; // Para guardar datos antes de crear en DB
let modo = localStorage.getItem("modo") || "oscuro";
const API_BASE = ""; // Usar rutas relativas para que funcione en Render y local sin cambios
const LOCAL_ACCOUNT_KEY = "andeleros_account_";
const LAST_ACTIVE_KEY = "andeleros_last_active";

const PALABRAS_PROHIBIDAS = ["tonto", "feo", "malo", "joder", "idiota"];

function esMalsonante(texto) {
  const low = texto.toLowerCase();
  return PALABRAS_PROHIBIDAS.some(p => low.includes(p));
}

/* Limpiar localStorage si se llega al límite */
function limpiarCuentasLocales() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LOCAL_ACCOUNT_KEY)) localStorage.removeItem(key);
  }
}

function getLocalAccountData(ide){
  const raw = localStorage.getItem(LOCAL_ACCOUNT_KEY + ide);
  if(!raw) return {};
  try {
    return JSON.parse(raw);
  } catch(e){
    return {};
  }
}

function saveLocalAccountData(ide, data){
  const existing = getLocalAccountData(ide);
  localStorage.setItem(LOCAL_ACCOUNT_KEY + ide, JSON.stringify({ ...existing, ...data }));
}

function normalizeFoto(src){
  if(!src || typeof src !== "string") return "pfp/p1.svg";
  if(src.endsWith(".png")){
    return src.replace(/\.png$/, ".svg");
  }
  return src;
}

function mergeLocalAccountData(account){
  if(!account || !account.ide) return account;
  const local = getLocalAccountData(account.ide);
  const foto = normalizeFoto(local.foto || account.foto || "pfp/p1.svg");
  return {
    ...account,
    ...local,
    foto,
    aceptado: local.aceptado === true || account.aceptado === true,
    noMostrar: local.noMostrar === true || account.noMostrar === true
  };
}

function saveCurrentUserLocalData(){
  if(!user || !user.ide) return;
  // Guardamos cuál es la última cuenta activa
  localStorage.setItem(LAST_ACTIVE_KEY, user.ide);
  saveLocalAccountData(user.ide, {
    ide: user.ide,
    apodo: user.apodo,
    foto: normalizeFoto(user.foto),
    aceptado: user.aceptado === true,
    noMostrar: user.noMostrar === true
  });
}

/* ================= MUSICA ================= */
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

/* ================= INIT ================= */
window.addEventListener("DOMContentLoaded", async () => {
  audio = document.getElementById("musica");
  
  // Intentar auto-login con la última cuenta usada si no hay sesión activa
  const lastIde = localStorage.getItem(LAST_ACTIVE_KEY);
  if (!user && lastIde) {
    await loginSavedAccount(lastIde, true); // Modo silencioso para el inicio automático
    if (user) return; // Si el login tuvo éxito, loginSavedAccount ya llamó a go()
  }
  go();
});

/* ================= UI ================= */
function hideAll(){
  [
    "menu","crear","login","setup","privacidad",
    "panel","perfil","menuJugar","overlayNoti"
  ].forEach(id=>{
    document.getElementById(id)?.classList.add("hidden");
  });
}

function show(id){
  document.getElementById(id)?.classList.remove("hidden");
}

/* ================= BARRA ================= */
function updateBar(){
  const logged = user && user.ide && user.aceptado;

  document.getElementById("btnModo").style.display = "inline-block";
  document.getElementById("btnMusica").style.display = "inline-block";

  document.getElementById("btnJugar").style.display = logged ? "inline-block":"none";
  document.getElementById("btnPerfil").style.display = logged ? "inline-block":"none";
  document.getElementById("btnNoti").style.display = logged ? "inline-block":"none";
}

/* ================= FLOW ================= */
function go(){

  document.body.className = modo;

  hideAll();
  updateBar();
  renderCuentas(); // Sincroniza en background

  const estado = document.getElementById("estado");

  if(!user || !user.ide){
    estado.innerText = "No logueado";
    show("menu");
    return;
  }

  user = mergeLocalAccountData(user);

  // Solo guardamos en localStorage si el usuario ya es "oficial" (aceptado)
  if (user.aceptado) {
    saveCurrentUserLocalData();
  }

  estado.innerText = "Logueado como " + user.apodo + " (" + user.ide + ")";
  abrirPanel();
}

/* ================= CREAR ================= */
async function crearCuenta(){
  const apodo = document.getElementById("apodo").value.trim();
  if(!apodo) return alert("Escribe apodo");

  if(esMalsonante(apodo)){
    return alert("El apodo contiene palabras no permitidas");
  }

  try {
    // 1. Ver límite de 5 en DB antes de proceder
    const resCuentas = await fetch(`${API_BASE}/cuentas`);
    let cuentasActuales = [];
    if(resCuentas.ok) cuentasActuales = await resCuentas.json();
    else throw new Error("Servidor no responde al verificar límites");

    if(cuentasActuales.length >= 50) { // Límite aumentado a 50
      return alert("El servidor está lleno. Contacta con el admin.");
    }

    // 2. En lugar de crear en DB, guardamos los datos temporalmente en memoria
    user = {
      apodo: apodo,
      foto: "pfp/p1.svg",
      aceptado: false
    };

    updateBar();
    abrirSetup();
  } catch(err) {
    console.error("Fallo en crearCuenta:", err);
    alert("No se pudo conectar con el servidor. Revisa tu internet o espera a que el servidor despierte.");
  }
}

/* ================= SETUP ================= */
function abrirSetup(){
  if(!user) return;

  hideAll();
  show("setup");

  // Ahora el ID y apodo son reales desde el principio
  document.getElementById("setupApodo").innerText = user.apodo;
  document.getElementById("setupId").innerText = user.ide || "Se generará al aceptar";
  document.getElementById("setupFoto").src = normalizeFoto(user.foto);

  // Generar solo 6 fotos disponibles
  const contenedor = document.querySelector("#setup .fotos");
  if(contenedor){
    contenedor.innerHTML = "";
    for(let i=1; i<=6; i++){
      const img = document.createElement("img");
      img.src = `pfp/p${i}.svg`;
      img.onclick = () => elegirFoto(img.src);
      contenedor.appendChild(img);
    }
  }
}

function elegirFoto(src){
  if(user) user.foto = normalizeFoto(src);

  document.getElementById("setupFoto").src = normalizeFoto(src);
  
  // Transición automática: al elegir foto, saltamos a privacidad tras un breve delay
  setTimeout(() => abrirPrivacidad(), 350);
}

function confirmarSetup(){
  abrirPrivacidad();
}

/* ================= PRIVACIDAD ================= */
function abrirPrivacidad(){
  if(!user) return go();

  hideAll();
  show("privacidad");
}

async function aceptarPrivacidad(){
  if(!user) return go();

  try {
    // AHORA es cuando creamos la cuenta en la Base de Datos
    const res = await fetch(`${API_BASE}/crear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apodo: user.apodo,
        foto: user.foto,
        aceptado: true, // Ya entra como aceptada
        noMostrar: true
      })
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Error en el servidor al crear cuenta");

    user = data;

    // AHORA SÍ: guardamos en localStorage para que aparezca en la lista
    saveCurrentUserLocalData();
    go();
  } catch(err){
    console.error("Error en aceptación:", err);
    alert("Fallo al confirmar la cuenta: " + err.message);
    go();
  }
}

function rechazarPrivacidad(){
  alert("Debes aceptar la política de privacidad para crear una cuenta.");
}

/* ================= LOGIN ================= */
async function loginCuenta(){

  const ide = document.getElementById("ide").value.trim();
  if(!ide) return alert("Escribe ID");

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ide })
    });

    const data = await res.json();

    if(!res.ok){
      return alert(data.error || "No existe esta cuenta");
    }

    user = mergeLocalAccountData(data);
    if (user.aceptado) {
      saveCurrentUserLocalData();
      go();
    } else {
      // Si no ha aceptado términos, forzamos que pase por el Setup
      abrirSetup();
    }
  } catch(err){
    console.error(err);
    alert("Error en login");
  }
}

/* ================= GUARDAR ================= */
function guardarCuenta(){
  // Las cuentas se guardan en la base de datos.
  if(user && user.ide){
    saveCurrentUserLocalData();
  }
}

/* ================= CUENTAS ================= */
function renderCuentas(){
  const div = document.getElementById("listaCuentas");
  if(!div) return;

  div.innerHTML = "";

  const cuentas = [];
  Object.keys(localStorage).forEach(key => {
    if(key && key.startsWith(LOCAL_ACCOUNT_KEY)){
      try {
        const acc = JSON.parse(localStorage.getItem(key));
        // Solo mostrar si la cuenta está aceptada y tiene ID (o recuperarla de la key)
        if (acc && acc.aceptado) {
          if (!acc.ide) acc.ide = key.replace(LOCAL_ACCOUNT_KEY, ""); 
          cuentas.push(acc);
        }
      } catch(err){
        console.error("Error en cuenta:", key);
      }
    }
  });

  if(cuentas.length === 0) {
    div.innerHTML = "<p style='opacity:0.5; font-size:12px;'>No hay cuentas en este dispositivo</p>";
    return;
  }

  div.innerHTML = "<p style='font-size:11px; opacity:0.6; margin-bottom:8px;'>Cuentas en este dispositivo (localStorage):</p>";

  cuentas.forEach(account=>{
    const row = document.createElement("div");
    row.className = "saved-account-card";
    row.setAttribute("style", "background:rgba(255,255,255,0.1); padding:10px; border-radius:10px; width:90%; cursor:pointer; display:flex; align-items:center; gap:12px; border:1px solid #555; transition: 0.2s;");

    // Efecto visual al pasar el dedo/mouse
    row.onmouseenter = () => row.style.background = "rgba(255,255,255,0.2)";
    row.onmouseleave = () => row.style.background = "rgba(255,255,255,0.1)";

    const img = document.createElement("img");
    img.src = normalizeFoto(account.foto);
    img.width = 40;
    img.height = 40;
    img.style.borderRadius = "50%";
    img.style.border = "2px solid var(--color-primario, #ccc)";

    const info = document.createElement("div");
    info.innerHTML = `<div style="font-weight:bold; font-size:14px;">${account.apodo}</div>
                      <div style="font-size:10px; opacity:0.6;">Toca para entrar</div>`;

    // Botón para olvidar cuenta localmente
    const btnOlvidar = document.createElement("div");
    btnOlvidar.innerHTML = "&times;";
    btnOlvidar.setAttribute("style", "margin-left:auto; font-size:20px; opacity:0.3; padding:5px; cursor:pointer;");
    btnOlvidar.onclick = (e) => {
      e.stopPropagation(); // Evita que se inicie sesión al dar a la X
      if(confirm(`¿Quitar a ${account.apodo} de este dispositivo?`)) {
        localStorage.removeItem(LOCAL_ACCOUNT_KEY + account.ide);
        if (localStorage.getItem(LAST_ACTIVE_KEY) === account.ide) localStorage.removeItem(LAST_ACTIVE_KEY);
        renderCuentas();
      }
    };

    row.onclick = ()=>{
      loginSavedAccount(account.ide);
    };

    row.appendChild(img);
    row.appendChild(info);
    row.appendChild(btnOlvidar);
    div.appendChild(row);
  });
}

/* ================= PANEL ================= */
function abrirPanel(){
  hideAll();
  show("panel");

  document.getElementById("pApodo").innerText = user.apodo;
}

/* ================= PERFIL ================= */
function verPerfil(){
  hideAll();
  show("perfil");

  document.getElementById("pfApodo").innerText = user.apodo;
  document.getElementById("pfId").innerText = user.ide;

  // Generar selector de fotos dinámico en el perfil
  const contenedorFotos = document.querySelector("#perfil .fotos");
  if(contenedorFotos){
    contenedorFotos.innerHTML = ""; // Limpiar
    for(let i=1; i<=6; i++){
      const img = document.createElement("img");
      img.src = `pfp/p${i}.svg`;
      img.onclick = () => setFoto(img.src);
      contenedorFotos.appendChild(img);
    }
  }

  actualizarFoto();
}

function actualizarFoto(){
  const img = document.getElementById("fotoPerfil");
  if(img){
    img.src = normalizeFoto(user.foto || "pfp/p1.svg") + "?t=" + Date.now();
  }
}

async function setFoto(src){
  if(!user || !user.ide) return;
  
  const fotoNormalizada = normalizeFoto(src);

  try {
    // Guardar en Base de Datos
    await fetch(`${API_BASE}/update/${encodeURIComponent(user.ide)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foto: fotoNormalizada })
    });

    user.foto = fotoNormalizada;
    saveCurrentUserLocalData();
    actualizarFoto();
  } catch(err) {
    console.error("Error al guardar foto:", err);
  }
}

/* ================= LOGIN SAVED ================= */
async function loginSavedAccount(ide, silent = false) {
  if(!ide) return;
  
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ide })
    });

    const data = await res.json();
    if (!res.ok) {
      // Si la cuenta ya no existe en el servidor, limpiamos el rastro local
      localStorage.removeItem(LOCAL_ACCOUNT_KEY + ide);
      if (localStorage.getItem(LAST_ACTIVE_KEY) === ide) localStorage.removeItem(LAST_ACTIVE_KEY);
      if (!silent) alert(data.error || "Esta cuenta ya no existe en el servidor");
      renderCuentas();
      return;
    }

    // Sincronizamos datos locales con los del servidor
    user = mergeLocalAccountData(data);
    saveCurrentUserLocalData();
    go(); // Redirige al panel
  } catch (err) {
    console.error("Error en login automático:", err);
    alert("Error de conexión con el servidor");
  }
}

/* ================= LOGOUT ================= */
function logout(){
  // Al cerrar sesión manualmente, quitamos la marca de "última cuenta"
  localStorage.removeItem(LAST_ACTIVE_KEY);
  user = null;
  go();
}

/* ================= JUGAR ================= */
function abrirJugar(){
  hideAll();
  show("menuJugar");
}

function cerrarJugar(){
  go();
}

/* ================= ENLACES ================= */
function irMinijuegos(){
  window.location.href = "https://magomagioso-bit.github.io/losandeleros-minijuegos/";
}

function irEscape(){
  window.location.href = "https://darkterminal.onrender.com/";
}

function irQuiz(){
  window.location.href = "/quiz.html";
}

function irMisterio(){
  window.location.href = "/mario%20bross/menu.html";
}

function irLab(){
  window.location.href = "https://elementlab.onrender.com/";
}

function irAdmin(){
  window.location.href = "/admin.html";
}

/* ================= NOTI ================= */
function abrirNoti(){
  hideAll();
  show("overlayNoti");
  document.getElementById("notiText").innerText = "🔔 No tienes notificaciones";
}

function cerrarNoti(){
  go();
}

/* ================= MODO ================= */
function toggleModo(){

  modo = modo === "oscuro" ? "claro" : modo === "claro" ? "neon" : "oscuro";

  localStorage.setItem("modo", modo);
  go();
}

/* ================= NAVEGACIÓN ================= */
function mostrarCrear(){
  hideAll();
  show("crear");
  document.getElementById("apodo").value = "";
  document.getElementById("apodo").focus();
}

function mostrarLogin(){
  hideAll();
  show("login");
  document.getElementById("ide").value = "";
  document.getElementById("ide").focus();
}

function volver(){
  go();
}

/* ================= ELIMINAR CUENTA ================= */
async function eliminarCuenta(){
  if(!user || !user.ide) return alert("No hay cuenta para eliminar");
  if(!confirm(`¿Seguro que quieres borrar a ${user.apodo}? Esta acción no se puede deshacer.`)) return;

  try {
    const idADel = user.ide; // Guardamos referencia antes de limpiar
    const res = await fetch(`${API_BASE}/delete/${encodeURIComponent(idADel)}`, {
      method: "DELETE"
    });

    if(!res.ok){
      const data = await res.json();
      return alert(data.error || "Error eliminando cuenta");
    }

    // Limpiar localstorage y estado global
    localStorage.removeItem(LOCAL_ACCOUNT_KEY + idADel);
    user = null;
    go();
  } catch(err){
    console.error(err);
    alert("Error eliminando cuenta");
  }
}

/* ================= MUSICA ================= */
function toggleMusica(){

  if(!audio) audio = document.getElementById("musica");

  if(!musicaActiva){
    audio.src = playlist[Math.floor(Math.random()*playlist.length)];
    audio.volume = 0.5;
    audio.play();
    musicaActiva = true;
  } else {
    audio.pause();
    musicaActiva = false;
  }
}