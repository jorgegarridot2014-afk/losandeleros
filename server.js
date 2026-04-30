const express = require("express");
const app = express();

app.get("/", (req, res) => {

const modo = req.query.modo;
const conJuego = modo !== "man";

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
  font-size:22px;
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

/* porcentaje dentro del juego */
#percentGame{
  position:absolute;
  top:10px;
  right:15px;
  font-size:26px;
  color:lime;
  font-weight:bold;
}

/* jugador */
#player{
  width:40px;
  height:40px;
  background:lime;
  position:absolute;
  bottom:0;
  left:80px;
}

/* pinchos */
.spike{
  width:0;
  height:0;
  border-left:15px solid transparent;
  border-right:15px solid transparent;
  border-bottom:40px solid red;
  position:absolute;
  bottom:0;
}

/* botón */
button{
  margin-top:10px;
  padding:10px 20px;
  font-size:16px;
}

/* loader */
.loader{
  border:6px solid #333;
  border-top:6px solid gold;
  border-radius:50%;
  width:60px;
  height:60px;
  margin:auto;
  animation:spin 1s linear infinite;
}

@keyframes spin{
  0%{transform:rotate(0);}
  100%{transform:rotate(360deg);}
}

/* eventos */
#eventos{
  margin-top:20px;
  background:#222;
  padding:15px;
  border-radius:10px;
  text-align:left;
}
</style>
</head>

<body>

<header>🔥 ANDEROS 🔥</header>

<div id="container">

<div id="left">
  <h2>🔧 Servidores en mantenimiento</h2>
  <p>Lo sentimos, estamos mejorando el sistema</p>

  <div class="loader"></div>

  <div id="eventos">
    <h3>🏆 EVENTOS</h3>
    <p>🟣 Brawl Stars - partidas ganadas</p>
    <p>⚽ 1v1 balón brawl</p>
    <p>🟡 Clash of Clans - super luchador</p>
    <p>⚔️ 1v1 desafíos</p>
    <p>🔵 Clash Royale - 1v1</p>
    <p>🎁 Premios: cuches, diploma, póster</p>
  </div>
</div>

${conJuego ? `
<div id="right">
  <h3>🎮 Minijuego</h3>

  <div id="game">
    <div id="percentGame">0%</div>
    <div id="player"></div>
  </div>

  <button onclick="startGame()">JUGAR</button>
</div>
` : ''}

</div>

<script>

// ===== PORCENTAJE =====
let progreso = 0;
function subirPorcentaje(){
  if(progreso < 100){
    progreso += Math.random()*3;
    if(progreso > 100) progreso = 100;
    percentGame.innerText = Math.floor(progreso) + "%";
  }
}

// ===== JUEGO =====
${conJuego ? `
let y=0;
let vel=0;
let gravedad=-0.4;
let spikes=[];
let tiempo=0;
let jugando=false;

function startGame(){
  jugando = true;
  y=0;
  vel=0;
  tiempo=0;
  progreso=0;

  document.querySelectorAll(".spike").forEach(e=>e.remove());
  spikes=[];

  setTimeout(spawn,2000);
}

function loop(){

  if(jugando){

    tiempo += 0.016;
    subirPorcentaje();

    vel += gravedad;
    y += vel;

    if(y < 0){
      y = 0;
      vel = 0;
    }

    player.style.bottom = y+"px";

    spikes.forEach((s,i)=>{
      s.x -= velocidad();
      s.el.style.left = s.x+"px";

      if(s.x < 80){
        jugando = false;
        alert("💀 Has perdido - dale a JUGAR");
      }

      if(s.x < -20){
        s.el.remove();
        spikes.splice(i,1);
      }
    });
  }

  requestAnimationFrame(loop);
}
loop();

function velocidad(){
  if(tiempo < 5) return 3;
  if(tiempo < 10) return 4;
  if(tiempo < 20) return 5;
  return 6;
}

function spawn(){

  if(!jugando) return;

  let s=document.createElement("div");
  s.className="spike";
  game.appendChild(s);

  spikes.push({el:s,x:500});

  let delay = 2000;
  if(tiempo>5) delay=1500;
  if(tiempo>10) delay=1200;
  if(tiempo>20) delay=900;

  setTimeout(spawn, delay);
}

// salto manual
document.addEventListener("click", ()=>{
  if(jugando && y === 0){
    vel = 8;
  }
});

document.addEventListener("touchstart", ()=>{
  if(jugando && y === 0){
    vel = 8;
  }
});
` : ''}

</script>

</body>
</html>
`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
  console.log("🔥 servidor final PRO");
});
