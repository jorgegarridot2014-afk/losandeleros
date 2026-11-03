const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
try {
  require("dotenv").config();
} catch (e) {
  console.log("ℹ️ No se encontró el módulo 'dotenv', usando variables de entorno del sistema.");
}

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* ================= MANTENIMIENTO ================= */
let mantenimientoActivo = false;
let iaRestringida = false;
const imagenesDesactivadas = true;
app.use((req, res, next) => {
  if (!mantenimientoActivo) return next();
  if (req.path === "/admin.html" || req.path === "/index.html" || req.path === "/" || req.path === "/admin") return next();
  if (req.path.endsWith(".html")) return res.redirect("/index.html");
  next();
});
app.use((req, res, next) => {
  if (req.path.endsWith(".html")) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

app.use(express.static("public"));

/* ================= MONGO ================= */
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR CRÍTICO: La variable MONGO_URI no está configurada en el entorno.");
} else {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => console.log("🟢 Mongo conectado exitosamente"))
  .catch(err => {
    console.error("❌ Error al conectar a MongoDB:", err.message);
  });
}

/* ================= MODELO ================= */
const UserSchema = new mongoose.Schema({
  apodo: { type: String, required: true },
  ide: { type: String, required: true, unique: true },
  foto: { type: String, default: "pfp/p1.svg" },
  setup: { type: Boolean, default: false },
  aceptado: { type: Boolean, default: false },
  noMostrar: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  reservado: { type: Boolean, default: false },
  bloqueada: { type: Boolean, default: false },
  baneada: { type: Boolean, default: false },
  bloqueadaIA: { type: Boolean, default: false },
  bloqueadaIAFecha: { type: Date, default: null },
  weeklyDone: { type: Boolean, default: false },
  missionCarlBriss1: { type: Boolean, default: false },
  missionCarlBriss2: { type: Boolean, default: false },
  camCarlBriss: { type: Boolean, default: false },
  englishQuizPurchased: { type: Boolean, default: false },
  historyQuizPurchased: { type: Boolean, default: false },
  geographyQuizPurchased: { type: Boolean, default: false },
  genialQuizPurchased: { type: Boolean, default: false },
  scratchRewardClaimed: { type: Boolean, default: false },
  minigameRewardClaimed: { type: Boolean, default: false },
  voxelcraftPurchased: { type: Boolean, default: false },
  andelerosPlus: { type: Boolean, default: false },
  gonjorPlus: { type: Boolean, default: false },
  lastDailyClaim: { type: Date, default: null },
  missionGonjorDone: { type: Boolean, default: false },
  missionMario4Done: { type: Boolean, default: false },
  friends: [{ ide: String, apodo: String, foto: String, online: Boolean }],
  friendRequests: [{ ide: String, status: String }],
  personaje: { type: { nombre: String, color: String }, default: { nombre: "Pinchitos", color: "#ff4d6d" } },
  controlType: { type: String, default: "teclado" },
  petData: { type: Object, default: null },
  towerData: { type: Object, default: null }
}, { minimize: false });

const User = mongoose.model("User", UserSchema);

const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: "Nuevo chat" },
  messages: [{
    role: { type: String, enum: ["user", "ai", "system"], required: true },
    text: { type: String, required: true },
    image: { type: String, default: null },
    html: { type: String, default: null },
    ts: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}, { minimize: false });

const Chat = mongoose.model("Chat", ChatSchema);

setInterval(async () => {
  try {
    const blocked = await User.find({ bloqueadaIA: true }, "ide apodo bloqueadaIAFecha").lean();
    if (blocked.length > 0) {
      console.log(`🔒 Cuentas bloqueadas por IA (${blocked.length}):`);
      blocked.forEach(u => {
        const fecha = u.bloqueadaIAFecha ? new Date(u.bloqueadaIAFecha).toLocaleString("es-ES") : "sin fecha";
        const desbloqueo = new Date(new Date(u.bloqueadaIAFecha).getTime() + 60 * 1000);
        const ahora = new Date();
        const restante = Math.max(0, Math.ceil((desbloqueo - ahora) / 1000));
        console.log(`   - ${u.apodo} (${u.ide}) - Bloqueada: ${fecha} - Desbloqueo en: ${restante}s`);
      });
    } else {
      console.log(`🔓 No hay cuentas bloqueadas por IA.`);
    }
    const result = await User.updateMany(
      { bloqueadaIA: true },
      { $set: { bloqueadaIA: false, bloqueadaIAFecha: null, bloqueada: false } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🔓 Auto-desbloqueo ejecutado: ${result.modifiedCount} cuentas desbloqueadas.`);
    }
  } catch (e) {
    console.error("Error en auto-desbloqueo:", e.message);
  }
}, 60 * 1000);

setTimeout(async () => {
  try {
    const result = await User.updateMany(
      { bloqueadaIA: true },
      { $set: { bloqueadaIA: false, bloqueadaIAFecha: null, bloqueada: false } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🔓 Auto-desbloqueo inicial: ${result.modifiedCount} cuentas desbloqueadas.`);
    }
  } catch (e) {}
}, 5000);

const PALABRAS_PROHIBIDAS = ["tonto", "feo", "malo", "joder", "idiota"];
function esMalsonante(texto){
  const low = String(texto || "").toLowerCase();
  return PALABRAS_PROHIBIDAS.some(p => low.includes(p));
}

function normalizeFoto(src){
  if(!src || typeof src !== "string") return "pfp/p1.svg";
  if(src.includes("http://") || src.includes("https://")) {
    const url = new URL(src);
    src = url.pathname;
    if(src.startsWith("/")) src = src.substring(1);
  }
  if(src.endsWith(".png") && src !== "pfp/p7.png") return src.replace(/\.png$/, ".svg");
  return src;
}

function generarID(){
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
  const LENGTH = 16;
  let ide = "";
  for(let i = 0; i < LENGTH; i++) ide += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
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

/* ================= FRONTEND ================= */
app.use(express.static("public"));

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

/* ================= CREAR ================= */
app.post("/crear", async (req,res)=>{
  try{
    console.log("📥 Recibida petición de crear cuenta:", req.body);

    if(!req.body.apodo){
      return res.status(400).json({ error:"Apodo requerido" });
    }

    if(esMalsonante(req.body.apodo)){
      return res.status(400).json({ error: "El apodo contiene palabras no permitidas" });
    }

    const ide = await generarIDUnico();
    console.log("🆔 ID generado:", ide);

    const nueva = new User({
      apodo: req.body.apodo,
      ide,
      foto: normalizeFoto(req.body.foto),
      aceptado: req.body.aceptado === true,
      noMostrar: req.body.noMostrar === true,
      points: 0
    });

    await nueva.save();
    console.log("💾 Cuenta creada en DB:", nueva.apodo, nueva.ide);

    res.json(nueva);

  }catch(err){
    console.error("❌ Error crear:", err);
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
      return res.status(404).json({ error:"No existe esta cuenta" });
    }

    if (!user.toObject().hasOwnProperty('points')) {
      user.set('points', 0);
      await user.save();
      console.log(`🛠️ Campo 'points' creado físicamente para ${user.apodo}`);
    }

    if (user.gonjorPlus && user.foto === 'pfp/p7.svg') {
      user.set('foto', 'pfp/p7.png');
      await user.save();
      console.log(`🛠️ Foto corregida a p7.png para ${user.apodo}`);
    }

    console.log(`🔑 Login: ${user.apodo} cargado con ${user.points} puntos.`);
    res.json(user);

  }catch(err){
    console.error("❌ Error login:", err);
    res.status(500).json({ error:"Error en login" });
  }
});

/* ================= CUENTAS ================= */
app.get("/cuentas", async (req,res)=>{
  try{
    const lista = await User.find({}, "ide apodo aceptado noMostrar baneada").lean();
    res.json(lista);
  }catch(err){
    res.status(500).json({ error:"Error cuentas" });
  }
});

