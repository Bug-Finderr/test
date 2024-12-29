interface StatusAreaProps {
  remainingBalance: string;
  lastFetch: string;
  nextFetchIn: string;
  nextFetchAt: string;
  onRefresh: () => void;
}

const formatDateTime = (dateStr: string): string => {
  if (dateStr === "N/A") return "N/A";
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr;
  }
};

const StatusArea: React.FC<StatusAreaProps> = ({
  remainingBalance,
  lastFetch,
  nextFetchIn,
  nextFetchAt,
  onRefresh,
}) => {
  return (
    <div className="section">
      <div className="status-header">
        <h2>Monitor Status</h2>
        <button
          onClick={onRefresh}
          className="refresh-button"
          aria-label="Refresh status"
        >
          ↻
        </button>
      </div>
      <div className="status-items">
        <div className="status-item">
          <span>Remaining Balance</span>
          <span className="value">{remainingBalance}</span>
        </div>
        <div className="status-item">
          <span>Last Fetch</span>
          <span className="value">{formatDateTime(lastFetch)}</span>
        </div>
        <div className="status-item">
          <span>Next Fetch In</span>
          <span className="value">{nextFetchIn}</span>
        </div>
        <div className="status-item">
          <span>Next Fetch At</span>
          <span className="value">{formatDateTime(nextFetchAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusArea;
