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
  historyQuizPurchased: { type: Boolean, default: false },
  geographyQuizPurchased: { type: Boolean, default: false },
  genialQuizPurchased: { type: Boolean, default: false },
  scratchRewardClaimed: { type: Boolean, default: false },
  missionGonjorDone: { type: Boolean, default: false },
  personaje: { type: { nombre: String, color: String }, default: { nombre: "Pinchitos", color: "#ff4d6d" } },
  controlType: { type: String, default: "teclado" }
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
  results: [{ playerId: String, playerName: String, score: Number }],
  finished: { type: Boolean, default: false },
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
    const { points, foto, aceptado, weeklyDone, missionCarlBriss1, missionCarlBriss2, englishQuizPurchased, historyQuizPurchased, geographyQuizPurchased, genialQuizPurchased, setup, personaje, controlType } = req.body;

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
    if (geographyQuizPurchased !== undefined) updateFields.geographyQuizPurchased = geographyQuizPurchased === true;
    if (genialQuizPurchased !== undefined) updateFields.genialQuizPurchased = genialQuizPurchased === true;
    if (setup !== undefined) updateFields.setup = setup === true;
    if (personaje && personaje.nombre && personaje.color) updateFields.personaje = personaje;
    if (controlType) updateFields.controlType = controlType;

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

/* ================= RECOMPENSA MISION GONJOR (SOLO 1 VEZ) ================= */
app.post("/claim-gonjor/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    if(!ide){
      return res.status(400).json({ error:"ID requerido" });
    }

    // Intento atómico: solo suma 300 si aún NO ha completado la misión Gonjor.
    const user = await User.findOneAndUpdate(
      { ide: ide, missionGonjorDone: { $ne: true } },
      { $inc: { points: 300 }, $set: { missionGonjorDone: true } },
      { new: true }
    );

    if(user){
      console.log(`☠️ Misión Gonjor completada por ${user.apodo} (+300 ⭐) -> ${user.points} pts.`);
      return res.json({ granted: true, points: user.points });
    }

    // Ya la completó antes o el usuario no existe
    const existing = await User.findOne({ ide }).select("points missionGonjorDone -_id");
    if(!existing){
      return res.status(404).json({ error:"No existe" });
    }
    return res.json({ granted: false, points: existing.points });

  }catch(err){
    console.log("❌ Error claim-gonjor:", err);
    res.status(500).json({ error:"Error al reclamar recompensa" });
  }
});

/* ================= RECOMPENSA SCRATCH (SOLO 1 VEZ) ================= */
app.post("/claim-scratch/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    if(!ide){
      return res.status(400).json({ error:"ID requerido" });
    }

    // Intento atómico: solo suma 500 la PRIMERA vez (campo scratchRewardClaimed).
    const user = await User.findOneAndUpdate(
      { ide: ide, scratchRewardClaimed: { $ne: true } },
      { $inc: { points: 500 }, $set: { scratchRewardClaimed: true } },
      { new: true }
    );

    if(user){
      console.log(`🧩 Recompensa Scratch entregada a ${user.apodo} (+500 ⭐) -> ${user.points} pts.`);
      return res.json({ granted: true, points: user.points });
    }

    // Ya la reclamó antes o el usuario no existe
    const existing = await User.findOne({ ide }).select("points scratchRewardClaimed -_id");
    if(!existing){
      return res.status(404).json({ error:"No existe" });
    }
    return res.json({ granted: false, points: existing.points });

  }catch(err){
    console.log("❌ Error claim-scratch:", err);
    res.status(500).json({ error:"Error al reclamar recompensa" });
  }
});

/* ================= RECOMPENSA MINIJUEGOS ================= */
app.post("/claim-minigame/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    if(!ide){
      return res.status(400).json({ error:"ID requerido" });
    }
    // Se otorgan 50 puntos cada vez que se entra a un minijuego.
    const user = await User.findOneAndUpdate(
      { ide: ide },
      { $inc: { points: 50 } },
      { new: true }
    );
    if(user){
      console.log(`🎮 Recompensa Minijuego entregada a ${user.apodo} (+50 ⭐) -> ${user.points} pts.`);
      return res.json({ granted: true, points: user.points });
    }
    return res.status(404).json({ error:"No existe" });
  }catch(err){
    console.log("❌ Error claim-minigame:", err);
    res.status(500).json({ error:"Error al reclamar recompensa" });
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
    res.json({ gameId, creator, topic: topic || "general" });
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
        await Game.deleteOne({ gameId });
        io.to(gameId).emit("game-deleted", { reason: "El anfitrión abandonó la partida" });
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
    
    res.json({ questions: getQuestions(game.topic), topic: game.topic });
  }catch(err){
    console.log("❌ Error start-game:", err);
    res.status(500).json({ error:"Error starting game" });
  }
});

