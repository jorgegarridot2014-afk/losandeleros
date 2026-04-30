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

/* temporizador */
#timer{
  font-size:20px;
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
  font-weight:bold;
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
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

button{
  margin-top:10px;
  padding:10px 20px;
  font-size:16px;
}

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
</style>
</head>

<body>

<header>
🏆 LOS ANDELEROS 🏆
<div id="timer">⏱️ 0.0s</div>
</header>

<div id="container">

<div id="left">
  <h2>🔧 Mantenimiento</h2>
  <p>Estamos mejorando los servidores</p>

  <div class="loader"></div>

  <img src="https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif" width="250">
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

let y=0;
let vel=0;
let gravedad=-0.7;
let spikes=[];
let jugando=false;
let tiempo=0;

// INICIAR
function startGame(){
  jugando=true;
  y=0;
  vel=0;
  tiempo=0;

  document.querySelectorAll(".spike").forEach(e=>e.remove());
  spikes=[];

  setTimeout(spawn,1500);
}

// LOOP
function loop(){

  if(jugando){

    tiempo += 0.016;

    // temporizador
    timer.innerText = "⏱️ " + tiempo.toFixed(1) + "s";

    // porcentaje
    let progreso = Math.min(100, tiempo*5);
    percentGame.innerText = Math.floor(progreso) + "%";

    // GANAR → reinicia solo
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

      // colisión
      if(s.x < 110 && s.x > 60 && y < s.altura + 20){
        jugando=false;
        alert("💀 Has muerto - dale a JUGAR");
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

// SPAWN CON ALTURA RANDOM
function spawn(){

  if(!jugando) return;

  let s=document.createElement("div");
  s.className="spike";

  // altura aleatoria
  let altura = Math.random() * 80;
  s.style.bottom = altura + "px";

  game.appendChild(s);

  spikes.push({el:s,x:500,altura:altura});

  setTimeout(spawn,1200);
}

// SALTO
function saltar(){
  if(jugando && y===0){
    vel = 15;
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

app.listen(3000, ()=>{
  console.log("🔥 servidor PRO++ funcionando");
});
