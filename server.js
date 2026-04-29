const express = require("express");
const app = express();


// 🟢 MENÚ PRINCIPAL
app.get("/", (req, res) => {
  res.send(`
    <html>
    <body style="font-family:Arial; text-align:center; margin-top:50px;">
      <h1>🎮 Los Andeleros</h1>

      <p><a href="/man">🚧 Mantenimiento + Juego</a></p>
      <p><a href="/jue">🟡 Pantalla amarilla</a></p>
    </body>
    </html>
  `);
});


// 🎮 + 🚧 + ⏳ COMANDO /man
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
  }

  #left{
    width:50%;
    background:#111;
    color:white;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    font-size:25px;
  }

  #right{
    width:50%;
    height:100vh;
    background:#222;
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
  }

  .obs{
    width:30px;
    height:60px;
    background:red;
    position:absolute;
    bottom:50px;
  }

  </style>
  </head>

  <body>

  <!-- IZQUIERDA -->
  <div id="left">
    🚧 MANTENIMIENTO
    <br><br>
    ⏳ <span id="timer">Cargando...</span>
  </div>

  <!-- DERECHA -->
  <div id="right">
    <div id="player"></div>
  </div>

  <script>
  // -------- TIMER --------
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


  // -------- JUEGO --------
  const player = document.getElementById("player");
  const game = document.getElementById("right");

  let saltando = false;

  function saltar(){
    if(saltando) return;
    saltando = true;

    let altura = 0;

    let subir = setInterval(()=>{
      altura += 10; // MÁS salto
      player.style.bottom = (50 + altura) + "px";

      if(altura >= 180){
        clearInterval(subir);

        let bajar = setInterval(()=>{
          altura -= 10;
          player.style.bottom = (50 + altura) + "px";

          if(altura <= 0){
            clearInterval(bajar);
            saltando = false;
          }
        },15);
      }
    },15);
  }

  // PC
  document.addEventListener("keydown", e=>{
    if(e.code === "Space") saltar();
  });

  // móvil + click
  document.addEventListener("click", saltar);
  document.addEventListener("touchstart", saltar);


  function crearObs(){
    const obs = document.createElement("div");
    obs.classList.add("obs");

    let pos = window.innerWidth / 2;
    game.appendChild(obs);

    let velocidad = 7;

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

    setTimeout(crearObs,1000);
  }

  crearObs();

  </script>

  </body>
  </html>
  `);
});


// 🟡 COMANDO /jue
app.get("/jue", (req, res) => {
  res.send(`
    <body style="background:yellow; margin:0;"></body>
  `);
});


// 🚀 SERVIDOR
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo 🔥");
});