function getQuestions(topic) {
  if (topic === "informatica") {
    return [
      {q:"¿Qué es un algoritmo?",a:["Conjunto de instrucciones","Hardware","Red social","Base de datos"],c:0,h:"Lógica"},
      {q:"HTML significa?",a:["HyperText Markup Language","High Tech Modern Language","HyperTransfer Markup","Home Tool Markup"],c:0,h:"Web"},
      {q:"CSS es usado para?",a:["Estilos y diseño","Programar servidores","Base de datos","Hardware"],c:0,h:"Diseño"},
      {q:"JavaScript es?",a:["Lenguaje de programación","Sistema operativo","Hardware","Componente físico"],c:0,h:"Web"},
      {q:"¿Qué es un bug?",a:["Error en el código","Característica oculta","Puerto USB","Lenguaje antiguo"],c:0,h:"Software"},
      {q:"RAM significa?",a:["Random Access Memory","Read Access Module","Rapid Action Memory","Real Application Mode"],c:0,h:"Memoria"},
      {q:"¿Qué es un servidor?",a:["Computadora que provee servicios","Mouse","Monitor","Teclado"],c:0,h:"Redes"},
      {q:"Python es?",a:["Lenguaje de programación","Sistema operativo","Hardware","Red social"],c:0,h:"Código"},
      {q:"HTTP es?",a:["Protocolo de transferencia","Lenguaje de programación","Base de datos","Sistema operativo"],c:0,h:"Web"},
      {q:"¿Qué hace un compilador?",a:["Traduce código a lenguaje máquina","Ejecuta el sistema","Guarda archivos","Conecta dispositivos"],c:0,h:"Código"},
      {q:"DNS significa?",a:["Domain Name System","Digital Network Service","Data Name Server","Domain Node System"],c:0,h:"Redes"},
      {q:"¿Qué es Git?",a:["Sistema de control de versiones","Lenguaje de programación","Base de datos","Editor de texto"],c:0,h:"DevOps"},
      {q:"API significa?",a:["Application Programming Interface","Advanced Program Integration","Automated Process Interface","Application Protocol Internet"],c:0,h:"Software"},
      {q:"¿Qué es un framework?",a:["Estructura para desarrollar software","Base de datos física","Red de computadoras","Sistema operativo"],c:0,h:"Desarrollo"},
      {q:"Python se usa mucho en?",a:["Data Science y web","Solo hardware","Solo muebles","Solo videojuegos"],c:0,h:"IA"},
      {q:"¿Qué es un array?",a:["Estructura de datos","Sistema operativo","Lenguaje web","Base de datos"],c:0,h:"Datos"},
      {q:"LAN significa?",a:["Local Area Network","Large Area Network","Light Application Node","Local Adapter Network"],c:0,h:"Redes"},
      {q:"¿Qué es el Frontend?",a:["Parte visual que ve el usuario","Base de datos","Servidor back-end","Hardware"],c:0,h:"Web"},
      {q:"¿Qué es el Backend?",a:["Lógica del servidor","Diseño visual","Monitor","Teclado"],c:0,h:"Servidor"},
      {q:"HTML5 es?",a:["Versión de HTML","Nuevo lenguaje de programación","Sistema operativo","Hardware"],c:0,h:"Web"}
    ].sort(() => Math.random() - 0.5).slice(0, 10);
  }
  if (topic === "geography") {
    return [
      {q:"¿Cuál es el río más largo del mundo?",a:["Nilo","Amazonas","Yangtsé","Misisipi"],c:1,h:"América del Sur"},
      {q:"¿En qué continente está Egipto?",a:["Asia","África","Europa","América"],c:1,h:"Pirámides"},
      {q:"¿Cuál es el país más grande del mundo?",a:["China","Estados Unidos","Rusia","Canadá"],c:2,h:"Superficie"},
      {q:"¿Qué océano está entre América y Europa/África?",a:["Pacífico","Índico","Atlántico","Ártico"],c:2,h:"Puente"},
      {q:"¿Cuál es la capital de Australia?",a:["Sídney","Melbourne","Canberra","Perth"],c:2,h:"No es la más poblada"},
      {q:"¿Cuál es el desierto más grande del mundo?",a:["Sahara","Gobi","Atacama","Antártico"],c:3,h:"Hielo y arena"},
      {q:"¿En qué país está el Machu Picchu?",a:["México","Colombia","Chile","Perú"],c:3,h:"Incas"},
      {q:"¿Cuál es la montaña más alta del mundo?",a:["K2","Kilimanjaro","Everest","Mont Blanc"],c:2,h:"8.848 m"},
      {q:"¿Cuántos continentes hay?",a:["5","6","7","8"],c:2,h:"Modelo estándar"},
      {q:"¿Qué país tiene más habitantes?",a:["India","China","Estados Unidos","Indonesia"],c:0,h:"2023"},
      {q:"¿Cuál es el lago más grande del mundo?",a:["Lago Victoria","Lago Superior","Mar Caspio","Lago Baikal"],c:2,h:"Salado y dulce"},
      {q:"¿En qué continente está Brasil?",a:["Asia","África","América del Sur","Europa"],c:2,h:"Amazonas"},
      {q:"¿Cuál es la capital de Japón?",a:["Osaka","Kioto","Tokio","Yokohama"],c:2,h:"Islas"},
      {q:"¿Qué mar está entre España y África?",a:["Mediterráneo","Rojo","Negro","Báltico"],c:0,h:"Estrecho"},
      {q:"¿Cuál es el país más pequeño del mundo?",a:["Mónaco","Vaticano","San Marino","Liechtenstein"],c:1,h:"Ciudad Estado"},
      {q:"¿En qué país está la Torre Eiffel?",a:["Reino Unido","Italia","España","Francia"],c:3,h:"París"},
      {q:"¿Cuál es el río más largo de España?",a:["Ebro","Tajo","Duero","Guadalquivir"],c:0,h:"Iberia"},
      {q:"¿Qué continente está al sur de Asia?",a:["África","Oceanía","Europa","América"],c:1,h:"Índico"},
      {q:"¿Cuál es la capital de Canadá?",a:["Toronto","Vancouver","Montreal","Ottawa"],c:3,h:"No es la más grande"},
      {q:"¿En qué país está el Canal de Panamá?",a:["Colombia","Costa Rica","Panamá","Nicaragua"],c:2,h:"Puente interoceánico"}
    ].sort(() => Math.random() - 0.5).slice(0, 10);
  }
  return [
    {q:"¿Capital de España?",a:["Madrid","Barcelona","Sevilla","Valencia"],c:0,h:"Capital del país"},
    {q:"Planeta rojo?",a:["Venus","Marte","Júpiter","Saturno"],c:1,h:"Óxido"},
    {q:"2+2?",a:["3","4","5","6"],c:1,h:"básico"},
    {q:"Capital Francia?",a:["Roma","París","Madrid","Lisboa"],c:1,h:"Torre Eiffel"},
    {q:"Lenguaje web?",a:["Python","HTML","C++","Java"],c:1,h:"estructura web"},
    {q:"Elemento más ligero?",a:["Helio","Hidrógeno","Oxígeno","Carbono"],c:0,h:"H"},
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
  ].sort(() => Math.random() - 0.5).slice(0, 10);
}

