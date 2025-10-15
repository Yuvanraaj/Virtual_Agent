import React, { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "../config";

export default function ResumeParse() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [parseStage, setParseStage] = useState(""); // "extracting", "analyzing", "done"
  const [streamingResult, setStreamingResult] = useState("");
  const resultRef = useRef(null);

  // Auto-scroll to results
  useEffect(() => {
    if (resultRef.current && (result || streamingResult)) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result, streamingResult]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError("");
    setResult(null);
    setStreamingResult("");
    setParseStage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF or DOCX file.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setStreamingResult("");
    
    // Step 1: Upload file and extract text
    setParseStage("extracting");
    const formData = new FormData();
    formData.append("resume", file);
    
    try {
      // First upload and extract text from the file
      const res = await fetch(`${API_BASE_URL}/api/parse-resume`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse resume.");
      
      // The backend now returns a structured `feedback` JSON per schema when extraction succeeded.
      if (data.feedback) {
        const fb = data.feedback;
        setResult({
          strengths: fb.strengths || [],
          weaknesses: fb.weaknesses || [],
          suggestions: fb.suggestions || [],
          overall: fb.overall_feedback || '',
          raw: null
        });
        setParseStage('done');
      } else if (data.text) {
        // In some edge cases backend returned just text; show raw text
        setResult({ raw: data.text });
        setParseStage('done');
      } else {
        throw new Error('Unexpected backend response');
      }
    } catch (err) {
      console.error('Error parsing resume:', err);
      setError(err.message);
      setParseStage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 pt-8">
      <h1 className="text-3xl font-bold mb-6">Resume Parser</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center w-full max-w-lg">
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-3 rounded font-semibold disabled:opacity-60"
        >
          {loading ? `${parseStage === "extracting" ? "Extracting Text..." : parseStage === "analyzing" ? "Analyzing..." : "Processing..."}` : "Upload & Parse"}
        </button>
        {error && <div className="text-red-500 mt-4">{error}</div>}
      </form>
      
      {/* Show streaming result while analyzing */}
      {streamingResult && (
        <div ref={resultRef} className="mt-8 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Resume Analysis</h2>
          <div className="whitespace-pre-wrap">
            {streamingResult}
            <span className="ml-1 animate-pulse">▌</span>
          </div>
        </div>
      )}
      
      {/* Show final structured result */}
      {result && !streamingResult && (
        <div ref={resultRef} className="mt-8 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          {result.raw ? (
            <pre className="whitespace-pre-wrap text-sm">{result.raw}</pre>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-2">Strengths</h2>
              <ul className="mb-4 list-disc pl-6">
                {result.strengths.length ? result.strengths.map((s, i) => <li key={i}>{s}</li>) : <li>No strengths found.</li>}
              </ul>
              
              <h2 className="text-xl font-bold mb-2">Weaknesses</h2>
              <ul className="mb-4 list-disc pl-6">
                {result.weaknesses.length ? result.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li>No weaknesses found.</li>}
              </ul>
              
              <h2 className="text-xl font-bold mb-2">Suggestions</h2>
              <ul className="mb-4 list-disc pl-6">
                {result.suggestions.length ? result.suggestions.map((s, i) => <li key={i}>{s}</li>) : <li>No suggestions found.</li>}
              </ul>
              
              {result.overall && (
                <>
                  <h2 className="text-xl font-bold mb-2">Overall Assessment</h2>
                  <p className="mb-2">{result.overall}</p>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
