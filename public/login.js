let usuario = null;

// 🚀 AL CARGAR
window.onload = function () {
  const guardado = localStorage.getItem("user");

  if (guardado) {
    usuario = JSON.parse(guardado);
    actualizarSesion();
  }
};

// 📂 MOSTRAR MENÚ
function mostrar(tipo) {
  const panel = document.getElementById("panel");

  if (tipo === "crear") {
    panel.innerHTML = `
      <input id="apodo" placeholder="Apodo"><br>
      <button onclick="crear()">Crear cuenta</button>
      <button onclick="volver()">Volver</button>
    `;
  }

  if (tipo === "login") {
    panel.innerHTML = `
      <input id="ide" placeholder="ID"><br>
      <button onclick="login()">Entrar</button>
      <button onclick="volver()">Volver</button>
    `;
  }

  if (tipo === "buscar") {
    panel.innerHTML = `
      <input id="buscar" placeholder="Buscar"><br>
      <button onclick="recuperar()">Buscar</button>
      <button onclick="volver()">Volver</button>
    `;
  }
}

// 🔙 VOLVER
function volver() {
  document.getElementById("panel").innerHTML = "";
}

// 🆕 CREAR CUENTA
async function crear() {
  const apodo = document.getElementById("apodo").value;

  if (!apodo) {
    alert("Pon un apodo");
    return;
  }

  try {
    const res = await fetch("/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apodo })
    });

    const data = await res.json();
    const user = data.user || data;

    if (user && user.ide) {
      alert("Tu ID es: " + user.ide);

      usuario = user;
      guardar();
      actualizarSesion();
      volver();
    } else {
      alert(data.error || "Error");
    }

  } catch (e) {
    alert("Error servidor");
  }
}

// 🔑 LOGIN
async function login() {
  const ide = document.getElementById("ide").value;

  if (!ide) {
    alert("Pon un ID");
    return;
  }

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ide })
    });

    const data = await res.json();

    if (data && data.ide) {
      usuario = data;

      guardar();
      actualizarSesion();
      volver();
    } else {
      alert(data.error || "No existe");
    }

  } catch (e) {
    alert("Error servidor");
  }
}

// 🔍 RECUPERAR
async function recuperar() {
  const texto = document.getElementById("buscar").value;

  if (!texto) {
    alert("Escribe algo");
    return;
  }

  try {
    const res = await fetch("/recuperar/" + texto);
    const data = await res.json();

    if (data.length === 0) {
      alert("Nada encontrado");
    } else {
      let lista = data.map(u => u.apodo + " (ID: " + u.ide + ")").join("\n");
      alert(lista);
    }

  } catch (e) {
    alert("Error servidor");
  }
}

// 💾 GUARDAR
function guardar() {
  localStorage.setItem("user", JSON.stringify(usuario));
}

// 🔝 TEXTO SESIÓN
function actualizarSesion() {
  const txt = document.getElementById("sesion");

  if (usuario) {
    txt.innerText = "👤 " + usuario.apodo;
  } else {
    txt.innerText = "No has iniciado sesión";
  }
}

// 🚪 LOGOUT
function logout() {
  localStorage.removeItem("user");
  location.reload();
}

// 👤 PERFIL
function abrirPerfil() {
  if (!usuario) {
    alert("No has iniciado sesión");
    return;
  }

  const box = document.getElementById("perfilBox");

  if (box.style.display === "block") {
    box.style.display = "none";
  } else {
    box.style.display = "block";
  }

  document.getElementById("nombre").innerText = usuario.apodo;
  document.getElementById("miID").innerText = usuario.ide;
  document.getElementById("avatarGrande").innerText = usuario.avatar || "😎";
}

// 🎮 ENTRAR
function entrar() {
  alert("Ya queda poco...");
}

// 🌙 MODO
function cambiarModo() {
  document.body.classList.toggle("light");
}
