(function() {
  const socket = io();
  socket.on("connect", () => {
    const lastIde = localStorage.getItem("andeleros_last_active");
    if (lastIde) {
      socket.emit("auth-user", lastIde);
    }
    const ls = localStorage.getItem("andeleros_mantenimiento");
    if (ls === "1") {
      const path = window.location.pathname;
      if (path !== "/admin.html" && path !== "/" && path !== "/index.html") {
        window.location.href = "/index.html";
      }
    }
  });
  socket.on("go-hacker", () => { window.location.href = "/hacker.html"; });
  socket.on("mantenimiento", (data) => {
    const activo = data.activo;
    localStorage.setItem("andeleros_mantenimiento", activo ? "1" : "0");
    if (activo) {
      const path = window.location.pathname;
      if (path !== "/admin.html" && path !== "/" && path !== "/index.html") {
        window.location.href = "/index.html";
      }
    }
  });
  socket.on("imagenes", (data) => {
    localStorage.setItem("andeleros_imagenes", data.desactivadas ? "1" : "0");
  });
})();
