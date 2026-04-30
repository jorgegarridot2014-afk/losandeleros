const express = require("express");
const app = express();

// RUTA PRINCIPAL
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
  background:#1a1a1a;
  color:white;
}

header{
  background:#333;
  padding:15px;
  text-align:center;
  font-size:20px;
}

#container{
  display:flex;
  flex-wrap:wrap;
}

#left, #right{
  flex:1;
  padding:20px;
  text-align:center;
}

/* móvil */
@media(max-width:700px){
  #container{
    flex-direction:column;
  }
}

/* temporizador */
#timer{
  font-size:28px;
  margin:20px 0;
}

/* rueda */
.loader{
  border:6px solid #444;
  border-top:6px solid yellow;
  border-radius:50%;
  width:50px;
  height:50px;
  margin:auto;
  animation:spin 1s linear infinite;
}

@keyframes spin{
  0%{transform:rotate(0deg);}
  100%{transform:rotate(360deg);}
}

/* juego */
#game{
  position:relative;
  width:300px;
  height:200px;
  background:black;
  margin:auto;
  overflow:hidden;
}

#player{
  width:30px;
  height:30px;
  background:yellow;
  position:absolute;
  bottom:0;
  left:50px;
}

.spike{
  width:0;
  height:0;
  border-left:10px solid transparent;
  border-right:10px solid transparent;
  border-bottom:30px solid red;
  position:absolute;
  bottom:0;
}

button{
  padding:10px;
  margin-top:10px;
}
</style>
</head>

<body>

<header>
🔧 Mantenimiento - Andeleros
</header>

<div id="container">

<div id="left">
  <h2>🔧 En mantenimiento</h2>
  <p>Lo sentimos, pero estamos en mantenimiento mejorando los servidores</p>

  <div id="timer"></div>

  <div class="loader"></div>
</div>

<div id="right">
  <h3>🎮 Minijuego</h3>

  <div id="game">
    <div id="player"></div>
  </div>

  <button onclick="startGame()">Jugar</button>
</div>

</div>

<script>

// ===== TEMPORIZADOR =====
let objetivo = new Date();
objetivo.setDate(objetivo.getDate() + ((6 - objetivo.getDay() + 7) % 7));
objetivo.setHours(17,30,0);

function actualizarTimer(){
  let ahora = new Date();
  let diff = objetivo - ahora;

  if(diff <= 0){
    timer.innerText = "YA DISPONIBLE 🔥";
    return;
  }

  let h = Math.floor(diff / 1000 / 60 / 60);
  let m = Math.floor(diff / 1000 / 60) % 60;
  let s = Math.floor(diff / 1000) % 60;

  timer.innerText = h+"h "+m+"m "+s+"s";
}

setInterval(actualizarTimer,1000);
actualizarTimer();


// ===== JUEGO =====
let jugando=false;
let y=0;
let vel=0;
let gravedad=-0.4;
let spikes=[];
let tiempo=0;

function startGame(){
  jugando=true;
  y=0;
  vel=8;
  spikes=[];
  tiempo=0;

  document.querySelectorAll(".spike").forEach(e=>e.remove());

  setTimeout(spawn,2000); // NO pinchos al inicio
}

function loop(){

  if(jugando){

    tiempo += 0.016;

    vel += gravedad;
    y += vel;

    if(y < 0){
      y = 0;
      vel = 8;
    }

    player.style.bottom = y+"px";

    spikes.forEach((s,i)=>{
      s.x -= velocidad();

      s.el.style.left = s.x+"px";

      if(s.x < 60){
        alert("💀 Game Over");
        jugando=false;
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

  let s = document.createElement("div");
  s.className="spike";

  game.appendChild(s);

  spikes.push({
    el:s,
    x:300
  });

  let delay = 2000;

  if(tiempo > 5) delay = 1500;
  if(tiempo > 10) delay = 1200;
  if(tiempo > 20) delay = 900;

  setTimeout(spawn, delay);
}

// controles móvil + pc
document.addEventListener("click", ()=> vel=8);
document.addEventListener("touchstart", ()=> vel=8);

</script>

</body>
</html>

`);
});

// PUERTO
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Servidor funcionando");
});
