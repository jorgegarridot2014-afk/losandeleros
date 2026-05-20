const express = require("express");
const app = express();

/* 💀 SERVIR ARCHIVOS (si los tienes) */
app.use(express.static("public"));

/* 💀 RUTA PRINCIPAL */
app.get("*", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

/* 💀 PUERTO RENDER */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor funcionando en puerto " + PORT);
});