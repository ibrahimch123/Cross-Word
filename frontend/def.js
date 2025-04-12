document.addEventListener("DOMContentLoaded", async () => {
    const isDefRoute = window.location.pathname.startsWith("/jeu/def/");
    if (!isDefRoute) return;
  
    // Hide the game mode UI
    document.getElementById("game-container").style.display = "none";
    document.getElementById("define-mode").style.display = "block";
  
    const parts = window.location.pathname.split('/');
    const lang = parts[3] || 'en';
    const time = parseInt(parts[4]) || 60;
    const username = localStorage.getItem("player");
  
    if (!username) {
      alert("Please log in first.");
      window.location.href = "/"; // redirect to login/home
      return;
    }
  
    // Fetch word to define
    const res = await fetch(`/api/defword/${lang}`);
    const data = await res.json();
    const word = data.word;
    document.getElementById("def-word").textContent = word;
  
    // Timer
    let remaining = time;
    const timerEl = document.getElementById("def-timer");
    const inputEl = document.getElementById("def-input");
    const formEl = document.getElementById("def-form");
    const msgEl = document.getElementById("def-message");
    const scoreEl = document.getElementById("def-score");
  
    const countdown = setInterval(() => {
      remaining--;
      timerEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(countdown);
        inputEl.disabled = true;
        msgEl.textContent = "Time's up!";
      }
    }, 1000);
  
    // Handle definition submission
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const def = inputEl.value.trim();
      msgEl.textContent = "";
      scoreEl.textContent = "";
  
      if (def.length < 5 || def.length > 200) {
        msgEl.textContent = "Definition must be 5–200 characters.";
        return;
      }
  
      const submitRes = await fetch("/api/def", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          definition: def,
          language: lang,
          username
        })
      });
  
      const submitData = await submitRes.json();
      if (submitRes.ok) {
        scoreEl.textContent = `+${submitData.bonus} points`;
        inputEl.value = "";
      } else {
        msgEl.textContent = submitData.error;
      }
    });
  });
  