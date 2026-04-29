const express = require("express");
const app = express();


// 🎮 /man → MANTENIMIENTO + JUEGO PRO
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
    background:linear-gradient(black, #111);
    color:white;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
  }

  #left h1{
    font-size:30px;
  }

  #timer{
    font-size:20px;
    margin-top:10px;
  }

  /* DERECHA */
  #game{
    width:50%;
    height:100vh;
    background:#1a1a1a;
    position:relative;
    overflow:hidden;
  }

  #player{
    width:40px;
    height:40px;
    background:#0f0;
    position:absolute;
    bottom:50px;
    left:50px;
    border-radius:5px;
  }

  .obs{
    width:30px;
    height:60px;
    background:red;
    position:absolute;
    bottom:50px;
  }

  #startBtn{
    position:absolute;
    top:20px;
    left:20px;
    padding:10px 20px;
    font-size:18px;
    background:#0f0;
    border:none;
    cursor:pointer;
  }

  </style>
  </head>

  <body>

  <!-- IZQUIERDA -->
  <div id="left">
    <h1>🚧 MANTENIMIENTO</h1>
    <div id="timer">Cargando...</div>
  </div>

  <!-- DERECHA -->
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
      h + "h " + m + "m " + s + "s";
  }

  setInterval(actualizarTimer, 1000);
  actualizarTimer();


  // 🎮 JUEGO PRO
  const player = document.getElementById("player");
  const game = document.getElementById("game");

  let saltando = false;
  let jugando = false;
  let velocidad = 6;

  function saltar(){
    if(!jugando) return;
    if(saltando) return;

    saltando = true;
    let altura = 0;

    let subir = setInterval(()=>{
      altura += 12; // salto rápido
      player.style.bottom = (50 + altura) + "px";

      if(altura >= 180){
        clearInterval(subir);

        let bajar = setInterval(()=>{
          altura -= 12;
          player.style.bottom = (50 + altura) + "px";

          if(altura <= 0){
            clearInterval(bajar);
            saltando = false;
          }
        },15);
      }
    },15);
  }

  // controles
  document.addEventListener("keydown", e=>{
    if(e.code === "Space") saltar();
  });

  document.addEventListener("click", saltar);
  document.addEventListener("touchstart", saltar);


  function startGame(){
    jugando = true;
    document.getElementById("startBtn").style.display = "none";
    crearObs();
    aumentarDificultad();
  }

  function crearObs(){
    if(!jugando) return;

    const obs = document.createElement("div");
    obs.classList.add("obs");

    let pos = window.innerWidth / 2;
    game.appendChild(obs);

    let mover = setInterval(()=>{
      pos -= velocidad;
      obs.style.left = pos + "px";

      const p = player.getBoundingClientRect();
      const o = obs.getBoundingClientRect();

      if(
        p.right > o.left &&
        p.left < o.right &&
        p.bottom > o.top
      ){
        alert("💀 PERDISTE");
        location.reload();
      }

      if(pos < -50){
        clearInterval(mover);
        obs.remove();
      }

    },20);

    setTimeout(crearObs, 900);
  }

  function aumentarDificultad(){
    setInterval(()=>{
      velocidad += 0.5; // cada vez más rápido 🔥
    },3000);
  }

  </script>

  </body>
  </html>
  `);
});


// 🟡 /jue
app.get("/jue", (req, res) => {
  res.send(`<body style="background:yellow; margin:0;"></body>`);
});


// 🚀 SERVIDOR
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo 🔥");
});