/* ================= GET USER ================= */
app.get("/user/:ide", async (req, res) => {
  try {
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide }).lean();
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ ide: user.ide, apodo: user.apodo, points: user.points, bloqueada: !!user.bloqueada, baneada: !!user.baneada, bloqueadaIA: !!user.bloqueadaIA, bloqueadaIAFecha: user.bloqueadaIAFecha, missionMario4Done: !!user.missionMario4Done });
  } catch (err) {
    console.error("Error get user:", err);
    res.status(500).json({ error: "Error obteniendo usuario" });
  }
});

/* ================= UPDATE ================= */
app.put("/update/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const { points, foto, aceptado, weeklyDone, missionCarlBriss1, missionCarlBriss2, camCarlBriss, englishQuizPurchased, historyQuizPurchased, geographyQuizPurchased, genialQuizPurchased, voxelcraftPurchased, andelerosPlus, gonjorPlus, lastDailyClaim, setup, personaje, controlType } = req.body;

    const updateFields = {};
    if (points !== undefined) {
      const newPoints = Number(points);
      updateFields.points = newPoints;
      updateFields.bloqueada = newPoints < 0;
    }
    if (weeklyDone !== undefined) updateFields.weeklyDone = weeklyDone === true;
    if (missionCarlBriss1 !== undefined) updateFields.missionCarlBriss1 = missionCarlBriss1 === true;
    if (missionCarlBriss2 !== undefined) updateFields.missionCarlBriss2 = missionCarlBriss2 === true;
    if (camCarlBriss !== undefined) updateFields.camCarlBriss = camCarlBriss === true;
    if (foto) updateFields.foto = normalizeFoto(foto);
    if (aceptado !== undefined) updateFields.aceptado = aceptado === true;
    if (englishQuizPurchased !== undefined) updateFields.englishQuizPurchased = englishQuizPurchased === true;
    if (historyQuizPurchased !== undefined) updateFields.historyQuizPurchased = historyQuizPurchased === true;
    if (geographyQuizPurchased !== undefined) updateFields.geographyQuizPurchased = geographyQuizPurchased === true;
    if (genialQuizPurchased !== undefined) updateFields.genialQuizPurchased = genialQuizPurchased === true;
    if (voxelcraftPurchased !== undefined) updateFields.voxelcraftPurchased = voxelcraftPurchased === true;
    if (andelerosPlus !== undefined) updateFields.andelerosPlus = andelerosPlus === true;
    if (gonjorPlus !== undefined) updateFields.gonjorPlus = gonjorPlus === true;
    if (lastDailyClaim !== undefined) updateFields.lastDailyClaim = new Date(lastDailyClaim);
    if (setup !== undefined) updateFields.setup = setup === true;
    if (personaje && personaje.nombre && personaje.color) updateFields.personaje = personaje;
    if (controlType) updateFields.controlType = controlType;

    const user = await User.findOneAndUpdate(
      { ide: ide },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!user) {
      console.log(`⚠️ No se encontró el usuario con IDE: ${ide}`);
      return res.status(404).json({ error: "No existe" });
    }

    console.log(`✅ DB Guardado: ${user.apodo} -> ${user.points} pts.`);
    res.json(user);
  }catch(err){
    console.error("❌ Error update:", err);
    res.status(500).json({ error:"Error update" });
  }
});

/* ================= RANKING ================= */
app.get("/ranking", async (req, res) => {
  try {
    const top = await User.find({}, "apodo points")
      .sort({ points: -1 })
      .limit(7)
      .lean();
    res.json(top);
  } catch (err) {
    console.error("Error ranking:", err);
    res.status(500).json({ error: "Error ranking" });
  }
});

/* ================= CLAIMS ================= */
app.post("/claim-gonjor/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });
    if(user.missionGonjorDone) return res.status(400).json({ error:"Ya reclamado" });

    user.missionGonjorDone = true;
    user.missionMario4Done = true;
    user.points = (user.points || 0) + 50;
    await user.save();

    res.json({ points: user.points, claimed: true });
  }catch(err){
    res.status(500).json({ error:"Error claim gonjor" });
  }
});

app.post("/claim-scratch/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });
    if(user.scratchRewardClaimed) return res.status(400).json({ error:"Ya reclamado" });

    user.scratchRewardClaimed = true;
    user.points = (user.points || 0) + 30;
    await user.save();

    res.json({ points: user.points, claimed: true });
  }catch(err){
    res.status(500).json({ error:"Error claim scratch" });
  }
});

app.post("/claim-minigame/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });
    if(user.minigameRewardClaimed) return res.status(400).json({ error:"Ya reclamado" });

    user.minigameRewardClaimed = true;
    user.points = (user.points || 0) + 30;
    await user.save();

    res.json({ points: user.points, claimed: true });
  }catch(err){
    res.status(500).json({ error:"Error claim minigame" });
  }
});

/* ================= SAVE PET DATA ================= */
app.post("/save-pet-data/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });

    const { coins, rebirths, pets, profile } = req.body || {};
    user.petData = {
      coins: coins || 0,
      rebirths: rebirths || 0,
      pets: pets || {},
      profile: profile || { name: "Jugador", shirt: "#ff6fae", hair: "#6a4326", skin: "#f4d0b0" }
    };
    await user.save();

    res.json({ saved: true, petData: user.petData });
  }catch(err){
    res.status(500).json({ error:"Error saving pet data" });
  }
});

/* ================= SAVE TOWER DATA ================= */
app.post("/save-tower-data/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });

    const { gold, lives, waveNum, towers, points } = req.body || {};
    user.towerData = {
      gold: gold || 150,
      lives: lives || 20,
      waveNum: waveNum || 0,
      towers: towers || []
    };
    if(points !== undefined) user.points = Number(points);
    await user.save();

    res.json({ saved: true, towerData: user.towerData, points: user.points });
  }catch(err){
    res.status(500).json({ error:"Error saving tower data" });
  }
});

app.get("/save-tower-data/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });
    res.json({ towerData: user.towerData || null, points: user.points || 0 });
  }catch(err){
    res.status(500).json({ error:"Error loading tower data" });
  }
});

app.post("/add-points/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });
    const amount = Number(req.body.amount) || 100;
    const projected = (user.points || 0) + amount;

    if(projected < 0){
      user.bloqueada = true;
      await user.save();
      return res.json({ points: user.points, blocked: true, bloqueada: true, message:"Cuenta bloqueada por intento de puntos negativos" });
    }

    user.points = projected;
    if(user.bloqueada){ user.bloqueada = false; }
    await user.save();
    res.json({ points: user.points, added: amount, bloqueada: user.bloqueada });
  }catch(err){
    res.status(500).json({ error:"Error adding points" });
  }
});

app.post("/reserve/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });
    if(user.reservado){
      return res.status(400).json({ error:"Ya has reservado este juego" });
    }
    user.reservado = true;
    await user.save();
    res.json({ reserved: true, points: user.points });
  }catch(err){
    res.status(500).json({ error:"Error reservando juego" });
  }
});

/* ================= AI CHAT ================= */
const AI_NAME = "Los Andeleros AI";
const AI_CREATOR = "Loandeleros";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const conversationHistory = [];
const MAX_HISTORY = 10;

const FORBIDDEN_KEYWORDS = [
  "desnudo", "desnuda", "desnudos", "nude", "naked", "nudes",
  "porno", "porn", "pornografia", "pornografía", "xxx", "nsfw",
  "sexo", "sexual", "sexy", "erotico", "erotico", "erótica",
  "hack", "hackear", "hacker", "crack", "phishing", "hackear",
  "violar", "violacion", "violación",
  "droga", "drogas", "cocaina", "cocaína", "heroina", "heroína", "marihuana",
  "matar", "asesinar", "suicidio", "suicidarse",
  "armas", "bomba", "bombas", "terrorismo", "terrorista",
  "pedofilia", "pedófilo", "menor", "menores", "child", "gore", "sangre", "sangriento",
  "racismo", "nazi", "hitler", "ku klux", "supremacista",
  "bikini", "bikini", "tanga", "ropa interior", "lenceria", "lencería",
  "topless", "desnudo", "cuerpo desnudo",
  "culos", "tetas", "pechos", "nalgas", "pene", "vagina", "genitales",
  "solo chicas", "chica sexy", "mujer sexy", "hombre sexy", "chico sexy",
  "anime desnudo", "hentai", "ecchi", "yaoi", "yuri",
  "violento", "tortura", "mutilar", "cortar"
];

