"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { getApiUrl } from "@/lib/api";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, Mail, AtSign, Image as ImageIcon } from "lucide-react";

export default function ProfileEditPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        email: "",
        bio: "",
        creatorBio: "",
        avatar: "",
        bannerImage: "",
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`${getApiUrl()}/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data.success) {
                const user = response.data.data;
                setFormData({
                    name: user.name || "",
                    username: user.username || "",
                    email: user.email || "",
                    bio: user.bio || "",
                    creatorBio: user.creatorBio || "",
                    avatar: user.avatar || "",
                    bannerImage: user.bannerImage || "",
                });
            }
        } catch (error) {
            toast.error("Failed to load profile");
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Name is required");
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.put(
                `${getApiUrl()}/users/profile`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                toast.success("Profile updated successfully!");
                router.push("/creator-dashboard");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (field: 'avatar' | 'bannerImage', file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.post(
                `${getApiUrl()}/upload/image`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (response.data.success) {
                setFormData(prev => ({
                    ...prev,
                    [field]: response.data.data.url,
                }));
                toast.success(`${field === 'avatar' ? 'Profile picture' : 'Banner'} uploaded!`);
            }
        } catch (error) {
            toast.error("Failed to upload image");
        }
    };

    if (isLoadingProfile) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </button>
                <h1 className="text-4xl font-bold mb-2 text-gradient">Edit Profile</h1>
                <p className="text-gray-600 dark:text-gray-400">Update your profile information</p>
            </div>

            <Card className="bg-glass-card shadow-soft">
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Profile Picture */}
                        <div>
                            <Label>Profile Picture</Label>
                            <div className="mt-2 flex items-center gap-4">
                                {formData.avatar && (
                                    <img
                                        src={formData.avatar}
                                        alt="Profile"
                                        className="w-20 h-20 rounded-full object-cover"
                                    />
                                )}
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageUpload('avatar', file);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Banner Image */}
                        <div>
                            <Label>Banner Image</Label>
                            <div className="mt-2">
                                {formData.bannerImage && (
                                    <img
                                        src={formData.bannerImage}
                                        alt="Banner"
                                        className="w-full h-32 rounded-lg object-cover mb-2"
                                    />
                                )}
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageUpload('bannerImage', file);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <Label htmlFor="name" className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Name *
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        {/* Username */}
                        <div>
                            <Label htmlFor="username" className="flex items-center gap-2">
                                <AtSign className="w-4 h-4" />
                                Username
                            </Label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="your-username"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Your profile URL: fundify.com/creators/{formData.username || 'username'}
                            </p>
                        </div>

                        {/* Email */}
                        <div>
                            <Label htmlFor="email" className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                disabled
                                className="bg-gray-100 dark:bg-gray-800"
                            />
                            <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                        </div>

                        {/* Bio */}
                        <div>
                            <Label htmlFor="bio">Short Bio</Label>
                            <Textarea
                                id="bio"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                placeholder="Tell us about yourself..."
                                className="mt-2 h-24"
                            />
                        </div>

                        {/* Creator Bio */}
                        <div>
                            <Label htmlFor="creatorBio">Creator Bio (for supporters)</Label>
                            <Textarea
                                id="creatorBio"
                                value={formData.creatorBio}
                                onChange={(e) => setFormData({ ...formData, creatorBio: e.target.value })}
                                placeholder="Describe what you create and why people should support you..."
                                className="mt-2 h-32"
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 bg-gradient-primary"
                            >
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

