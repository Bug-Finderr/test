// Helper function to determine the next interval based on thresholds
const determineNextInterval = (balance, thresholds, defaultDuration) => {
  for (const threshold of thresholds) {
    if (balance <= threshold.limit) {
      return threshold.interval;
    }
  }
  return defaultDuration;
};

module.exports = {
  determineNextInterval,
};
