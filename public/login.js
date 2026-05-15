let usuario = null;
function el(id){ return document.getElementById(id); }

/* INICIO */
window.onload = ()=>{
  let guardado = localStorage.getItem("usuario");
  if(guardado){
    usuario = JSON.parse(guardado);
  }

  actualizar();

  if(!localStorage.getItem("priv")){
    mostrarPrivacidad(); // 🔥 CAMBIO
  }
};

/* 🔒 PRIVACIDAD (BLOQUEA TODO) */
function mostrarPrivacidad(){
  el("privacidad").style.display = "flex";
  document.body.classList.add("bloqueado"); // 🔥 BLOQUEO
}

function aceptarPrivacidad(){
  localStorage.setItem("priv","ok");
  el("privacidad").style.display = "none";
  document.body.classList.remove("bloqueado"); // 🔥 DESBLOQUEO
}

function rechazarPrivacidad(){
  document.body.innerHTML = "<h2>Debes aceptar la privacidad</h2>";
}

/* NAV */
function irCrear(){ ocultar(); el("crear").classList.remove("hidden"); }
function irLogin(){ ocultar(); el("login").classList.remove("hidden"); }
function volver(){ actualizar(); }

function ocultar(){
  ["crear","login","perfil","panelJuego"].forEach(id=>{
    if(el(id)) el(id).classList.add("hidden");
  });
}

/* CREAR */
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

  localStorage.removeItem("priv");

  actualizar();

  mostrarPrivacidad(); // 🔥 IMPORTANTE
}

/* LOGIN */
function loginCuenta(){
  let id = el("ide").value;

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  let user = cuentas.find(c=>c.ide == id);

  if(!user) return alert("No existe");

  usuario = user;

  localStorage.setItem("usuario", JSON.stringify(user));

  actualizar();
}

/* CUENTAS */
function cargarGuardadas(){
  let cont = el("guardadas");
  cont.innerHTML = "";

  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  if(!usuario && cuentas.length > 0){
    el("bloqueGuardadas").style.display = "block";

    cuentas.forEach(c=>{
      let b = document.createElement("button");
      b.textContent = c.apodo + " (" + c.ide + ")";
      b.onclick = ()=>{
        usuario = c;
        localStorage.setItem("usuario", JSON.stringify(c));
        actualizar();
      };
      cont.appendChild(b);
    });

  } else {
    el("bloqueGuardadas").style.display = "none";
  }
}

/* PERFIL */
function irPerfil(){
  ocultar();
  el("perfil").classList.remove("hidden");

  el("pApodo").innerText = usuario.apodo;
  el("pID").innerText = "ID: " + usuario.ide;
}

/* LOGOUT */
function logout(){
  usuario = null;
  localStorage.removeItem("usuario");
  actualizar();
}

/* ELIMINAR */
function eliminarCuenta(){
  let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];

  cuentas = cuentas.filter(c=>c.ide !== usuario.ide);

  localStorage.setItem("cuentas", JSON.stringify(cuentas));

  usuario = null;
  actualizar();
}

/* NOTI */
function abrirNoti(){
  el("notiPanel").style.display = "flex";
}

function cerrarNoti(){
  el("notiPanel").style.display = "none";
}

/* JUEGOS */
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

/* MODO */
function modo(){
  document.body.classList.toggle("claro");
}

/* UI */
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