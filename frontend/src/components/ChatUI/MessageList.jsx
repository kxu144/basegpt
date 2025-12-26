import React from "react";

export default function MessageList({ messages, loading }) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading conversation...</div>
      </div>
    );
  }
  
  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700 mb-2">How can I help you today?</div>
          <div className="text-sm text-gray-500">Start a conversation by typing a message below.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`group mb-6 ${m.role === "user" ? "flex justify-end" : m.role === "error" ? "flex justify-center" : "flex justify-start"}`}
          >
            {m.role === "error" ? (
              // Error message styling
              <div className="max-w-[85%] w-full">
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-800 mb-1">Error</div>
                    <div className="text-sm text-red-700 whitespace-pre-wrap break-words">
                      {m.text}
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`flex gap-4 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  m.role === "user" 
                    ? "bg-[#19c37d] text-white" 
                    : "bg-[#ab68ff] text-white"
                }`}>
                  {m.role === "user" ? "U" : "AI"}
                </div>
                
                {/* Message content */}
                <div className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      m.role === "user"
                        ? "bg-[#19c37d] text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div 
                      className="text-[15px] leading-relaxed whitespace-pre-wrap break-words"
                      style={{ wordBreak: "break-word" }}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