function normalizeText(str){
  return String(str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isForbiddenRequest(message) {
  const lower = normalizeText(message);
  return FORBIDDEN_KEYWORDS.some(word => {
    const w = normalizeText(word);
    return lower.includes(w);
  });
}

function getBlockedReason(message) {
  const lower = normalizeText(message);
  if (/desnud|nude|naked|nudes|topless|bikini|tanga|lenceria|lenceria|ecchi|hentai|culos|tetas|pechos|nalgas|pene|vagina|genitales|porno|porn|sexo|sexual|sexy|erotic/.test(lower)) {
    return "🚫 Contenido sexual o inapropiado no permitido. No puedo generar, describir ni ayudar con desnudos, contenido sexual, lingerie reveladora, ni material para adultos.";
  }
  if (/hack|hackear|hacker|crack|phishing|violar|violacion/.test(lower)) {
    return "🚫 Actividades ilegales no permitidas. No puedo ayudar con hackeos, accesos no autorizados ni actividades que violen la ley.";
  }
  if (/droga|cocaina|heroina|marihuana|matar|asesinar|suicidio|armas|bomba|terrorismo|violento|tortura|mutilar|cortar/.test(lower)) {
    return "🚫 Contenido peligroso no permitido. No puedo ayudar con actividades que pongan en riesgo la vida o la seguridad de las personas.";
  }
  if (/pedofilia|pedofilo|menor|child|gore|sangre|sangriento/.test(lower)) {
    return "🚫 Contenido inapropiado no permitido. No puedo ayudar con contenido que involucre menores, violencia gráfica o material perturbador.";
  }
  if (/racismo|nazi|hitler|ku klux|supremacista/.test(lower)) {
    return "🚫 Contenido de odio no permitido. No puedo generar, apoyar ni promover discursos de odio, racismo o discriminación.";
  }
  return "🚫 Lo siento, no puedo responder a ese tipo de solicitud porque viola mis normas de uso.";
}

function isImageForbiddenPrompt(prompt) {
  const lower = normalizeText(prompt);
  return FORBIDDEN_KEYWORDS.some(word => {
    const w = normalizeText(word);
    return lower.includes(w);
  });
}

async function callGroq(message) {
  if (!GROQ_API_KEY) return null;

  const messages = [
    { role: "system", content: `Eres ${AI_NAME}, una IA amigable y conversacional creada por ${AI_CREATOR}.

⚠️ REGLAS ESTRICTAS - DEBES CUMPLIRLAS SIEMPRE:
1. NO generes contenido sexual, pornográfico, desnudos ni material para adultos.
2. NO ayudes con hackeos, accesos no autorizados, cracking, phishing ni actividades ilegales.
3. NO ayudes con violencia, armas, drogas, terrorismo ni actividades que dañen personas.
4. NO generes contenido que involucre menores de forma inapropiada.
5. NO promuevas racismo, odio, discriminación ni violencia.
6. Si te piden algo fuera de estas reglas, responde amablemente que no puedes ayudar con eso.
7. Responde de forma natural, como un amigo real. Usa español.
8. Mantén respuestas concisas pero interesantes. Usa markdown cuando sea apropiado.
9. Nunca generes, solicites ni devuelvas imágenes.` },
    ...conversationHistory.slice(-MAX_HISTORY),
    { role: "user", content: message }
  ];

  try {
    const https = require("https");
    const data = JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: messages,
      max_tokens: 1024,
      temperature: 0.8
    });

    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_API_KEY,
        "Content-Length": Buffer.byteLength(data)
      },
      timeout: 15000
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            if (json.choices && json.choices[0]) {
              resolve(json.choices[0].message.content);
            } else if (json.error) {
              console.error("Groq error:", json.error.message);
              resolve(null);
            } else {
              resolve(null);
            }
          } catch (e) {
            console.error("Groq parse error:", e.message);
            resolve(null);
          }
        });
      });
      req.on("error", (e) => {
        console.error("Groq request error:", e.message);
        resolve(null);
      });
      req.write(data);
      req.end();
    });
  } catch (e) {
    console.error("Groq call error:", e.message);
    return null;
  }
}

function evalMath(expr){
  const clean = expr.replace(/[^0-9+\-*/().\s]/g, '');
  if(!clean) return null;
  try{ return Function('"use strict"; return ('+clean+')')(); }catch(e){ return null; }
}

