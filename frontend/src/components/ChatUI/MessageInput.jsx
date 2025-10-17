import React from "react";

export default function MessageInput({ value, onChange, onSend, sending, isNewConv, onKeyDown, error }) {
  return (
    <div className="p-4 border-t bg-gray-50">
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <div className="flex gap-3">
        <textarea
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Write a message... (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="flex-1 resize-none rounded-md border border-gray-200 p-3 text-sm focus:outline-none focus:ring"
        />
        <div className="flex flex-col items-end">
          <button
            onClick={onSend}
            disabled={sending}
            className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Send"}
          </button>
          <div className="text-xs text-gray-400 mt-2">{isNewConv ? "This will create a new conversation" : ""}</div>
        </div>
      </div>
    </div>
  );
}
