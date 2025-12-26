import React from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatPanel({
  messages,
  loadingConv,
  inputValue,
  setInputValue,
  onSend,
  sending,
  isNewConv,
  onKeyDown,
  error,
  scrollRef,
  selectedConvId,
  convTitle,
  convDate,
}) {
  return (
    <main className="flex-1 flex flex-col bg-white">
      {/* Messages + Input */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages take all remaining space */}
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} loading={loadingConv} scrollRef={scrollRef} />
        </div>

        {/* Input stays at bottom */}
        <div className="border-t border-gray-200 bg-white">
          <MessageInput
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSend={onSend}
            sending={sending}
            isNewConv={isNewConv}
            onKeyDown={onKeyDown}
            error={error}
          />
        </div>
      </div>
    </main>
  );
}
