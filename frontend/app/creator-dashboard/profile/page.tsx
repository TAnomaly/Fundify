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
import { User, Mail, AtSign, Image as ImageIcon, Loader2 } from "lucide-react";

export default function ProfileEditPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
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
      if (!token) {
        toast.error("Please login first");
        router.push("/login");
        return;
      }

      console.log("📥 Loading profile...");
      const response = await axios.get(`${getApiUrl()}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const user = response.data.data;
        const profileData = {
          name: user.name || "",
          username: user.username || "",
          email: user.email || "",
          bio: user.bio || "",
          creatorBio: user.creatorBio || "",
          avatar: user.avatar || "",
          bannerImage: user.bannerImage || "",
        };
        setFormData(profileData);
        setOriginalData(profileData);
        console.log("✅ Profile loaded successfully");
      }
    } catch (error: any) {
      console.error("❌ Profile load error:", error);
      console.error("   Response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to load profile. Please try again.");
      // Don't redirect, let user stay and retry
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const hasChanges = () => {
    if (!originalData) return false;
    return Object.keys(formData).some(
      (key) => formData[key as keyof typeof formData] !== originalData[key as keyof typeof originalData]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!hasChanges()) {
      toast("No changes to save", { icon: "ℹ️" });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please login first");
        router.push("/login");
        return;
      }

      // Only send fields that changed (Twitter/X style)
      const updateData: any = {};
      if (formData.name !== originalData.name && formData.name.trim()) {
        updateData.name = formData.name.trim();
      }
      if (formData.username !== originalData.username && formData.username?.trim()) {
        updateData.username = formData.username.trim();
      }
      if (formData.bio !== originalData.bio) {
        updateData.bio = formData.bio?.trim() || "";
      }
      if (formData.creatorBio !== originalData.creatorBio) {
        updateData.creatorBio = formData.creatorBio?.trim() || "";
      }
      if (formData.avatar !== originalData.avatar) {
        updateData.avatar = formData.avatar?.trim() || "";
      }
      if (formData.bannerImage !== originalData.bannerImage) {
        updateData.bannerImage = formData.bannerImage?.trim() || "";
      }

      console.log("📤 Updating profile with:", Object.keys(updateData));

      const response = await axios.put(
        `${getApiUrl()}/users/profile`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log("✅ Profile updated successfully");
        toast.success("Profile updated successfully!");
        setOriginalData(formData); // Update original to current
        // Don't redirect, let user continue editing (Twitter/X style)
      }
    } catch (error: any) {
      console.error("❌ Profile update error:", error);
      console.error("   Response:", error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.message ||
                          "Failed to update profile. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (field: 'avatar' | 'bannerImage', file: File) => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Max 5MB.");
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    const uploadData = new FormData();
    uploadData.append('image', file);

    setUploadingField(field);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please login first");
        return;
      }

      console.log(`📤 Uploading ${field}:`, file.name);

      const response = await axios.post(
        `${getApiUrl()}/upload/image`,
        uploadData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        const newUrl = response.data.data.url;
        setFormData(prev => ({
          ...prev,
          [field]: newUrl,
        }));
        console.log(`✅ ${field} uploaded:`, newUrl);
        toast.success(`${field === 'avatar' ? 'Profile picture' : 'Banner'} uploaded!`);
      }
    } catch (error: any) {
      console.error(`❌ ${field} upload error:`, error);
      console.error("   Response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingField(null);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600 dark:text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-4xl font-bold mb-2 text-gradient">Edit Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {hasChanges() ? "You have unsaved changes" : "Update your profile information"}
        </p>
      </div>

      <Card className="bg-glass-card shadow-soft">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div>
              <Label className="text-base font-semibold">Profile Picture</Label>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-white text-3xl font-bold">
                      {formData.name.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  {uploadingField === 'avatar' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload('avatar', file);
                    }}
                    disabled={uploadingField === 'avatar'}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 5MB • JPG, PNG, GIF</p>
                </div>
              </div>
            </div>

            {/* Banner Image */}
            <div>
              <Label className="text-base font-semibold">Banner Image</Label>
              <div className="mt-3">
                {formData.bannerImage ? (
                  <div className="relative mb-3">
                    <img
                      src={formData.bannerImage}
                      alt="Banner"
                      className="w-full h-40 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700"
                    />
                    {uploadingField === 'bannerImage' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 mb-3 flex items-center justify-center text-white">
                    <ImageIcon className="w-12 h-12 opacity-50" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload('bannerImage', file);
                  }}
                  disabled={uploadingField === 'bannerImage'}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Max 5MB • Recommended: 1500x500px</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

            {/* Name */}
            <div>
              <Label htmlFor="name" className="flex items-center gap-2 text-base font-semibold">
                <User className="w-4 h-4" />
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
                className="mt-2"
                required
              />
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username" className="flex items-center gap-2 text-base font-semibold">
                <AtSign className="w-4 h-4" />
                Username
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                placeholder="your-username"
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                fundify.com/creators/<span className="font-semibold">{formData.username || 'username'}</span>
              </p>
            </div>

            {/* Email (Read-only) */}
            <div>
              <Label htmlFor="email" className="flex items-center gap-2 text-base font-semibold">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="mt-2 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="bio" className="text-base font-semibold">Short Bio</Label>
                <span className="text-xs text-gray-500">{formData.bio.length}/160</span>
              </div>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 160) })}
                placeholder="Tell us about yourself in a few words..."
                className="mt-2 h-20 resize-none"
                maxLength={160}
              />
            </div>

            {/* Creator Bio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="creatorBio" className="text-base font-semibold">Creator Bio</Label>
                <span className="text-xs text-gray-500">{formData.creatorBio.length}/500</span>
              </div>
              <Textarea
                id="creatorBio"
                value={formData.creatorBio}
                onChange={(e) => setFormData({ ...formData, creatorBio: e.target.value.slice(0, 500) })}
                placeholder="Describe what you create and why people should support you..."
                className="mt-2 h-32 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">This will be shown on your creator page</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading || !hasChanges()}
                className="flex-1 bg-gradient-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>

            {hasChanges() && (
              <p className="text-center text-sm text-amber-600 dark:text-amber-400">
                ⚠️ You have unsaved changes
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
