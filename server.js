const express = require("express");
const app = express();

app.get("/", (req, res) => {

res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body{
  margin:0;
  font-family:Arial;
  background:#111;
  color:white;
}

header{
  background:#222;
  padding:15px;
  text-align:center;
  font-size:24px;
  color:gold;
}

#container{
  display:flex;
  flex-wrap:wrap;
}

#left,#right{
  flex:1;
  padding:20px;
  text-align:center;
}

@media(max-width:700px){
  #container{flex-direction:column;}
}

/* mantenimiento */
.loader{
  border:6px solid #333;
  border-top:6px solid gold;
  border-radius:50%;
  width:70px;
  height:70px;
  margin:20px auto;
  animation:spin 1s linear infinite;
}

@keyframes spin{
  0%{transform:rotate(0);}
  100%{transform:rotate(360deg);}
}

#timer{
  font-size:22px;
  color:cyan;
  margin-top:10px;
}

/* juego */
#game{
  position:relative;
  width:500px;
  height:320px;
  background:black;
  margin:auto;
  overflow:hidden;
  border:2px solid gold;
}

#percentGame{
  position:absolute;
  top:10px;
  right:15px;
  font-size:26px;
  color:lime;
}

#player{
  width:40px;
  height:40px;
  background:lime;
  position:absolute;
  bottom:0;
  left:80px;
}

.spike{
  width:30px;
  height:40px;
  background:red;
  position:absolute;
  bottom:0;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

button{
  margin-top:10px;
  padding:10px 20px;
}
</style>
</head>

<body>

<header>🏆 LOS ANDELEROS 🏆</header>

<div id="container">

  <!-- IZQUIERDA -->
  <div id="left">
    <h2>🔧 SERVIDORES EN MANTENIMIENTO</h2>
    <p>Estamos mejorando los servidores...</p>

    <div class="loader"></div>

    <div id="timer"></div>

    <!-- MENSAJE 3D -->
    <p id="mensaje3d" style="color:orange; font-size:20px; margin-top:10px;">
      El siguiente sábado a las 5:30 PM el juego estará en 3D
    </p>
  </div>

  <!-- DERECHA -->
  <div id="right">
    <h3>🎮 Minijuego</h3>

    <div id="game">
      <div id="percentGame">0%</div>
      <div id="player"></div>
    </div>

    <button onclick="startGame()">JUGAR</button>
  </div>

</div>

<script>


//////////////////////
// ⏱️ TEMPORIZADOR + MENSAJE 3D
//////////////////////

const timerEl = document.getElementById("timer");
const mensaje3d = document.getElementById("mensaje3d");

function getObjetivoHoy(){
  const ahora = new Date();
  const objetivo = new Date();

  // Hoy a las 18:30
  objetivo.setHours(18, 30, 0, 0);

  // Si ya pasó, lo ponemos para mañana
  if (ahora > objetivo) {
    objetivo.setDate(objetivo.getDate() + 1);
  }

  return objetivo;
}

let objetivo = getObjetivoHoy();

function actualizarTimer(){
  const ahora = new Date();
  let diff = objetivo - ahora;

  // Si llega a 0, recalculamos para el siguiente día
  if (diff <= 0) {
    objetivo = getObjetivoHoy();
    return;
  }

  const horas = Math.floor(diff / (1000 * 60 * 60));
  const minutos = Math.floor((diff / (1000 * 60)) % 60);
  const segundos = Math.floor((diff / 1000) % 60);

  timerEl.innerText = `${horas}h ${minutos}m ${segundos}s`;

  // Mostrar mensaje cuando quede poco (opcional)
  if (diff < 60000) {
    mensaje3d.style.display = "block";
  }
}

// Actualiza cada segundo
setInterval(actualizarTimer, 1000);
actualizarTimer();

//////////////////////
// 🎮 JUEGO
//////////////////////

let y=0;
let vel=0;
let gravedad=-0.7;
let spikes=[];
let jugando=false;
let tiempo=0;

const game = document.getElementById("game");
const player = document.getElementById("player");
const percentGame = document.getElementById("percentGame");

function startGame(){
  jugando=true;
  y=0;
  vel=0;
  tiempo=0;

  document.querySelectorAll(".spike").forEach(e=>e.remove());
  spikes=[];

  setTimeout(spawn,1200);
}

function loop(){

  if(jugando){

    tiempo += 0.016;

    let progreso = Math.min(100, tiempo*5);
    percentGame.innerText = Math.floor(progreso)+"%";

    if(progreso >= 100){
      alert("🏆 GANASTE");
      startGame();
    }

    vel += gravedad;
    y += vel;

    if(y < 0){
      y = 0;
      vel = 0;
    }

    player.style.bottom = y+"px";

    spikes.forEach((s,i)=>{
      s.x -= 10;
      s.el.style.left = s.x+"px";

      if(s.x < 110 && s.x > 60 && y < 35){
        jugando=false;
        alert("💀 Has muerto");
      }

      if(s.x < -40){
        s.el.remove();
        spikes.splice(i,1);
      }
    });
  }

  requestAnimationFrame(loop);
}
loop();

function spawn(){
  if(!jugando) return;

  let s=document.createElement("div");
  s.className="spike";
  s.style.left="500px";

  game.appendChild(s);

  spikes.push({el:s,x:500});

  let delay = 1000 + Math.random()*1500;
  setTimeout(spawn, delay);
}

function saltar(){
  if(jugando && y===0){
    vel=15;
  }
}

document.addEventListener("click", saltar);
document.addEventListener("touchstart", saltar);

document.addEventListener("keydown", (e)=>{
  if(e.code==="Space"){
    e.preventDefault();
    saltar();
  }
});

</script>

</body>
</html>
`);
});

// PUERTO CORRECTO PARA DEPLOY
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 Servidor funcionando en puerto " + PORT));
