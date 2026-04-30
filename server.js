const express = require("express");
const app = express();

app.get("/", (req, res) => {

  const modo = req.query.modo;

  // true = con juego
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

#timer{font-size:30px;}
#percent{font-size:40px;color:lime;}

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

#game{
  position:relative;
  width:450px;
  height:300px;
  background:black;
  margin:auto;
  overflow:hidden;
  border:2px solid gold;
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
  width:0;
  height:0;
  border-left:15px solid transparent;
  border-right:15px solid transparent;
  border-bottom:40px solid red;
  position:absolute;
  bottom:0;
}

#eventos{
  margin-top:20px;
  background:#222;
  padding:10px;
  border-radius:10px;
}
</style>
</head>

<body>

<header>🔥 ANDEROS 🔥</header>

<div id="container">

<div id="left">
  <h2>🔧 Servidores en mantenimiento</h2>
  <p>Lo sentimos, estamos mejorando el sistema</p>

  ${conJuego ? '<div id="timer"></div>' : ''}

  <div id="percent">0%</div>

  <div class="loader"></div>

  <div id="eventos">
    <h3>🏆 Eventos</h3>
    <p>Brawl Stars</p>
    <p>Clash Royale</p>
    <p>Clash of Clans</p>
  </div>
</div>

${conJuego ? `
<div id="right">
  <h3>🎮 Minijuego</h3>
  <div id="game">
    <div id="player"></div>
  </div>
</div>
` : ''}

</div>

<script>

// ===== PORCENTAJE =====
let progreso = 0;
setInterval(()=>{
  if(progreso < 100){
    progreso += Math.random()*4;
    if(progreso > 100) progreso = 100;
    percent.innerText = Math.floor(progreso) + "%";
  }
},500);

// ===== TEMPORIZADOR =====
${conJuego ? `
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
` : ''}

// ===== JUEGO =====
${conJuego ? `
let y=0;
let vel=0;
let gravedad=-0.4;
let spikes=[];
let tiempo=0;

// NO pinchos al inicio
setTimeout(spawn,2000);

function loop(){

  tiempo += 0.016;

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
      alert("💀 Game Over");
      location.reload();
    }

    if(s.x < -20){
      s.el.remove();
      spikes.splice(i,1);
    }
  });

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

  let s=document.createElement("div");
  s.className="spike";
  game.appendChild(s);

  spikes.push({el:s,x:450});

  let delay = 2000;
  if(tiempo>5) delay=1500;
  if(tiempo>10) delay=1200;
  if(tiempo>20) delay=900;

  setTimeout(spawn, delay);
}

// SALTO MANUAL
document.addEventListener("click", ()=>{
  if(y === 0){
    vel = 8;
  }
});

document.addEventListener("touchstart", ()=>{
  if(y === 0){
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
  console.log("🔥 servidor con comandos listo");
});