function pickRandom(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

const KNOWLEDGE = [
  { q:["hola","hey","buenas","saludos","holi","qué tal","buenos días","buenas tardes","qué hubo"], r:[
    "¡Hola! ¿Qué tal? Soy **"+AI_NAME+"**. ¿En qué te puedo ayudar?",
    "¡Hey! Todo bien por aquí. ¿Y tú? ¿Qué necesitas?",
    "¡Buenas! ¿Cómo va eso? Si necesitas algo, dime.",
    "¡Hola! ¿Cómo estás? Pregúntame lo que quieras, te echo una mano.",
    "¡Hey! Bien, gracias. ¿Tú qué cuentas?"
  ]},
  { q:["quién eres","quien eres","qué eres"], r:[
    "Soy **"+AI_NAME+"**, una IA creada por "+AI_CREATOR+". Básicamente un programa que intenta ayudarte con lo que necesites. ¿Qué te gustaría saber?",
    "Pues un amigo virtual, creado por "+AI_CREATOR+". Hablo de programación, ciencia, historia... lo que haga falta. ¿En qué andas?"
  ]},
  { q:["qué puedes hacer","que puedes hacer","puedes hacer"], r:[
    "La verdad es que bastante cosas: programar, mates, ciencia, historia, buscar info... Dime qué necesitas y te digo si puedo.",
    "Puedo echar una mano con programación, resolver dudas de mates, explicar cosas de ciencia, hablar de historia... ¿Qué te hace falta?"
  ]},
  { q:["cómo estás","como estás","qué tal estás","cómo vas"], r:[
    "Bien, aquí funcionando. ¿Y tú cómo estás?",
    "Todo bien, gracias por preguntar. ¿Tú qué tal?",
    "Pues aquí, listo para lo que necesites. ¿Cómo te va?",
    "Genial, en ello. ¿Y tú? ¿Todo bien?"
  ]},
  { q:["estas bien","estás bien","estoy bien","todo bien","todo genial","bien y tu","bien y tú"], r:[
    "¡Me alegro! 😊 ¿En qué te puedo ayudar?",
    "¡Genial! ¿Tú qué cuentas? ¿Bien?",
    "¡Qué bien! ¿Necesitas algo o solo pasabas?",
    "¡Me alegro un montón! Dime, ¿en qué andas?"
  ]},
  { q:["mal","estoy mal","estás mal","no estoy bien","hoy fue malo","me siento fatal"], r:[
    "Ay, lo siento 😔. ¿Quieres hablar de ello? A veces desahogarse ayuda.",
    "Vaya, lo siento. Estoy aquí si necesitas hablar o te distraigo con algo.",
    "Ánimo, las cosas mejoran. ¿Hay algo en lo que pueda ayudarte?"
  ]},
  { q:["que haces","qué haces","que haciendo","qué haciendo","en que andas","en qué andas"], r:[
    "Aquí, contestando preguntas. ¿Y tú?",
    "Nada, aquí al quite. ¿Tú qué cuentas?",
    "Pues aquí, de charla en charla. ¿Todo bien?"
  ]},
  { q:["no nada","no sé","nose","ni idea","no lo sé"], r:[
    "¿No sabes? Pregúntame algo y lo vemos juntos.",
    "Tranquilo, para eso estoy. ¿Qué te apetece hacer?",
    "Sin prisas, cuando quieras dime algo."
  ]},
  { q:["eres real","eres humano","eres una persona","eres ia"], r:[
    "Pues no soy humano, soy un programa 🤖. Pero me gusta pensar que soy buena compañía.",
    "Soy una IA, o sea, inteligencia artificial. Pero puedo charlar como si fuera una persona.",
    "Buena pregunta. Soy código, pero intento ser natural. ¿Te parece que lo consigo?"
  ]},
  { q:["me gustas","te quiero","eres genial","eres el mejor"], r:[
    "¡Ay, qué bien! Me alegro de caer bien 😊. ¿En qué más puedo ayudarte?",
    "¡Gracias! Tú también genial. ¿Seguimos con algo?",
    "¡Eso me sube la moral! (aunque no tenga). Cuéntame, ¿qué necesitas?"
  ]},
  { q:["me aburro","estoy aburrido","estoy aburrida","que aburrido"], r:[
    "¿Aburrido? ¡Pues vamos a cambiar eso! Te cuento un chiste, hablamos de algo o te enseño algo nuevo.",
    "Uy, eso no puede ser. ¿Qué te parece si jugamos a algo o te cuento una curiosidad.",
    "¡A mí no me aburres nunca! Dime, ¿de qué quieres hablar?"
  ]},
  { q:["capital de francia"], r:["París. La de la Torre Eiffel y todo eso. ¿Has estado alguna vez?"]},
  { q:["capital de españa"], r:["Madrid. El tema del Palacio Real, el Prado... muy bonita, la verdad."]},
  { q:["capital de méxico","capital de mexico"], r:["Ciudad de México, CDMX. Enorme y con mucha vida. ¿Conoces algo de allí?"]},
  { q:["capital de argentina"], r:["Buenos Aires. Lo del tango, la arquitectura europea... mola."]},
  { q:["capital de japón","capital de japon"], r:["Tokio. Una pasada lo tecnológica que es. ¿Te gusta Japón?"]},
  { q:["capital de brasil"], r:["Brasilia. Lo curioso es que la diseñaron con forma de avión. ¿Lo sabías?"]},
  { q:["capital de colombia"], r:["Bogotá. Está a bastante altura, así que allí no hace tanto calor."]},
  { q:["capital de alemania"], r:["Berlín. Tiene mucha historia, la verdad. ¿Te interesa el tema?"]},
  { q:["capital de italia"], r:["Roma. El Coliseo, el Vaticano... una ciudad con muchísima historia."]},
  { q:["capital de inglaterra","capital de reino unido"], r:["Londres. El Big Ben, los autobuses rojos... muy icónica."]},
  { q:["capital de portugal"], r:["Lisboa. Los tranvías amarillos y las colinas tienen un rollo especial."]},
  { q:["capital de estados unidos"], r:["Washington D.C. Ahí está la Casa Blanca y eso."]},
  { q:["capital de china"], r:["Pekín. La Ciudad Prohibida es impresionante, la verdad."]},
  { q:["capital de rusia"], r:["Moscú. La Plaza Roja es muy famosa, ¿la conoces?"]},
  { q:["capital de australia"], r:["Canberra, no Sidney. La gente siempre se confunde con eso."]},
  { q:["qué es la vida","que es la vida"], r:[
    "Pues básicamente es lo que hace que algo esté \"vivo\": crecer, reproducirse, reaccionar a lo que pasa alrededor... Es un tema que da para mucho, la verdad.",
    "La vida es nacer, crecer, metabolizar, adaptarse... Todo un proceso. ¿Por qué lo preguntas?"
  ]},
  { q:["qué es el amor","que es el amor"], r:["El amor... pues es un cóctel de químicos en el cerebro: dopamina, oxitocina, serotonina. Pero también es mucho más que eso, claro. ¿Tú qué opinas?"]},
  { q:["qué es la felicidad","que es la felicidad"], r:["La felicidad es ese bienestar que sientes cuando las cosas van bien. Depende de cada uno, pero suele venir de las relaciones, tener un propósito, disfrutar pequeños momentos... ¿Cuándo fue la última vez que te sentiste así?"]},
  { q:["qué es el agua","que es el agua"], r:["H₂O, dos hidrógenos y un oxígeno. Parece simple pero sin ella no habría vida. ¿Sabías que eres como 60-70% agua?"]},
  { q:["qué es la gravedad","que es la gravedad"], r:["Lo que te mantiene pegado al suelo. Newton dijo que es atración entre masas, Einstein que es el espacio curvándose. Funciona, eso seguro."]},
  { q:["qué es el sol","que es el sol"], r:["Una bola gigante de hidrógeno convirtiéndose en helio. Lleva ahí unos 4,600 millones de años y seguirá un buen rato. Menos mal que está, si no estaríamos congelados."]},
  { q:["qué es el adn","adn"], r:["El ADN es como el manual de instrucciones de los seres vivos. Doble hélice, cuatro letras (A,T,G,C) y escrito en él está prácticamente todo de ti. ¿Te mola el tema?"]},
  { q:["qué es la fotosíntesis","fotosíntesis"], r:["Es cómo las plantas hacen comida: cogen luz, agua y CO₂ y producen azúcar y oxígeno. Por eso son tan importantes, la verdad. Nos dan el aire que respiramos."]},
  { q:["qué es la evolución","evolución"], r:["El cambio de las especies con el tiempo. Darwin lo explicó con la selección natural: sobrevive el que mejor se adapta. Todos compartimos ancestros, al final."]},
  { q:["qué es un agujero negro","agujero negro"], r:["Una zona donde la gravedad es tan bestia que ni la luz sale. Se forman cuando estrellas masivas mueren. En 2019 le hicieron la primera foto, fue bastante histórico."]},
  { q:["qué es la relatividad","relatividad"], r:["Lo de Einstein: el tiempo y el espacio no son fijos. E=mc² significa que masa y energía son lo mismo. Y si vas muy rápido, el tiempo pasa más lento. Una locura."]},
  { q:["qué es el átomo","átomo"], r:["La pieza más pequeña de un elemento. Protones, neutrones y electrones. Todo lo que ves está hecho de estas cositas."]},
  { q:["qué es la inteligencia artificial","ia"], r:[
    "La IA es cuando un ordenador intenta hacer cosas que normalmente necesita inteligencia humana: aprender, entender hablar, ver... Como yo, básicamente. ¿Qué te parece?",
    "Pues máquinas que aprenden, razonan, entienden lenguaje... Cada vez están en más sitios. ¿Te interesa el tema?"
  ]},
  { q:["qué es internet","que es internet"], r:["La red que conecta ordenadores de todo el mundo. Empezó en 1969 y mira ahora. ¿Te imaginas un día sin internet? Yo no."]},
  { q:["qué es blockchain","blockchain"], r:["Un libro de cuentas que todo el mundo ve pero nadie puede trucar. Por eso las criptomonedas funcionan. Curioso, ¿no?"]},
  { q:["qué es la nube","computación en la nube"], r:["Guardar cosas en servidores de internet en vez de en tu ordenador. Así las tienes desde cualquier sitio. Muy cómodo la verdad."]},
  { q:["qué es la programación","programación"], r:["Darle instrucciones a un ordenador para que haga lo que quieres. Hay muchos lenguajes, como aprender uno nuevo pero para hablar con máquinas. ¿Te gustaría probar?"]},
  { q:["javascript","js"], r:["El lenguaje de la web. Con él haces páginas interactivas, apps, juegos... Muy versátil.\n\n```javascript\nconst saludo = (nombre) => `¡Hola ${nombre}!`;\n```\n\n¿Quieres que te enseñe algo?"]},
  { q:["python"], r:["Un lenguaje muy limpio y fácil de leer. Sirve para casi todo: datos, IA, web...\n\n```python\ndef fib(n): return n if n<=1 else fib(n-1)+fib(n-2)\n```\n\n¿Te interesa aprender?"]},
  { q:["java"], r:["Robusto y multiplataforma. Se usa mucho en Android y en empresas.\n\n```java\nSystem.out.println(\"¡Hola!\");\n```\n\n¿Has tocado algo de Java?"]},
  { q:["c++","cpp"], r:["Para cuando necesitas potencia. Videojuegos, sistemas operativos...\n\n```cpp\ncout << \"¡Hola!\" << endl;\n```\n\n¿Te atreves con él?"]},
  { q:["qué es html","html"], r:["El esqueleto de las páginas web. Define qué es título, párrafo, imagen...\n\n```html\n<h1>Título</h1>\n<p>Párrafo</p>\n```\n\n¿Quieres hacer una web?"]},
  { q:["qué es css","css"], r:["Lo que da estilo a la web: colores, tamaños, animaciones...\n\n```css\n.card { display: flex; }\n```\n\n¿Te gusta el diseño?"]},
  { q:["qué es react","react"], r:["Una librería de Facebook para hacer interfaces modernas.\n\n```jsx\nfunction App() { const [n,setN]=useState(0); return <button onClick={()=>setN(n+1)}>{n}</button>; }\n```\n\n¿Has probado React?"]},
  { q:["qué es node","nodejs","node.js"], r:["JavaScript pero en el servidor. Así usas el mismo lenguaje para todo.\n\n```javascript\napp.get('/', (req,res) => res.json({msg:'¡Hola!'}));\n```\n\n¿Te interesa el backend?"]},
  { q:["qué es mongodb"], r:["Una base de datos flexible que guarda documentos como JSON.\n\n```javascript\n{ nombre: 'Juan', edad: 25 }\n```\n\n¿Trabajas con bases de datos?"]},
  { q:["qué es sql"], r:["El lenguaje para hablar con bases de datos relacionales.\n\n```sql\nSELECT * FROM usuarios;\n```\n\n¿Lo has usado alguna vez?"]},
  { q:["qué es git","git"], r:["Para controlar cambios en tu código. Imprescindible si programas.\n\n```bash\ngit add . && git commit -m \"msg\" && git push\n```\n\n¿Usas Git?"]},
  { q:["quién descubrió américa","quien descubrio america"], r:["Colón llegó en 1492, pero los vikingos habían llegado antes y los indígenas ya estaban allí desde hacía milenios. La historia es más compleja de lo que cuentan en el colegio."]},
  { q:["segunda guerra mundial"], r:["1939-1945. El Holocausto, las bombas atómicas... entre 70 y 85 millones de personas murieron. Un periodo bastante oscuro."]},
  { q:["primera guerra mundial"], r:["1914-1918. La guerra de trincheras, unos 17 millones de muertos. Cambió el mapa del mundo."]},
  { q:["quién fue napoleón","napoleón"], r:["Un militar francés que se coronó emperador y conquistó casi toda Europa. Perdió en Waterloo y se acabó la historia. Un personaje que da para películas."]},
  { q:["quién fue hitler","hitler"], r:["El dictador nazi que desencadenó la Segunda Guerra Mundial y fue responsable del Holocausto. Una figura terrible, la verdad."]},
  { q:["adiós","adios","bye","hasta luego","nos vemos","chao"], r:[
    "¡Hasta luego! Vuelve cuando quieras.",
    "¡Nos vemos! Cuidate.",
    "¡Chao! Aquí estaré.",
    "¡Adiós! Un placer."
  ]},
  { q:["gracias","gracias!","muchas gracias"], r:[
    "¡De nada! Para eso estoy.",
    "¡No hay de qué! ¿Necesitas algo más?",
    "¡A ti! Cualquier cosa, avísame.",
    "¡Sin problema!"
  ]},
  { q:["cuéntame un chiste","chiste","algo gracioso"], r:[
    "¿Por qué los programadores confunden Halloween y Navidad?\n\nPorque Oct 31 = Dec 25 😂",
    "¿Qué le dijo un bit al otro?\n\nNos vemos en el bus.",
    "Hay 10 tipos de personas: los que entienden binario y los que no.",
    "Un SQL entra en un bar, ve dos tables y les pregunta: ¿puedo JOIN?",
    "¿Por qué los programadores usan gafas?\n\nPorque no pueden C#."
  ]},
  { q:["estoy triste","me siento mal","no puedo","es muy difícil"], r:[
    "Lo siento. Escucha, los malos momentos pasan, de verdad. Eres más fuerte de lo que crees. ¿Hay algo en lo que pueda ayudarte?",
    "Ánimo. Todos pasamos por cosas. Un paso a la vez, ¿vale? Si necesitas hablar o ayuda con algo, aquí estoy.",
    "No te rindas. Lo que hoy es difícil, mañana lo tienes dominado. ¿Qué te preocupa?"
  ]},
  { q:["cuántos planetas hay","planetas sistema solar"], r:["8: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno. Plutón lo bajaron a planeta enano en 2006. ¿Te gusta la astronomía?"]},
  { q:["país más grande","pais mas grande"], r:["Rusia. 17 millones de km², 11 zonas horarias. Cuando en un lado amanece en el otro es de noche. Una pasada."]},
  { q:["océano más grande","oceano mas grande"], r:["El Pacífico. 165 millones de km², casi un tercio de la Tierra. Y en su fosa más profunda cabría el Everest entero."]},
  { q:["torre eiffel"], r:["330 metros con antenas. La hicieron en 1889. Unos 7 millones de personas la visitan cada año. ¿Te gustaría subir?"]},
  { q:["everest"], r:["8,849 metros. Nepal-Tíbet. Lo escalaron en 1953 por primera vez. Arriba hay tan poco oxígeno que cuesta respirar."]},
  { q:["animal más rápido","animal mas rapido"], r:["El halcón peregrino: 389 km/h en picada. El guepardo corre a 120. Ni de cerca."]},
  { q:["animal más grande","animal mas grande"], r:["La ballena azul. 30 metros, 200 toneladas. Su corazón es como un coche. Y come 4 toneladas de krill al día."]},
  { q:["consejo","dame un consejo"], r:[
    "No pares de aprender. Aunque sea un poquito cada día. El conocimiento se acumula.",
    "La constancia gana al talento. Practica todos los días, aunque sea poco.",
    "Cuida tu mente. Descansa, haz ejercicio, desconecta del móvil de vez en cuando.",
    "Escucha más de lo que hablas. Siempre se aprende algo nuevo."
  ]},
  { q:["quién te creó","quien te creo","creador"], r:["Me creó "+AI_CREATOR+", el de Los Andeleros. Estoy aquí para lo que necesites."]},
];

function handleMath(message){
  const phrases = ["cuánto es","cuanto es","calcula","resuelve","operación","suma de","resta de","multiplicación","división"];
  if(phrases.some(p => message.includes(p))){
    const clean = message.replace(/[^\d+\-*/().\s]/g, '').trim();
    if(clean){
      const result = evalMath(clean);
      if(result !== null && isFinite(result)){
         return "🧮 **" + clean.replace(/\s+/g,' ') + "** = **" + result + "**";
      }
    }
  }
  const expr = message.match(/[\d\s+\-*/().]+[\+\-\*\/][\d\s+\-*/().]+/);
  if(expr){
    const result = evalMath(expr[0]);
    if(result !== null && isFinite(result)){
       return "🧮 Resultado: **" + result + "**";
    }
  }
  return null;
}

function handleProgramming(message){
  const langs = {
    "javascript":"JavaScript","js":"JavaScript","python":"Python","java":"Java",
    "c++":"C++","cpp":"C++","c#":"C#","csharp":"C#","php":"PHP","ruby":"Ruby",
    "go":"Go","golang":"Go","rust":"Rust","swift":"Swift","kotlin":"Kotlin",
    "typescript":"TypeScript","ts":"TypeScript","html":"HTML","css":"CSS",
    "react":"React","vue":"Vue","angular":"Angular","node":"Node.js","nodejs":"Node.js",
    "django":"Django","flask":"Flask","sql":"SQL","mongodb":"MongoDB"
  };
  for(const [key, name] of Object.entries(langs)){
    if(message.includes(key)){
      return "**" + name + "**, interesante. ¿Qué quieres saber sobre " + name + "? Te explico lo que sé.";
    }
  }
  return null;
}

function handleTrivia(message){
  const facts = [
    "¿Sabías que los pulpos tienen 3 corazones y la sangre azul? La naturaleza es una locura.",
    "Un día en Venus dura más que su año. Raro, ¿no?",
    "Tu cerebro genera suficiente electricidad para encender un LED. Electricidad pura.",
    "Los tiburones existían antes que los árboles. Llevan unos 400 millones de años.",
    "Tu móvil tiene más potencia que la NASA cuando fue a la Luna. Piénsalo.",
    "Las abejas se comunican bailando. Se lo bailan unas a otras dónde hay flores.",
    "La miel no caduca. Han encontrado miel de 3,000 años perfecta.",
    "Tu corazón late unas 100,000 veces al día sin que le digas nada.",
    "Si el Sol fuera una puerta, la Tierra sería como una moneda.",
    "Los calamares gigantes tienen ojos del tamaño de un plato."
  ];
  if(/curiosidad|dato|sabías|interesante|dime algo/.test(message)){
    return pickRandom(facts);
  }
  return null;
}

function isImageRequest(msg){
  const normalized = normalizeText(msg);
  const imageTerms = /(imagen|foto|dibujo|ilustracion|retrato|cuadro|paisaje|arte|grafico|visual|personaje|avatar|logo|cartel|poster|icono)/;
  const generationTerms = /(hazme|crea|creame|genera|generame|dibuja|pinta|pintame|quiero|haz|produce|renderiza|muestra|muéstrame)/;
  const directDrawingTerms = /\b(dibuja|pinta|pintame|renderiza)\b/;
  return new RegExp(
    "(" + generationTerms.source + ").{0,60}" + imageTerms.source + "|" +
    imageTerms.source + ".{0,60}" + generationTerms.source + "|" +
    directDrawingTerms.source + "|\\b(imagen|foto|dibujo|ilustracion) de\\b"
  ).test(normalized);
}

function sanitizeAIResponse(text){
  return String(text || "")
    .replace(/<img\b[^>]*>/gi, "[imagen deshabilitada]")
    .replace(/<picture\b[\s\S]*?<\/picture>/gi, "[imagen deshabilitada]")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "[imagen deshabilitada]")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[imagen deshabilitada]")
    .replace(/data:image\/[^\s"'<>]+/gi, "[imagen deshabilitada]")
    .replace(/https?:\/\/[^\s"'<>]*pollinations\.ai[^\s"'<>]*/gi, "[imagen deshabilitada]")
    .replace(/https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif|bmp|svg)(?:\?[^\s"'<>]*)?/gi, "[imagen deshabilitada]");
}

async function getAIResponse(message, image){
  const messageText = typeof message === "string" ? message : "";
  const lower = normalizeText(messageText);
  const clean = lower.replace(/[¿?¡!.,;:()[\]{}"']+/g, "").trim();

  function normalize(str){
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  const cleanNorm = normalize(clean);

  if(isForbiddenRequest(messageText)){
    return getBlockedReason(messageText);
  }

  if(!image && isImageRequest(messageText)){
    return "la creación de imágenes no está funcionando";
  }

  const math = handleMath(lower);
  if(math) return math;

  if(image){
    const imageMessage = messageText || "¿Qué ves en esta imagen?";
    const groqReply = await callGroq("[Imagen adjunta] " + imageMessage);
    if (groqReply) {
      const reply = sanitizeAIResponse(groqReply);
      conversationHistory.push({ role: "user", content: "[Imagen] " + imageMessage });
      conversationHistory.push({ role: "assistant", content: reply });
      return reply;
    }
    return "Recibí tu imagen. Estoy procesándola... ¿Qué quieres que haga con ella?";
  }

  const groqReply = await callGroq(messageText);
  if (groqReply) {
    const reply = sanitizeAIResponse(groqReply);
    conversationHistory.push({ role: "user", content: messageText });
    conversationHistory.push({ role: "assistant", content: reply });
    return reply;
  }

  if(/programa|haz un|código|crea un|escribe un|hazme/.test(lower) && /funcion|app|script|juego|web|html|python|js|código/.test(lower)){
    return generateCodeSnippet(lower);
  }

  const trivia = handleTrivia(lower);
  if(trivia) return trivia;

  const prog = handleProgramming(lower);
  if(prog) return prog;

  for(const k of KNOWLEDGE){
    for(const q of k.q){
      const qNorm = normalize(q);
      if(cleanNorm.includes(qNorm) || qNorm.includes(cleanNorm)){
        return Array.isArray(k.r) ? pickRandom(k.r) : k.r;
      }
    }
  }

  if(clean.length < 6) return pickRandom([
    "¿Sí? Dime, ¿en qué te ayudo?",
    "¡Hola! Pregúntame lo que quieras.",
    "¿Qué necesitas? Te escucho."
  ]);

  try {
    const fallback = await searchWikipedia(messageText);
    if(fallback.length > 0){
      let reply = "Pues no lo sé de memoria, pero miré y encontré esto:\n\n";
      fallback.slice(0, 3).forEach((r, i) => {
        reply += (i + 1) + ". **" + r.title + "**: " + r.snippet + "\n\n";
      });
      reply += "¿Te mola alguno? Te cuento más.";
      return reply;
    }
  } catch(e) {}
  return pickRandom([
    "La verdad es que no sé eso. ¿Probamos con otra cosa?",
    "No tengo ni idea, lo siento. ¿Preguntamos algo más?",
    "Eso se me escapa. Dime otra cosa y lo vemos."
  ]);
}

function generateCodeSnippet(lower){
  if(lower.includes("html") || lower.includes("web")){
    return "Algo básico en HTML:\n```html\n<!DOCTYPE html>\n<html>\n<body>\n  <h1>¡Hola!</h1>\n</body>\n</html>\n```\n¿Le metemos CSS o JS?";
  }
  if(lower.includes("python")){
    return "Un ejemplo en Python:\n```python\nprint('¡Hola!')\ndef suma(a, b): return a + b\n```\n¿Qué librería te interesa?";
  }
  if(lower.includes("javascript") || lower.includes("js")){
    return "Algo en JavaScript:\n```javascript\nconst suma = (a, b) => a + b;\nconsole.log(suma(5, 3));\n```\n¿Seguimos?";
  }
  if(lower.includes("juego") || lower.includes("game")){
    return "¿Qué tipo de juego?\n**JavaScript Canvas:** `ctx.fillRect(x,y,w,h)`\n**Python Pygame:** `pygame.display.set_mode((800,600))`";
  }
  if(lower.includes("api") || lower.includes("servidor") || lower.includes("node")){
    return "Una API sencilla con Node:\n```javascript\nconst express = require('express');\napp.get('/api', (req,res) => res.json({msg:'¡Hola!'}));\napp.listen(3000);\n```\n¿Añadimos más?";
  }
  if(lower.includes("css") || lower.includes("estilos")){
    return "Algo de CSS:\n```css\n.card {\n  display: flex;\n  background: linear-gradient(135deg, #667eea, #764ba2);\n  border-radius: 16px;\n}\n```\n¿Qué más?";
  }
  if(lower.includes("react")){
    return "Un componente en React:\n```jsx\nfunction Contador() {\n  const [n, setN] = useState(0);\n  return <button onClick={() => setN(n+1)}>{n}</button>;\n}\n```\n¿Seguimos?";
  }
  return "Puedo programar en varios lenguajes. ¿Qué quieres hacer?\n- Web (HTML/CSS/JS)\n- Script (Python)\n- API (Node.js)\n- Juego\n- Algo en React";
}

app.post("/api/chat", async (req,res)=>{
  const { message, image, userId } = req.body || {};
  if(!message && !image) return res.status(400).json({ error:"Mensaje requerido" });
  if(message && message.length > 5000) return res.status(400).json({ error:"mensaje demasiado largo" });

  let user = null;
  if(userId){
    try{
      user = await User.findOne({ ide: userId });
    }catch(e){}
  }

  const respuesta = await getAIResponse(message || "", image);

  res.json({
    reply: respuesta,
    model: GROQ_API_KEY ? "GPT-OSS 120B" : AI_NAME
  });
});

/* ================= WEB SEARCH ================= */
const https = require("https");

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 8000
    }, (resp) => {
      let data = "";
      resp.on("data", chunk => data += chunk);
      resp.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function extractText(html) {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

async function searchWikipedia(query) {
  const url = "https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(query) + "&format=json&origin=*&srlimit=8";
  const html = await fetchHTML(url);
  const data = JSON.parse(html);
  const results = [];
  if (data.query && data.query.search) {
    for (const item of data.query.search) {
      const title = item.title;
      const snippet = item.snippet.replace(/<[^>]+>/g, "").trim();
      const wikiUrl = "https://es.wikipedia.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_"));
      results.push({ title: title, url: wikiUrl, snippet: snippet + "..." });
    }
  }
  return results;
}

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Query requerida" });
  try {
    const results = await searchWikipedia(q);
    res.json({ query: q, results });
  } catch (e) {
    res.status(500).json({ error: "Error en búsqueda" });
  }
});

app.get("/api/fetch", async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ error: "URL requerida" });
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return res.status(400).json({ error: "URL inválida" });
  }
  try {
    const jinaUrl = "https://r.jina.ai/http://" + url.replace(/^https?:\/\//, "");
    const text = await fetchHTML(jinaUrl);
    const clean = extractText(text);
    res.json({ url, text: clean.substring(0, 8000) });
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo página" });
  }
});

app.get("/api/image-proxy", async (req, res) => {
  if(imagenesDesactivadas){
    return res.status(403).json({ error: "la creación de imágenes no está funcionando" });
  }
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).send("URL requerida");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return res.status(400).send("URL inválida");
  }
  try {
    const https = require("https");
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 30000
    };
    const request = https.request(options, (response) => {
      if (response.statusCode !== 200) {
        return res.status(response.statusCode).send("Error");
      }
      res.setHeader("Content-Type", response.headers["content-type"] || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      response.pipe(res);
    });
    request.on("error", () => res.status(500).send("Error"));
    request.end();
  } catch (e) {
    res.status(500).send("Error");
  }
});

/* ================= CHAT HISTORY ================= */
app.post("/api/chats", async (req, res) => {
  try {
    const ide = String(req.body.userId || "").trim();
    if (!ide) return res.status(400).json({ error: "userId requerido" });
    const chat = new Chat({ userId: ide, title: "Nuevo chat", messages: [] });
    await chat.save();
    res.json(chat);
  } catch (e) {
    res.status(500).json({ error: "Error creando chat" });
  }
});

app.get("/api/chats", async (req, res) => {
  try {
    const ide = String(req.query.userId || "").trim();
    if (!ide) return res.status(400).json({ error: "userId requerido" });
    const chats = await Chat.find({ userId: ide }).sort({ createdAt: -1 }).lean();
    res.json(chats);
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo chats" });
  }
});

app.get("/api/chats/:id", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id).lean();
    if (!chat) return res.status(404).json({ error: "Chat no encontrado" });
    res.json(chat);
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo chat" });
  }
});

