(function() {
  const LAST_ACTIVE_KEY = "andeleros_last_active";
  const ide = localStorage.getItem(LAST_ACTIVE_KEY);
  if (!ide) return;

  const style = document.createElement("style");
  style.textContent = "@keyframes bonusPop{0%{transform:translateY(0);opacity:1;}50%{transform:translateY(-10px);}100%{transform:translateY(0);opacity:1;}}";
  document.head.appendChild(style);

  fetch(`/user/${encodeURIComponent(ide)}`)
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(data => {
      const newPoints = (data.points || 0) + 50;
      return fetch(`/update/${encodeURIComponent(ide)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: newPoints })
      });
    })
    .then(() => {
      const msg = document.createElement("div");
      msg.textContent = "+50 ⭐";
      msg.style.cssText = "position:fixed; top:20px; right:20px; background:linear-gradient(90deg,#f59e0b,#f97316); color:white; padding:12px 20px; border-radius:12px; font-weight:bold; z-index:99999; box-shadow:0 0 20px rgba(249,115,22,0.5); animation: bonusPop 0.5s ease;";
      document.body.appendChild(msg);
      setTimeout(() => { msg.style.opacity = "0"; msg.style.transition = "opacity 0.5s"; }, 2500);
      setTimeout(() => msg.remove(), 3100);
    })
    .catch(err => console.error("Error bonus:", err));
})();
