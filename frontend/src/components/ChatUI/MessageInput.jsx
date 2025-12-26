import React, { useRef, useEffect } from "react";

export default function MessageInput({ value, onChange, onSend, sending, isNewConv, onKeyDown, error }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  return (
    <div className="bg-white">
      {error && (
        <div className="px-4 pt-3">
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="relative flex items-end gap-3 bg-white rounded-2xl border border-gray-300 shadow-sm hover:border-gray-400 focus-within:border-[#19c37d] focus-within:shadow-md transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Message ChatGPT..."
            rows={1}
            className="flex-1 resize-none rounded-2xl px-4 py-3 text-[15px] leading-relaxed focus:outline-none bg-transparent text-gray-900 placeholder-gray-500 max-h-[200px] overflow-y-auto"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={onSend}
            disabled={sending || !value.trim()}
            className="mb-2 mr-2 p-2 rounded-lg bg-[#19c37d] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#16a570] transition-colors flex-shrink-0"
            title="Send message"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
          </button>
        </div>
        <div className="text-xs text-gray-500 text-center mt-2">
          ChatGPT can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
}
