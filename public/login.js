let user = JSON.parse(localStorage.getItem("user")) || null;
let cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];
let modo = localStorage.getItem("modo") || "oscuro";

/* =========================
   UI PRINCIPAL
========================= */

function actualizarUI(){

  document.body.className = modo;

  const menu = document.getElementById("menu");
  const panel = document.getElementById("panel");
  const perfil = document.getElementById("perfil");
  const crear = document.getElementById("crear");
  const login = document.getElementById("login");

  const btnPerfil = document.getElementById("btnPerfil");
  const btnNoti = document.getElementById("btnNoti");
  const btnEntrar = document.getElementById("btnEntrar");

  menu.style.display = "none";
  panel.style.display = "none";
  perfil.style.display = "none";
  crear.style.display = "none";
  login.style.display = "none";

  if(user){

    document.getElementById("estado").innerText = "Logueado";

    panel.style.display = "block";
    document.getElementById("pApodo").innerText = user.apodo;

    btnPerfil.style.display = "inline-block";
    btnNoti.style.display = "inline-block";
    btnEntrar.style.display = "inline-block";

  }else{

    document.getElementById("estado").innerText = "No logueado";

    menu.style.display = "block";

    btnPerfil.style.display = "none";
    btnNoti.style.display = "none";
    btnEntrar.style.display = "none";
  }

  mostrarCuentas();
}

/* =========================
   PERFIL
========================= */

function verPerfil(){
  if(!user){
    alert("Debes iniciar sesión");
    return;
  }

  document.getElementById("perfil").style.display = "block";
  document.getElementById("pfApodo").innerText = user.apodo;
  document.getElementById("pfId").innerText = user.ide;
}

/* =========================
   NOTI
========================= */

function abrirNoti(){
  if(!user) return;
  document.getElementById("overlayNoti").classList.add("active");
}

function cerrarNoti(){
  document.getElementById("overlayNoti").classList.remove("active");
}

/* =========================
   ENTRAR
========================= */

function abrirEntrar(){
  if(!user) return;
  document.getElementById("menuEntrar").style.display = "block";
}

function cerrarEntrar(){
  document.getElementById("menuEntrar").style.display = "none";
}

/* =========================
   LINKS
========================= */

function irMinijuegos(){
  window.location.href = "https://magomagioso-bit.github.io/losandeleros-minijuegos/";
}

function irEscape(){
  window.location.href = "https://darkterminal.onrender.com/";
}

function irEventos(){
  window.location.href = "admin.html";
}

/* =========================
   CUENTAS
========================= */

function mostrarCuentas(){
  const div = document.getElementById("listaCuentas");
  div.innerHTML = "";

  cuentas.forEach(c => {
    const btn = document.createElement("button");
    btn.innerText = c.apodo + " (" + c.ide + ")";
    btn.onclick = () => loginDirecto(c);
    div.appendChild(btn);
  });
}

function loginDirecto(c){
  user = c;
  localStorage.setItem("user", JSON.stringify(user));
  actualizarUI();
}

/* =========================
   CREAR / LOGIN
========================= */

function crearCuenta(){
  const apodo = document.getElementById("apodo").value;

  const data = {
    apodo,
    ide: Math.floor(10000 + Math.random()*90000)
  };

  cuentas.push(data);
  localStorage.setItem("cuentas", JSON.stringify(cuentas));

  loginDirecto(data);
}

function loginCuenta(){
  const ide = document.getElementById("ide").value;
  const encontrado = cuentas.find(c => c.ide == ide);

  if(encontrado){
    loginDirecto(encontrado);
  }else{
    alert("Cuenta no encontrada");
  }
}

/* =========================
   ELIMINAR CUENTA
========================= */

function eliminarCuenta(){

  if(!user) return;

  if(!confirm("¿Eliminar cuenta?")) return;

  cuentas = cuentas.filter(c => c.ide !== user.ide);
  localStorage.setItem("cuentas", JSON.stringify(cuentas));

  localStorage.removeItem("user");
  user = null;

  actualizarUI();
}

/* ========================= */

function logout(){
  localStorage.removeItem("user");
  user = null;
  actualizarUI();
}

/* ========================= */

function toggleModo(){
  modo = (modo === "oscuro") ? "claro" : "oscuro";
  localStorage.setItem("modo", modo);
  actualizarUI();
}

/* =========================
   MENÚS
========================= */

function mostrarCrear(){
  document.getElementById("crear").style.display="block";
  document.getElementById("login").style.display="none";
}

function mostrarLogin(){
  document.getElementById("login").style.display="block";
  document.getElementById("crear").style.display="none";
}

function volver(){
  actualizarUI();
}

window.onload = actualizarUI;