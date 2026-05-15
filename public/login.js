let usuario = null;

function el(id){ return document.getElementById(id); }

/* ========================= */
/* 🔥 PANTALLAS */
/* ========================= */
function mostrarPantalla(id){

  ["crear","login","perfil","notiPanel"].forEach(p=>{
    let e = el(p);
    if(e){
      e.classList.add("hidden");
      e.style.display = "none";
    }
  });

  // limpiar inputs
  if(el("apodo")) el("apodo").value = "";
  if(el("ide")) el("ide").value = "";

  if(id && el(id)){
    el(id).classList.remove("hidden");

    if(id === "notiPanel" || id === "privacidad"){
      el(id).style.display = "flex";
    } else {
      el(id).style.display = "block";
    }
  }
}

/* ========================= */
/* NAV */
/* ========================= */
function irCrear(){ mostrarPantalla("crear"); }
function irLogin(){ mostrarPantalla("login"); }
function volver(){ mostrarPantalla(null); }

/* ========================= */
/* CUENTAS */
/* ========================= */
function guardarCuenta(user){
  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  if(!cuentas.some(c => c.ide === user.ide)){
    cuentas.push(user);
  }

  localStorage.setItem("cuentas", JSON.stringify(cuentas));
}

function cargarGuardadas(){

  let cont = el("guardadas");
  let bloque = el("bloqueGuardadas");

  cont.innerHTML = "";

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  if(usuario){
    bloque.style.display = "none";
    return;
  }

  if(cuentas.length > 0){

    bloque.style.display = "block";

    cuentas.forEach(c=>{
      let b = document.createElement("button");
      b.textContent = c.apodo + " (" + c.ide + ")";
      b.onclick = ()=>loginRapido(c.ide);
      cont.appendChild(b);
    });

  } else {
    bloque.style.display = "none";
  }
}

/* ========================= */
/* CREAR */
/* ========================= */
async function crearCuenta(){

  let apodo = el("apodo").value.trim();
  if(!apodo) return alert("Pon apodo");

  let res = await fetch("/crear",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({apodo})
  });

  let user = await res.json();

  usuario = user;
  localStorage.setItem("usuario", JSON.stringify(user));
  guardarCuenta(user);

  alert(`Cuenta creada\n\nApodo: ${user.apodo}\nID: ${user.ide}`);

  actualizar();
}

/* ========================= */
/* LOGIN */
/* ========================= */
function loginCuenta(){
  let id = el("ide").value.trim();
  if(!id) return alert("Pon ID");
  loginRapido(id);
}

async function loginRapido(id){

  let res = await fetch("/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ide:id})
  });

  let user = await res.json();
  if(!user) return alert("No existe");

  usuario = user;
  localStorage.setItem("usuario", JSON.stringify(user));
  guardarCuenta(user);

  actualizar();
}

/* ========================= */
/* PERFIL */
/* ========================= */
function irPerfil(){

  mostrarPantalla("perfil");

  el("pApodo").innerText = usuario.apodo;
  el("pID").innerText = "ID: " + usuario.ide;
}

/* ========================= */
/* LOGOUT */
/* ========================= */
function logout(){

  mostrarPantalla(null);

  usuario = null;
  localStorage.removeItem("usuario");

  actualizar();
}

/* ========================= */
/* ELIMINAR */
/* ========================= */
async function eliminarCuenta(){

  if(!confirm("¿Seguro que quieres eliminar la cuenta?")) return;

  await fetch("/eliminar",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ide:usuario.ide})
  });

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];
  cuentas = cuentas.filter(c => c.ide !== usuario.ide);
  localStorage.setItem("cuentas", JSON.stringify(cuentas));

  mostrarPantalla(null);

  localStorage.removeItem("usuario");
  usuario = null;

  actualizar();
}

/* ========================= */
/* 🔒 PRIVACIDAD */
/* ========================= */
function aceptarPrivacidad(){

  if(el("noMostrar") && el("noMostrar").checked){
    localStorage.setItem("priv_" + usuario.ide, "ok");
  }

  el("privacidad").style.display = "none";
}

function rechazarPrivacidad(){
  document.body.innerHTML = "<h2>Debes aceptar la política</h2>";
}

/* ========================= */
/* 🔔 NOTI */
/* ========================= */
function abrirNoti(){
  el("notiPanel").classList.remove("hidden");
  el("notiPanel").style.display = "flex";
}

function cerrarNoti(){
  el("notiPanel").classList.add("hidden");
  el("notiPanel").style.display = "none";
}

/* ========================= */
/* 🎮 JUEGO */
/* ========================= */
function mostrarJuego(){
  mostrarPantalla(null);

  let opcion = confirm("¿Quieres entrar al Escape Room?");
  if(opcion){
    window.location.href = "https://darkterminal.onrender.com/";
  }
}

/* ========================= */
/* 🌙 MODO */
/* ========================= */
function modo(){
  document.body.classList.toggle("claro");
}

/* ========================= */
/* UI */
/* ========================= */
function actualizar(){

  mostrarPantalla(null);

  if(usuario){

    el("estado").innerText = "Logueado: " + usuario.apodo;

    el("menu").style.display = "none";
    el("bloqueGuardadas").style.display = "none";

    el("btnPerfil").classList.remove("hidden");
    el("btnLogout").classList.remove("hidden");
    el("btnNoti").classList.remove("hidden");
    el("btnEntrar").classList.remove("hidden");

    if(!localStorage.getItem("priv_" + usuario.ide)){
      el("privacidad").style.display = "flex";
    }

  } else {

    el("estado").innerText = "No logueado";

    el("menu").style.display = "block";

    el("btnPerfil").classList.add("hidden");
    el("btnLogout").classList.add("hidden");
    el("btnNoti").classList.add("hidden");
    el("btnEntrar").classList.add("hidden");

    cargarGuardadas();

    el("privacidad").style.display = "none";
  }
}

/* ========================= */
/* INIT */
/* ========================= */
window.onload = ()=>{

  let guardado = localStorage.getItem("usuario");
  if(guardado){
    usuario = JSON.parse(guardado);
  }

  actualizar();
};