const express = require("express");
const path = require("path");

const app = express();

/* ================= SOLO REFLEJOS ================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reflejos.html"));
});

/* ================= START ================= */
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Reflejos activo");
});