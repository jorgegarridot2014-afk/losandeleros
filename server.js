const express = require("express");
const app = express();

// esto sirve los archivos como index.html
app.use(express.static(__dirname));

// prueba simple
app.get("/", (req, res) => {
  res.send("LOS ANDELEROS FUNCIONA 🔥");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
