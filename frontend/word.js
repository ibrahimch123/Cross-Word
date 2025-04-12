let fullWord = "";
let revealed = [];
let score = 0;
let hintInterval = 10;
let timeLimit = 60;
let timerId;
let tick = 0;
let suggestionUsed = false;
let currentFocusIndex = 0;

function getGameParamsFromURL() {
  const parts = window.location.pathname.split('/');
  return {
    lang: parts[3] || 'en',
    time: parseInt(parts[4]) || 60,
    hint: parseInt(parts[5]) || 10
  };
}

function renderWord() {
  const container = document.getElementById("word-display");
  container.innerHTML = "";

  revealed.forEach((char, i) => {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 1;
    input.dataset.index = i;
    input.className = "letter-box";

    if (char !== "_") {
      input.value = char;
      input.disabled = true;
    }

    if (i === currentFocusIndex && char === "_") {
      input.autofocus = true;
    }

    input.addEventListener("input", () => handleInput(i, input));
    container.appendChild(input);
  });

  const inputToFocus = document.querySelector(`input[data-index="${currentFocusIndex}"]`);
  if (inputToFocus && inputToFocus.disabled === false) {
    inputToFocus.focus();
  }
}

async function startGame() {
  suggestionUsed = false;
  clearInterval(timerId);

  const { lang, time, hint } = getGameParamsFromURL();
  const res = await fetch(`/api/word/${lang}/${time}/${hint}`);
  const data = await res.json();

  fullWord = data.word.toUpperCase();
  revealed = Array(fullWord.length).fill("_");
  score = data.startingScore;
  hintInterval = data.hintInterval;
  timeLimit = data.timeLimit;
  tick = 0;
  currentFocusIndex = 0;

  document.getElementById("definition").textContent = data.definition;
  document.getElementById("score").textContent = score;
  document.getElementById("timer").textContent = timeLimit;
  document.getElementById("message").textContent = "";
  document.getElementById("hint-icon").style.display = "none";
  document.getElementById("suggestions").style.display = "none";
  document.getElementById("suggestion-list").innerHTML = "";

  renderWord();
  timerId = setInterval(updateTimer, 1000);
}

function updateTimer() {
  tick++;
  timeLimit--;
  document.getElementById("timer").textContent = timeLimit;

  if (tick % hintInterval === 0) {
    revealRandomLetter();
    score -= 10;
    document.getElementById("score").textContent = score;
    if (!revealed.includes("_")) return;
    if (!suggestionUsed) {
      document.getElementById("hint-icon").style.display = "block";
    }
  }

  if (timeLimit <= 0) {
    clearInterval(timerId);
    document.getElementById("message").textContent = `⏱️ Time's up! The word was: ${fullWord}`;
    document.querySelectorAll(".letter-box").forEach(box => box.disabled = true);
    updateScore();
  }
}

function handleInput(index, input) {
  currentFocusIndex = index;
  const letter = input.value.toUpperCase();

  if (letter === fullWord[index] && revealed[index] === "_") {
    revealed[index] = letter;
    score += 5;
    input.value = letter;
    input.disabled = true;

    const nextInput = document.querySelector(`input[data-index='${index + 1}']`);
    if (nextInput) {
      currentFocusIndex = index + 1;
      nextInput.focus();
    }
  } else {
    input.value = "";
    score -= 5;
  }

  document.getElementById("score").textContent = score;

  if (!revealed.includes("_")) {
    clearInterval(timerId);
    const bonus = Math.floor(timeLimit / 10);
    score += bonus;
    document.getElementById("score").textContent = score;
    document.getElementById("message").textContent = `🎉 Well done! Final score: ${score}`;
    document.querySelectorAll(".letter-box").forEach(box => box.disabled = true);
    updateScore();
  }

  if (suggestionUsed) {
    refreshSuggestions();
  }
}

function revealRandomLetter() {
  const hiddenIndexes = revealed.map((c, i) => c === "_" ? i : -1).filter(i => i !== -1);
  if (hiddenIndexes.length === 0) return;

  const randIdx = hiddenIndexes[Math.floor(Math.random() * hiddenIndexes.length)];
  revealed[randIdx] = fullWord[randIdx];

  if (randIdx === currentFocusIndex) {
    currentFocusIndex += 1;
  }

  renderWord();

  if (!revealed.includes("_")) {
    clearInterval(timerId);
    document.getElementById("message").textContent = `❌ You lost! Word was: ${fullWord}`;
    document.querySelectorAll(".letter-box").forEach(box => box.disabled = true);
    updateScore();
    return;
  }

  if (suggestionUsed) {
    refreshSuggestions();
  }
}

function refreshSuggestions() {
  const lang = document.getElementById("lang-select").value;
  const pattern = revealed.map(c => c === "_" ? "." : c).join("");

  fetch(`/jeu/suggestions/${lang}/${pattern}`)
    .then(res => res.json())
    .then(data => {
      const suggestionBox = document.getElementById("suggestions");
      const suggestionList = document.getElementById("suggestion-list");

      suggestionList.innerHTML = "";

      data.words.forEach(word => {
        const li = document.createElement("li");
        li.textContent = word;
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
          document.getElementById("message").textContent = `You clicked: ${word}`;
        });
        suggestionList.appendChild(li);
      });

      suggestionBox.style.display = "block";
    })
    .catch(err => {
      console.error("Error fetching suggestions:", err);
    });
}

function updateScore() {
  const player = localStorage.getItem("player");
  if (player) {
    fetch(`/gamers/update/${player}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score })
    })
    .then(res => res.json())
    .then(data => {
      console.log("✅ Score submitted:", data.message);
    })
    .catch(err => {
      console.error("❌ Failed to submit score:", err);
    });
  }
}

document.getElementById("hint-icon").addEventListener("click", () => {
  if (suggestionUsed || score < 20) return;

  suggestionUsed = true;
  score -= 20;
  document.getElementById("score").textContent = score;
  document.getElementById("hint-icon").style.display = "none";

  refreshSuggestions();
});