/* ================= BROADCAST GAME ENDED ================= */
async function broadcastGameEnded(gameId) {
  const game = await Game.findOne({ gameId }).lean();
  if (!game || game.finished) return;

  const winner = game.results && game.results.length > 0
    ? game.results.reduce((a, b) => (a.score > b.score ? a : b))
    : null;

  if (winner) {
    const user = await User.findOneAndUpdate(
      { ide: winner.playerId },
      { $inc: { points: 5000 } },
      { new: true }
    );
    console.log(`🏆 Ganador del multiplayer [${game.topic}]: ${winner.playerName} (+5000 ⭐) -> ${user.points} pts totales`);
  }

  await Game.findOneAndUpdate({ gameId }, { finished: true });

  io.to(gameId).emit("game-ended", {
    results: game.results || [],
    winner: winner
  });
}

/* ================= END GAME ================= */
app.post("/end-game", async (req,res)=>{
  try{
    const { gameId, playerId, score } = req.body;

    const game = await Game.findOne({ gameId });
    if(!game) return res.status(404).json({ error: "Game not found" });

    const playerIndex = game.playerIds.indexOf(playerId);
    const playerName = playerIndex >= 0 ? game.players[playerIndex] : playerId;

    const existingResult = game.results.findIndex(r => r.playerId === playerId);
    if(existingResult >= 0){
      game.results[existingResult].score = Math.max(game.results[existingResult].score, score);
    } else {
      game.results.push({ playerId, playerName, score: score || 0 });
    }

    await game.save();

    const allFinished = game.results.length >= game.players.length;
    if(allFinished){
      const winner = game.results.length > 0
        ? game.results.reduce((a, b) => (a.score > b.score ? a : b))
        : null;

      if(winner){
        const user = await User.findOneAndUpdate(
          { ide: winner.playerId },
          { $inc: { points: 5000 } },
          { new: true }
        );
        console.log(`🏆 Ganador: ${winner.playerName} (+5000 ⭐) -> ${user.points} pts totales`);
      }

      game.finished = true;
      await Game.findOneAndUpdate({ gameId }, { finished: true });

      io.to(gameId).emit("game-ended", { results: game.results, winner });
      res.json({ ok: true, gameEnded: true, results: game.results, winner });
    } else {
      const waitingFor = game.players.length - game.results.length;
      io.to(gameId).emit("player-finished", {
        playerName,
        results: game.results,
        waitingFor
      });
      res.json({ ok: true, gameEnded: false, waitingFor });
    }
  }catch(err){
    console.log("❌ Error end-game:", err);
    res.status(500).json({ error:"Error ending game" });
  }
});

