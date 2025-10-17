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
    <aside className="w-80 border-r border-gray-200 flex flex-col">
      <div className="p-4 flex flex-col gap-2 border-b border-gray-100">
        <button
          onClick={onNewChat}
          className="px-3 py-1 rounded-md bg-black text-white text-sm hover:opacity-90"
        >
          + New chat
        </button>
        <div className="relative">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations"
            className="w-full pl-3 pr-8 py-1 rounded-md border border-gray-200 text-sm"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">🔍</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No conversations yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredConversations.map((c) => (
              <li
                key={c.id}
                onClick={() => onSelectConversation(c)}
                className={`p-3 cursor-pointer hover:bg-gray-100 ${selectedConvId === c.id ? "bg-gray-100" : ""}`}
              >
                <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                <div className="text-xs text-gray-500 truncate">{c.snippet || formatDate(c.updated_at)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="p-3 border-t text-xs text-gray-500">Local frontend • no auth token stored</div>
    </aside>
  );
}
