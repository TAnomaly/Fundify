"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { Palette, Save, Eye } from "lucide-react";

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  borderRadius: number;
  animationDuration: number;
}

export default function ThemeEditorPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: "#8b5cf6",
    secondaryColor: "#ec4899",
    accentColor: "#3b82f6",
    backgroundColor: "#111827",
    textColor: "#ffffff",
    fontSize: 24,
    borderRadius: 24,
    animationDuration: 8,
  });

  const [previewAlert, setPreviewAlert] = useState(false);

  const handleSave = () => {
    localStorage.setItem("alertTheme", JSON.stringify(theme));
    toast.success("Theme saved successfully!");
  };

  const handleReset = () => {
    setTheme({
      primaryColor: "#8b5cf6",
      secondaryColor: "#ec4899",
      accentColor: "#3b82f6",
      backgroundColor: "#111827",
      textColor: "#ffffff",
      fontSize: 24,
      borderRadius: 24,
      animationDuration: 8,
    });
    toast.success("Theme reset to default");
  };

  const showPreview = () => {
    setPreviewAlert(true);
    setTimeout(() => setPreviewAlert(false), theme.animationDuration * 1000);
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
          Back to Widgets
        </button>
        <h1 className="text-4xl font-bold mb-2 text-gradient">Theme Editor</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your alert appearance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme Settings */}
        <div className="space-y-6">
          {/* Colors */}
          <Card className="bg-glass-card shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Palette className="w-6 h-6 text-purple-600" />
                <CardTitle>Colors</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) =>
                        setTheme({ ...theme, primaryColor: e.target.value })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={theme.primaryColor}
                      onChange={(e) =>
                        setTheme({ ...theme, primaryColor: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={theme.secondaryColor}
                      onChange={(e) =>
                        setTheme({ ...theme, secondaryColor: e.target.value })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={theme.secondaryColor}
                      onChange={(e) =>
                        setTheme({ ...theme, secondaryColor: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) =>
                        setTheme({ ...theme, accentColor: e.target.value })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={theme.accentColor}
                      onChange={(e) =>
                        setTheme({ ...theme, accentColor: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="backgroundColor">Background</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={theme.backgroundColor}
                      onChange={(e) =>
                        setTheme({ ...theme, backgroundColor: e.target.value })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={theme.backgroundColor}
                      onChange={(e) =>
                        setTheme({ ...theme, backgroundColor: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography & Animation */}
          <Card className="bg-glass-card shadow-soft">
            <CardHeader>
              <CardTitle>Typography & Animation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fontSize">Font Size: {theme.fontSize}px</Label>
                <Input
                  id="fontSize"
                  type="range"
                  min="16"
                  max="48"
                  value={theme.fontSize}
                  onChange={(e) =>
                    setTheme({ ...theme, fontSize: parseInt(e.target.value) })
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="borderRadius">Border Radius: {theme.borderRadius}px</Label>
                <Input
                  id="borderRadius"
                  type="range"
                  min="0"
                  max="50"
                  value={theme.borderRadius}
                  onChange={(e) =>
                    setTheme({ ...theme, borderRadius: parseInt(e.target.value) })
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="animationDuration">
                  Animation Duration: {theme.animationDuration}s
                </Label>
                <Input
                  id="animationDuration"
                  type="range"
                  min="3"
                  max="30"
                  value={theme.animationDuration}
                  onChange={(e) =>
                    setTheme({
                      ...theme,
                      animationDuration: parseInt(e.target.value),
                    })
                  }
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-primary text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Theme
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1">
              Reset to Default
            </Button>
          </div>
        </div>

        {/* Preview */}
        <Card className="bg-glass-card shadow-soft lg:sticky lg:top-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preview</CardTitle>
              <Button onClick={showPreview} size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Test Alert
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-900 rounded-lg p-8 min-h-[400px] flex items-center justify-center overflow-hidden">
              {previewAlert && (
                <div
                  className="absolute inset-0 flex items-center justify-center animate-fade-in"
                  style={{
                    animation: `fade-in 1s ease-out`,
                  }}
                >
                  <div
                    className="p-1 shadow-2xl"
                    style={{
                      background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor}, ${theme.accentColor})`,
                      borderRadius: `${theme.borderRadius}px`,
                    }}
                  >
                    <div
                      className="p-8 min-w-[400px]"
                      style={{
                        backgroundColor: theme.backgroundColor,
                        borderRadius: `${theme.borderRadius - 2}px`,
                      }}
                    >
                      <div className="text-center mb-6">
                        <div className="text-6xl mb-4 animate-bounce">💰</div>
                        <h2
                          className="font-bold mb-2"
                          style={{
                            fontSize: `${theme.fontSize * 1.5}px`,
                            color: theme.textColor,
                          }}
                        >
                          New Donation!
                        </h2>
                      </div>

                      <div className="text-center mb-4">
                        <div
                          className="font-bold mb-2"
                          style={{
                            fontSize: `${theme.fontSize}px`,
                            background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.accentColor})`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          Anonymous Donor
                        </div>
                        <div
                          className="font-bold"
                          style={{
                            fontSize: `${theme.fontSize * 2}px`,
                            color: theme.textColor,
                          }}
                        >
                          $50.00
                        </div>
                      </div>

                      <div
                        className="rounded-lg p-4"
                        style={{
                          backgroundColor: `${theme.backgroundColor}dd`,
                          borderRadius: `${theme.borderRadius / 2}px`,
                        }}
                      >
                        <p
                          className="text-center italic"
                          style={{
                            fontSize: `${theme.fontSize * 0.8}px`,
                            color: theme.textColor,
                          }}
                        >
                          "Keep up the great content!"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!previewAlert && (
                <div className="text-center text-gray-500">
                  <Eye className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Click "Test Alert" to preview your theme</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
