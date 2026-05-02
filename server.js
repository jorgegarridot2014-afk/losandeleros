const express = require("express");
const app = express();

app.get("/", (req, res) => {

res.setHeader("Content-Type", "text/html");

res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body{margin:0;font-family:Arial;background:#111;color:white;}
header{background:#222;padding:15px;text-align:center;font-size:24px;color:gold;}
#container{display:flex;flex-wrap:wrap;}
#left,#right{flex:1;padding:20px;text-align:center;}
@media(max-width:700px){#container{flex-direction:column;}}

.loader{
border:6px solid #333;
border-top:6px solid gold;
border-radius:50%;
width:70px;height:70px;
margin:20px auto;
animation:spin 1s linear infinite;
}

@keyframes spin{
0%{transform:rotate(0);}
100%{transform:rotate(360deg);}
}

#timer{font-size:22px;color:cyan;margin-top:10px;}

#game{
position:relative;
width:500px;height:320px;
background:black;
margin:auto;
overflow:hidden;
border:2px solid gold;
}

#percentGame{
position:absolute;
top:10px;right:15px;
font-size:26px;color:lime;
}

#player{
width:40px;height:40px;
background:lime;
position:absolute;
bottom:0;left:80px;
}

.spike{
width:30px;height:40px;
background:red;
position:absolute;
bottom:0;
clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

button{margin-top:10px;padding:10px 20px;}
</style>
</head>

<body>

<header>🏆 LOS ANDELEROS 🏆</header>

<div id="container">

<div id="left">
<h2>🔧 SERVIDORES EN MANTENIMIENTO</h2>
<p>Lo sentimos, estamos en mantenimiento.</p>

<div class="loader"></div>

<div id="timer"></div>

<p style="color:orange;margin-top:15px;">
Lo sentimos pero estamos en mantenimiento 🚧
</p>

<p style="color:#aaa;margin-top:10px;font-size:14px;">
No sabemos cuándo podrá estar la página web al 100% funcional por temas de copyright.
</p>
</div>

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
// ⏱️ TEMPORIZADOR (+1 día)
//////////////////////

const timerEl = document.getElementById("timer");

function getObjetivo(){
const ahora = new Date();
const objetivo = new Date();
objetivo.setHours(18,30,0,0);
objetivo.setDate(objetivo.getDate()+1);
return objetivo;
}

let objetivo = getObjetivo();

function actualizar(){
const ahora = new Date();
let diff = objetivo - ahora;

const h = Math.floor(diff/3600000);
const m = Math.floor((diff%3600000)/60000);
const s = Math.floor((diff%60000)/1000);

timerEl.innerText = h+"h "+m+"m "+s+"s";
}

setInterval(actualizar,1000);
actualizar();

//////////////////////
// 🎮 MINIJUEGO (FIX REAL)
//////////////////////

let y=0, vel=0, gravedad=-0.7;
let spikes=[], jugando=false, tiempo=0;

const game = document.getElementById("game");
const player = document.getElementById("player");
const percentGame = document.getElementById("percentGame");

function startGame(){
jugando=true;
y=0; vel=0; tiempo=0;

spikes.forEach(s=>s.el.remove());
spikes=[];

spawn();
}

function loop(){
requestAnimationFrame(loop);
if(!jugando) return;

tiempo += 0.016;

let progreso = Math.min(100, tiempo*5);
percentGame.innerText = Math.floor(progreso)+"%";

if(progreso>=100){
jugando=false;
alert("🏆 GANASTE");
}

vel += gravedad;
y += vel;

if(y<0){y=0;vel=0;}
player.style.bottom=y+"px";

spikes.forEach((s,i)=>{
s.x -= 8;
s.el.style.left = s.x+"px";

if(s.x<110 && s.x>60 && y<35){
jugando=false;
alert("💀 Has muerto");
}

if(s.x<-50){
s.el.remove();
spikes.splice(i,1);
}
});
}
loop();

function spawn(){
if(!jugando) return;

let s=document.createElement("div");
s.className="spike";
s.style.left="500px";

game.appendChild(s);
spikes.push({el:s,x:500});

setTimeout(spawn,1200+Math.random()*1200);
}

/* 🔥 SOLO DENTRO DEL JUEGO */
function saltar(){
if(jugando && y===0){
vel=14;
}
}

game.addEventListener("click", saltar);
game.addEventListener("touchstart", saltar);

document.addEventListener("keydown",(e)=>{
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor en puerto " + PORT));
