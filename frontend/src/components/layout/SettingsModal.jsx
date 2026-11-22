/**
 * SettingsModal
 * -------------
 * Settings dialog with left navigation and content pane.
 */

import { useState } from "react";
import { Monitor, Moon, Sliders, Sun, User } from "lucide-react";
import Modal from "../ui/Modal.jsx";
import SegmentedControl from "../ui/SegmentedControl.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const SECTIONS = [
  { id: "general", label: "General", icon: Sliders },
  { id: "account", label: "Account", icon: User },
];

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState("general");
  const { preference, setPreference } = useTheme();
  const { user } = useAuth();

  return (
    <Modal open={open} onClose={onClose} title="Settings" size="lg">
      <div className="flex flex-col gap-5 sm:flex-row sm:min-h-[260px]">
        <nav
          aria-label="Settings sections"
          className="flex gap-1 border-b border-line-subtle pb-2 sm:w-40 sm:shrink-0 sm:flex-col sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3"
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeTab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveTab(s.id)}
                className={[
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-fast",
                  active
                    ? "bg-active font-medium text-fg"
                    : "text-fg-secondary hover:bg-hover hover:text-fg",
                ].join(" ")}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 text-sm">
          {activeTab === "general" && (
            <div className="divide-y divide-line-subtle">
              <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-fg">Theme</span>
                <SegmentedControl
                  label="Theme"
                  options={THEME_OPTIONS}
                  value={preference}
                  onChange={setPreference}
                  size="sm"
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <span className="font-medium text-fg">Default language</span>
                <span className="text-fg-secondary">
                  {user?.preferred_language || "Python"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4">
                <span className="font-medium text-fg">Hint progression</span>
                <span className="text-fg-secondary">5 levels (concept check at Level 3)</span>
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="divide-y divide-line-subtle">
              <div className="flex items-center justify-between pb-3.5">
                <span className="text-fg-secondary">Name</span>
                <span className="font-medium text-fg">{user?.name || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <span className="text-fg-secondary">Email</span>
                <span className="font-mono text-[13px] text-fg">{user?.email || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <span className="text-fg-secondary">Role</span>
                <span className="capitalize text-fg">{user?.role || "student"}</span>
              </div>
              <div className="flex items-center justify-between pt-3.5">
                <span className="text-fg-secondary">Institution</span>
                <span className="text-fg">{user?.institution || "Independent"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
