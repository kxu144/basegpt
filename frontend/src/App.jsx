import React from "react";
import ChatUI from "./components/ChatUI/ChatUI.jsx";
import { API_BASE } from "./utils/api";

export default function App() {
  fetch(`${API_BASE}/test`).then(r => r.json()).then(console.log).catch(console.error);
  return <ChatUI />;
}
