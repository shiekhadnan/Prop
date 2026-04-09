"use client";

import { useState, useEffect } from "react";
import { Gear, User, Palette, Key, Eye, EyeSlash } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [saving, setSaving] = useState(false);
  const [samApiKey, setSamApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUser(data);
          setName(data.name);
          setAvatar(data.avatar ?? "");
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar: avatar || null }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Gear size={28} weight="duotone" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your profile and app preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User size={20} weight="duotone" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email ?? ""}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input
              id="avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.png"
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette size={20} weight="duotone" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use dark theme across the application
              </p>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email updates about reviews and proposals
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Save</Label>
              <p className="text-sm text-muted-foreground">
                Automatically save proposal drafts while editing
              </p>
            </div>
            <Switch checked={autoSave} onCheckedChange={setAutoSave} />
          </div>
        </CardContent>
      </Card>
      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key size={20} weight="duotone" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sam-api-key">SAM.gov API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="sam-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={samApiKey}
                  onChange={(e) => setSamApiKey(e.target.value)}
                  placeholder="Enter your SAM.gov API key"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <Button
                onClick={async () => {
                  setSavingApiKey(true);
                  try {
                    await fetch("/api/settings/api-keys", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ samApiKey }),
                    });
                  } finally {
                    setSavingApiKey(false);
                  }
                }}
                disabled={savingApiKey}
              >
                {savingApiKey ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Get your free API key from{" "}
              <a
                href="https://sam.gov/profile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                sam.gov/profile
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
