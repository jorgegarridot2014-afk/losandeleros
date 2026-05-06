const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const FILE = path.join(__dirname, "users.json");

// crear archivo si no existe
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "[]");
}

// leer
function leerUsuarios() {
  return JSON.parse(fs.readFileSync(FILE));
}

// guardar
function guardarUsuarios(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// generar ID
function generarID(users) {
  return (users.length + 1).toString().padStart(4, "0");
}

// ===== CREAR =====
app.post("/crear", (req, res) => {
  const { apodo } = req.body;

  if (!apodo) return res.json({ error: "Falta apodo" });

  const users = leerUsuarios();

  const nuevo = {
    apodo,
    ide: generarID(users),
    avatar: ""
  };

  users.push(nuevo);
  guardarUsuarios(users);

  res.json(nuevo);
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  const { ide } = req.body;

  const users = leerUsuarios();

  const user = users.find(u => u.ide === ide);

  if (!user) return res.json({ error: "No existe" });

  res.json(user);
});

// ===== RECUPERAR =====
app.get("/recuperar/:txt", (req, res) => {
  const txt = req.params.txt.toLowerCase();

  const users = leerUsuarios();

  const result = users.filter(u =>
    u.apodo.toLowerCase().includes(txt)
  );

  res.json(result);
});

// ===== AVATAR =====
app.post("/avatar", (req, res) => {
  const { ide, avatar } = req.body;

  const users = leerUsuarios();

  const user = users.find(u => u.ide === ide);

  if (user) {
    user.avatar = avatar;
    guardarUsuarios(users);
  }

  res.json({ ok: true });
});

// ===== START =====
app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});