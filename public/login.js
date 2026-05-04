let usuario = null;
let cuentasGuardadas = JSON.parse(localStorage.getItem("cuentas")) || [];

window.onload = () => {

  const btnCrear = document.getElementById("btnCrear");
  const btnLogin = document.getElementById("btnLogin");
  const btnRecuperar = document.getElementById("btnRecuperar");
  const btnVolver = document.getElementById("btnVolver");

  const crearPanel = document.getElementById("crearPanel");
  const loginPanel = document.getElementById("loginPanel");
  const recuperarPanel = document.getElementById("recuperarPanel");

  const menuPrincipal = document.getElementById("menuPrincipal");

  const cuentasDiv = document.getElementById("cuentas");
  const tituloCuentas = document.getElementById("tituloCuentas");

  const perfil = document.getElementById("perfil");
  const app = document.getElementById("app");
  const menu = document.getElementById("menu");
  const juego = document.getElementById("juego");

  const perfilImg = document.getElementById("perfilImg");
  const perfilApodo = document.getElementById("perfilApodo");
  const perfilID = document.getElementById("perfilID");

  const estado = document.getElementById("estado");
  const usuarioTexto = document.getElementById("usuarioTexto");

  // AUTO LOGIN
  const ultima = localStorage.getItem("ultimaCuenta");
  if(ultima) loginPorID(ultima);

  cargarCuentas();

  // MENÚ
  btnCrear.onclick = ()=>mostrar(crearPanel);
  btnLogin.onclick = ()=>mostrar(loginPanel);
  btnRecuperar.onclick = ()=>mostrar(recuperarPanel);
  btnVolver.onclick = volver;

  function mostrar(panel){
    ocultar();
    panel.style.display="block";
    btnVolver.style.display="block";
    menuPrincipal.style.display="none";
  }

  function volver(){
    ocultar();
    menuPrincipal.style.display="block";
    btnVolver.style.display="none";
  }

  function ocultar(){
    crearPanel.style.display="none";
    loginPanel.style.display="none";
    recuperarPanel.style.display="none";
  }

  // CREAR
  document.getElementById("crearCuenta").onclick = async () => {
    const apodo = document.getElementById("apodoInput").value.trim();
    if(!apodo) return alert("Pon apodo");

    const res = await fetch("/crear",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ apodo })
    });

    const data = await res.json();

    guardarCuenta(data);
    alert("ID: " + data.ide);
  };

  // LOGIN
  document.getElementById("entrar").onclick = () => {
    loginPorID(document.getElementById("ideInput").value);
  };

  async function loginPorID(ide){
    if(!ide) return;

    const res = await fetch("/login",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ ide })
    });

    if(!res.ok) return alert("No existe");

    usuario = await res.json();

    guardarCuenta(usuario);
    localStorage.setItem("ultimaCuenta", usuario.ide);

    menu.style.display="none";
    app.style.display="block";

    cuentasDiv.style.display="none";
    tituloCuentas.style.display="none";

    usuarioTexto.innerText = "Bienvenido " + usuario.apodo;
    estado.innerText = usuario.apodo;
  }

  function guardarCuenta(user){
    cuentasGuardadas = cuentasGuardadas.filter(u=>u.ide!==user.ide);
    cuentasGuardadas.unshift(user);

    if(cuentasGuardadas.length > 5){
      cuentasGuardadas.pop();
    }

    localStorage.setItem("cuentas", JSON.stringify(cuentasGuardadas));
    cargarCuentas();
  }

  function cargarCuentas(){
    cuentasDiv.innerHTML="";

    cuentasGuardadas.forEach(u=>{
      const div = document.createElement("div");
      div.innerText = u.apodo;
      div.onclick = ()=>loginPorID(u.ide);
      cuentasDiv.appendChild(div);
    });
  }

  // RECUPERAR
  document.getElementById("buscarCuenta").onclick = async () => {
    const texto = document.getElementById("recuperarInput").value.trim();
    if(!texto) return alert("Escribe algo");

    const res = await fetch("/recuperar/" + texto);
    const data = await res.json();

    if(data.length === 0) return alert("No existe");

    let msg = "";
    data.forEach(u=>{
      msg += u.apodo + " | " + u.ide + "\n";
    });

    alert(msg);
  };

  // PERFIL
  document.getElementById("btnPerfil").onclick = () => {

    if(!usuario){
      alert("No estás en una cuenta");
      return;
    }

    perfil.style.display="block";
    app.style.display="none";

    perfilImg.src = usuario.foto || "https://i.pravatar.cc/100";
    perfilApodo.innerText = usuario.apodo;
    perfilID.innerText = usuario.ide;
  };

  window.cerrarPerfil = () => {
    perfil.style.display="none";
    app.style.display="block";
  };

  document.querySelectorAll("#fotos img").forEach(img=>{
    img.onclick = ()=>{
      usuario.foto = img.src;
      perfilImg.src = img.src;
    };
  });

  // BOTÓN ENTRAR (JUEGO)
  document.getElementById("btnEntrarJuego").onclick = () => {
    app.style.display="none";
    juego.style.display="block";
  };

  window.volverApp = () => {
    juego.style.display="none";
    app.style.display="block";
  };

  // LOGOUT
  document.getElementById("logout").onclick = () => {
    usuario=null;

    menu.style.display="block";
    app.style.display="none";

    cuentasDiv.style.display="block";
    tituloCuentas.style.display="block";

    estado.innerText="No has iniciado sesión";
  };

  // MODO
  document.getElementById("btnModo").onclick = () => {
    document.body.classList.toggle("claro");
  };

};