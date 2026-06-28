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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= MONGO ================= */
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR CRÍTICO: La variable MONGO_URI no está configurada en el entorno.");
} else {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // Falla rápido si no hay conexión (5 seg) en lugar de esperar infinito
  })
  .then(() => console.log("🟢 Mongo conectado exitosamente"))
  .catch(err => {
    console.error("❌ Error al conectar a MongoDB:");
    console.error("Mensaje:", err.message);
    console.error("Asegúrate de que la IP de Render esté permitida (0.0.0.0/0) en MongoDB Atlas.");
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
  weeklyDone: { type: Boolean, default: false },
  missionCarlBriss1: { type: Boolean, default: false },
  missionCarlBriss2: { type: Boolean, default: false },
  englishQuizPurchased: { type: Boolean, default: false },
  historyQuizPurchased: { type: Boolean, default: false }
}, { minimize: false }); // 🚀 Fuerza a que los campos se guarden siempre en DB

const User = mongoose.model("User", UserSchema);

/* ================= GAME SCHEMA ================= */
const GameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  creator: { type: String, required: true },
  creatorId: { type: String, required: true },
  topic: { type: String, default: "general" },
  status: { type: String, default: "waiting" },
  players: [{ type: String }],
  playerIds: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const Game = mongoose.model("Game", GameSchema);

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
      points: 0 // Aseguramos que empiece con 0 en la DB
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
      return res.status(404).json({ error:"No existe" });
    }

    // 🛠️ REPARACIÓN: Si el campo 'points' no existe físicamente en el documento, lo creamos.
    // Usamos toObject para verificar la existencia real en el BSON de MongoDB.
    if (!user.toObject().hasOwnProperty('points')) {
      user.set('points', 0);
      await user.save();
      console.log(`🛠️ Campo 'points' creado físicamente para ${user.apodo}`);
    }

    console.log(`🔑 Login: ${user.apodo} cargado con ${user.points} puntos.`);
    res.json(user);

  }catch(err){
    console.log("❌ Error login:", err);
    res.status(500).json({ error:"Error login" });
  }
});

/* ================= CUENTAS ================= */
app.get("/cuentas", async (req,res)=>{
  try{
    // 🛡️ SEGURIDAD: Nunca enviar el 'ide' en la lista pública
    const users = await User.find({ aceptado: true })
      .select("apodo foto points -_id")
      .lean();

    const normalizedUsers = users.map(u => ({ ...u, foto: normalizeFoto(u.foto) }));

    res.json(normalizedUsers);

  }catch(err){
    console.log("❌ Error cuentas:", err);
    res.status(500).json({ error:"Error cuentas" });
  }
});

/* ================= UPDATE ================= */
app.put("/update/:ide", async (req,res)=>{
  try{

    const ide = String(req.params.ide || "").trim();
    const { points, foto, aceptado, weeklyDone, missionCarlBriss1, missionCarlBriss2, englishQuizPurchased, historyQuizPurchased } = req.body;

    console.log(`📩 Petición UPDATE para ${ide}. Puntos a guardar: ${points}`);

    const updateFields = {};
    if (points !== undefined) updateFields.points = Number(points);
    if (weeklyDone !== undefined) updateFields.weeklyDone = weeklyDone === true;
    if (missionCarlBriss1 !== undefined) updateFields.missionCarlBriss1 = missionCarlBriss1 === true;
    if (missionCarlBriss2 !== undefined) updateFields.missionCarlBriss2 = missionCarlBriss2 === true;
    if (foto) updateFields.foto = normalizeFoto(foto);
    if (aceptado !== undefined) updateFields.aceptado = aceptado === true;
    if (englishQuizPurchased !== undefined) updateFields.englishQuizPurchased = englishQuizPurchased === true;
    if (historyQuizPurchased !== undefined) updateFields.historyQuizPurchased = historyQuizPurchased === true;

    // 🚀 Usamos findOneAndUpdate con $set para OBLIGAR a MongoDB a crear/actualizar el campo
    const user = await User.findOneAndUpdate(
      { ide: ide },
      { $set: updateFields },
      { new: true, runValidators: true } // new: true para devolver el documento actualizado
    );

    if (!user) {
      console.log(`⚠️ No se encontró el usuario con IDE: ${ide}`);
      return res.status(404).json({ error: "No existe" });
    }

    console.log(`✅ DB Guardado Exitoso: ${user.apodo} -> ${user.points} pts.`);
    res.json(user); // user ya es el documento actualizado
  }catch(err){
    console.log("❌ Error update:", err);
    res.status(500).json({ error:"Error update" });
  }
});

