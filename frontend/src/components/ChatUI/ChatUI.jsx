import React, { useEffect, useState, useRef } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";
import { API_BASE } from "../../utils/api";
import { useScrollToBottom } from "../common/hooks";

export default function ChatUI() {
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewConv, setIsNewConv] = useState(false);
  const convLoadController = useRef(null);
  const messagesContainerRef = useScrollToBottom(messages);

  useEffect(() => { loadConversationList(); }, []);

  // --- functions for loadConversationList, loadConversation, handleNewChat, handleSelectConversation, handleSend, handleKeyDown ---
  // Copy from your original ChatUI.jsx (unchanged logic) — no UI code here
  async function loadConversationList() {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/c/list`, { method: "GET" });
      if (!res.ok) throw new Error(`Failed to fetch list: ${res.status}`);
      const data = await res.json();
      // Expecting an array of metadata dicts { id, title, updated_at, snippet }
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Could not load conversations");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadConversation(convId) {
    if (!convId) return;
    // cancel existing
    if (convLoadController.current) convLoadController.current.abort();
    const controller = new AbortController();
    convLoadController.current = controller;
    setLoadingConv(true);
    setError(null);
    setIsNewConv(false);
    try {
      const res = await fetch(`${API_BASE}/c/${encodeURIComponent(convId)}`, {
        method: "GET",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to fetch conv: ${res.status}`);
      const data = await res.json();
      // Expecting data like { id, title, messages: [{role, text, created_at}, ...] }
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setSelectedConvId(data.id ?? convId);
    } catch (err) {
      if (err.name === "AbortError") return; // expected when aborted
      console.error(err);
      setError("Could not load conversation");
      // clear loaded messages on failure
      setMessages([]);
      setSelectedConvId(null);
    } finally {
      setLoadingConv(false);
    }
  }

  function handleNewChat() {
    // Create a fresh local conversation — we will call POST /qa on first send
    const tmpId = `new-${crypto.randomUUID()}`;
    setSelectedConvId(tmpId);
    setMessages([]);
    setIsNewConv(true);
    setInputValue("");
    // also push a minimal metadata entry at the top
    setConversations((prev) => [
      { id: tmpId, title: "New chat", updated_at: new Date().toISOString(), snippet: "" },
      ...prev.filter((c) => c.id !== tmpId),
    ]);
  }

  function handleSelectConversation(conv) {
    // conv may be metadata object or an id string
    const id = typeof conv === "string" ? conv : conv.id;
    // If it's a local new placeholder, just switch to it
    if (id && id.startsWith("new-")) {
      setSelectedConvId(id);
      setMessages([]);
      setIsNewConv(true);
      return;
    }
    loadConversation(id);
  }

  async function handleSend() {
    if (!inputValue.trim()) return;
    setError(null);
    setSending(true);
    const userText = inputValue;
    setInputValue("");

    // Optimistic add
    const userMsg = { role: "user", text: userText, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);

    try {
      const payload = {
        conversation_id: isNewConv ? null : selectedConvId,
        message: userText,
      };
      const res = await fetch(`${API_BASE}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        let errorMessage = "Failed to send message. Please try again.";
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `Error: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const responseData = await res.json();
      // Expecting at least: { conversation_id, assistant_message: { text, created_at }, title? }

      const newConvId = responseData.conversation_id ?? selectedConvId;
      const assistantMsg = responseData.assistant_message ?? { role: "assistant", text: responseData.reply ?? "", created_at: new Date().toISOString() };

      // update selected conv id if server returned a new id
      setSelectedConvId(newConvId);
      setIsNewConv(false);

      // replace last messages (we added user optimistic) and append assistant
      setMessages((prev) => {
        // keep all previous user messages and append assistant
        return [...prev, { role: "assistant", text: assistantMsg.text ?? assistantMsg, created_at: assistantMsg.created_at }];
      });

      // update conversations list with metadata from server if provided
      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== newConvId);
        const title = responseData.title ?? (assistantMsg.text ? assistantMsg.text.slice(0, 60) : "Chat");
        const snippet = assistantMsg.text ? assistantMsg.text.slice(0, 120) : "";
        return [{ id: newConvId, title, updated_at: new Date().toISOString(), snippet }, ...updated];
      });
    } catch (err) {
      console.error(err);
      // Add error message inline after the user message
      setMessages((prev) => [...prev, {
        role: "error",
        text: err.message || "An error occurred. Please try again.",
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    // This should only receive Enter key events (modifier keys are filtered in MessageInput)
    // Handle Enter key to send message
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const convTitle = selectedConvId && selectedConvId.startsWith("new-") ? "New chat" : selectedConv?.title || "Welcome";
  const convDate = selectedConv ? selectedConv.updated_at : "Select or start a conversation";

  return (
    <div className="h-screen flex bg-white text-gray-900 overflow-hidden">
      <Sidebar
        conversations={conversations}
        selectedConvId={selectedConvId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        loading={loadingList}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <ChatPanel
        messages={messages}
        loadingConv={loadingConv}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSend={handleSend}
        sending={sending}
        isNewConv={isNewConv}
        onKeyDown={handleKeyDown}
        scrollRef={messagesContainerRef}
        selectedConvId={selectedConvId}
        convTitle={convTitle}
        convDate={convDate}
      />
    </div>
  );
}
