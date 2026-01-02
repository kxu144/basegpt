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
  scrollRef,
  selectedConvId,
  convTitle,
  convDate,
  entities,
  onEntitiesChange,
  messageInputRef,
}) {
  return (
    <main className="flex-1 flex flex-col bg-white">
      {/* Messages + Input */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages take all remaining space */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <MessageList messages={messages} loading={loadingConv} />
        </div>

        {/* Input stays at bottom */}
        <div className="border-t border-gray-200 bg-white">
          <MessageInput
            ref={messageInputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSend={onSend}
            sending={sending}
            isNewConv={isNewConv}
            onKeyDown={onKeyDown}
            entities={entities}
            onEntitiesChange={onEntitiesChange}
          />
        </div>
      </div>
    </main>
  );
}
