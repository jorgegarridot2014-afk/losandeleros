const mantenimiento = true;

app.get("*", (req,res)=>{
  if(mantenimiento){
    return res.sendFile(__dirname + "/maintenance.html");
  }
  res.sendFile(__dirname + "/index.html");
});