const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect("mongodb://127.0.0.1:27017/appUsuarios")
.then(()=> console.log("✅ Mongo conectado"))
.catch(err=> console.log("❌ Mongo error:", err));

const User = mongoose.model("User", {
  apodo: String,
  ide: String
}, "users");

/* CREAR */
app.post("/crear", async (req,res)=>{
  const { apodo } = req.body;
  if(!apodo) return res.json(null);

  const ide = Date.now().toString();

  const user = new User({ apodo, ide });
  await user.save();

  res.json(user);
});

/* LOGIN */
app.post("/login", async (req,res)=>{
  const { ide } = req.body;
  const user = await User.findOne({ ide });
  res.json(user || null);
});

app.listen(3000, ()=> console.log("🚀 http://localhost:3000"));