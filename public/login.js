let usuario = null;

// 🚀 INICIO AUTOMÁTICO
window.onload = () => {
  const guardado = localStorage.getItem("user");

  if (guardado) {
    usuario = JSON.parse(guardado);
    actualizarSesion();
  }
};

// 🔄 MOSTRAR MENÚS
function mostrar(tipo){
  const panel = document.getElementById("panel");

  if(tipo === "crear"){
    panel.innerHTML = `
      <input id="apodo" placeholder="Apodo">
      <br>
      <button onclick="crear()">Crear cuenta</button>
      <button onclick="volver()">Volver</button>
    `;
  }

  if(tipo === "login"){
    panel.innerHTML = `
      <input id="ide" placeholder="ID">
      <br>
      <button onclick="login()">Entrar</button>
      <button onclick="volver()">Volver</button>
    `;
  }

  if(tipo === "buscar"){
    panel.innerHTML = `
      <input id="buscar" placeholder="Buscar cuenta">
      <br>
      <button onclick="recuperar()">Buscar</button>
      <button onclick="volver()">Volver</button>
    `;
  }
}

// 🔙 VOLVER
function volver(){
  document.getElementById("panel").innerHTML = "";
}

// 🆕 CREAR CUENTA
async function crear(){
  const apodo = document.getElementById("apodo").value;

  if(!apodo){
    alert("Pon un apodo");
    return;
  }

  try{
    const res = await fetch("/crear",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({apodo})
    });

    const data = await res.json();

    const user = data.user || data;

    if(user && user.ide){
      alert("✅ Cuenta creada\nTu ID: " + user.ide);

      usuario = user;
      guardar();
      actualizarSesion();
      volver();
    } else {
      alert(data.error || "Error al crear cuenta");
    }

  } catch(e){
    alert("Error de conexión con el servidor");
  }
}

// 🔑 LOGIN
async function login(){
  const ide = document.getElementById("ide").value;

  if(!ide){
    alert("Pon un ID");
    return;
  }

  try{
    const res = await fetch("/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ide})
    });

    const data = await res.json();

    if(data && data.ide){
      usuario = data;

      guardar();
      actualizarSesion();
      volver();
    } else {
      alert(data.error || "No existe");
    }

  } catch(e){
    alert("Error de conexión con el servidor");
  }
}

// 🔍 RECUPERAR CUENTA
async function recuperar(){
  const texto = document.getElementById("buscar").value;

  if(!texto){
    alert("Escribe algo");
    return;
  }

  try{
    const res = await fetch("/recuperar/"+texto);
    const data = await res.json();

    if(data.length === 0){
      alert("No se encontraron cuentas");
    } else {
      let lista = data.map(u => `${u.apodo} (ID: ${u.ide})`).join("\n");
      alert("Resultados:\n\n" + lista);
    }

  } catch(e){
    alert("Error de conexión");
  }
}

// 💾 GUARDAR SESIÓN
function guardar(){
  localStorage.setItem("user", JSON.stringify(usuario));
}

// 🔝 TEXTO SESIÓN
function actualizarSesion(){
  const txt = document.getElementById("sesion");

  if(usuario){
    txt.innerText = "👤 " + usuario.apodo + " | Conectado";
  } else {
    txt.innerText = "❌ No has iniciado sesión";
  }
}

// 🚪 LOGOUT
function logout(){
  localStorage.removeItem("user");
  location.reload();
}

// 👤 PERFIL
function abrirPerfil(){
  if(!usuario){
    alert("No has iniciado sesión");
    return;
  }

  const box = document.getElementById("perfilBox");

  box.style.display = box.style.display === "block" ? "none" : "block";

  document.getElementById("nombre").innerText = usuario.apodo;
  document.getElementById("miID").innerText = usuario.ide;
  document.getElementById("avatarGrande").innerText = usuario.avatar || "😎";
}

// 🎮 BOTÓN ENTRAR
function entrar(){
  alert("🔥 Ya queda poco... preparando juego");
}

// 🌙 MODO
function cambiarModo(){
  document.body.classList.toggle("light");
}
