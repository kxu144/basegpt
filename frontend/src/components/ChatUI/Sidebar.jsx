import React, { useState, useRef, useEffect } from "react";
import { formatDate } from "../../utils/api";
import { useAuth } from "../common/useAuth.jsx";

export default function Sidebar({
  conversations,
  selectedConvId,
  onNewChat,
  onSelectConversation,
  loading,
  searchTerm,
  setSearchTerm,
  onOpenSettings,
}) {
  const { email, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const filteredConversations = conversations.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (c.title?.toLowerCase().includes(q)) || (c.snippet?.toLowerCase().includes(q));
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showUserMenu]);

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

      {/* User menu */}
      <div className="p-3 border-t border-gray-800">
        {email && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full px-3 py-2 rounded-lg bg-[#2f2f2f] text-gray-200 text-sm font-medium hover:bg-[#3f3f3f] transition-colors flex items-center gap-3"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {email.charAt(0).toUpperCase()}
                </span>
              </div>
              {/* Email text */}
              <span className="truncate flex-1 text-left">{email}</span>
              <svg 
                className={`w-4 h-4 flex-shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#2f2f2f] rounded-lg border border-gray-700 shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSettings();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#3f3f3f] transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#3f3f3f] transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
