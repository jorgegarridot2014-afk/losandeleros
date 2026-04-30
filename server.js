const express = require("express");
const app = express();

app.get("/", (req, res) => res.redirect("/man"));

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
  background:black;
}

/* IZQUIERDA */
#left{
  width:50%;
  background:#3a3a00;
  color:#ffd700;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  text-align:center;
}

/* TEXTO */
#msg{
  margin-top:15px;
}

/* RUEDA */
#loader{
  margin-top:20px;
  width:40px;
  height:40px;
  border:5px solid #444;
  border-top:5px solid yellow;
  border-radius:50%;
  animation:spin 1s linear infinite;
}

@keyframes spin{
  100%{transform:rotate(360deg);}
}

/* JUEGO */
#game{
  width:45%;
  height:80vh;
  margin:auto;
  position:relative;
  overflow:hidden;
  background:black;
  border:2px solid #333;
}

/* HUD */
#hud{
  position:absolute;
  top:10px;
  right:10px;
  color:white;
  font-size:14px;
}

/* SUELO */
#ground{
  position:absolute;
  bottom:0;
  width:100%;
  height:50px;
  background:#222;
}

#player{
  width:40px;
  height:40px;
  background:#0f0;
  position:absolute;
  left:50px;
  bottom:50px;
}

/* PINCHOS */
.spike{
  width:0;
  height:0;
  border-left:15px solid transparent;
  border-right:15px solid transparent;
  border-bottom:40px solid red;
  position:absolute;
  bottom:50px;
}

#startBtn{
  position:absolute;
  top:10px;
  left:10px;
  padding:10px 20px;
  background:yellow;
  border:none;
  cursor:pointer;
}
</style>
</head>

<body>

<div id="left">
  <h1>🚧 MANTENIMIENTO</h1>
  <div id="msg">
    Lo sentimos, pero estamos en mantenimiento<br>
    mejorando los servidores
  </div>
  <div id="loader"></div>
</div>

<div id="game">
  <button id="startBtn" onclick="startGame()">JUGAR</button>
  <div id="hud">0 pts | 0%</div>
  <div id="player"></div>
  <div id="ground"></div>
</div>

<script>

const player = document.getElementById("player");
const game = document.getElementById("game");
const hud = document.getElementById("hud");

let y = 50;
let velocidadY = 0;
let gravedad = -0.7;
let fuerzaSalto = 13;
let rotacion = 0;

let jugando = false;
let velocidad = 6;
let spikes = [];

let puntos = 0;
let tiempoInicio = 0;


// LOOP SUAVE
function loop(){
  if(jugando){

    velocidadY += gravedad;
    y += velocidadY;

    if(y <= 50){
      y = 50;
      velocidadY = 0;
      rotacion = 0;
    } else {
      rotacion += 10;
    }

    player.style.bottom = y + "px";
    player.style.transform = "rotate(" + rotacion + "deg)";

    // recorrer al revés (sin bugs)
    for(let i = spikes.length - 1; i >= 0; i--){
      let spike = spikes[i];

      spike.pos -= velocidad;
      spike.el.style.left = spike.pos + "px";

      const p = player.getBoundingClientRect();
      const o = spike.el.getBoundingClientRect();

      // colisión mejorada
      if(
        p.right - 10 > o.left &&
        p.left + 10 < o.right &&
        p.bottom > o.top
      ){
        morir();
      }

      if(spike.pos < -50){
        spike.el.remove();
        spikes.splice(i,1);
        puntos += 10;
      }
    }

    // HUD
    let tiempo = (Date.now() - tiempoInicio)/1000;
    let porcentaje = Math.min(100, Math.floor(tiempo * 5));

    hud.innerText = puntos + " pts | " + porcentaje + "%";
  }

  requestAnimationFrame(loop);
}

loop();


// SALTO
function saltar(){
  if(jugando && y === 50){
    velocidadY = fuerzaSalto;
  }
}

// CONTROLES
document.addEventListener("keydown", e=>{
  if(e.code === "Space") saltar();
});
document.addEventListener("click", saltar);
document.addEventListener("touchstart", saltar);


// START
function startGame(){
  resetGame();
  jugando = true;
  document.getElementById("startBtn").style.display="none";
  tiempoInicio = Date.now();
  crearObs();
}


// CREAR PINCHOS
function crearObs(){
  if(!jugando) return;

  const spike = document.createElement("div");
  spike.classList.add("spike");

  let pos = game.offsetWidth;

  game.appendChild(spike);
  spikes.push({el: spike, pos: pos});

  let tiempo = 800 + Math.random()*800;
  setTimeout(crearObs, tiempo);
}


// MUERTE
function morir(){
  jugando = false;

  spikes.forEach(s => s.el.remove());
  spikes = [];

  document.getElementById("startBtn").style.display="block";

  y = 50;
  velocidadY = 0;
  rotacion = 0;
  velocidad = 6;
  puntos = 0;

  player.style.bottom = "50px";
  player.style.transform = "rotate(0deg)";
}


// RESET
function resetGame(){
  spikes = [];
}


// DIFICULTAD SUAVE
setInterval(()=>{
  if(jugando){
    velocidad += 0.25;
  }
},3000);

</script>

</body>
</html>

`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo 🔥");
});
