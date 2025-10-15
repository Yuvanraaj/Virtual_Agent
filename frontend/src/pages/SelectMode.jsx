import React from "react";
import { useLocation } from "wouter";

const options = [
  {
    label: "Virtual Agent",
    path: "/agent",
    description: "Interact with the Anam AI Virtual Agent.",
  },
  {
    label: "Chatbot",
    path: "/chatbot",
    description: "Try the classic chatbot interface.",
  },
  {
    label: "Resume Parse",
    path: "/resume-parse",
    description: "Parse and analyze your resume.",
  },
];

export default function SelectMode() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] p-4">
      <h1 className="text-3xl font-bold mb-8">Choose a Mode</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
        {options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => navigate(opt.path)}
            className="rounded-xl shadow-lg bg-white dark:bg-gray-800 p-8 flex flex-col items-center hover:scale-105 transition-transform border border-gray-200 dark:border-gray-700"
          >
            <span className="text-xl font-semibold mb-2">{opt.label}</span>
            <span className="text-gray-500 dark:text-gray-300 text-center">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
