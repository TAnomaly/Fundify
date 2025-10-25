"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth";
import { userApi } from "@/lib/api";
import toast from "react-hot-toast";
import { ArrowLeft, Save, User, Mail, Globe, Camera } from "lucide-react";

export default function CreatorSettingsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        displayName: "",
        bio: "",
        avatarUrl: "",
        website: "",
        twitter: "",
        instagram: "",
        youtube: "",
    });

    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = getCurrentUser();
                if (!currentUser) {
                    router.push("/login");
                    return;
                }

                const response = await userApi.getMe();
                if (response.success && response.data) {
                    setUser(response.data);
                    setFormData({
                        username: response.data.username || "",
                        email: response.data.email || "",
                        displayName: response.data.displayName || response.data.name || "",
                        bio: response.data.bio || "",
                        avatarUrl: response.data.avatarUrl || response.data.avatar || "",
                        website: response.data.website || "",
                        twitter: response.data.twitter || "",
                        instagram: response.data.instagram || "",
                        youtube: response.data.youtube || "",
                    });
                }
            } catch (error: any) {
                toast.error("Failed to load user data");
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const response = await userApi.updateMe(formData);
            if (response.success) {
                toast.success("Settings updated successfully!");
                // Update local storage
                const updatedUser = { ...user, ...formData };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                setUser(updatedUser);
            } else {
                toast.error(response.message || "Failed to update settings");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/creator-dashboard")}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>
                <h1 className="text-4xl font-bold mb-2">
                    Creator <span className="text-gradient">Settings</span>
                </h1>
                <p className="text-muted-foreground text-lg">
                    Manage your creator profile and preferences
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange("username", e.target.value)}
                                    placeholder="your_username"
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange("email", e.target.value)}
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={formData.displayName}
                                onChange={(e) => handleInputChange("displayName", e.target.value)}
                                placeholder="Your Display Name"
                            />
                        </div>

                        <div>
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                                id="bio"
                                value={formData.bio}
                                onChange={(e) => handleInputChange("bio", e.target.value)}
                                placeholder="Tell your supporters about yourself..."
                                rows={4}
                            />
                        </div>

                        <div>
                            <Label htmlFor="avatarUrl">Avatar URL</Label>
                            <Input
                                id="avatarUrl"
                                value={formData.avatarUrl}
                                onChange={(e) => handleInputChange("avatarUrl", e.target.value)}
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Social Links */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            Social Links
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                value={formData.website}
                                onChange={(e) => handleInputChange("website", e.target.value)}
                                placeholder="https://yourwebsite.com"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="twitter">Twitter</Label>
                                <Input
                                    id="twitter"
                                    value={formData.twitter}
                                    onChange={(e) => handleInputChange("twitter", e.target.value)}
                                    placeholder="@yourusername"
                                />
                            </div>
                            <div>
                                <Label htmlFor="instagram">Instagram</Label>
                                <Input
                                    id="instagram"
                                    value={formData.instagram}
                                    onChange={(e) => handleInputChange("instagram", e.target.value)}
                                    placeholder="@yourusername"
                                />
                            </div>
                            <div>
                                <Label htmlFor="youtube">YouTube</Label>
                                <Input
                                    id="youtube"
                                    value={formData.youtube}
                                    onChange={(e) => handleInputChange("youtube", e.target.value)}
                                    placeholder="@yourusername"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="min-w-[120px]"
                    >
                        {isSaving ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                Saving...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                Save Changes
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
