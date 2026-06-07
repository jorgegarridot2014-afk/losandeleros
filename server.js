const express = require("express");
const path = require("path");

const app = express();

/* ================= MANTENIMIENTO SIEMPRE ================= */
app.use((req, res) => {
  return res.sendFile(path.join(__dirname, "public", "mantenimiento.html"));
});

/* ================= START ================= */
app.listen(process.env.PORT || 3000, () => {
  console.log("🚧 Modo mantenimiento activo siempre");
});