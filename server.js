const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= MONGO ================= */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("🟢 Mongo conectado"))
.catch(err=>console.log("❌ Mongo error:", err));

/* ================= MODELO ================= */
const UserSchema = new mongoose.Schema({
  apodo: { type: String, required: true },
  ide: { type: String, required: true, unique: true },
  foto: { type: String, default: "pfp/p1.svg" },
  setup: { type: Boolean, default: false },
  aceptado: { type: Boolean, default: false },
  noMostrar: { type: Boolean, default: false }
});

const User = mongoose.model("User", UserSchema);

const PALABRAS_PROHIBIDAS = ["tonto", "feo", "malo", "joder", "idiota"]; // Sincronizado

function esMalsonante(texto) {
  const low = String(texto || "").toLowerCase();
  return PALABRAS_PROHIBIDAS.some(p => low.includes(p));
}

/* ================= NORMALIZAR FOTOS ================= */
function normalizeFoto(src){
  if(!src || typeof src !== "string") return "pfp/p1.svg";
  if(src.endsWith(".png")){
    return src.replace(/\.png$/, ".svg");
  }
  return src;
}

/* ================= FRONTEND ================= */
app.use(express.static("public"));

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

/* ================= GENERAR ID ================= */
function generarID(){
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
  const LENGTH = 16; // ID más largo y seguro
  let ide = "";

  for(let i = 0; i < LENGTH; i++){
    ide += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }

  return ide;
}

async function generarIDUnico(){
  let ide;
  let existe = true;

  while(existe){
    ide = generarID();
    existe = await User.exists({ ide });
  }

  return ide;
}

/* ================= CREAR (SOLO BASE) ================= */
app.post("/crear", async (req,res)=>{
  try{

    if(!req.body.apodo){
      return res.status(400).json({ error:"Apodo requerido" });
    }

    if(esMalsonante(req.body.apodo)){
      return res.status(400).json({ error: "El apodo contiene palabras no permitidas" });
    }

    const ide = await generarIDUnico();

    const nueva = new User({
      apodo: req.body.apodo,
      ide,
      foto: normalizeFoto(req.body.foto),
      aceptado: req.body.aceptado === true,
      noMostrar: req.body.noMostrar === true
    });

    await nueva.save();
    console.log("💾 Cuenta creada en DB:", nueva.apodo, nueva.ide);

    res.json(nueva);

  }catch(err){
    console.log("❌ Error crear:", err);
    res.status(500).json({ error:"Error creando cuenta" });
  }
});

/* ================= LOGIN ================= */
app.post("/login", async (req,res)=>{
  try{

    const ide = String(req.body.ide || "").trim();
    if(!ide){
      return res.status(400).json({ error:"ID requerido" });
    }

    const user = await User.findOne({ ide });

    if(!user){
      return res.status(404).json({ error:"No existe" });
    }

    res.json(user);

  }catch(err){
    console.log("❌ Error login:", err);
    res.status(500).json({ error:"Error login" });
  }
});

/* ================= CUENTAS ================= */
app.get("/cuentas", async (req,res)=>{
  try{
    // Solo devolvemos cuentas que terminaron el proceso (aceptado: true)
    const users = await User.find({ aceptado: true }).lean(); 
    const normalizedUsers = [];

    for(const user of users){
      normalizedUsers.push({ ...user, foto: normalizeFoto(user.foto) });
    }

    res.json(normalizedUsers);

  }catch(err){
    console.log("❌ Error cuentas:", err);
    res.status(500).json({ error:"Error cuentas" });
  }
});

/* ================= UPDATE ================= */
app.put("/update/:ide", async (req,res)=>{
  try{

    const updateData = { ...req.body };
    if(updateData.foto){
      updateData.foto = normalizeFoto(updateData.foto);
    }

    const user = await User.findOneAndUpdate(
      { ide: String(req.params.ide) },
      updateData,
      { new:true }
    );

    if(!user){
      return res.status(404).json({ error:"No existe" });
    }

    res.json(user);

  }catch(err){
    console.log("❌ Error update:", err);
    res.status(500).json({ error:"Error update" });
  }
});

/* ================= PRIVACIDAD ================= */
app.put("/aceptar/:ide", async (req,res)=>{
  try{

    const user = await User.findOneAndUpdate(
      { ide: String(req.params.ide) },
      {
        aceptado: true,
        noMostrar: req.body.noMostrar === true,
        foto: req.body.foto ? normalizeFoto(req.body.foto) : undefined
      },
      { new:true }
    );

    if(!user){
      return res.status(404).json({ error:"No existe" });
    }

    console.log("✅ Aceptó:", user.apodo);

    res.json(user);

  }catch(err){
    console.log("❌ Error aceptar:", err);
    res.status(500).json({ error:"Error aceptar" });
  }
});

/* ================= DELETE ================= */
app.delete("/delete/:ide", async (req,res)=>{
  try{
    const ideLimpio = String(req.params.ide || "").trim();
    
    if(!ideLimpio){
      return res.status(400).json({ error: "ID no proporcionado" });
    }

    const result = await User.deleteOne({ ide: ideLimpio });

    if(result.deletedCount === 0){
      return res.status(404).json({ error:"No existe" });
    }

    res.json({ ok:true });

  }catch(err){
    console.log("❌ Error delete:", err);
    res.status(500).json({ error:"Error delete" });
  }
});

/* ================= BORRAR TODO ================= */
// app.delete("/borrarTodo", async (req,res)=>{
//   try{
//     await User.deleteMany({});
//     res.json({ ok:true, message: "Todas las cuentas eliminadas" });
//   }catch(err){
//     res.status(500).json({ error:"Error al borrar todo" });
//   }
// });

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server funcionando en puerto ${PORT}`);
});