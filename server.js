const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());
app.use(express.static("public"));

/* 🔥 CONEXIÓN MONGO */
mongoose.connect("mongodb+srv://6767:Dfagt3evMJbBKuqj@cluster0.cqeusrr.mongodb.net/appUsuarios")
.then(() => console.log("Mongo conectado"))
.catch(err => console.log(err));

/* MODELO USUARIO */
const User = mongoose.model("User", {
  apodo: String,
  ide: String
});

/* CREAR CUENTA */
app.post("/crear", async (req, res) => {
  try{
    const ide = Math.floor(Math.random() * 1000000).toString();

    const user = new User({
      apodo: req.body.apodo,
      ide
    });

    await user.save();
    res.json(user);
  }catch(e){
    res.json(null);
  }
});

/* LOGIN */
app.post("/login", async (req, res) => {
  try{
    const user = await User.findOne({ ide: req.body.ide });
    res.json(user);
  }catch(e){
    res.json(null);
  }
});

/* ELIMINAR CUENTA */
app.post("/eliminar", async (req, res) => {
  try{
    await User.deleteOne({ ide: req.body.ide });
    res.json({ ok: true });
  }catch(e){
    res.json({ ok: false });
  }
});

/* PUERTO PARA RENDER */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor funcionando en puerto " + PORT);
});