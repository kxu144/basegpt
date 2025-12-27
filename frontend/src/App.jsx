import React from "react";
import ChatUI from "./components/ChatUI/ChatUI.jsx";
import Login from "./components/Login/Login.jsx";
import { AuthProvider, useAuth } from "./components/common/useAuth.jsx";

function AppContent() {
  const { authenticated, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLoginSuccess={login} />;
  }

  return <ChatUI />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
