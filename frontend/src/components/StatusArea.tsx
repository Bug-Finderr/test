interface StatusAreaProps {
  remainingBalance: string;
  lastFetch: string;
  nextFetchIn: string;
  nextFetchAt: string;
}

const StatusArea: React.FC<StatusAreaProps> = ({
  remainingBalance,
  lastFetch,
  nextFetchIn,
  nextFetchAt,
}) => {
  return (
    <div className="section">
      <h2>Monitor Status</h2>
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
