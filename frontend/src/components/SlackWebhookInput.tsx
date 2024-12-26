interface SlackWebhookInputProps {
  slackWebhook: string;
  setSlackWebhook: (url: string) => void;
}

const SlackWebhookInput: React.FC<SlackWebhookInputProps> = ({
  slackWebhook,
  setSlackWebhook,
}) => {
  return (
    <div className="section">
      <h2>Slack Webhook URL Input</h2>
      <textarea
        value={slackWebhook}
        onChange={(e) => setSlackWebhook(e.target.value)}
        placeholder="Paste your Slack Webhook URL here..."
        rows={2}
        className="textarea slack-webhook-textarea"
      ></textarea>
    </div>
  );
};

export default SlackWebhookInput;