/* ================= SHOOTER (ANDEBRAWL) ================= */
/* Mapa en memoria de salas del shooter: room -> Map(socketId -> player) */
const shooterRooms = {};
const authenticatedSockets = new Map(); /* socket.id -> ide */

/* Dimensiones lógicas del mundo del shooter (para spawns en las esquinas) */
const W = 1280;
const H = 720;

/* ================= MATCHMAKING (LOBBY DEL SHOOTER) ================= */
/* Se abre UNA sola sala de espera a la vez. Cualquier jugador que pida
   matchmaking durante la ventana de búsqueda (LOBBY_MS) entra en la MISMA
   sala, y al cerrarse la sala todos empiezan la partida juntos. Si nadie más
   entra, el jugador empieza solo (con bots). */
const LOBBY_MS = 10000;
let lobby = null; // { room, sockets: Set<socketId>, timer }

function lobbyNotify() {
  if (!lobby) return;
  for (const id of lobby.sockets) {
    const s = io.sockets.sockets.get(id);
    if (s) s.emit("lobby-update", { count: lobby.sockets.size });
  }
}

function joinLobby(socket) {
  if (!lobby) {
    lobby = {
      room: "ANDE_" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      sockets: new Set(),
      timer: setTimeout(closeLobby, LOBBY_MS)
    };
  }
  lobby.sockets.add(socket.id);
  lobbyNotify();
}

function leaveLobby(socket) {
  if (!lobby) return;
  lobby.sockets.delete(socket.id);
  if (lobby.sockets.size === 0) {
    clearTimeout(lobby.timer);
    lobby = null;
  }
}

function closeLobby() {
  if (!lobby) return;
  const room = lobby.room;
  const ids = [...lobby.sockets];
  lobby = null;
  for (const id of ids) {
    const s = io.sockets.sockets.get(id);
    if (s) s.emit("match-found", { room });
  }
}

