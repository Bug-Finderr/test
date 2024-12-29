interface StatusAreaProps {
  remainingBalance: string;
  lastFetch: string;
  nextFetchIn: string;
  nextFetchAt: string;
  onRefresh: () => void;
}

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
          <span className="value">{lastFetch}</span>
        </div>
        <div className="status-item">
          <span>Next Fetch In</span>
          <span className="value">{nextFetchIn}</span>
        </div>
        <div className="status-item">
          <span>Next Fetch At</span>
          <span className="value">{nextFetchAt}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusArea;
