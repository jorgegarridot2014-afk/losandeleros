const express = require("express");
const app = express();

let mantenimiento = true;

app.use(express.static(__dirname));

app.get("/estado", (req, res) => {
  res.json({ mantenimiento });
});

app.get("/on", (req, res) => {
  mantenimiento = true;
  res.send("ON");
});

app.get("/off", (req, res) => {
  mantenimiento = false;
  res.send("OFF");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo");
});
