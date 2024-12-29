import { useState, useEffect } from "react";
import FetchSnippetInput from "./components/FetchSnippetInput";
import SlackWebhookInput from "./components/SlackWebhookInput";
import ThresholdManager from "./components/ThresholdManager";
import StatusArea from "./components/StatusArea";
import ManualFetchButton from "./components/ManualFetchButton";
import { API_BASE_URL } from "./config";

interface Threshold {
  limit: number;
  interval: number;
}

const App: React.FC = () => {
  const [fetchSnippet, setFetchSnippet] = useState<string>("");
  const [slackWebhook, setSlackWebhook] = useState<string>("");
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [remainingBalance, setRemainingBalance] = useState<string>("N/A");
  const [lastFetch, setLastFetch] = useState<string>("N/A");
  const [nextFetchIn, setNextFetchIn] = useState<string>("N/A");
  const [nextFetchAt, setNextFetchAt] = useState<string>("N/A");
  const [defaultDuration, setDefaultDuration] = useState<number>(120);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  // Fetch status from backend
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      const data = await response.json();
      setRemainingBalance(data.remainingBalance || "N/A");
      setLastFetch(data.lastFetch || "N/A");
      setNextFetchIn(data.nextFetchCountdown || "N/A");
      setNextFetchAt(data.nextFetchAt || "N/A");
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  // Fetch configuration from backend
  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/config`);
      if (response.ok) {
        const data = await response.json();
        setFetchSnippet(data.fetchSnippet || "");
        setSlackWebhook(data.slackWebhook || "");
        setThresholds(data.thresholds || []);
        setDefaultDuration(data.defaultDuration || 120);
        setIsConfigured(
          !!(data.fetchSnippet && data.slackWebhook && data.thresholds.length)
        );
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchConfig();
    const interval = setInterval(fetchStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Handle Save & Start Monitoring
  const handleSaveAndStart = async () => {
    try {
      const payload = {
        fetchSnippet,
        slackWebhook,
        thresholds,
        defaultDuration,
      };
      const response = await fetch(`${API_BASE_URL}/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.status === "success") {
        setIsConfigured(true);
        await fetchStatus();
        alert("Configuration saved and monitoring started.");
      } else {
        alert("Failed to save configuration.");
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      alert("An error occurred while saving configuration.");
    }
  };

  // Handle Manual Fetch
  const handleManualFetch = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manual-fetch`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.status === "success") {
        alert("Manual fetch triggered successfully.");
        fetchStatus();
      } else {
        alert("Failed to trigger manual fetch.");
      }
    } catch (error) {
      console.error("Error triggering manual fetch:", error);
      alert("An error occurred while triggering manual fetch.");
    }
  };

  return (
    <>
      <main className="App">
        {isConfigured ? (
          <>
            <StatusArea
              remainingBalance={remainingBalance}
              lastFetch={lastFetch}
              nextFetchIn={nextFetchIn}
              nextFetchAt={nextFetchAt}
              onRefresh={fetchStatus}
            />
            <ManualFetchButton onManualFetch={handleManualFetch} />
            <div className="section configuration-section">
              <h2>Configuration</h2>
              <button
                className="edit-config-button"
                onClick={() => setIsConfigured(false)}
              >
                Edit Configuration
              </button>
            </div>
          </>
        ) : (
          <>
            <FetchSnippetInput
              fetchSnippet={fetchSnippet}
              setFetchSnippet={setFetchSnippet}
            />
            <SlackWebhookInput
              slackWebhook={slackWebhook}
              setSlackWebhook={setSlackWebhook}
            />
            <ThresholdManager
              thresholds={thresholds}
              setThresholds={setThresholds}
            />
            <div className="section">
              <h2>Default Fetch Duration</h2>
              <div className="input-group">
                <label>Default Duration (minutes):</label>
                <input
                  type="number"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
                  placeholder="Enter default duration in minutes"
                  required
                  min={1}
                  className="default-duration-input"
                />
              </div>
              <p>
                Default fetch duration is used when no thresholds are met.
                Currently set to {defaultDuration} minutes.
              </p>
            </div>
            <div className="section">
              <button
                onClick={handleSaveAndStart}
                className="save-start-button"
                disabled={
                  !(
                    fetchSnippet &&
                    slackWebhook &&
                    thresholds.length > 0 &&
                    defaultDuration > 0
                  )
                }
              >
                Save & Start Monitoring
              </button>
            </div>
          </>
        )}
      </main>
      <footer>
        <p>
          Created by <a href="https://github.com/Bug-Finderr">Bug-Finderr</a>
        </p>
      </footer>
    </>
  );
};

export default App;
