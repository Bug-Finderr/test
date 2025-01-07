const express = require("express");
const cors = require("cors");
const db = require("./database");
const scheduler = require("./scheduler");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

/**
 * Setup Configuration Endpoint
 * Expects: fetchSnippet, slackWebhook, thresholds, defaultDuration
 */
app.post("/setup", async (req, res) => {
  const { fetchSnippet, slackWebhook, thresholds, defaultDuration } = req.body;

  if (!fetchSnippet || !slackWebhook || !thresholds || !defaultDuration) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid configuration data." });
  }

  try {
    // Save configuration to database
    await db.saveConfig({
      fetchSnippet,
      slackWebhook,
      thresholds,
      defaultDuration,
    });

    // Initialize scheduler with the new configuration
    scheduler.init();

    console.log("Configuration saved and scheduler initialized.");
    res.json({ status: "success" });
  } catch (error) {
    console.error("Error in setup:", error);
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
});

/**
 * Manual Fetch Endpoint
 * Triggers an immediate fetch operation
 */
app.post("/manual-fetch", async (req, res) => {
  try {
    const config = await db.getConfig();
    if (!config) {
      return res
        .status(400)
        .json({ status: "error", message: "Configuration not found." });
    }

    await scheduler.manualFetch();
    res.json({ status: "success" });
  } catch (error) {
    console.error("Error in manual fetch:", error);
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
});

/**
 * Status Endpoint
 * Retrieves the current monitoring status
 */
app.get("/status", async (req, res) => {
  try {
    const status = await db.getStatus();
    res.json(status);
  } catch (error) {
    console.error("Error fetching status:", error);
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
});

/**
 * Get Configuration Endpoint
 * Retrieves the current configuration
 */
app.get("/config", async (req, res) => {
  try {
    const config = await db.getConfig();
    if (!config) {
      return res
        .status(404)
        .json({ status: "error", message: "Configuration not found." });
    }
    res.json({
      fetchSnippet: config.fetchSnippet,
      slackWebhook: config.slackWebhook,
      thresholds: config.thresholds,
      defaultDuration: config.defaultDuration,
    });
  } catch (error) {
    console.error("Error fetching configuration:", error);
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);

  // Initialize scheduler if configuration exists
  db.getConfig().then((config) => {
    if (config) scheduler.init();
  });
});

// Cleanup Puppeteer on server shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  const puppeteerManager = require("./puppeteerManager");
  await puppeteerManager.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  const puppeteerManager = require("./puppeteerManager");
  await puppeteerManager.cleanup();
  process.exit(0);
});
