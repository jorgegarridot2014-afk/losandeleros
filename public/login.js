const mantenimiento = true;

window.onload = () => {
  if(mantenimiento){
    document.getElementById("maintenance").style.display = "flex";
    return;
  }

  actualizarUI();
};