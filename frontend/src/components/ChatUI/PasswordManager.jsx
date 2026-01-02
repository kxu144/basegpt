import React, { useState, useEffect } from "react";
import { API_BASE } from "../../utils/api";

export default function PasswordManager() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'view' or 'add'
  const [selectedKey, setSelectedKey] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyDetails, setKeyDetails] = useState(null);
  const [loadingKey, setLoadingKey] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState({ key: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/keys`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setKeys(data);
      }
    } catch (err) {
      console.error("Failed to load keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    setCheckingPassword(true);
    setPasswordError("");
    try {
      const response = await fetch(`${API_BASE}/keys/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: passwordInput }),
      });

      if (response.ok) {
        setUnlocked(true);
        setShowPasswordModal(false);
        setPasswordInput("");
        
        // Execute the pending action
        if (pendingAction === 'view' && selectedKey) {
          loadKeyDetails(selectedKey);
        } else if (pendingAction === 'add') {
          setShowAddModal(true);
        }
        setPendingAction(null);
      } else {
        const data = await response.json();
        setPasswordError(data.detail || "Invalid password");
      }
    } catch (err) {
      setPasswordError("Failed to verify password. Please try again.");
    } finally {
      setCheckingPassword(false);
    }
  };

  const loadKeyDetails = async (key) => {
    setLoadingKey(true);
    try {
      const response = await fetch(`${API_BASE}/keys/${key.id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setKeyDetails(data);
        setShowKeyModal(true);
      } else if (response.status === 403) {
        setUnlocked(false);
      }
    } catch (err) {
      console.error("Failed to load key details:", err);
    } finally {
      setLoadingKey(false);
    }
  };

  const handleKeyClick = async (key) => {
    setSelectedKey(key);
    
    // Try to fetch the key - if we get 403, we need password
    try {
      const response = await fetch(`${API_BASE}/keys/${key.id}`, {
        credentials: "include",
      });
      
      if (response.ok) {
        // Already unlocked, show details
        const data = await response.json();
        setKeyDetails(data);
        setShowKeyModal(true);
        setUnlocked(true);
      } else if (response.status === 403) {
        // Need to unlock first
        setUnlocked(false);
        setPendingAction('view');
        setShowPasswordModal(true);
      }
    } catch (err) {
      console.error("Failed to load key details:", err);
    }
  };

  const handleSaveKey = async () => {
    if (!keyDetails) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/keys/${keyDetails.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          key: keyDetails.key,
          password: keyDetails.password,
        }),
      });

      if (response.ok) {
        setShowKeyModal(false);
        setKeyDetails(null);
        loadKeys();
      }
    } catch (err) {
      console.error("Failed to save key:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddClick = () => {
    if (unlocked) {
      setShowAddModal(true);
    } else {
      setPendingAction('add');
      setShowPasswordModal(true);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.key || !newKey.password) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newKey),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewKey({ key: "", password: "" });
        loadKeys();
      } else if (response.status === 403) {
        setUnlocked(false);
        setPendingAction('add');
        setShowPasswordModal(true);
        setShowAddModal(false);
      }
    } catch (err) {
      console.error("Failed to add key:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm("Are you sure you want to delete this key?")) return;

    try {
      const response = await fetch(`${API_BASE}/keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        loadKeys();
        if (selectedKey?.id === keyId) {
          setShowKeyModal(false);
          setKeyDetails(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete key:", err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Saved Passwords</h2>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Password
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading passwords...</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No saved passwords yet. Click "Add Password" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              onClick={() => handleKeyClick(key)}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{key.key}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Last updated: {new Date(key.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">Verify Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your account password to continue. Your passwords will remain unlocked for 5 minutes.
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUnlock();
              }}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            {passwordError && (
              <div className="mb-4 text-sm text-red-600">{passwordError}</div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput("");
                  setPasswordError("");
                  setPendingAction(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                disabled={checkingPassword || !passwordInput}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {checkingPassword ? "Verifying..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Details/Edit Modal */}
      {showKeyModal && keyDetails && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">Edit Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key/Name
                </label>
                <input
                  type="text"
                  value={keyDetails.key}
                  onChange={(e) =>
                    setKeyDetails({ ...keyDetails, key: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={keyDetails.password}
                    onChange={(e) =>
                      setKeyDetails({ ...keyDetails, password: e.target.value })
                    }
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-between mt-6">
              <button
                onClick={() => handleDeleteKey(keyDetails.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowKeyModal(false);
                    setKeyDetails(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKey}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">Add Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key/Name
                </label>
                <input
                  type="text"
                  value={newKey.key}
                  onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                  placeholder="e.g., Gmail, GitHub"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newKey.password}
                    onChange={(e) =>
                      setNewKey({ ...newKey, password: e.target.value })
                    }
                    placeholder="Enter password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewKey({ key: "", password: "" });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddKey}
                disabled={saving || !newKey.key || !newKey.password}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

