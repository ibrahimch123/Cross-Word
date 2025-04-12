document.addEventListener("DOMContentLoaded", () => {
    const player = localStorage.getItem("player");
    const password = localStorage.getItem("password");
    const gameBox = document.getElementById("game-container");
    const authBox = document.getElementById("auth-container");
  
    // If already logged in, show game and username
    if (player) {
      authBox.style.display = "none";
      gameBox.style.display = "block";
      document.getElementById("welcome-user").textContent = "Logged in as: " + player;
    }
  
    let mode = "login";
  
    const title = document.getElementById("auth-title");
    const button = document.getElementById("auth-button");
    const msg = document.getElementById("toggle-msg");
    const error = document.getElementById("auth-error");
  
    function setMode(newMode) {
      mode = newMode;
      if (mode === "login") {
        title.textContent = "Login";
        button.textContent = "Login";
        msg.innerHTML = `No account? <a href="#" id="toggle-link">Click to register</a>`;
      } else {
        title.textContent = "Register";
        button.textContent = "Register";
        msg.innerHTML = `Already have an account? <a href="#" id="toggle-link">Click to login</a>`;
      }
      attachToggle();
      error.textContent = "";
    }
  
    function attachToggle() {
      const toggleLink = document.getElementById("toggle-link");
      if (toggleLink) {
        toggleLink.addEventListener("click", (e) => {
          e.preventDefault();
          setMode(mode === "login" ? "register" : "login");
        });
      }
    }
  
    attachToggle();
  
    document.getElementById("auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("auth-username").value.trim();
      const pwd = document.getElementById("auth-password").value.trim();
  
      if (!username || !pwd) {
        error.textContent = "Please fill in all fields.";
        return;
      }
  
      try {
        if (mode === "login") {
          const res = await fetch(`/gamers/login/${username}/${pwd}`, { method: "PUT" });
          const data = await res.json();
  
          if (res.ok) {
            localStorage.setItem("player", username);
            localStorage.setItem("password", pwd);
            authBox.style.display = "none";
            gameBox.style.display = "block";
            document.getElementById("welcome-user").textContent = "Logged in as: " + username;
          } else {
            error.textContent = data.error || "Login failed.";
          }
        } else {
          const res = await fetch(`/gamers/add/${username}/${pwd}`, { method: "POST" });
          const data = await res.json();
  
          if (res.ok) {
            localStorage.setItem("player", username);
            localStorage.setItem("password", pwd);
            authBox.style.display = "none";
            gameBox.style.display = "block";
            document.getElementById("welcome-user").textContent = "Logged in as: " + username;
          } else {
            error.textContent = data.error || "Registration failed.";
          }
        }
      } catch (err) {
        error.textContent = "Something went wrong. Try again.";
      }
    });
  
    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        const username = localStorage.getItem("player");
        const pwd = localStorage.getItem("password");
  
        if (!username || !pwd) {
          alert("Missing login credentials.");
          return;
        }
  
        try {
          const res = await fetch(`/gamers/logout/${username}/${pwd}`, {
            method: "POST"
          });
          const data = await res.json();
  
          if (res.ok) {
            localStorage.removeItem("player");
            localStorage.removeItem("password");
            location.reload();
          } else {
            alert(data.error || "Logout failed.");
          }
        } catch (err) {
          alert("Logout request failed.");
        }
      });
    }
  });
  