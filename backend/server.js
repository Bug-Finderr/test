const express = require("express");
const cors = require("cors");
const db = require("./database");
const scheduler = require("./scheduler");
const fetchHandler = require("./fetchHandler");
const { determineNextInterval } = require("./intervalUtils");

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

  if (
    !fetchSnippet ||
    !slackWebhook ||
    !thresholds ||
    thresholds.length === 0 ||
    !defaultDuration
  ) {
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

    // Stop any existing scheduled task
    scheduler.stop();

    const { fetchSnippet, slackWebhook, thresholds, defaultDuration } = config;
    const creditBalance = await fetchHandler.performFetch(
      fetchSnippet,
      slackWebhook
    );

    if (creditBalance !== null && !isNaN(creditBalance)) {
      await fetchHandler.handleBalance({
        creditBalance,
        slackWebhook,
        thresholds,
        manual: true,
      });

      // Determine the next interval based on the current balance
      const nextInterval =
        determineNextInterval(creditBalance, thresholds, defaultDuration) ||
        defaultDuration;
      const nextFetchAtDate = new Date(Date.now() + nextInterval * 60000);
      const nextFetchAt = nextFetchAtDate.toLocaleString();

      // Update status in database
      await db.updateStatus({
        remainingBalance: creditBalance,
        lastFetch: Date.now(),
        nextFetchCountdown: nextInterval,
        nextFetchAt: nextFetchAtDate.toISOString(),
      });

      // Schedule the next fetch
      scheduler.scheduleFetch(nextInterval);

      res.json({ status: "success" });
    } else {
      res
        .status(500)
        .json({ status: "error", message: "Failed to fetch credit balance." });
    }
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
