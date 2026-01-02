import React, { useState } from "react";
import PasswordManager from "./PasswordManager";

const IconGear = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconShield = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SETTINGS_SECTIONS = [
  { id: "general", label: "General", Icon: IconGear },
  { id: "security", label: "Security", Icon: IconShield },
];

export default function Settings({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState("general");

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">General</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                  <option>System</option>
                  <option>Light</option>
                  <option>Dark</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accent color</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                  <option>Default</option>
                  <option>Blue</option>
                  <option>Green</option>
                  <option>Purple</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                  <option>Auto-detect</option>
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Spoken language</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                  <option>Auto-detect</option>
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
                <p className="mt-2 text-sm text-gray-500">
                  For best results, select the language you mainly speak. If it's not listed, it may still be supported via auto-detection.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </button>
                  <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                    <option>Maple</option>
                    <option>Ocean</option>
                    <option>Ember</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Show follow up suggestions in chats</label>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors">
                  <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white transition-transform" />
                </button>
              </div>
            </div>
          </div>
        );
      case "security":
        return <PasswordManager />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] max-h-[800px] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Navigation */}
        <div className="w-64 bg-[#171717] text-gray-200 flex flex-col border-r border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {SETTINGS_SECTIONS.map((section) => {
              const IconComponent = section.Icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 transition-colors mb-1 ${
                    activeSection === section.id
                      ? "bg-[#2f2f2f] text-white"
                      : "text-gray-300 hover:bg-[#2f2f2f] hover:text-white"
                  }`}
                >
                  <IconComponent />
                  <span className="text-sm font-medium">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

