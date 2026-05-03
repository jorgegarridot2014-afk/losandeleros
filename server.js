const express = require("express");
const fs = require("fs");
const app = express();

app.use(express.json());
app.use(express.static("public"));

let users = [];

// CARGAR USUARIOS
if (fs.existsSync("users.json")) {
  users = JSON.parse(fs.readFileSync("users.json"));
}

// 🔥 ASEGURAR FOTO SIEMPRE
users = users.map(u => ({
  ...u,
  foto: u.foto || "https://i.pravatar.cc/150?img=1"
}));

function guardar(){
  fs.writeFileSync("users.json", JSON.stringify(users,null,2));
}

// OBTENER CUENTAS
app.get("/cuentas",(req,res)=>{
  res.json(users);
});

// LOGIN / CREAR
app.post("/login",(req,res)=>{
  const {ide, apodo} = req.body;

  // LOGIN
  if(ide){
    const u = users.find(x=>x.ide == ide);
    if(!u) return res.json({error:true});
    return res.json(u);
  }

  // CREAR
  if(apodo){
    if(users.length >= 5){
      return res.json({error:"max"});
    }

    let id;
    do{
      id = Math.floor(Math.random()*2000)+1;
    }while(users.find(x=>x.ide == id));

    const nuevo = {
      apodo,
      ide: id,
      coins: 100,
      foto: "https://i.pravatar.cc/150?img=3"
    };

    users.push(nuevo);
    guardar();

    return res.json(nuevo);
  }

  res.json({error:true});
});

// ELIMINAR CUENTAS
app.post("/eliminar",(req,res)=>{
  const {ids} = req.body;

  users = users.filter(u => !ids.includes(u.ide));
  guardar();

  res.json({ok:true});
});

// CAMBIAR FOTO
app.post("/guardarPerfil",(req,res)=>{
  const {ide, foto} = req.body;

  const u = users.find(x=>x.ide == ide);

  if(u){
    u.foto = foto;
    guardar();
    return res.json({ok:true});
  }

  res.json({error:true});
});

app.listen(3000,()=>{
  console.log("Servidor en http://localhost:3000");
});