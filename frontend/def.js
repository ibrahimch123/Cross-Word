document.addEventListener("DOMContentLoaded", async () => {
    const player = localStorage.getItem("player");
    const authBox = document.getElementById("auth-container");
    const gameBox = document.getElementById("define-mode");
  
    if (!player) return; // Let login.js handle login
  
    if (authBox) authBox.style.display = "none";
    if (gameBox) gameBox.style.display = "block";
  
    const pathParts = window.location.pathname.split("/");
    const lang = pathParts[3] || "en";
    const timeLimit = parseInt(pathParts[4]) || 60;
  
    const wordSpan = document.getElementById("def-word");
    const timerSpan = document.getElementById("def-timer");
    const form = document.getElementById("def-form");
    const input = document.getElementById("def-input");
    const msg = document.getElementById("def-message");
    const scoreMsg = document.getElementById("def-score");
  
    // Display user info
    const welcomeUser = document.getElementById("welcome-user");
    if (welcomeUser) welcomeUser.textContent = "Logged in as: " + player;
  
    // Logout
    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("player");
        location.reload();
      });
    }
  
    let word = "";
    let remaining = timeLimit;
    let timer;
  
    try {
      const res = await fetch(`/api/defword/${lang}`);
      const data = await res.json();
      word = data.word.toUpperCase();
      wordSpan.textContent = word;
  
      // Start countdown
      timer = setInterval(() => {
        remaining--;
        timerSpan.textContent = remaining;
      
        if (remaining <= 0) {
            clearInterval(timer);
            msg.textContent = "Time's up!";
            input.disabled = true;
            form.querySelector("button").disabled = true;
          
            const replayBtn = document.getElementById("replay-button");
            if (replayBtn) replayBtn.style.display = "inline-block";
          }
          
      }, 1000);
      
    } catch (err) {
      console.error("Failed to load word:", err);
      msg.textContent = "Failed to load word.";
    }
  
    // Handle submission of definitions
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.textContent = "";
      scoreMsg.textContent = "";
  
      const definition = input.value.trim();
  
      if (definition.length < 5 || definition.length > 200) {
        msg.textContent = "Definition must be 5–200 characters.";
        return;
      }
  
      try {
        const res = await fetch("/api/def", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word,
            definition,
            language: lang,
            username: player,
          }),
        });
  
        const result = await res.json();
  
        if (res.ok) {
          scoreMsg.textContent = `+${result.bonus} points awarded.`;
          input.value = "";
        } else {
          msg.textContent = result.error || "Failed to submit.";
        }
      } catch (err) {
        msg.textContent = "Error submitting definition.";
      }
    });
  });
  const replayBtn = document.getElementById("replay-button");
if (replayBtn) {
  replayBtn.addEventListener("click", () => {
    window.location.reload(); // Simple way to restart the game
  });
}
