import { useState } from "react";

interface Threshold {
  limit: number;
  interval: number;
}

interface ThresholdManagerProps {
  thresholds: Threshold[];
  setThresholds: (thresholds: Threshold[]) => void;
}

const ThresholdManager: React.FC<ThresholdManagerProps> = ({
  thresholds,
  setThresholds,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempThreshold, setTempThreshold] = useState<Threshold>({
    limit: 0,
    interval: 0,
  });

  const addThreshold = () => {
    setEditingIndex(thresholds.length);
    setTempThreshold({ limit: 0, interval: 0 });
  };

  const saveThreshold = () => {
    if (editingIndex !== null) {
      const updatedThresholds = [...thresholds];
      updatedThresholds[editingIndex] = tempThreshold;
      // Remove if adding a new empty row
      if (
        updatedThresholds[editingIndex].limit === 0 &&
        updatedThresholds[editingIndex].interval === 0
      ) {
        updatedThresholds.splice(editingIndex, 1);
      }
      setThresholds(updatedThresholds.sort((a, b) => a.limit - b.limit));
      setEditingIndex(null);
      setTempThreshold({ limit: 0, interval: 0 });
    }
  };

  const cancelEdit = () => {
    if (editingIndex !== null && editingIndex >= thresholds.length) {
      // If adding a new threshold, remove the empty row
      const updatedThresholds = [...thresholds];
      updatedThresholds.splice(editingIndex, 1);
      setThresholds(updatedThresholds);
    }
    setEditingIndex(null);
    setTempThreshold({ limit: 0, interval: 0 });
  };

  const editThreshold = (index: number) => {
    setEditingIndex(index);
    setTempThreshold({ ...thresholds[index] });
  };

  const deleteThreshold = (index: number) => {
    const updatedThresholds = thresholds.filter((_, i) => i !== index);
    setThresholds(updatedThresholds);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Threshold
  ) => {
    setTempThreshold({
      ...tempThreshold,
      [field]: parseFloat(e.target.value),
    });
  };

  return (
    <div className="section">
      <h2>Threshold & Interval Management</h2>
      <table className="threshold-table" role="grid">
        <thead>
          <tr>
            <th scope="col">Limit (Credits)</th>
            <th scope="col">Interval (minutes)</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {thresholds.map((threshold, index) => (
            <tr key={index}>
              <td>
                {editingIndex === index ? (
                  <div className="input-wrapper">
                    <label htmlFor={`limit-${index}`} className="sr-only">
                      Credit Limit
                    </label>
                    <input
                      id={`limit-${index}`}
                      type="number"
                      value={tempThreshold.limit}
                      onChange={(e) => handleInputChange(e, "limit")}
                      aria-label="Credit limit value"
                    />
                  </div>
                ) : (
                  threshold.limit
                )}
              </td>
              <td>
                {editingIndex === index ? (
                  <div className="input-wrapper">
                    <label htmlFor={`interval-${index}`} className="sr-only">
                      Fetch Interval
                    </label>
                    <input
                      id={`interval-${index}`}
                      type="number"
                      value={tempThreshold.interval}
                      onChange={(e) => handleInputChange(e, "interval")}
                      aria-label="Fetch interval value"
                    />
                  </div>
                ) : (
                  threshold.interval
                )}
              </td>
              <td>
                {editingIndex === index ? (
                  <div>
                    <button className="success" onClick={saveThreshold}>
                      Save
                    </button>
                    <button className="danger" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      className="primary"
                      onClick={() => editThreshold(index)}
                    >
                      Edit
                    </button>
                    <button
                      className="danger"
                      onClick={() => deleteThreshold(index)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {editingIndex !== null && editingIndex === thresholds.length && (
            <tr>
              <td>
                <div className="input-wrapper">
                  <label htmlFor="new-limit" className="sr-only">
                    New Credit Limit
                  </label>
                  <input
                    id="new-limit"
                    type="number"
                    value={tempThreshold.limit}
                    onChange={(e) => handleInputChange(e, "limit")}
                    placeholder="Enter credit limit"
                    aria-label="Enter new credit limit"
                  />
                </div>
              </td>
              <td>
                <div className="input-wrapper">
                  <label htmlFor="new-interval" className="sr-only">
                    New Fetch Interval
                  </label>
                  <input
                    id="new-interval"
                    type="number"
                    value={tempThreshold.interval}
                    onChange={(e) => handleInputChange(e, "interval")}
                    placeholder="Enter fetch interval"
                    aria-label="Enter new fetch interval"
                  />
                </div>
              </td>
              <td>
                <div>
                  <button className="success" onClick={saveThreshold}>
                    Save
                  </button>
                  <button className="danger" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="add-threshold-wrapper">
        <button onClick={addThreshold}>Add Threshold</button>
      </div>
    </div>
  );
};

export default ThresholdManager;