/* ================= RANKING ================= */
app.get("/ranking", async (req,res)=>{
  try{
    // Obtenemos los 10 usuarios con más puntos (que hayan aceptado la privacidad)
    const top = await User.find({ aceptado: true })
      .sort({ points: -1 })
      .limit(10)
      .select("apodo points foto -_id");
    
    res.json(top);
  }catch(err){
    res.status(500).json({ error: "Error al obtener ranking" });
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

/* ================= CREATE MULTIPLAYER GAME ================= */
app.post("/create-game", async (req,res)=>{
  try{
    const { creator, creatorId, topic } = req.body;
    const gameId = "GAME_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const game = new Game({
      gameId,
      creator,
      creatorId,
      topic: topic || "general",
      status: "waiting",
      players: [creator],
      playerIds: [creatorId]
    });
    
    await game.save();
    res.json({ gameId, creator, topic: "general" });
  }catch(err){
    console.log("❌ Error create-game:", err);
    res.status(500).json({ error:"Error creating game" });
  }
});

/* ================= GET ALL WAITING GAMES ================= */
app.get("/games", async (req,res)=>{
  try{
    const games = await Game.find({ status: "waiting" })
      .select("gameId creator topic players createdAt -_id")
      .lean();
    res.json(games);
  }catch(err){
    console.log("❌ Error games:", err);
    res.status(500).json({ error:"Error getting games" });
  }
});

/* ================= JOIN GAME ================= */
app.post("/join-game", async (req,res)=>{
  try{
    const { gameId, player, playerId } = req.body;
    const game = await Game.findOne({ gameId });
    
    if(!game){
      return res.status(404).json({ error: "Game not found" });
    }
    
    if(game.playerIds.includes(playerId)){
      return res.json({ gameId, alreadyJoined: true, game });
    }
    
    if(game.players.length >= 4){
      return res.status(400).json({ error: "Game full" });
    }
    
    game.players.push(player);
    game.playerIds.push(playerId);
    await game.save();
    
    io.to(gameId).emit("player-joined", game);
    res.json({ gameId, success: true, game });
  }catch(err){
    console.log("❌ Error join-game:", err);
    res.status(500).json({ error:"Error joining game" });
  }
});

/* ================= LEAVE GAME ================= */
app.post("/leave-game", async (req,res)=>{
  try{
    const { gameId, playerId } = req.body;
    const game = await Game.findOne({ gameId });
    
    if(!game) return res.status(404).json({ error: "Game not found" });
    
    const idx = game.playerIds.indexOf(playerId);
    if(idx > -1) {
      game.players.splice(idx, 1);
      game.playerIds.splice(idx, 1);
      
      if(game.players.length === 0) {
        await Game.deleteOne({ gameId });
        io.to(gameId).emit("game-ended");
      } else if(game.creatorId === playerId) {
        game.creator = game.players[0];
        game.creatorId = game.playerIds[0];
        await game.save();
        io.to(gameId).emit("player-left", game);
      } else {
        await game.save();
        io.to(gameId).emit("player-left", game);
      }
    }
    
    res.json({ ok: true });
  }catch(err){
    console.log("❌ Error leave-game:", err);
    res.status(500).json({ error:"Error leaving game" });
  }
});

/* ================= START GAME ================= */
app.post("/start-game", async (req,res)=>{
  try{
    const { gameId, playerId } = req.body;
    const game = await Game.findOne({ gameId });
    
    if(!game) return res.status(404).json({ error: "Game not found" });
    if(game.creatorId !== playerId) return res.status(403).json({ error: "Only creator can start" });
    
    game.status = "active";
    await game.save();
    
    res.json({ questions: getQuestions() });
  }catch(err){
    console.log("❌ Error start-game:", err);
    res.status(500).json({ error:"Error starting game" });
  }
});

function getQuestions() {
  return [
    {q:"¿Capital de España?",a:["Madrid","Barcelona","Sevilla","Valencia"],c:0,h:"Capital del país"},
    {q:"Planeta rojo?",a:["Venus","Marte","Júpiter","Saturno"],c:1,h:"Óxido"},
    {q:"2+2?",a:["3","4","5","6"],c:1,h:"básico"},
    {q:"Capital Francia?",a:["Roma","París","Madrid","Lisboa"],c:1,h:"Torre Eiffel"},
    {q:"Lenguaje web?",a:["Python","HTML","C++","Java"],c:1,h:"estructura web"},
    {q:"Elemento más ligero?",a:["Helio","Hidrógeno","Oxígeno","Carbono"],c:1,h:"H"},
    {q:"Velocidad luz?",a:["300k km/s","150k","100k","500k"],c:0,h:"constante"},
    {q:"Capital Italia?",a:["Roma","Milán","Venecia","Nápoles"],c:0,h:"imperio"},
    {q:"5x5?",a:["20","25","30","15"],c:1,h:"multiplicación"},
    {q:"Mona Lisa?",a:["Da Vinci","Picasso","Goya","Van Gogh"],c:0,h:"arte"},
    {q:"CPU es?",a:["Pantalla","Procesador","Teclado","RAM"],c:1,h:"cerebro"},
    {q:"Océano más grande?",a:["Atlántico","Índico","Pacífico","Ártico"],c:2,h:"muy grande"},
    {q:"Gas respiramos?",a:["Oxígeno","CO2","Helio","Hidrógeno"],c:0,h:"vida"},
    {q:"Capital Japón?",a:["Tokio","Kyoto","Osaka","Seúl"],c:0,h:"Asia"},
    {q:"HTML es?",a:["Lenguaje web","Sistema","App","IA"],c:0,h:"web"},
    {q:"Newton?",a:["Gravedad","Electricidad","Fuego","Luz"],c:0,h:"manzana"},
    {q:"Planeta grande?",a:["Júpiter","Marte","Tierra","Venus"],c:0,h:"gigante"},
    {q:"Continentes?",a:["5","6","7","8"],c:2,h:"modelo"},
    {q:"Python creado por?",a:["Guido","Elon","Jobs","Linus"],c:0,h:"programación"},
    {q:"Metal líquido?",a:["Mercurio","Oro","Plata","Hierro"],c:0,h:"tóxico"}
  ];
}

/* ================= SOCKET.IO ================= */
io.on("connection", (socket) => {
  console.log("🔌 Usuario conectado:", socket.id);
  
  socket.on("join-game", (gameId) => {
    socket.join(gameId);
  });
  
  socket.on("start-game", (gameId, questions) => {
    io.to(gameId).emit("game-started", questions);
  });
  
  socket.on("disconnect", () => {
    console.log("🔌 Usuario desconectado:", socket.id);
  });
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server funcionando en puerto ${PORT}`);
});