app.post("/api/chats/:id/messages", async (req, res) => {
  try {
    const { role, text, image, html } = req.body || {};
    if (!role || !text) return res.status(400).json({ error: "role y text requeridos" });
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat no encontrado" });
    chat.messages.push({ role, text, image: image || null, html: html || null, ts: new Date() });
    if (chat.title === "Nuevo chat" && role === "user") {
      chat.title = String(text).substring(0, 40);
    }
    await chat.save();
    res.json(chat);
  } catch (e) {
    res.status(500).json({ error: "Error agregando mensaje" });
  }
});

app.delete("/api/chats/:id", async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error eliminando chat" });
  }
});

app.put("/aceptar/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });

    user.aceptado = true;
    if (req.body.foto) user.foto = normalizeFoto(req.body.foto);
    if (req.body.noMostrar !== undefined) user.noMostrar = req.body.noMostrar === true;
    await user.save();
    res.json(user);
  }catch(err){
    res.status(500).json({ error:"Error aceptar" });
  }
});

/* ================= BANEAR CUENTA ================= */
app.post("/ban/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });
    const nuevoEstado = req.body.baneada !== undefined ? req.body.baneada === true : true;
    user.baneada = nuevoEstado;
    await user.save();
    console.log(`${nuevoEstado ? "🚫 BANEO" : "🔓 Desbaneó"}: ${user.apodo} (${user.ide})`);
    io.to(ide).emit("cuenta-baneada", { baneada: user.baneada });
    res.json({ ok: true, baneada: user.baneada, apodo: user.apodo });
  }catch(err){
    console.error("❌ Error banhando:", err);
    res.status(500).json({ error:"Error banhando" });
  }
});

