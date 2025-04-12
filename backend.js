const express = require('express');
const app = express();
const port = 3000;
const mySql = require('mysql2');
require('dotenv').config();
const bcrypt = require('bcrypt');
app.use(express.json()); // Middleware to parse JSON bodies
const cors = require('cors');
app.use(cors());
const path = require('path');
app.use(express.static(path.join(__dirname, 'frontend'))); // Serve static files from the public directory
// Create MySQL connection
const db = mySql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database.');
});
async function getTopN(N) {
  const query = `SELECT username, score FROM players ORDER BY score DESC LIMIT ${N};`;
  return new Promise((resolve, reject) => {
    db.query(query, [N], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}
// Add a player
async function addPlayer(username, password) {
  const query = 'INSERT INTO players (username, password) VALUES (?, ?)';
  return new Promise((resolve, reject) => {
    db.query(query, [username, password], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Get players with selected fields and filters
async function getPlayers(fields = [], filters = {}) {
  const selectFields = fields.length > 0 ? fields.join(', ') : '*';
  const filterKeys = Object.keys(filters);
  const whereClause = filterKeys.length > 0
    ? 'WHERE ' + filterKeys.map(key => `${key} = ?`).join(' AND ')
    : '';

  const query = `SELECT ${selectFields} FROM players ${whereClause}`;

  return new Promise((resolve, reject) => {
    db.query(query, Object.values(filters), (err, results) => {
      if (err) {
        console.error('Error fetching players:', err);
        return reject(err);
      }
      resolve(results);
    });
  });
}

// Update player values
async function updatePlayer(filters = {}, updates = {}) {
  const filterKeys = Object.keys(filters).map(key => `${key} = ?`).join(' AND ');
  const updateKeys = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const query = `UPDATE players SET ${updateKeys} WHERE ${filterKeys}`;

  return new Promise((resolve, reject) => {
    db.query(query, [...Object.values(updates), ...Object.values(filters)], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}
async function updatePlayerScore(player, scoreToAdd) {
  if (typeof scoreToAdd !== 'number') {
    throw new Error('scoreToAdd must be a number');
  }

  const query = `UPDATE players SET score = score + ? WHERE username = ?`;

  return new Promise((resolve, reject) => {
    db.query(query, [scoreToAdd, player], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

async function deletePlayer(username) {
  const query = 'DELETE FROM players WHERE username = ?';
  return new Promise((resolve, reject) => {
    db.query(query, [username], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

}
function getNDefinitionsFrom(from = 1, nb = 10) {
  const offset = from > 0 ? from - 1 : 0;
  const query = `
  SELECT w.id AS word_id, w.word, d.definition
  FROM words w
  LEFT JOIN definitions d ON w.id = d.word_id
  WHERE w.id IN (
    SELECT word_ids.id
    FROM (SELECT id FROM words ORDER BY id LIMIT ?, ?) AS word_ids
  )
  ORDER BY w.id
`;


  return new Promise((resolve, reject) => {
    db.query(query, [offset, nb], (err, results) => {
      if (err) return reject(err);

      const grouped = {};
      for (const row of results) {
        if (!grouped[row.word_id]) {
          grouped[row.word_id] = {
            word: row.word,
            id: row.word_id,
            "def:": [row.definition]
          };
        } else {
          grouped[row.word_id]["def:"].push(row.definition);
        }
      }

      resolve(Object.values(grouped));
    });
  });
}

async function deleteDef(id) {
  const query = 'DELETE FROM definitions WHERE id = ?';
  return new Promise((resolve, reject) => {
    db.query(query, [id], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}
// Register player
app.post('/gamers/add/:player/:password', async (req, res) => {
  const { player, password } = req.params;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await addPlayer(player, hashedPassword);
    await updatePlayer({ username: player }, { lastLogin: new Date() });
    res.status(201).json({ message: 'Player added successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player info
app.get('/gamers/get/:player', async (req, res) => {
  const { player } = req.params;
  try {
    const playerData = await getPlayers(
      ['username', 'score', 'gamesPlayed', 'lastLogin'],
      { username: player }
    );
    if (playerData.length === 0) {
      return res.status(404).json({ error: 'Player does not exist' });
    }
    res.status(200).json(playerData[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login player
app.put('/gamers/login/:player/:password', async (req, res) => {
  const { player, password } = req.params;
  try {
    const playerData = await getPlayers(['*'], { username: player });
    if (playerData.length === 0) {
      return res.status(404).json({ error: 'Player does not exist' });
    }

    const isPasswordValid = await bcrypt.compare(password, playerData[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    await updatePlayer({ username: player }, { lastLogin: new Date() });

    const { password: _, ...publicData } = playerData[0];
    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout player
app.post('/gamers/logout/:username/:password', async (req, res) => {
  const { username, password } = req.params;

  try {
    const playerData = await getPlayers(['username', 'password'], { username });
    if (playerData.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = playerData[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/admin/top/:N', async (req, res) => {
  let N = parseInt(req.params.N);
  if (isNaN(N)) {
    N = 10;
  }

  try {
    const topPlayers = await getTopN(N);
    res.status(200).json(topPlayers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/admin/top', async (req, res) => {

  try {
    const topPlayers = await getTopN(10);
    res.status(200).json(topPlayers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.delete('/admin/delete/joueur/:player', async (req, res) => {
  const { player } = req.params;
  try {
    const result = await deletePlayer(player);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.status(200).json({ message: `Player: ${player} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

 app.delete('/admin/delete/def/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteDef(id);
    res.status(200).json({ message: `Definition with ID: ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
 })
// Health check route
app.get('/', (req, res) => {
  res.send('API is working.');
});
// Get definitions route
// 1. /word — defaults: nb = 10, from = 1
app.get('/word', async (req, res) => {
  try {
    const definitions = await getNDefinitionsFrom(1, 10);
    res.status(200).json(definitions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. /word/:nb — custom nb, default from = 1
app.get('/word/:nb', async (req, res) => {
  const nb = parseInt(req.params.nb);
  if (isNaN(nb) || nb <= 0) {
    return res.status(400).json({ error: 'nb must be a positive integer.' });
  }

  try {
    const definitions = await getNDefinitionsFrom(1, nb);
    res.status(200).json(definitions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. /word/:nb/:from — both nb and from are custom
app.get('/word/:nb/:from', async (req, res) => {
  const nb = parseInt(req.params.nb);
  const from = parseInt(req.params.from);

  if (isNaN(nb) || nb <= 0 || isNaN(from) || from <= 0) {
    return res.status(400).json({ error: 'nb and from must be positive integers.' });
  }

  try {
    const definitions = await getNDefinitionsFrom(from, nb);
    res.status(200).json(definitions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

function getRandomWord(lang = 'en') {
  const query = `
    SELECT d.id AS definition_id, d.definition, d.source, w.word, w.language
    FROM definitions d
    JOIN words w ON d.word_id = w.id
    WHERE w.language = ?
    ORDER BY RAND()
    LIMIT 1
  `;

  return new Promise((resolve, reject) => {
    db.query(query, [lang], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error('No definitions found'));
      resolve(results[0]); // includes word, definition, etc.
    });
  });
}


function getRandomWordForDefinition(lang = 'en') {
  const query = `
    SELECT DISTINCT w.id, w.word, w.language
    FROM words w
    WHERE w.language = ? AND CHAR_LENGTH(w.word) >= 5
    ORDER BY RAND()
    LIMIT 1
  `;
  return new Promise((resolve, reject) => {
    db.query(query, [lang], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error('No suitable word found'));
      resolve(results[0]);
    });
  });
}
function getWordRow(word, language) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM words WHERE word = ? AND language = ?';
    db.query(query, [word, language], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
}
function definitionExists(wordId, def) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT 1 FROM definitions WHERE word_id = ? AND definition = ?';
    db.query(query, [wordId, def], (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0);
    });
  });
}
function insertDefinition(wordId, def, source) {
  return new Promise((resolve, reject) => {
    const query = 'INSERT INTO definitions (word_id, definition, source) VALUES (?, ?, ?)';
    db.query(query, [wordId, def, source], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// update player score
app.put('/gamers/update/:player', async (req, res) => {
  const { player } = req.params;
  const { score } = req.body;

  // Validate input
  if (typeof score !== 'number') {
    return res.status(400).json({ error: 'Score must be a number.' });
  }

  try {
    // Update score in DB
    const result = await updatePlayerScore(player, score);

    // Check if any row was updated
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Player '${player}' not found.` });
    }

    res.status(200).json({ message: 'Player score updated successfully' });
  } catch (error) {
    console.error('Score update failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// === Serve HTML page for all /jeu/word routes ===
app.get('/jeu/word/:lang/:time/:hint', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'jeu.html'));
});

app.get('/jeu/word/:lang', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'jeu.html'));
});

app.get('/jeu/word', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'jeu.html'));
});

// === Provide game data as JSON ===
app.get('/api/word/:lang/:time/:hint', async (req, res) => {
  const { lang, time, hint } = req.params;
  try {
    const data = await getRandomWord(lang);
    const startingScore = data.word.length * 10;

    res.status(200).json({
      word: data.word,
      wordLength: data.word.length,
      definition: data.definition,
      startingScore,
      hintInterval: parseInt(hint),
      timeLimit: parseInt(time)
    });
  } catch (error) {
    console.error('Error fetching game word:', error);
    res.status(500).json({ error: 'Failed to load game word' });
  }
});

app.get('/api/word/:lang', async (req, res) => {
  const { lang } = req.params;
  try {
    const data = await getRandomWord(lang);
    const startingScore = data.word.length * 10;

    res.status(200).json({
      word: data.word,
      wordLength: data.word.length,
      definition: data.definition,
      startingScore,
      hintInterval: 10,
      timeLimit: 60
    });
  } catch (error) {
    console.error('Error fetching game word:', error);
    res.status(500).json({ error: 'Failed to load game word' });
  }
});

app.get('/api/word', async (req, res) => {
  try {
    const data = await getRandomWord('en');
    const startingScore = data.word.length * 10;

    res.status(200).json({
      word: data.word,
      wordLength: data.word.length,
      definition: data.definition,
      startingScore,
      hintInterval: 10,
      timeLimit: 60
    });
  } catch (error) {
    console.error('Error fetching game word:', error);
    res.status(500).json({ error: 'Failed to load game word' });
  }
});

app.get('/jeu/def', async (req, res) => {
  try {
    const data = await getRandomWordForDefinition('en'); // default lang
    res.status(200).json({
      word: data.word,
      language: data.language
    });
  } catch (error) {
    console.error('Error fetching word to define:', error);
    res.status(500).json({ error: 'Failed to load word for definition' });
  }
});
app.get('/jeu/def/:lang', async (req, res) => {
  const { lang } = req.params;
  try {
    const data = await getRandomWordForDefinition(lang);
    res.status(200).json({
      word: data.word,
      language: data.language
    });
  } catch (error) {
    console.error('Error fetching word to define:', error);
    res.status(500).json({ error: 'Failed to load word for definition' });
  }
});
// === POST /jeu/def — submit new definition
app.post('/jeu/def', async (req, res) => {
  const { word, definition, language, username } = req.body;

  if (!word || !definition || !language || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const wordRow = await getWordRow(word, language);
    if (!wordRow) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const exists = await definitionExists(wordRow.id, definition);
    if (exists) {
      return res.status(409).json({ error: 'Definition already exists' });
    }

    await insertDefinition(wordRow.id, definition, username);
    await updatePlayerScore(username, 5); // bonus for contributing

    res.status(201).json({ message: 'Definition added successfully', bonus: 5 });
  } catch (error) {
    console.error('Error submitting definition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/jeu/suggestions/:lang/:pattern', async (req, res) => {
  const rawPattern = req.params.pattern.toUpperCase();
  const lang = req.params.lang.toLowerCase();
  const mysqlPattern = `^${rawPattern}$`;

  try {
    const query = `
      SELECT DISTINCT word
      FROM words
      WHERE word REGEXP ? AND language = ?
      LIMIT 10
    `;

    db.query(query, [mysqlPattern, lang], (err, results) => {
      if (err) {
        console.error('❌ Suggestion error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const words = results.map(row => row.word.toUpperCase());
      res.status(200).json({ words });
    });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
