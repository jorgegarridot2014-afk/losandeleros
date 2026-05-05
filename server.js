const express = require("express");
const app = express();

// servir carpeta public
app.use(express.static("public"));

app.listen(3000, () => {
  console.log("Servidor en mantenimiento en http://localhost:3000");
});