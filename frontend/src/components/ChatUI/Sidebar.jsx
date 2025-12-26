import React from "react";
import { formatDate } from "../../utils/api";

export default function Sidebar({
  conversations,
  selectedConvId,
  onNewChat,
  onSelectConversation,
  loading,
  searchTerm,
  setSearchTerm,
}) {
  const filteredConversations = conversations.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (c.title?.toLowerCase().includes(q)) || (c.snippet?.toLowerCase().includes(q));
  });

  return (
    <aside className="w-64 bg-[#171717] text-gray-200 flex flex-col border-r border-gray-800">
      <div className="p-3 flex flex-col gap-2">
        <button
          onClick={onNewChat}
          className="px-3 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2 justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
        <div className="relative">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#2f2f2f] border border-gray-700 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-600"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-gray-400 text-center">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">No conversations yet.</div>
        ) : (
          <ul className="px-2 py-2">
            {filteredConversations.map((c) => (
              <li
                key={c.id}
                onClick={() => onSelectConversation(c)}
                className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-1 ${
                  selectedConvId === c.id 
                    ? "bg-[#2f2f2f] text-white" 
                    : "text-gray-300 hover:bg-[#2f2f2f] hover:text-white"
                }`}
              >
                <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                {c.snippet && (
                  <div className="text-xs text-gray-500 truncate mt-0.5">{c.snippet}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
