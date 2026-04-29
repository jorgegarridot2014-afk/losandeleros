const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.redirect("/man");
});

app.get("/man", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body{
  margin:0;
  display:flex;
  font-family:Arial;
  overflow:hidden;
}

/* IZQUIERDA */
#left{
  width:50%;
  background:linear-gradient(180deg,#000,#111);
  color:#ff0;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  text-shadow:0 0 10px red, 0 0 20px yellow;
}

#timer{
  font-size:20px;
  margin-top:10px;
}

#msg{
  margin-top:20px;
  color:#f00;
  text-shadow:0 0 10px red, 0 0 20px yellow;
}

/* DERECHA */
#game{
  width:50%;
  height:100vh;
  position:relative;
  overflow:hidden;
  background:black;
}

/* FONDO NEÓN PRO */
#game::before{
  content:"";
  position:absolute;
  width:200%;
  height:200%;
  background:linear-gradient(45deg, red, yellow, red);
  animation:fondo 6s linear infinite;
  opacity:0.2;
}

@keyframes fondo{
  0%{transform:translate(0,0);}
  100%{transform:translate(-50%,-50%);}
}

#player{
  width:40px;
  height:40px;
  background:#0f0;
  position:absolute;
  bottom:50px;
  left:50px;
  box-shadow:0 0 20px #0f0;
}

.obs{
  width:30px;
  height:60px;
  background:red;
  position:absolute;
  bottom:50px;
  box-shadow:0 0 20px red;
}

#startBtn{
  position:absolute;
  top:20px;
  left:20px;
  padding:10px 20px;
  font-size:18px;
  background:yellow;
  border:none;
  cursor:pointer;
  box-shadow:0 0 15px red;
}

</style>
</head>

<body>

<div id="left">
  <h1>🚧 MANTENIMIENTO</h1>
  <div id="timer">Cargando...</div>
  <div id="msg">Lo sentimos 😔</div>
</div>

<div id="game">
  <button id="startBtn" onclick="startGame()">JUGAR</button>
  <div id="player"></div>
</div>

<script>

// ⏳ TIMER
function actualizarTimer(){
  const ahora = new Date();
  const objetivo = new Date();
  objetivo.setDate(ahora.getDate() + ((6 - ahora.getDay() + 7) % 7));
  objetivo.setHours(17,30,0,0);

  const diff = objetivo - ahora;

  if(diff <= 0){
    document.getElementById("timer").innerText = "¡YA!";
    return;
  }

  const h = Math.floor(diff / (1000*60*60));
  const m = Math.floor((diff / (1000*60)) % 60);
  const s = Math.floor((diff / 1000) % 60);

  document.getElementById("timer").innerText =
    h+"h "+m+"m "+s+"s";
}

setInterval(actualizarTimer,1000);
actualizarTimer();


// 🎮 JUEGO ULTRA PRO
const player = document.getElementById("player");
const game = document.getElementById("game");

let saltando = false;
let jugando = false;
let velocidad = 6;
let intervalos = [];

function saltar(){
  if(!jugando || saltando) return;

  saltando = true;
  let altura = 0;

  let subir = setInterval(()=>{
    altura += 10;
    player.style.bottom = (50 + altura) + "px";

    if(altura >= 170){
      clearInterval(subir);

      let bajar = setInterval(()=>{
        altura -= 5; // caída suave
        player.style.bottom = (50 + altura) + "px";

        if(altura <= 0){
          clearInterval(bajar);
          saltando = false;
        }
      },15);
    }
  },15);
}

// CONTROLES
document.addEventListener("keydown", e=>{
  if(e.code === "Space") saltar();
});
document.addEventListener("click", saltar);
document.addEventListener("touchstart", saltar);


function startGame(){
  jugando = true;
  document.getElementById("startBtn").style.display="none";
  crearObs();
  dificultad();
}

function crearObs(){
  if(!jugando) return;

  const obs = document.createElement("div");
  obs.classList.add("obs");

  let pos = game.offsetWidth;
  game.appendChild(obs);

  let mover = setInterval(()=>{
    pos -= velocidad;
    obs.style.left = pos + "px";

    const p = player.getBoundingClientRect();
    const o = obs.getBoundingClientRect();

    if(
      p.right > o.left &&
      p.left < o.right &&
      p.bottom > o.top &&
      p.top < o.bottom
    ){
      morir();
    }

    if(pos < -50){
      clearInterval(mover);
      obs.remove();
    }

  },16);

  intervalos.push(mover);

  setTimeout(crearObs,800);
}

function dificultad(){
  let diff = setInterval(()=>{
    velocidad += 0.5;
  },3000);

  intervalos.push(diff);
}

// 💀 MUERTE PRO
function morir(){
  jugando = false;

  intervalos.forEach(i => clearInterval(i));

  document.body.style.background = "red";

  setTimeout(()=>{
    location.reload();
  },700);
}

</script>

</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo 🔥");
});