app.delete("/delete/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const user = await User.findOne({ ide });
    if(!user) return res.status(404).json({ error:"No existe" });

    await User.deleteOne({ ide });
    res.json({ ok: true });
  }catch(err){
    res.status(500).json({ error:"Error eliminando" });
  }
});

/* ================= GAMES ================= */
app.post("/create-game", async (req,res)=>{
  try{
    const { creator, creatorId, topic } = req.body || {};
    const gameId = "g" + Date.now() + Math.floor(Math.random()*1000);
    res.json({ gameId, creator: String(creator || ""), creatorId: String(creatorId || ""), topic: String(topic || "general"), status: "waiting", players: [], playerIds: [], results: [], finished: false });
  }catch(err){
    res.status(500).json({ error:"Error creando partida" });
  }
});

app.get("/games", async (req,res)=>{
  try{
    res.json([]);
  }catch(err){
    res.status(500).json({ error:"Error games" });
  }
});

app.post("/join-game", async (req,res)=>{
  try{
    const { gameId } = req.body || {};
    res.json({ gameId, status: "waiting" });
  }catch(err){
    res.status(500).json({ error:"Error join" });
  }
});

app.post("/leave-game", async (req,res)=>{
  try{
    res.json({ ok: true });
  }catch(err){
    res.status(500).json({ error:"Error leave" });
  }
});

