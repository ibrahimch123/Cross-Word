// Extract 'step' from URL to use as initial page length
const step = parseInt(window.location.pathname.split('/').pop()) || 10;

fetch(`/api/dump/all`) // now fetching the full dataset
  .then(res => res.json())
  .then(data => {
    const tableBody = document.querySelector("#dump-table tbody");

    data.forEach(entry => {
      const definitions = Array.isArray(entry.def)
        ? entry.def.filter(d => d && d.trim())
        : [];

      const defList = definitions.length
        ? definitions.map(d => `<li>${d}</li>`).join('')
        : "<em>No definitions</em>";

      const row = document.createElement("tr");

      const langCell = document.createElement("td");
      langCell.textContent = entry.lang || "–";
      row.appendChild(langCell);

      const srcCell = document.createElement("td");
      srcCell.textContent = entry.src || "–";
      row.appendChild(srcCell);

      const wordCell = document.createElement("td");
      wordCell.textContent = entry.word;
      row.appendChild(wordCell);

      const defCell = document.createElement("td");
      defCell.innerHTML = `<ul>${defList}</ul>`;
      row.appendChild(defCell);

      tableBody.appendChild(row);
    });

    // Initialize DataTable with dynamic page length
    $('#dump-table').DataTable({
      pageLength: step,
      lengthMenu: [10, 25, 50, 100]
    });
  })
  .catch(err => {
    console.error("Error loading definitions:", err);
  });
