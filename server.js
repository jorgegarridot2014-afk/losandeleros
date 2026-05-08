const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

/* 🔗 CONEXIÓN MONGODB */
mongoose.connect("mongodb+srv://6767:Dfagt3evMJbBKuqj@cluster0.cqeusrr.mongodb.net/appUsuarios?retryWrites=true&w=majority")
.then(()=> console.log("MongoDB conectado"))
.catch(err=> console.log(err));

/* 🔒 MANTENIMIENTO SIEMPRE ACTIVO */
const mantenimiento = true;

app.use((req,res,next)=>{
  if(mantenimiento){
    return res.send(`
      <html>
      <head>
      <style>
      body{
        background:#111;
        color:white;
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
        font-family:Arial;
        text-align:center;
      }
      .box{
        background:#222;
        padding:40px;
        border-radius:10px;
      }
      button{
        padding:12px 20px;
        background:orange;
        border:none;
        margin-top:20px;
        cursor:pointer;
      }
      </style>
      </head>
      <body>
        <div class="box">
          <h1>🔒 WEB EN MANTENIMIENTO</h1>
          <p>Por seguridad de usuarios</p>
          <button onclick="window.location.href='https://darkterminal.onrender.com/'">
          👉 Ir a Escape Rooms
          </button>
        </div>
      </body>
      </html>
    `);
  }
  next();
});

/* 🚀 START */
app.listen(PORT, ()=>{
  console.log("Servidor activo");
});