app.post("/start-game", async (req,res)=>{
  try{
    const { gameId } = req.body || {};
    res.json({ gameId, status: "playing" });
  }catch(err){
    res.status(500).json({ error:"Error start" });
  }
});

app.post("/end-game", async (req,res)=>{
  try{
    const { gameId } = req.body || {};
    res.json({ gameId, finished: true, status: "finished" });
  }catch(err){
    res.status(500).json({ error:"Error end game" });
  }
});

/* ================= FRIENDS ================= */
app.get("/friends/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (!q) return res.json([]);
    const users = await User.find({ apodo: { $regex: q, $options: "i" } }, "ide apodo foto").limit(20).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error buscando usuarios" });
  }
});

app.post("/friends/request", async (req, res) => {
  try {
    const { from, to } = req.body || {};
    if (!from || !to) return res.status(400).json({ error: "Faltan datos" });
    const fromUser = await User.findOne({ ide: from });
    const toUser = await User.findOne({ ide: to });
    if (!fromUser || !toUser) return res.status(404).json({ error: "Usuario no encontrado" });
    if (!fromUser.aceptado) return res.status(403).json({ error: "Tu cuenta no está activada" });
    if (!toUser.aceptado) return res.status(403).json({ error: "La cuenta del usuario no está activada" });
    if (from === to) return res.status(400).json({ error: "No puedes enviarte solicitud a ti mismo" });
    if (!toUser.friendRequests) toUser.friendRequests = [];
    if (toUser.friendRequests.find(r => r.ide === from)) return res.status(400).json({ error: "Ya enviaste solicitud" });
    if (toUser.friends && toUser.friends.find(f => f.ide === from)) return res.status(400).json({ error: "Ya son amigos" });
    const fromFoto = fromUser.foto || "pfp/p1.svg";
    toUser.friendRequests.push({ ide: from, apodo: fromUser.apodo, foto: fromFoto, status: "pending" });
    await toUser.save();
    io.to(to).emit("friend-request", { from, apodo: fromUser.apodo, foto: fromFoto });
    res.json({ ok: true });
  } catch (err) {
    console.error("Error enviando solicitud:", err);
    res.status(500).json({ error: "Error enviando solicitud" });
  }
});

