let usuario = null;
let bloqueo = false;

/* OCULTAR */
function ocultar(){
  document.getElementById("crear").classList.add("hidden");
  document.getElementById("login").classList.add("hidden");
  document.getElementById("perfil").classList.add("hidden");
  document.getElementById("juego").classList.add("hidden");
  document.getElementById("notiPanel").style.display = "none";
}

/* VOLVER */
function volver(){
  if(bloqueo) return;
  ocultar();
}

/* NAV */
function irCrear(){ if(bloqueo) return; ocultar(); document.getElementById("crear").classList.remove("hidden"); }
function irLogin(){ if(bloqueo) return; ocultar(); document.getElementById("login").classList.remove("hidden"); }

/* PERFIL */
function irPerfil(){
  if(!usuario || bloqueo) return;

  ocultar();
  document.getElementById("perfil").classList.remove("hidden");

  document.getElementById("pApodo").innerText = usuario.apodo;
  document.getElementById("pID").innerText = "ID: " + usuario.ide;
}

/* NOTI */
function abrirNoti(){
  if(bloqueo) return;
  document.getElementById("notiPanel").style.display = "flex";
}
function cerrarNoti(){
  document.getElementById("notiPanel").style.display = "none";
}

/* JUEGO */
function abrirJuego(){
  if(bloqueo) return;
  ocultar();
  document.getElementById("juego").classList.remove("hidden");
}

function irScape(){
  if(bloqueo) return;
  window.location.href = "https://darkterminal.onrender.com/";
}

/* CUENTAS */
function guardarCuenta(user){
  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  if(!cuentas.find(c => c.ide === user.ide)){
    cuentas.push(user);
  }

  localStorage.setItem("cuentas", JSON.stringify(cuentas));
}

function borrarCuentaLocal(ide){
  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];
  cuentas = cuentas.filter(c => c.ide !== ide);
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

/* CREAR */
async function crear(){
  if(bloqueo) return;

  const apodo = document.getElementById("apodo").value;

  const res = await fetch("/crear",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ apodo })
  });

  const user = await res.json();
  if(!user) return alert("Error");

  usuario = user;

  localStorage.setItem("usuario", JSON.stringify(usuario));
  guardarCuenta(usuario);

  actualizar();
  cargarGuardadas();
}

/* LOGIN */
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

  actualizar();
  cargarGuardadas();
}

/* ELIMINAR */
function eliminarCuenta(){
  if(!usuario || bloqueo) return;

  if(!confirm("¿Seguro?")) return;
  if(!confirm("¿Seguro de verdad?")) return;

  borrarCuentaLocal(usuario.ide);

  fetch("/eliminar",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ ide: usuario.ide })
  });

  usuario = null;
  localStorage.removeItem("usuario");

  actualizar();
  cargarGuardadas();
}

/* LOGOUT */
function logout(){
  if(bloqueo) return;

  usuario = null;
  localStorage.removeItem("usuario");
  actualizar();
}

/* MODO */
function modo(){
  if(bloqueo) return;
  document.body.classList.toggle("claro");
}

/* PRIVACIDAD */
function aceptarPrivacidad(){
  if(!usuario) return;

  const noMostrar = document.getElementById("noMostrar").checked;

  if(noMostrar){
    localStorage.setItem("privacidad_"+usuario.ide, "ok");
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

/* UI */
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

    const aceptada = localStorage.getItem("privacidad_"+usuario.ide);

    if(!aceptada){
      document.getElementById("privacidad").classList.remove("hidden");
    } else {
      document.getElementById("privacidad").classList.add("hidden");
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

/* INIT */
window.onload = ()=>{
  cargarGuardadas();

  const guardado = localStorage.getItem("usuario");
  if(guardado){
    usuario = JSON.parse(guardado);
  }

  actualizar();
};