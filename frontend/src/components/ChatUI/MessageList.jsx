import React from "react";

export default function MessageList({ messages, loading, scrollRef }) {
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
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`group mb-6 ${m.role === "user" ? "flex justify-end" : "flex justify-start"}`}
          >
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
          </div>
        ))}
      </div>
    </div>
  );
}
