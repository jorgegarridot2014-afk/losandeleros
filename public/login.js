let usuario = null;
let seleccionEliminar = [];

// ===== CARGAR CUENTAS =====
async function cargarCuentas(){
  const cont = document.getElementById("cuentas");
  cont.innerHTML = "";

  try{
    const res = await fetch("/cuentas");
    const data = await res.json();

    if(!Array.isArray(data) || data.length === 0){
      cont.innerHTML = "No hay cuentas";
      return;
    }

    data.forEach(u=>{
      const div = document.createElement("div");

      const img = document.createElement("img");
      img.src = u.foto || "https://i.pravatar.cc/100?img=1";
      img.style.width = "40px";
      img.style.height = "40px";
      img.style.borderRadius = "50%";

      const nombre = document.createElement("span");
      nombre.innerText = u.apodo;

      div.appendChild(img);
      div.appendChild(nombre);

      div.onclick = ()=>{
        usuario = u;
        entrar();
      };

      cont.appendChild(div);
    });

  }catch(e){
    cont.innerHTML = "Error servidor";
  }
}

// ===== CREAR CUENTA =====
async function crear(){
  const apodo = document.getElementById("apodo").value;

  if(!apodo) return alert("Pon un apodo");

  const res = await fetch("/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({apodo})
  });

  const data = await res.json();

  if(data.error === "max"){
    return alert("Máximo 5 cuentas");
  }

  if(data.error){
    return alert("Error");
  }

  alert("Cuenta creada ID: " + data.ide);

  cargarCuentas();
}

// ===== LOGIN =====
async function login(){
  const ide = document.getElementById("ide").value;

  if(!ide) return alert("Pon ID");

  const res = await fetch("/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ide})
  });

  const data = await res.json();

  if(data.error){
    return alert("No existe");
  }

  usuario = data;
  entrar();
}

// ===== ENTRAR =====
function entrar(){
  document.getElementById("menu").style.display = "none";
  document.getElementById("app").style.display = "flex";

  document.getElementById("usuarioTexto").innerText =
    "Sesión: " + usuario.apodo;

  // PERFIL
  document.getElementById("perfilImg").src =
    usuario.foto || "https://i.pravatar.cc/100?img=1";

  document.getElementById("perfilApodo").innerText = usuario.apodo;
  document.getElementById("perfilID").innerText = "ID: " + usuario.ide;
}

// ===== LOGOUT =====
function logout(){
  usuario = null;

  document.getElementById("app").style.display = "none";
  document.getElementById("menu").style.display = "flex";
}

// ===== PERFIL =====
function abrirPerfil(){
  if(!usuario){
    alert("Inicia sesión");
    return;
  }

  document.getElementById("menu").style.display = "none";
  document.getElementById("app").style.display = "none";
  document.getElementById("perfil").style.display = "flex";
}

// ===== CAMBIAR FOTO =====
async function cambiarFoto(src){
  if(!usuario) return;

  usuario.foto = src;

  document.getElementById("perfilImg").src = src;

  await fetch("/guardarPerfil",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      ide: usuario.ide,
      foto: src
    })
  });

  cargarCuentas();
}

// ===== ELIMINAR =====
async function abrirEliminar(){
  seleccionEliminar = [];

  document.getElementById("perfil").style.display = "none";
  document.getElementById("eliminarPanel").style.display = "flex";

  const cont = document.getElementById("tablaEliminar");
  cont.innerHTML = "";

  const res = await fetch("/cuentas");
  const data = await res.json();

  data.forEach(u=>{
    const div = document.createElement("div");

    const check = document.createElement("input");
    check.type = "checkbox";

    check.onchange = ()=>{
      if(check.checked){
        seleccionEliminar.push(Number(u.ide));
      }else{
        seleccionEliminar =
          seleccionEliminar.filter(id => id !== Number(u.ide));
      }
    };

    div.appendChild(check);
    div.append(" " + u.apodo);

    cont.appendChild(div);
  });
}

// ===== CONFIRMAR ELIMINAR =====
async function confirmarEliminar(){
  if(seleccionEliminar.length === 0){
    return alert("Selecciona cuentas");
  }

  await fetch("/eliminar",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ids: seleccionEliminar})
  });

  seleccionEliminar = [];

  cargarCuentas();

  alert("Eliminadas");

  document.getElementById("eliminarPanel").style.display = "none";
  document.getElementById("menu").style.display = "flex";
}

// ===== VOLVER =====
function volver(){
  document.getElementById("perfil").style.display = "none";
  document.getElementById("eliminarPanel").style.display = "none";

  if(usuario){
    document.getElementById("app").style.display = "flex";
  }else{
    document.getElementById("menu").style.display = "flex";
  }
}

// ===== INICIO =====
window.onload = ()=>{
  document.getElementById("menu").style.display = "flex";
  cargarCuentas();
};