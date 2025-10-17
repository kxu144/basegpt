import React from "react";
import { formatDate } from "../../utils/api";

export default function MessageList({ messages, loading, scrollRef }) {
  if (loading) return <div className="text-sm text-gray-500">Loading conversation...</div>;
  if (!messages.length) return <div className="text-sm text-gray-400">No messages yet — say hi 👋</div>;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
      {messages.map((m, i) => (
        <div key={i} className={`max-w-[80%] ${m.role === "user" ? "ml-auto text-right" : "mr-auto text-left"}`}>
          <div className={`inline-block p-3 rounded-2xl ${m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
          <div className="text-xs text-gray-400 mt-1">{formatDate(m.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
