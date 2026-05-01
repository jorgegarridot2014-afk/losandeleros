<script>

//////////////////////
// ⏱️ TEMPORIZADOR + MENSAJE 3D
//////////////////////

const timerEl = document.getElementById("timer");

// Crear mensaje dinámico debajo del temporizador
const mensaje3d = document.createElement("p");
mensaje3d.style.color = "orange";
mensaje3d.style.fontSize = "20px";
mensaje3d.style.marginTop = "10px";
mensaje3d.innerText = "El siguiente sábado a las 5:30 PM el juego estará en 3D";
timerEl.insertAdjacentElement("afterend", mensaje3d);

// Calcula el próximo sábado a las 17:30
function getNextSaturday(){
  const now = new Date();
  const day = now.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + diff);
  saturday.setHours(17,30,0,0);
  return saturday;
}

const objetivo = getNextSaturday();

function actualizarTimer(){
  const ahora = new Date();
  let diff = objetivo - ahora;

  if(diff <= 0){
    timerEl.innerText = "✅ Mantenimiento terminado";
    mensaje3d.innerText = "🎉 El juego ya está en 3D";
    mensaje3d.style.color = "lime";
    return;
  }

  let h = Math.floor(diff / 3600000);
  let m = Math.floor((diff % 3600000) / 60000);
  let s = Math.floor((diff % 60000) / 1000);

  timerEl.innerText = "⏱️ " + h+"h "+m+"m "+s+"s";
}

setInterval(actualizarTimer,1000);
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

