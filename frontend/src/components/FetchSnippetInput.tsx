import { FC } from "react";

interface FetchSnippetInputProps {
  fetchSnippet: string;
  setFetchSnippet: (snippet: string) => void;
}

const FetchSnippetInput: FC<FetchSnippetInputProps> = ({
  fetchSnippet,
  setFetchSnippet,
}) => {
  return (
    <div className="section">
      <h2>Fetch Snippet Input</h2>
      <textarea
        value={fetchSnippet}
        onChange={(e) => setFetchSnippet(e.target.value)}
        placeholder="Paste your fetch snippet here..."
        rows={10}
        className="textarea"
      ></textarea>
    </div>
  );
};

export default FetchSnippetInput;
