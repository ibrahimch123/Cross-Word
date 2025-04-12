document.addEventListener("DOMContentLoaded", () => {
    const player = localStorage.getItem("player");
    const password = localStorage.getItem("password");
  
    const gameBox = document.getElementById("game-container");
    const authBox = document.getElementById("auth-container");
    const welcomeUser = document.getElementById("welcome-user");
  
    // If already logged in
    if (player) {
      if (authBox) authBox.style.display = "none";
      if (gameBox) gameBox.style.display = "block";
      if (welcomeUser) welcomeUser.textContent = "Logged in as: " + player;
    }
  
    // Handle logout if logout button is present
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
  
    // Skip if page has no login form
    const authForm = document.getElementById("auth-form");
    if (!authForm) return;
  
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
  
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const username = document.getElementById("auth-username").value.trim();
      const pwd = document.getElementById("auth-password").value.trim();
  
      if (!username || !pwd) {
        error.textContent = "Please fill in all fields.";
        return;
      }
  
      try {
        const endpoint = mode === "login"
          ? `/gamers/login/${username}/${pwd}`
          : `/gamers/add/${username}/${pwd}`;
        const method = mode === "login" ? "PUT" : "POST";
  
        const res = await fetch(endpoint, { method });
        const data = await res.json();
  
        if (res.ok) {
          localStorage.setItem("player", username);
          localStorage.setItem("password", pwd);
          if (authBox) authBox.style.display = "none";
          if (gameBox) gameBox.style.display = "block";
          if (welcomeUser) welcomeUser.textContent = "Logged in as: " + username;
        } else {
          error.textContent = data.error || "Authentication failed.";
        }
      } catch (err) {
        error.textContent = "Something went wrong. Try again.";
      }
    });
  });
  