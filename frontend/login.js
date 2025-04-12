document.addEventListener("DOMContentLoaded", () => {
    const player = localStorage.getItem("player");
    const gameBox = document.getElementById("game-container");
    const authBox = document.getElementById("auth-container");
  
    // If already logged in
    if (player) {
      authBox.style.display = "none";
      gameBox.style.display = "block";
      return;
    }
  
    // Initial mode
    let mode = "login";
  
    // Elements
    const title = document.getElementById("auth-title");
    const button = document.getElementById("auth-button");
    const msg = document.getElementById("toggle-msg");
    const error = document.getElementById("auth-error");
  
    // Main toggle logic
    function setMode(newMode) {
      mode = newMode;
      if (mode === "login") {
        title.textContent = "🔐 Login";
        button.textContent = "Login";
        msg.innerHTML = `No account? <a href="#" id="toggle-link">Click to register</a>`;
      } else {
        title.textContent = "🆕 Register";
        button.textContent = "Register";
        msg.innerHTML = `Already have an account? <a href="#" id="toggle-link">Click to login</a>`;
      }
      attachToggle(); // re-attach link listener
      error.textContent = "";
    }
  
    // Attaches click handler to the link inside toggle message
    function attachToggle() {
      const toggleLink = document.getElementById("toggle-link");
      if (toggleLink) {
        toggleLink.addEventListener("click", (e) => {
          e.preventDefault();
          setMode(mode === "login" ? "register" : "login");
        });
      }
    }
  
    attachToggle(); // Initial setup
  
    // Submit handler
    document.getElementById("auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("auth-username").value.trim();
      const password = document.getElementById("auth-password").value.trim();
  
      if (!username || !password) {
        error.textContent = "⚠️ Please fill in all fields.";
        return;
      }
  
      try {
        if (mode === "login") {
          const res = await fetch(`/gamers/login/${username}/${password}`, { method: "PUT" });
          const data = await res.json();
  
          if (res.ok) {
            localStorage.setItem("player", username);
            authBox.style.display = "none";
            gameBox.style.display = "block";
          } else {
            error.textContent = data.error || "Login failed.";
          }
        } else {
          const res = await fetch(`/gamers/add/${username}/${password}`, { method: "POST" });
          const data = await res.json();
  
          if (res.ok) {
            localStorage.setItem("player", username);
            authBox.style.display = "none";
            gameBox.style.display = "block";
          } else {
            error.textContent = data.error || "Registration failed.";
          }
        }
      } catch (err) {
        error.textContent = "❌ Something went wrong. Try again.";
      }
    });
  });
  