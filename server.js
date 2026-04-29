const express = require("express");
const app = express();

// COMANDO /man
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
    justify-content:center;
    align-items:center;
    font-size:30px;
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

  <div id="left">
    🚧 MANTENIMIENTO
  </div>

  <div id="right">
    <div id="player"></div>
  </div>

  <script>
  const player = document.getElementById("player");
  const game = document.getElementById("right");

  let saltando = false;

  // SALTO MEJORADO (más alto)
  function saltar(){
    if(saltando) return;
    saltando = true;

    let altura = 0;

    let subir = setInterval(()=>{
      altura += 8; // más potente
      player.style.bottom = (50 + altura) + "px";

      if(altura >= 160){ // salto más alto
        clearInterval(subir);

        let bajar = setInterval(()=>{
          altura -= 8;
          player.style.bottom = (50 + altura) + "px";

          if(altura <= 0){
            clearInterval(bajar);
            saltando = false;
          }
        },15);
      }
    },15);
  }

  // PC (tecla espacio)
  document.addEventListener("keydown", (e)=>{
    if(e.code === "Space"){
      saltar();
    }
  });

  // móvil + click
  document.addEventListener("click", saltar);
  document.addEventListener("touchstart", saltar);

  // obstáculos
  function crearObs(){
    const obs = document.createElement("div");
    obs.classList.add("obs");

    let pos = window.innerWidth / 2;

    game.appendChild(obs);

    let velocidad = 6;

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

    setTimeout(crearObs,1200);
  }

  crearObs();
  </script>

  </body>
  </html>
  `);
});


// COMANDO /jue (pantalla amarilla)
app.get("/jue", (req, res) => {
  res.send(`
    <body style="background:yellow; margin:0;"></body>
  `);
});


// servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo 🔥");
});
