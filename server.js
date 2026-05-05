const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const FILE = path.join(__dirname, "users.json");

// 📁 Crear users.json si no existe
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "[]");
}

// 📥 Leer usuarios
function leerUsuarios() {
  try {
    const data = fs.readFileSync(FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// 💾 Guardar usuarios
function guardarUsuarios(usuarios) {
  fs.writeFileSync(FILE, JSON.stringify(usuarios, null, 2));
}

// 🔢 Generar ID único
function generarID(usuarios) {
  let id;
  let existe = true;

  while (existe) {
    id = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    existe = usuarios.some(u => u.ide === id.toString());
  }

  return id.toString();
}

// 🆕 CREAR CUENTA
app.post("/crear", (req, res) => {
  const { apodo } = req.body;

  if (!apodo) {
    return res.json({ error: "Falta apodo" });
  }

  const usuarios = leerUsuarios();

  const nuevo = {
    apodo: apodo,
    ide: generarID(usuarios),
    avatar: "😎"
  };

  usuarios.push(nuevo);
  guardarUsuarios(usuarios);

  res.json({ user: nuevo }); // 🔥 IMPORTANTE
});

// 🔑 LOGIN
app.post("/login", (req, res) => {
  const { ide } = req.body;

  if (!ide) {
    return res.json({ error: "Falta ID" });
  }

  const usuarios = leerUsuarios();

  const user = usuarios.find(u => u.ide === ide);

  if (!user) {
    return res.json({ error: "No existe" });
  }

  res.json(user);
});

// 🔍 RECUPERAR CUENTA
app.get("/recuperar/:texto", (req, res) => {
  const texto = req.params.texto.toLowerCase();

  const usuarios = leerUsuarios();

  const resultados = usuarios.filter(u =>
    u.apodo.toLowerCase().includes(texto)
  );

  res.json(resultados);
});

// 🎨 CAMBIAR AVATAR
app.post("/avatar", (req, res) => {
  const { ide, avatar } = req.body;

  const usuarios = leerUsuarios();

  const user = usuarios.find(u => u.ide === ide);

  if (!user) {
    return res.json({ error: "No existe" });
  }

  user.avatar = avatar;

  guardarUsuarios(usuarios);

  res.json({ ok: true });
});

// 🚀 INICIAR SERVIDOR
const PORT = 3000;

app.listen(PORT, () => {
  console.log("Servidor funcionando en http://localhost:" + PORT);
});
