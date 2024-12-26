const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "database.sqlite");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Could not connect to SQLite database:", err);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// Init tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fetchSnippet TEXT NOT NULL,
      slackWebhook TEXT NOT NULL,
      defaultDuration INTEGER NOT NULL DEFAULT 120
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS thresholds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credit_limit REAL NOT NULL,
      interval INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remainingBalance REAL,
      lastFetch INTEGER,
      nextFetchCountdown INTEGER,
      nextFetchAt TEXT
    )
  `);
});

// Save config
const saveConfig = ({
  fetchSnippet,
  slackWebhook,
  thresholds,
  defaultDuration,
}) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM config`, [], (err) => {
      if (err) return reject(err);
      db.run(
        `INSERT INTO config (fetchSnippet, slackWebhook, defaultDuration) VALUES (?, ?, ?)`,
        [fetchSnippet, slackWebhook, defaultDuration],
        function (err) {
          if (err) return reject(err);
          // Save thresholds
          db.run(`DELETE FROM thresholds`, [], (err) => {
            if (err) return reject(err);
            const stmt = db.prepare(
              `INSERT INTO thresholds (credit_limit, interval) VALUES (?, ?)`
            );
            thresholds.forEach((th) => {
              stmt.run(th.limit, th.interval);
            });
            stmt.finalize((err) => {
              if (err) return reject(err);
              resolve();
            });
          });
        }
      );
    });
  });
};

// Get config
const getConfig = () => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT fetchSnippet, slackWebhook, defaultDuration FROM config LIMIT 1`,
      [],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        // Get thresholds
        db.all(
          `SELECT credit_limit, interval FROM thresholds ORDER BY credit_limit ASC`,
          [],
          (err, rows) => {
            if (err) return reject(err);
            const formattedRows = rows.map((row) => ({
              limit: row.credit_limit,
              interval: row.interval,
            }));
            resolve({
              fetchSnippet: row.fetchSnippet,
              slackWebhook: row.slackWebhook,
              thresholds: formattedRows,
              defaultDuration: row.defaultDuration,
            });
          }
        );
      }
    );
  });
};

// Update status
const updateStatus = ({
  remainingBalance,
  lastFetch,
  nextFetchCountdown,
  nextFetchAt,
}) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM status`, [], (err) => {
      if (err) return reject(err);
      db.run(
        `INSERT INTO status (remainingBalance, lastFetch, nextFetchCountdown, nextFetchAt) VALUES (?, ?, ?, ?)`,
        [remainingBalance, lastFetch, nextFetchCountdown, nextFetchAt],
        function (err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  });
};

// Get status
const getStatus = () => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT remainingBalance, lastFetch, nextFetchCountdown, nextFetchAt FROM status LIMIT 1`,
      [],
      (err, row) => {
        if (err) return reject(err);
        if (!row)
          return resolve({
            remainingBalance: "N/A",
            lastFetch: "N/A",
            nextFetchCountdown: "N/A",
            nextFetchAt: "N/A",
          });
        const formattedStatus = {
          remainingBalance: row.remainingBalance
            ? `$${row.remainingBalance.toFixed(2)}`
            : "N/A",
          lastFetch: row.lastFetch
            ? new Date(row.lastFetch).toLocaleString()
            : "N/A",
          nextFetchCountdown: row.nextFetchCountdown
            ? `${row.nextFetchCountdown} minutes`
            : "N/A",
          nextFetchAt: row.nextFetchAt || "N/A",
        };
        resolve(formattedStatus);
      }
    );
  });
};

module.exports = {
  saveConfig,
  getConfig,
  updateStatus,
  getStatus,
};
