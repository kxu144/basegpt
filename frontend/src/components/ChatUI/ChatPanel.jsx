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
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{convTitle}</h1>
          <div className="text-xs text-gray-500">{convDate}</div>
        </div>
        <div className="text-sm text-gray-500">Chat-like UI — frontend only</div>
      </header>

      {/* Messages + Input */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages take all remaining space */}
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} loading={loadingConv} scrollRef={scrollRef} />
        </div>

        {/* Input stays at bottom */}
        <div className="border-t">
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