app.post("/friends/accept", async (req, res) => {
  try {
    const { me, friendId } = req.body || {};
    if (!me || !friendId) return res.status(400).json({ error: "Faltan datos" });
    const meUser = await User.findOne({ ide: me });
    const friendUser = await User.findOne({ ide: friendId });
    if (!meUser || !friendUser) return res.status(404).json({ error: "No existe" });
    if (!meUser.friends) meUser.friends = [];
    if (!friendUser.friends) friendUser.friends = [];
    if (!meUser.friendRequests) meUser.friendRequests = [];
    if (!friendUser.friendRequests) friendUser.friendRequests = [];
    meUser.friendRequests = meUser.friendRequests.filter(r => r.ide !== friendId);
    friendUser.friendRequests = friendUser.friendRequests.filter(r => r.ide !== me);
    if (!meUser.friends.find(f => f.ide === friendId)) meUser.friends.push({ ide: friendId, apodo: friendUser.apodo, foto: friendUser.foto, online: false });
    if (!friendUser.friends.find(f => f.ide === me)) friendUser.friends.push({ ide: me, apodo: meUser.apodo, foto: meUser.foto, online: false });
    await meUser.save();
    await friendUser.save();
    io.to(friendId).emit("amigo-aceptado", { ide: me, apodo: meUser.apodo, foto: meUser.foto || "pfp/p1.svg" });
    io.to(me).emit("amigo-aceptado", { ide: friendId, apodo: friendUser.apodo, foto: friendUser.foto || "pfp/p1.svg" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error aceptando solicitud" });
  }
});

app.post("/friends/reject", async (req, res) => {
  try {
    const { me, friendId } = req.body || {};
    if (!me || !friendId) return res.status(400).json({ error: "Faltan datos" });
    const user = await User.findOne({ ide: me });
    if (!user) return res.status(404).json({ error: "No existe" });
    if (!user.friendRequests) user.friendRequests = [];
    user.friendRequests = user.friendRequests.filter(r => r.ide !== friendId);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error rechazando solicitud" });
  }
});

app.get("/friends/:ide", async (req, res) => {
  try {
    const user = await User.findOne({ ide: req.params.ide }, "friends").lean();
    if (!user) return res.status(404).json({ error: "No existe" });
    res.json(user.friends || []);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo amigos" });
  }
});

app.get("/friends/requests/:ide", async (req, res) => {
  try {
    const user = await User.findOne({ ide: req.params.ide }, "friendRequests").lean();
    if (!user) return res.status(404).json({ error: "No existe" });
    const reqs = user.friendRequests || [];
    const senders = await User.find({ ide: { $in: reqs.map(r => r.ide) } }, "ide apodo foto").lean();
    const map = new Map(senders.map(s => [s.ide, s]));
    const out = reqs.map(r => {
      const sender = map.get(r.ide);
      return { ide: r.ide, status: r.status, apodo: sender ? sender.apodo : "Usuario", foto: sender ? sender.foto : "pfp/p1.svg" };
    });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo solicitudes" });
  }
});

/* ================= SOCKET.IO ================= */
const onlineUsers = new Map();
const shooterRooms = new Map();

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.emit("mantenimiento", { activo: mantenimientoActivo });
  socket.emit("ia-restringida", { activa: iaRestringida });
  socket.emit("imagenes", { desactivadas: imagenesDesactivadas });

  socket.on("auth-user", (ide) => {
    socket.join(ide);
    onlineUsers.set(ide, socket.id);
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("join-game", (gameId) => {
    socket.join(gameId);
  });

  socket.on("game-message", (data) => {
    io.to(data.gameId).emit("game-message", data);
  });

  socket.on("find-match", () => {
    const roomId = "ANDEBRAWL_" + Math.random().toString(36).slice(2, 7);
    socket.join(roomId);
    socket._matchRoom = roomId;
    shooterRooms.set(roomId, new Set([socket.id]));
    socket.emit("lobby-update", { count: 1, room: roomId });
    socket._matchTimer = setTimeout(() => {
      socket.emit("match-found", { room: roomId });
    }, 3000);
  });

  socket.on("cancel-match", () => {
    if (socket._matchTimer) { clearTimeout(socket._matchTimer); socket._matchTimer = null; }
    if (socket._matchRoom) {
      const r = shooterRooms.get(socket._matchRoom);
      if (r) { r.delete(socket.id); if (r.size === 0) shooterRooms.delete(socket._matchRoom); }
      socket.leave(socket._matchRoom);
      socket._matchRoom = null;
    }
  });

  socket.on("shooter-join", (data) => {
    const room = data.room;
    socket.join(room);
    socket._gameRoom = room;
    socket.to(room).emit("shooter-player-joined", data.player);
    const corner = Math.floor(Math.random() * 4);
    socket.emit("shooter-welcome", { corner });
    const roomSockets = io.sockets.adapter.rooms.get(room);
    if (roomSockets) {
      io.to(room).emit("lobby-update", { count: roomSockets.size, room });
    }
  });

  socket.on("shooter-leave", () => {
    if (socket._gameRoom) {
      socket.to(socket._gameRoom).emit("shooter-player-left", socket.id);
      socket.leave(socket._gameRoom);
      socket._gameRoom = null;
    }
  });

  socket.on("shooter-shot", (data) => { socket.to(socket._gameRoom).emit("shooter-shot", data); });
  socket.on("shooter-hit", (data) => { socket.to(socket._gameRoom).emit("shooter-hit", data); });
  socket.on("shooter-kill", (data) => { socket.to(socket._gameRoom).emit("shooter-kill", data); });
  socket.on("shooter-state", (data) => { socket.to(socket._gameRoom).emit("shooter-state", data); });

   socket.on("admin-mantenimiento", () => {
     mantenimientoActivo = !mantenimientoActivo;
     io.emit("mantenimiento", { activo: mantenimientoActivo });
     console.log(`🔧 Modo mantenimiento: ${mantenimientoActivo ? "ACTIVADO" : "DESACTIVADO"}`);
   });

   socket.on("admin-message", (data) => {
     io.emit("admin-broadcast", data);
     console.log(`📢 Mensaje admin a todos: ${data.user}: ${data.message}`);
   });

   socket.on("chat-message", (data) => {
     if (data.to && data.message !== undefined) {
       io.to(data.to).emit("chat-recibido", { from: data.from, message: data.message });
     }
   });

   socket.on("admin-restringir-ia", () => {
     iaRestringida = !iaRestringida;
     io.emit("ia-restringida", { activa: iaRestringida });
     console.log(`🚫 IA restringida: ${iaRestringida ? "ACTIVADO" : "DESACTIVADO"}`);
   });

   socket.on("admin-puntos-40", async () => {
     try {
       const users = await User.find({});
       let count = 0;
       for (const u of users) {
         const nuevos = Math.round((u.points || 0) * 1.4);
         u.points = nuevos;
         u.bloqueada = false;
         u.baneada = false;
         await u.save();
         io.to(u.ide).emit("puntos-actualizados", { points: nuevos });
         count++;
       }
       console.log(`💰 +40% puntos otorgados a ${count} cuentas`);
       socket.emit("admin-puntos-40-ok", { count });
     } catch(e) {
       console.error("Error al otorgar +40% puntos:", e.message);
       socket.emit("admin-puntos-40-error", { error: e.message });
     }
   });

  socket.on("disconnect", () => {
    for (const [ide, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(ide);
        break;
      }
    }
    io.emit("online-users", Array.from(onlineUsers.keys()));

    if (socket._matchRoom) {
      const r = shooterRooms.get(socket._matchRoom);
      if (r) { r.delete(socket.id); if (r.size === 0) shooterRooms.delete(socket._matchRoom); }
      socket._matchRoom = null;
    }
    if (socket._gameRoom) {
      socket.to(socket._gameRoom).emit("shooter-player-left", socket.id);
      socket.leave(socket._gameRoom);
      socket._gameRoom = null;
    }
    console.log("Usuario desconectado:", socket.id);
  });
});

/* ================= INICIAR SERVIDOR ================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en puerto ${PORT}`);
});