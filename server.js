const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const FILE = path.join(__dirname, "users.json");

// 🔧 Crear archivo si no existe
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
function guardarUsuarios(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// 🔢 Generar ID único
function generarID(usuarios) {
  let id = usuarios.length + 1;
  return id.toString().padStart(4, "0");
}

// 🆕 CREAR CUENTA
app.post("/crear", (req, res) => {
  const { apodo } = req.body;

  if (!apodo) {
    return res.status(400).json({ error: "Falta apodo" });
  }

  const usuarios = leerUsuarios();

  const nuevo = {
    apodo: apodo,
    ide: generarID(usuarios),
    foto: ""
  };

  usuarios.push(nuevo);
  guardarUsuarios(usuarios);

  res.json(nuevo);
});

// 🔑 LOGIN
app.post("/login", (req, res) => {
  const { ide } = req.body;

  if (!ide) {
    return res.status(400).json({ error: "Falta ID" });
  }

  const usuarios = leerUsuarios();

  const user = usuarios.find(u => u.ide === ide);

  if (!user) {
    return res.status(404).json({ error: "No existe" });
  }

  res.json(user);
});

// 🔍 RECUPERAR CUENTA (GLOBAL)
app.get("/recuperar/:texto", (req, res) => {
  const texto = req.params.texto.toLowerCase();

  const usuarios = leerUsuarios();

  const resultados = usuarios.filter(u =>
    u.apodo.toLowerCase().includes(texto)
  );

  res.json(resultados);
});

// 🚀 INICIAR SERVIDOR
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});