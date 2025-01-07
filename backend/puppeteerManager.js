const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

class PuppeteerManager {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });
      this.page = await this.browser.newPage();

      // Set a common User-Agent string
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/131.0.0.0 Safari/537.36"
      );
    } catch (error) {
      console.error("Error initializing Puppeteer:", error);
      throw error;
    }
  }

  async setupSession(fetchSnippet) {
    try {
      // Extract and set cookies from the fetch snippet
      const cookieMatch = fetchSnippet.match(/"cookie":\s*"([^"]+)"/);
      if (cookieMatch && cookieMatch[1]) {
        const cookies = cookieMatch[1].split(";").map((cookie) => {
          const [name, ...rest] = cookie.trim().split("=");
          return {
            name: name,
            value: rest.join("="),
            domain: "console.anthropic.com",
            path: "/",
          };
        });
        await this.page.setCookie(...cookies);
      }

      // Navigate to ensure session is active
      await this.page.goto("https://console.anthropic.com/settings/billing", {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      console.log("Session setup complete.\n");
    } catch (error) {
      console.error("Error setting up session:", error);
      throw error;
    }
  }

  async fetchBalance(fetchSnippet) {
    try {
      const balance = await this.page.evaluate(async (snippet) => {
        try {
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

      return balance;
    } catch (error) {
      console.error("Error fetching balance:", error);
      return null;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = new PuppeteerManager();
