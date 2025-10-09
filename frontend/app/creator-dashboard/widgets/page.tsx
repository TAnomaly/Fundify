"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";
import { Copy, ExternalLink, Settings, Monitor, Video, Play } from "lucide-react";

export default function WidgetsPage() {
  const router = useRouter();
  const [widgetUrl, setWidgetUrl] = useState<string>("");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setWidgetUrl(
      `${window.location.origin}/stream-widgets/alerts?creator=${user.id}`
    );
  }, [router]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const openWidget = () => {
    window.open(widgetUrl, "_blank", "width=1920,height=1080");
  };

  const sendTestAlert = () => {
    toast.success("Test alert sent! Check your widget window.");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className="text-4xl font-bold mb-2 text-gradient">Stream Widgets</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Add donation alerts and widgets to your stream
        </p>
      </div>

      {/* Alert Widget Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-glass-card shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Monitor className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Donation Alert Widget</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  OBS Browser Source
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="widget-url">Widget URL</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="widget-url"
                  value={widgetUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(widgetUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📺 How to add to OBS:
              </h4>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Open OBS Studio</li>
                <li>Add new "Browser Source"</li>
                <li>Paste the widget URL above</li>
                <li>Set size: 1920x1080</li>
                <li>Check "Shutdown source when not visible"</li>
                <li>Click OK!</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={openWidget}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview Widget
              </Button>
              <Button
                onClick={sendTestAlert}
                className="flex-1 bg-gradient-primary text-white"
              >
                Send Test Alert
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Widget Settings */}
        <Card className="bg-glass-card shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle>Customization</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Personalize your alerts
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="alert-duration">Alert Duration (seconds)</Label>
              <Input
                id="alert-duration"
                type="number"
                defaultValue={8}
                min={3}
                max={30}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="min-amount">Minimum Amount for Alert</Label>
              <div className="flex gap-2 mt-2">
                <span className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 rounded-l-md border border-r-0">
                  $
                </span>
                <Input
                  id="min-amount"
                  type="number"
                  defaultValue={1}
                  min={0}
                  step={0.01}
                  className="rounded-l-none"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="alert-sound">Alert Sound</Label>
              <select
                id="alert-sound"
                className="w-full mt-2 px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                defaultValue="default"
              >
                <option value="default">Default Chime</option>
                <option value="coin">Coin Drop</option>
                <option value="fanfare">Fanfare</option>
                <option value="none">No Sound</option>
              </select>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/creator-dashboard/widgets/theme")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Customize Theme
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Platform Integrations */}
      <Card className="bg-glass-card shadow-soft">
        <CardHeader>
          <CardTitle>Platform Integrations</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connect your streaming platforms
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Twitch */}
            <div className="border border-purple-300 dark:border-purple-700 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Twitch</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sync donations with Twitch alerts
              </p>
              <Button variant="outline" className="w-full" disabled>
                Connect Twitch
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Soon
                </span>
              </Button>
            </div>

            {/* YouTube */}
            <div className="border border-red-300 dark:border-red-700 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold mb-2">YouTube</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Show Super Chat style alerts
              </p>
              <Button variant="outline" className="w-full" disabled>
                Connect YouTube
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Soon
                </span>
              </Button>
            </div>

            {/* Kick */}
            <div className="border border-green-300 dark:border-green-700 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Kick</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Display Kick donations
              </p>
              <Button variant="outline" className="w-full" disabled>
                Connect Kick
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Soon
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Widget Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <Card className="bg-glass-card shadow-soft hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-semibold mb-2">Goal Tracker</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Show donation goals on stream
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const user = getCurrentUser();
                  const url = `${window.location.origin}/stream-widgets/goal?creator=${user?.id}`;
                  copyToClipboard(url);
                }}
              >
                Copy URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const user = getCurrentUser();
                  window.open(
                    `${window.location.origin}/stream-widgets/goal?creator=${user?.id}`,
                    "_blank",
                    "width=1920,height=1080"
                  );
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-glass-card shadow-soft hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3">⭐</div>
            <h3 className="font-semibold mb-2">Top Supporters</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Display leaderboard widget
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const user = getCurrentUser();
                  const url = `${window.location.origin}/stream-widgets/top-supporters?creator=${user?.id}`;
                  copyToClipboard(url);
                }}
              >
                Copy URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const user = getCurrentUser();
                  window.open(
                    `${window.location.origin}/stream-widgets/top-supporters?creator=${user?.id}`,
                    "_blank",
                    "width=1920,height=1080"
                  );
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-glass-card shadow-soft hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">Recent Events</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Stream of latest donations
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const user = getCurrentUser();
                  const url = `${window.location.origin}/stream-widgets/recent-events?creator=${user?.id}`;
                  copyToClipboard(url);
                }}
              >
                Copy URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const user = getCurrentUser();
                  window.open(
                    `${window.location.origin}/stream-widgets/recent-events?creator=${user?.id}`,
                    "_blank",
                    "width=1920,height=1080"
                  );
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
