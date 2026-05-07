const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

/* 🔒 MANTENIMIENTO TOTAL */
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

app.use(express.static(__dirname));

app.listen(PORT, ()=>{
  console.log("Servidor activo");
});