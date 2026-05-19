let usuario = null;
function el(id){ return document.getElementById(id); }

/* ========================= */
/* INICIO */
/* ========================= */
window.onload = ()=>{

  let guardado = localStorage.getItem("usuario");

  if(guardado){
    usuario = JSON.parse(guardado);
  }

  actualizar();

  // 🔥 PRIVACIDAD SOLO SI LOGUEADO Y NO ACEPTADA
  if(usuario && !localStorage.getItem("priv")){
    mostrarPrivacidad();
  }
};

/* ========================= */
/* 🔒 PRIVACIDAD */
/* ========================= */
function mostrarPrivacidad(){
  let p = el("privacidad");
  if(!p) return;

  p.style.display = "flex";
  document.body.classList.add("bloqueado");
}

function aceptarPrivacidad(){
  localStorage.setItem("priv","ok");
  cerrarPrivacidad();
}

function noVolverPrivacidad(){
  localStorage.setItem("priv","ok");
  cerrarPrivacidad();
}

function cerrarPrivacidad(){
  el("privacidad").style.display = "none";
  document.body.classList.remove("bloqueado");
}

// 💀 RECHAZAR → EFECTO GLITCH
function rechazarPrivacidad(){

  document.body.innerHTML = `
    <div class="bloqueo">
      <h1 class="glitch" data-text="ACCESO DENEGADO">ACCESO DENEGADO</h1>
      <p class="glitch2">Debes aceptar la privacidad para continuar</p>
    </div>
  `;
}

/* ========================= */
/* NAV */
/* ========================= */
function irCrear(){ ocultar(); el("crear").classList.remove("hidden"); }
function irLogin(){ ocultar(); el("login").classList.remove("hidden"); }
function volver(){ actualizar(); }

function ocultar(){
  ["crear","login","perfil","panelJuego"].forEach(id=>{
    if(el(id)) el(id).classList.add("hidden");
  });
}

/* ========================= */
/* CREAR CUENTA */
/* ========================= */
function crearCuenta(){

  let apodo = el("apodo").value;
  if(!apodo) return alert("Pon apodo");

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  if(cuentas.length >= 5) return alert("Max 5 cuentas");

  let id = Math.floor(Math.random()*100000);

  usuario = {apodo, ide:id};

  cuentas.push(usuario);

  localStorage.setItem("usuario", JSON.stringify(usuario));
  localStorage.setItem("cuentas", JSON.stringify(cuentas));

  actualizar();

  // 🔥 MOSTRAR PRIVACIDAD
  setTimeout(()=>{
    mostrarPrivacidad();
  },100);
}

/* ========================= */
/* LOGIN */
/* ========================= */
function loginCuenta(){

  let id = el("ide").value;

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  let user = cuentas.find(c => String(c.ide) === String(id));

  if(!user) return alert("No existe");

  usuario = user;

  localStorage.setItem("usuario", JSON.stringify(user));

  actualizar();

  // 🔥 PRIVACIDAD SI NO ACEPTADA
  if(!localStorage.getItem("priv")){
    setTimeout(()=>{
      mostrarPrivacidad();
    },100);
  }
}

/* ========================= */
/* CUENTAS GUARDADAS */
/* ========================= */
function cargarGuardadas(){

  let cont = el("guardadas");
  cont.innerHTML = "";

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  if(usuario){
    el("bloqueGuardadas").style.display = "none";
    return;
  }

  cuentas.forEach(c=>{
    let b = document.createElement("button");

    b.textContent = c.apodo + " (" + c.ide + ")";

    b.onclick = ()=>{
      usuario = c;
      localStorage.setItem("usuario", JSON.stringify(c));
      actualizar();

      if(!localStorage.getItem("priv")){
        mostrarPrivacidad();
      }
    };

    cont.appendChild(b);
  });

  el("bloqueGuardadas").style.display = cuentas.length ? "block" : "none";
}

/* ========================= */
/* PERFIL */
/* ========================= */
function irPerfil(){

  if(!usuario) return;

  ocultar();
  el("perfil").classList.remove("hidden");

  el("pApodo").innerText = usuario.apodo;
  el("pID").innerText = "ID: " + usuario.ide;
}

/* ========================= */
/* LOGOUT */
/* ========================= */
function logout(){
  usuario = null;
  localStorage.removeItem("usuario");
  actualizar();
}

/* ========================= */
/* ELIMINAR */
/* ========================= */
function eliminarCuenta(){

  if(!usuario) return;

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  cuentas = cuentas.filter(c => c.ide !== usuario.ide);

  localStorage.setItem("cuentas", JSON.stringify(cuentas));

  usuario = null;
  localStorage.removeItem("usuario");

  actualizar();
}

/* ========================= */
/* NOTI */
/* ========================= */
function abrirNoti(){
  el("notiPanel").style.display = "flex";
}

function cerrarNoti(){
  el("notiPanel").style.display = "none";
}

/* ========================= */
/* JUEGOS */
/* ========================= */
function mostrarJuego(){
  ocultar();
  el("panelJuego").classList.remove("hidden");
}

function irEscape(){
  window.location.href = "https://darkterminal.onrender.com/";
}

function irMini(){
  window.location.href = "https://magomagioso-bit.github.io/losandeleros-minijuegos/";
}

function irEventos(){
  window.location.href = "admin.html";
}

/* ========================= */
/* MODO */
/* ========================= */
function modo(){
  document.body.classList.toggle("claro");
}

/* ========================= */
/* UI */
/* ========================= */
function actualizar(){

  ocultar();

  if(usuario){

    el("estado").innerText = "Logueado: " + usuario.apodo;

    el("menu").style.display = "none";
    el("bloqueGuardadas").style.display = "none";

    el("btnPerfil").style.display = "inline-block";
    el("btnEntrar").style.display = "inline-block";
    el("btnNoti").style.display = "inline-block";
    el("btnLogout").style.display = "inline-block";

  } else {

    el("estado").innerText = "No logueado";

    el("menu").style.display = "block";

    el("btnPerfil").style.display = "none";
    el("btnEntrar").style.display = "none";
    el("btnNoti").style.display = "none";
    el("btnLogout").style.display = "none";

    cargarGuardadas();
  }
}