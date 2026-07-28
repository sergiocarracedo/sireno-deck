import React from "react";

interface CodeBlockProps {
  children: string;
  language?: string;
}

export function CodeBlock({ children, language = "bash" }: CodeBlockProps) {
  return (
    <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto">
      <code className={`language-${language} text-sm font-mono text-gray-100`}>
        {children}
      </code>
    </pre>
  );
}

interface FileBlockProps {
  filename: string;
  children: React.ReactNode;
}

export function FileBlock({ filename, children }: FileBlockProps) {
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-4 py-2 text-sm font-mono text-gray-400 border-b border-gray-700">
        {filename}
      </div>
      <div className="bg-gray-900 p-4 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
