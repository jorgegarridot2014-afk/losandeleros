(function() {
  const socket = io();
  socket.on("connect", () => {
    const lastIde = localStorage.getItem("andeleros_last_active");
    if (lastIde) {
      socket.emit("auth-user", lastIde);
    }
  });
  socket.on("go-hacker", () => { window.location.href = "/hacker.html"; });
})();
