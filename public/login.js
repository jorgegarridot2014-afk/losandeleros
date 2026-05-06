let usuario = null;
let cuentas = [];

// ===== INICIO =====
window.onload = () => {
  const u = localStorage.getItem("user");
  const c = localStorage.getItem("cuentas");

  if (u) usuario = JSON.parse(u);
  if (c) cuentas = JSON.parse(c);

  render();
};

// ===== RENDER =====
function render() {
  const menu = document.getElementById("menuTop");
  const panel = document.getElementById("panel");
  const sesion = document.getElementById("sesion");

  panel.innerHTML = "";
  document.getElementById("volver").style.display = "none";
  menu.style.display = "block";

  if (usuario) {
    sesion.innerText = "👤 " + usuario.apodo + " (" + usuario.ide + ")";

    menu.innerHTML = `
      <button id="btnEntrar">Entrar</button>
      <button id="btnLogout">Cerrar sesión</button>
    `;

    document.getElementById("btnEntrar").onclick = entrar;
    document.getElementById("btnLogout").onclick = logout;

  } else {
    sesion.innerText = "No has iniciado sesión";

    menu.innerHTML = `
      <button id="btnLoginMenu">Iniciar sesión</button>
      <button id="btnCrearMenu">Crear cuenta</button>
      <button id="btnRecuperarMenu">Recuperar cuenta</button>
    `;

    document.getElementById("btnLoginMenu").onclick = mostrarLogin;
    document.getElementById("btnCrearMenu").onclick = mostrarCrear;
    document.getElementById("btnRecuperarMenu").onclick = mostrarRecuperar;

    if (cuentas.length > 0) {
      panel.innerHTML = "<h3>Cuentas guardadas</h3>" +
        cuentas.map(u => `
          <div>
            ${u.apodo} (${u.ide})
            <button onclick="usarCuenta('${u.ide}')">Entrar</button>
          </div>
        `).join("");
    }
  }
}

// ===== CONTROL OPCIONES =====
function abrirOpcion(html) {
  document.getElementById("menuTop").style.display = "none";
  document.getElementById("volver").style.display = "inline-block";
  document.getElementById("panel").innerHTML = html;
}

function volver() {
  document.getElementById("panel").innerHTML = "";
  render();
}

// ===== CREAR =====
function mostrarCrear() {
  abrirOpcion(`
    <input id="apodo" placeholder="Apodo"><br>
    <button id="btnCrear">Crear</button>
  `);

  setTimeout(() => {
    document.getElementById("btnCrear").onclick = crear;
  }, 0);
}

async function crear() {
  const apodo = document.getElementById("apodo").value;
  if (!apodo) return alert("Pon un nombre");

  const res = await fetch("/crear", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({apodo})
  });

  const data = await res.json();
  if (data.error) return alert(data.error);

  usuario = data;
  guardarUsuario();
  añadirCuenta(data);

  render();
}

// ===== LOGIN =====
function mostrarLogin() {
  abrirOpcion(`
    <input id="ide" placeholder="ID"><br>
    <button id="btnLogin">Entrar</button>
  `);

  setTimeout(() => {
    document.getElementById("btnLogin").onclick = login;
  }, 0);
}

async function login() {
  const ide = document.getElementById("ide").value;

  const res = await fetch("/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ide})
  });

  const data = await res.json();
  if (data.error) return alert("No existe");

  usuario = data;
  guardarUsuario();
  añadirCuenta(data);

  render();
}

// ===== RECUPERAR (ARREGLADO) =====
function mostrarRecuperar() {
  abrirOpcion(`
    <input id="buscar" placeholder="Buscar usuario"><br>
    <button id="btnBuscar">Buscar</button>
    <div id="res"></div>
  `);

  setTimeout(() => {
    document.getElementById("btnBuscar").onclick = buscar;
  }, 0);
}

async function buscar() {
  const txt = document.getElementById("buscar").value;

  if (!txt) return alert("Escribe algo");

  try {
    const res = await fetch("/recuperar/" + txt);

    if (!res.ok) return alert("Error servidor");

    const data = await res.json();

    const cont = document.getElementById("res");

    if (data.length === 0) {
      cont.innerHTML = "No se encontró ninguna cuenta";
      return;
    }

    cont.innerHTML = data.map(u => `
      <div>
        ${u.apodo} (${u.ide})
        <button onclick="usarCuenta('${u.ide}')">Usar</button>
      </div>
    `).join("");

  } catch (e) {
    console.error(e);
    alert("Error conexión");
  }
}

// ===== CUENTAS =====
function añadirCuenta(u) {
  if (!cuentas.find(c => c.ide === u.ide)) {
    cuentas.push(u);
    localStorage.setItem("cuentas", JSON.stringify(cuentas));
  }
}

function usarCuenta(ide) {
  usuario = cuentas.find(c => c.ide == ide);
  guardarUsuario();
  render();
}

function guardarUsuario() {
  localStorage.setItem("user", JSON.stringify(usuario));
}

// ===== LOGOUT =====
function logout() {
  usuario = null;
  localStorage.removeItem("user");
  render();
}

// ===== ENTRAR =====
function entrar() {
  abrirOpcion(`
    <h2>🔥 Ya queda poco...</h2>
    <div class="spinner"></div>
    <button id="irSitio">Ir a ScapeRooms</button>
  `);

  setTimeout(() => {
    document.getElementById("irSitio").onclick = () => {
      window.location.href = "https://darkterminal.onrender.com/";
    };
  }, 0);
}

// ===== PERFIL =====
function abrirPerfil() {
  if (!usuario) return alert("No has iniciado sesión");

  document.getElementById("perfilBox").style.display = "block";

  document.getElementById("nombre").innerText = usuario.apodo || "Sin nombre";
  document.getElementById("miID").innerText = usuario.ide || "Sin ID";

  document.getElementById("avatarGrande").src =
    usuario.avatar || "https://i.pravatar.cc/100";
}

function cerrarPerfil() {
  document.getElementById("perfilBox").style.display = "none";
}

// ===== CAMBIAR FOTO =====
function cambiarAvatar(src) {
  if (!usuario) return;

  usuario.avatar = src;
  guardarUsuario();

  document.getElementById("avatarGrande").src = src;
}

// ===== MODO =====
function cambiarModo() {
  document.body.classList.toggle("light");
}

// ===== MÚSICA =====
function toggleMusica() {
  const audio = document.getElementById("audio");

  audio.volume = 0.3;

  if (audio.paused) {
    audio.play().catch(() => {
      alert("Pulsa otra vez 🔊");
    });
  } else {
    audio.pause();
  }
}
