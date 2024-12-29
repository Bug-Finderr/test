const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const slackNotifier = require("./slackNotifier");

puppeteer.use(StealthPlugin());

/**
 * Parses a cookie string into an array of cookie objects for Puppeteer.
 * @param {string} cookieStr - The cookie string from the fetch snippet.
 * @returns {Array} Array of cookie objects.
 */
const parseCookies = (cookieStr) => {
  return cookieStr.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return {
      name: name,
      value: rest.join("="),
      domain: "console.anthropic.com", // Adjust if necessary
      path: "/",
      // Uncomment and set if required
      // secure: true,
      // httpOnly: true,
    };
  });
};

/**
 * Executes the fetch snippet using Puppeteer and returns the credit balance.
 * @param {string} fetchSnippet - The fetch snippet to execute.
 * @returns {number|null} The fetched credit balance or null on failure.
 */
const executeFetchWithPuppeteer = async (fetchSnippet) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    // Set a common User-Agent string
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/131.0.0.0 Safari/537.36"
    );

    // Extract and set cookies from the fetch snippet
    const cookieMatch = fetchSnippet.match(/"cookie":\s*"([^"]+)"/);
    if (cookieMatch && cookieMatch[1]) {
      const cookies = parseCookies(cookieMatch[1]);
      await page.setCookie(...cookies);
      console.log("Cookies set successfully.");
    } else {
      console.warn("No cookie header found in fetch snippet.");
    }

    // Navigate to the billing page to ensure session is active
    await page.goto("https://console.anthropic.com/settings/billing", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Execute the fetch snippet within the page context
    const balance = await page.evaluate(async (snippet) => {
      try {
        console.log("Executing fetch...");
        const response = await eval(snippet);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data.amount / 100;
      } catch (error) {
        console.error("Error executing fetch snippet:", error);
        return null;
      }
    }, fetchSnippet);

    await browser.close();
    return balance;
  } catch (error) {
    if (browser) await browser.close();
    console.error("Puppeteer execution error:", error);
    return null;
  }
};

/**
 * Performs the fetch operation with retries and sends Slack notifications upon multiple failures.
 * @param {string} fetchSnippet - The fetch snippet to execute.
 * @param {string} slackWebhook - The Slack webhook URL for notifications.
 * @param {number} maxRetries - Maximum number of retry attempts.
 * @param {number} retryDelay - Delay between retries in milliseconds.
 * @returns {number|null} The fetched credit balance or null on failure.
 */
const performFetch = async (
  fetchSnippet,
  slackWebhook,
  maxRetries = 5,
  retryDelay = 5000
) => {
  let attempts = 0;
  let balance = null;

  while (attempts < maxRetries) {
    try {
      console.log(`Fetch attempt ${attempts + 1} of ${maxRetries}`);
      balance = await executeFetchWithPuppeteer(fetchSnippet);
      if (balance !== null && !isNaN(balance)) {
        console.log(`Successfully fetched credit balance: $${balance}`);
        return balance;
      } else {
        throw new Error("Invalid balance fetched.");
      }
    } catch (error) {
      attempts += 1;
      console.error(`Fetch attempt ${attempts} failed:`, error);
      if (attempts < maxRetries) {
        console.log(`Retrying in ${retryDelay / 1000} seconds...\n`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // After maxRetries failed, send Slack notification
  await slackNotifier.sendToSlack(
    slackWebhook,
    `:warning: *Anthropic Credit Monitor Error*\n\n` +
      `Failed to fetch or parse credit balance after ${maxRetries} attempts.\n` +
      `• Time: \`${new Date().toLocaleString()}\`\n` +
      `• Please check your configuration or network connectivity.`
  );

  return null;
};

/**
 * Handles the fetched credit balance by sending alerts if thresholds are met.
 * @param {object} params - Parameters for handling balance.
 * @param {number|null} params.creditBalance - The fetched credit balance.
 * @param {string} params.slackWebhook - The Slack webhook URL.
 * @param {Array} params.thresholds - Array of threshold objects.
 * @param {boolean} params.manual - Indicates if the fetch was manual.
 */
const handleBalance = async ({
  creditBalance,
  slackWebhook,
  thresholds,
  manual = false,
}) => {
  if (creditBalance === null || isNaN(creditBalance)) {
    await slackNotifier.sendToSlack(
      slackWebhook,
      `:warning: *Anthropic Credit Monitor Error*\n\n` +
        `Failed to fetch or parse credit balance.\n` +
        `• Time: \`${new Date().toLocaleString()}\`\n` +
        `• Please check your configuration.`
    );
    return;
  }

  console.log(`Fetched Credit Balance: $${creditBalance.toFixed(2)}`);

  // Send alert if below any threshold
  for (const threshold of thresholds) {
    if (creditBalance <= threshold.limit) {
      await slackNotifier.sendToSlack(
        slackWebhook,
        `:alert: *Anthropic Credit Alert*\n\n` +
          `Your API credit balance has fallen below the threshold.\n\n` +
          `• Current Balance: \`$${creditBalance.toFixed(2)}\`\n` +
          `• Threshold Limit: \`$${threshold.limit.toFixed(2)}\`\n` +
          `• Time: \`${new Date().toLocaleString()}\`\n\n` +
          `_Please consider topping up your credits to avoid service interruptions._`
      );
      break; // Alert once for the first matched threshold
    }
  }
};

module.exports = {
  performFetch,
  handleBalance,
};
