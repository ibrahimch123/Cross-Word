// === On Page Load ===
document.addEventListener("DOMContentLoaded", async () => {
  const player = localStorage.getItem("player");
  const password = localStorage.getItem("password");

  const authBox = document.getElementById("auth-container");
  const gameBox = document.getElementById("game-container");
  const startBtn = document.getElementById("start-button");
  const welcomeUser = document.getElementById("welcome-user");

  // Show game UI if logged in, otherwise stay on auth
  if (player && password) {
    if (authBox) authBox.style.display = "none";
    if (gameBox) gameBox.style.display = "block";
    if (welcomeUser) welcomeUser.textContent = "Logged in as: " + player;
    if (startBtn) startBtn.style.display = "inline-block";
  } else {
    if (authBox) authBox.style.display = "block";
    if (gameBox) gameBox.style.display = "none";
    return;
  }

  // Logout logic
  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch(`/gamers/logout/${player}/${password}`, { method: "POST" });
      } catch (_) {}
      localStorage.removeItem("player");
      localStorage.removeItem("password");
      location.reload();
    });
  }

  // Start button triggers game setup
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      runDefinitionGame(); // Keep button visible
    });
  }
});


// === Main Game Logic ===
function runDefinitionGame() {
  // Clear old timer if it exists
  if (window.definitionTimer) {
    clearInterval(window.definitionTimer);
  }

  // === Config & State Setup ===
  const pathParts = window.location.pathname.split("/");
  const lang = pathParts[3] || "en";
  const timeLimit = parseInt(pathParts[4]) || 60;
  const hintInterval = 10; // seconds between hints (future use)
  let tick = 0;
  let remaining = timeLimit;

  const wordSpan = document.getElementById("def-word");
  const timerSpan = document.getElementById("def-timer");
  const form = document.getElementById("def-form");
  const input = document.getElementById("def-input");
  const msg = document.getElementById("def-message");
  const scoreMsg = document.getElementById("def-score");

  input.disabled = false;
  input.value = "";
  msg.textContent = "";
  scoreMsg.textContent = "";
  timerSpan.textContent = remaining;
  form.querySelector("button").disabled = false;

  let word = "";

  // === Fetch Word from Server ===
  fetch(`/api/defword/${lang}`)
    .then(res => res.json())
    .then(data => {
      word = data.word.toUpperCase();
      wordSpan.textContent = word;

      // === Timer Countdown (with tick logic) ===
      window.definitionTimer = setInterval(() => {
        tick++;
        remaining--;
        timerSpan.textContent = remaining;

        if (remaining <= 0) {
          clearInterval(window.definitionTimer);
          msg.textContent = "Time's up!";
          input.disabled = true;
          form.querySelector("button").disabled = true;
          return;
        }

        // Future: hook in a hint penalty here
        // if (tick % hintInterval === 0) {
        //   console.log("Hint logic trigger (todo)");
        // }
      }, 1000);
    })
    .catch(err => {
      console.error("Failed to load word:", err);
      msg.textContent = "Failed to load word.";
    });

  // === Submit Definition ===
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    scoreMsg.textContent = "";

    const definition = input.value.trim();
    if (definition.length < 5 || definition.length > 200) {
      msg.textContent = "Definition must be 5–200 characters.";
      return;
    }

    const player = localStorage.getItem("player");

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
}
