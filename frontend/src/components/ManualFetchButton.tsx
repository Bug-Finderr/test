interface ManualFetchButtonProps {
  onManualFetch: () => void;
}

const ManualFetchButton: React.FC<ManualFetchButtonProps> = ({
  onManualFetch,
}) => {
  return (
    <div className="section">
      <button onClick={onManualFetch} className="manual-fetch-button">
        Manual Fetch
      </button>
    </div>
  );
};

export default ManualFetchButton;
