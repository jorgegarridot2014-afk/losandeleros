console.log("LOGIN JS CARGADO");

let usuario = null;
let bloqueo = false;

/* OCULTAR */
function ocultar(){
  document.getElementById("crear").classList.add("hidden");
  document.getElementById("login").classList.add("hidden");
  document.getElementById("perfil").classList.add("hidden");
}

/* NAV */
function irCrear(){
  if(bloqueo) return;
  ocultar();
  document.getElementById("crear").classList.remove("hidden");
}

function irLogin(){
  if(bloqueo) return;
  ocultar();
  document.getElementById("login").classList.remove("hidden");
}

function volver(){
  if(bloqueo) return;
  ocultar();
}

/* ========================= */
/* 🔥 CUENTAS GUARDADAS */
/* ========================= */

function guardarCuenta(user){
  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  if(!cuentas.find(c => c.ide === user.ide)){
    cuentas.push(user);
  }

  localStorage.setItem("cuentas", JSON.stringify(cuentas));
}

function cargarGuardadas(){
  const cont = document.getElementById("guardadas");
  cont.innerHTML = "";

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  cuentas.forEach(c=>{
    const btn = document.createElement("button");
    btn.innerText = c.apodo + " (" + c.ide + ")";
    btn.onclick = ()=> loginRapido(c.ide);
    cont.appendChild(btn);
  });
}

/* ========================= */
/* CREAR */
/* ========================= */

async function crear(){
  if(bloqueo) return;

  const apodo = document.getElementById("apodo").value;

  const res = await fetch("/crear",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ apodo })
  });

  const user = await res.json();
  if(!user) return alert("Error al crear");

  usuario = user;

  localStorage.setItem("usuario", JSON.stringify(usuario));

  guardarCuenta(usuario);
  cargarGuardadas();

  actualizar();
}

/* ========================= */
/* LOGIN */
/* ========================= */

async function login(){
  if(bloqueo) return;

  const ide = document.getElementById("ide").value;
  loginRapido(ide);
}

async function loginRapido(ide){
  if(bloqueo) return;

  const res = await fetch("/login",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ ide })
  });

  const user = await res.json();
  if(!user) return alert("No existe");

  usuario = user;

  localStorage.setItem("usuario", JSON.stringify(usuario));

  guardarCuenta(usuario);
  cargarGuardadas();

  actualizar();
}

/* ========================= */
/* PERFIL */
/* ========================= */

function irPerfil(){
  if(!usuario || bloqueo) return;

  ocultar();
  document.getElementById("perfil").classList.remove("hidden");

  document.getElementById("pApodo").innerText = usuario.apodo;
  document.getElementById("pID").innerText = "ID: " + usuario.ide;
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

async function eliminarCuenta(){
  if(!usuario || bloqueo) return;

  if(!confirm("¿Seguro?")) return;
  if(!confirm("¿Seguro de verdad?")) return;

  await fetch("/eliminar",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ ide: usuario.ide })
  });

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];
  cuentas = cuentas.filter(c => c.ide !== usuario.ide);
  localStorage.setItem("cuentas", JSON.stringify(cuentas));

  usuario = null;
  localStorage.removeItem("usuario");

  cargarGuardadas();
  actualizar();
}

/* ========================= */
/* 🎮 BOTÓN ENTRAR */
/* ========================= */

function abrirJuego(){
  alert("Cargando juego...");
  window.location.href = "https://darkterminal.onrender.com/";
}

/* ========================= */
/* 🔔 NOTIFICACIONES */
/* ========================= */

function abrirNoti(){
  document.getElementById("notiPanel").classList.remove("hidden");
}

function cerrarNoti(){
  document.getElementById("notiPanel").classList.add("hidden");
}

/* ========================= */
/* MODO */
/* ========================= */

function modo(){
  document.body.classList.toggle("claro");
}

/* ========================= */
/* PRIVACIDAD */
/* ========================= */

function aceptarPrivacidad(){
  if(!usuario) return;

  const check = document.getElementById("noMostrar").checked;

  if(check){
    localStorage.setItem("priv_"+usuario.ide, "ok");
  }

  document.getElementById("privacidad").classList.add("hidden");
}

function rechazarPrivacidad(){
  bloqueo = true;

  document.body.innerHTML = `
    <h2 style="text-align:center;margin-top:50px;">
      Debes aceptar la política de privacidad para usar la web
    </h2>
  `;
}

/* ========================= */
/* UI */
/* ========================= */

function actualizar(){

  const menu = document.getElementById("menu");
  const bloque = document.getElementById("bloqueGuardadas");

  if(usuario){
    document.getElementById("estado").innerText = "Logueado: " + usuario.apodo;

    menu.style.display = "none";
    bloque.style.display = "none";

    document.getElementById("btnPerfil").classList.remove("hidden");
    document.getElementById("btnLogout").classList.remove("hidden");
    document.getElementById("btnEntrarJuego").classList.remove("hidden");
    document.getElementById("btnNoti").classList.remove("hidden");

    const ok = localStorage.getItem("priv_"+usuario.ide);

    if(!ok){
      document.getElementById("privacidad").classList.remove("hidden");
    }

  }else{
    document.getElementById("estado").innerText = "No logueado";

    menu.style.display = "block";
    bloque.style.display = "block";

    document.getElementById("btnPerfil").classList.add("hidden");
    document.getElementById("btnLogout").classList.add("hidden");
    document.getElementById("btnEntrarJuego").classList.add("hidden");
    document.getElementById("btnNoti").classList.add("hidden");

    document.getElementById("privacidad").classList.add("hidden");
  }
}

/* ========================= */
/* INIT */
/* ========================= */

window.onload = ()=>{

  const guardado = localStorage.getItem("usuario");

  if(guardado){
    usuario = JSON.parse(guardado);
  }

  cargarGuardadas();
  actualizar();
};