/* ================= SOCKET.IO ================= */
io.on("connection", (socket) => {
  console.log("🔌 Usuario conectado:", socket.id);

  socket.on("join-game", (gameId) => {
    socket.join(gameId);
  });

  /* ---------- MATCHMAKING: entrar/salir de la sala de espera ---------- */
  socket.on("find-match", () => joinLobby(socket));
  socket.on("cancel-match", () => leaveLobby(socket));

  /* ---------- SHOOTER: unirse a una sala ---------- */
  socket.on("shooter-join", (data) => {
    const room = (data && data.room) ? data.room : "ANDEBRAWL";
    socket.data.shooterRoom = room;

    if (!shooterRooms[room]) shooterRooms[room] = new Map();
    // Asignar la PRIMERA esquina libre (0=arriba-izq, 1=arriba-der, 2=abajo-der,
    // 3=abajo-izq) para garantizar que dos jugadores nunca compartan esquina,
    // aunque alguien entre/salga. El cliente calcula las coordenadas reales en su
    // propio tamaño de pantalla a partir de este índice.
    const taken = new Set();
    for (const p of shooterRooms[room].values()) {
      if (typeof p.corner === "number") taken.add(p.corner);
    }
    let corner = 0;
    while (taken.has(corner) && corner < 4) corner++;
    if (corner >= 4) corner = shooterRooms[room].size % 4; // fallback (no debería ocurrir)
    const corners = [
      { x: 70, y: 70 },
      { x: W - 70, y: 70 },
      { x: W - 70, y: H - 70 },
      { x: 70, y: H - 70 }
    ];
    const c = corners[corner];

    const player = {
      id: socket.id,
      apodo: (data && data.player && data.player.apodo) || "Jugador",
      color: (data && data.player && data.player.color) || "#00ffcc",
      corner,
      x: c.x, y: c.y, angle: 0, hp: 100, score: 0, alive: true
    };

    shooterRooms[room].set(socket.id, player);
    socket.join(room);

    // Avisar a los demás que llegó un nuevo jugador
    socket.to(room).emit("shooter-player-joined", player);

    // Enviar al propio jugador su esquina asignada para que se posicione bien
    socket.emit("shooter-welcome", player);

    // Enviar al nuevo jugador la lista de los que ya estaban
    const others = [];
    for (const [id, p] of shooterRooms[room].entries()) {
      if (id !== socket.id) others.push(p);
    }
    socket.emit("shooter-players", others);

    console.log(`🔫 Shooter: ${player.apodo} se unió a ${room} (${shooterRooms[room].size} jugadores)`);
  });

  /* ---------- SHOOTER: estado del jugador (posición, ángulo, hp...) ---------- */
  socket.on("shooter-state", (state) => {
    const room = socket.data.shooterRoom;
    if (!room || !shooterRooms[room]) return;
    const p = shooterRooms[room].get(socket.id);
    if (p) Object.assign(p, state);
    socket.to(room).emit("shooter-state", { id: socket.id, ...state });
  });

  /* ---------- SHOOTER: disparo (solo visual para los demás) ---------- */
  socket.on("shooter-shot", (shot) => {
    const room = socket.data.shooterRoom;
    if (!room) return;
    socket.to(room).emit("shooter-shot", shot);
  });

  /* ---------- SHOOTER: impacto (daño a un jugador) ---------- */
  socket.on("shooter-hit", (data) => {
    const room = socket.data.shooterRoom;
    if (!room) return;
    socket.to(room).emit("shooter-hit", data);
  });

  /* ---------- SHOOTER: baja / muerte ---------- */
  socket.on("shooter-kill", (data) => {
    const room = socket.data.shooterRoom;
    if (!room) return;
    socket.to(room).emit("shooter-kill", data);
  });

  /* ---------- SHOOTER: salir de la sala ---------- */
  function shooterLeave() {
    const room = socket.data.shooterRoom;
    if (!room) return;
    if (shooterRooms[room]) {
      shooterRooms[room].delete(socket.id);
      if (shooterRooms[room].size === 0) delete shooterRooms[room];
    }
    socket.to(room).emit("shooter-player-left", socket.id);
    socket.leave(room);
    socket.data.shooterRoom = null;
    console.log(`🔫 Shooter: un jugador salió de ${room}`);
  }

  socket.on("shooter-leave", shooterLeave);

  socket.on("start-game", (gameId, questions) => {
    io.to(gameId).emit("game-started", questions);
  });

  socket.on("end-game", async ({ gameId, playerId, score }) => {
    try {
      const game = await Game.findOne({ gameId });
      if (!game) return;

      const playerIndex = game.playerIds.indexOf(playerId);
      const playerName = playerIndex >= 0 ? game.players[playerIndex] : playerId;

      game.results = game.results || [];
      const existingResult = game.results.findIndex(r => r.playerId === playerId);
      if(existingResult >= 0){
        game.results[existingResult].score = Math.max(game.results[existingResult].score, score || 0);
      } else {
        game.results.push({ playerId, playerName, score: score || 0 });
      }

      game.finished = game.results.length >= game.players.length;
      await game.save();

      if(game.finished){
        broadcastGameEnded(gameId);
      } else {
        io.to(gameId).emit("player-finished", {
          playerName,
          results: game.results,
          waitingFor: game.players.length - game.results.length
        });
      }
    } catch(err) {
      console.error("❌ Error socket end-game:", err);
    }
  });

  socket.on("admin-message", (data) => {
    io.emit("admin-broadcast", data);
  });

  socket.on("auth-user", (ide) => {
    authenticatedSockets.set(socket.id, ide);
  });

  socket.on("auth-admin", () => {
    socket.data.isAdmin = true;
    authenticatedSockets.set(socket.id, "admin");
  });

  socket.on("admin-hackermode", () => {
    if (!socket.data.isAdmin) return;
    // Enviar a TODOS los clientes conectados (menos el propio admin)
    // para que cualquier página abierta de Carl Briss reciba el modo hacker,
    // aunque no esté autenticada en el mapa de sockets.
    socket.broadcast.emit("go-hacker");
  });

  socket.on("disconnect", () => {
    console.log("🔌 Usuario desconectado:", socket.id);
    authenticatedSockets.delete(socket.id);
    if (socket.data.shooterRoom) shooterLeave();
    leaveLobby(socket);
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