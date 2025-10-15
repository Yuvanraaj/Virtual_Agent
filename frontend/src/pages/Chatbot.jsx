import React, { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "../config";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: "system", content: "You are a helpful AI interview coach. Ask me interview questions and give feedback." },
    { role: "assistant", content: "Hi! I'm your virtual interview prep agent. Ask me anything or say 'start interview' to begin." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamingMessage("");
    
    try {
  // Use streaming API via configured backend
  const response = await fetch(`${API_BASE_URL}/api/openai-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          temperature: 0.2,
          max_tokens: 800,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedResponse = "";
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        
        // Decode the stream chunk
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        // Process each line (event)
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            
            // Check for the [DONE] marker
            if (data === '[DONE]') {
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              
              if (content) {
                accumulatedResponse += content;
                setStreamingMessage(accumulatedResponse);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
      
      // When streaming is done, add the complete message to the chat
      if (accumulatedResponse) {
        setMessages([...newMessages, { role: "assistant", content: accumulatedResponse }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: "(No response)" }]);
      }
    } catch (err) {
      console.error('Error with streaming response:', err);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, there was an error." }]);
    } finally {
      setLoading(false);
      setStreamingMessage("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] p-4">
      <h1 className="text-3xl font-bold mb-6">Interview Prep Chatbot</h1>
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow p-6 flex flex-col gap-4">
        <div className="flex-1 overflow-y-auto max-h-96 mb-4">
          {messages.slice(1).map((msg, i) => (
            <div key={i} className={`mb-2 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <span className={`inline-block px-3 py-2 rounded-lg ${msg.role === "user" ? "bg-indigo-100 text-indigo-900" : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"}`}>{msg.content}</span>
            </div>
          ))}
          
          {/* Show streaming message while it's being generated */}
          {streamingMessage && (
            <div className="mb-2 text-left">
              <span className="inline-block px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                {streamingMessage}
                <span className="ml-1 animate-pulse">▌</span>
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 rounded border border-gray-300 dark:bg-gray-800 dark:text-white"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your question or 'start interview'..."
            disabled={loading}
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded font-semibold" disabled={loading}>
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
