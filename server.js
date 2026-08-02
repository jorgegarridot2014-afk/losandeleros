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
  weeklyDone: { type: Boolean, default: false },
  missionCarlBriss1: { type: Boolean, default: false },
  missionCarlBriss2: { type: Boolean, default: false },
  englishQuizPurchased: { type: Boolean, default: false },
  historyQuizPurchased: { type: Boolean, default: false },
  geographyQuizPurchased: { type: Boolean, default: false },
  genialQuizPurchased: { type: Boolean, default: false },
  scratchRewardClaimed: { type: Boolean, default: false },
  missionGonjorDone: { type: Boolean, default: false },
  friends: [{ ide: String, apodo: String, foto: String, online: Boolean }],
  friendRequests: [{ ide: String, status: String }],
  personaje: { type: { nombre: String, color: String }, default: { nombre: "Pinchitos", color: "#ff4d6d" } },
  controlType: { type: String, default: "teclado" }
}, { minimize: false });

const User = mongoose.model("User", UserSchema);

const PALABRAS_PROHIBIDAS = ["tonto", "feo", "malo", "joder", "idiota"];
function esMalsonante(texto){
  const low = String(texto || "").toLowerCase();
  return PALABRAS_PROHIBIDAS.some(p => low.includes(p));
}

function normalizeFoto(src){
  if(!src || typeof src !== "string") return "pfp/p1.svg";
  if(src.endsWith(".png")) return src.replace(/\.png$/, ".svg");
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
    const lista = await User.find({}, "ide apodo aceptado noMostrar").lean();
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
    res.json({ ide: user.ide, apodo: user.apodo, points: user.points });
  } catch (err) {
    console.error("Error get user:", err);
    res.status(500).json({ error: "Error obteniendo usuario" });
  }
});

/* ================= UPDATE ================= */
app.put("/update/:ide", async (req,res)=>{
  try{
    const ide = String(req.params.ide || "").trim();
    const { points, foto, aceptado, weeklyDone, missionCarlBriss1, missionCarlBriss2, englishQuizPurchased, historyQuizPurchased, geographyQuizPurchased, genialQuizPurchased, setup, personaje, controlType } = req.body;

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

/* ================= ACEPTAR / DELETE ================= */
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
    if (toUser.friendRequests.find(r => r.ide === from)) return res.status(400).json({ error: "Ya enviaste solicitud a este usuario" });
    if (toUser.friends && toUser.friends.find(f => f.ide === from)) return res.status(400).json({ error: "Ya son amigos" });
    const fromFoto = fromUser.foto || "pfp/p1.svg";
    toUser.friendRequests.push({ ide: from, apodo: fromUser.apodo, foto: fromFoto, status: "pending" });
    await toUser.save();
    io.to(to).emit("friend-request", { from, apodo: fromUser.apodo, foto: fromFoto });
    console.log(`📨 Solicitud enviada de ${fromUser.apodo} (${from}) a ${toUser.apodo} (${to})`);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error enviando solicitud:", err);
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
  console.log("🔌 Usuario conectado:", socket.id);

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

  /* === Shooters === */
  socket.on("find-match", () => {
    const roomId = "ANDEBRAWL_" + Math.random().toString(36).slice(2, 7);
    socket.join(roomId);
    socket._matchRoom = roomId;
    shooterRooms.set(roomId, new Set([socket.id]));

    const count = shooterRooms.get(roomId).size;
    socket.emit("lobby-update", { count, room: roomId });

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
    console.log("🔌 Usuario desconectado:", socket.id);
  });
});

/* ================= INICIAR SERVIDOR ================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server funcionando en puerto ${PORT}`);
});
