import React, { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";
import Settings from "./Settings";
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
  const [showSettings, setShowSettings] = useState(false);
  const convLoadController = useRef(null);
  const messagesContainerRef = useScrollToBottom(messages);
  const wsRef = useRef(null);
  const wsReconnectTimeoutRef = useRef(null);

  useEffect(() => {
    loadConversationList();
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // WebSocket connection management
  function getWebSocketUrl() {
    const baseUrl = API_BASE || "http://127.0.0.1:8000";
    // Convert http:// to ws:// and https:// to wss://
    const wsUrl = baseUrl.replace(/^http/, "ws");
    return `${wsUrl}/ws`;
  }

  function connectWebSocket() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        if (wsReconnectTimeoutRef.current) {
          clearTimeout(wsReconnectTimeoutRef.current);
          wsReconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        wsRef.current = null;
        // Attempt to reconnect after a delay
        if (!wsReconnectTimeoutRef.current) {
          wsReconnectTimeoutRef.current = setTimeout(() => {
            wsReconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 3000);
        }
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
    }
  }

  function disconnectWebSocket() {
    if (wsReconnectTimeoutRef.current) {
      clearTimeout(wsReconnectTimeoutRef.current);
      wsReconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }

  function handleWebSocketMessage(data) {
    if (data.type === "chunk") {
      // Use flushSync to force immediate render for real-time streaming
      flushSync(() => {
        setMessages((prev) => {
          const newMessages = [...prev];
          for (let i = newMessages.length - 1; i >= 0; i--) {
            if (newMessages[i].role === "assistant") {
              newMessages[i] = {
                ...newMessages[i],
                text: (newMessages[i].text || "") + (data.content || ""),
              };
              break;
            }
          }
          return newMessages;
        });
      });
    } else if (data.type === "done") {
      // Finalize the conversation
      const newConvId = data.conversation_id;
      setSelectedConvId(newConvId);
      setIsNewConv(false);
      setSending(false);

      // Update the last assistant message with final content
      setMessages((prev) => {
        const newMessages = [...prev];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === "assistant") {
            newMessages[i] = {
              ...newMessages[i],
              text: data.content || newMessages[i].text || "",
              created_at: data.created_at || newMessages[i].created_at,
            };
            break;
          }
        }
        return newMessages;
      });

      // Update conversation list
      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== newConvId);
        const title = data.content ? data.content.slice(0, 60) : "Chat";
        const snippet = data.content ? data.content.slice(0, 120) : "";
        return [
          { id: newConvId, title, updated_at: data.created_at || new Date().toISOString(), snippet },
          ...updated,
        ];
      });

      // Reload conversation list to get updated metadata
      loadConversationList();
    } else if (data.type === "error") {
      setSending(false);
      const errorMsg = data.content || "An error occurred. Please try again.";
      // Remove the placeholder assistant message if it exists
      setMessages((prev) => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "assistant" && !newMessages[newMessages.length - 1].text) {
          newMessages.pop();
        }
        return [
          ...newMessages,
          {
            role: "error",
            text: errorMsg,
            created_at: new Date().toISOString(),
          },
        ];
      });
    }
  }

  async function loadConversationList() {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/c/list`, { 
        method: "GET",
        credentials: "include", // Send cookies for authentication
      });
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
        credentials: "include", // Send cookies for authentication
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to fetch conv: ${res.status}`);
      const data = await res.json();
      // Backend returns: { id, title, updated_at, messages: [{id, role, content, created_at}, ...] }
      // Frontend expects: messages with {role, text, created_at}
      const formattedMessages = Array.isArray(data.messages)
        ? data.messages.map((msg) => ({
            role: msg.role,
            text: msg.content, // Map content to text
            created_at: msg.created_at,
          }))
        : [];
      setMessages(formattedMessages);
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

    // Optimistic add user message
    const userMsg = { role: "user", text: userText, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);

    // Ensure WebSocket is connected
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setSending(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "error",
            text: "Failed to connect. Please try again.",
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }
    }

    try {
      // Send query via WebSocket
      const payload = {
        type: "query",
        conversation_id: isNewConv ? null : selectedConvId,
        message: userText,
      };
      wsRef.current.send(JSON.stringify(payload));

      // Add placeholder assistant message that will be updated with chunks
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error(err);
      setSending(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          text: err.message || "An error occurred. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
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
        onOpenSettings={() => setShowSettings(true)}
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

      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
