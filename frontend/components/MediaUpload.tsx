"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { X, Image as ImageIcon, Video as VideoIcon, Loader2 } from "lucide-react";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import axios from "axios";
import toast from "react-hot-toast";

interface MediaUploadProps {
  onImagesChange?: (urls: string[]) => void;
  onVideoChange?: (url: string | null) => void;
  maxImages?: number;
  allowVideo?: boolean;
  existingImages?: string[];
  existingVideo?: string;
}

export function MediaUpload({
  onImagesChange,
  onVideoChange,
  maxImages = 10,
  allowVideo = true,
  existingImages = [],
  existingVideo,
}: MediaUploadProps) {
  const [images, setImages] = useState<string[]>(existingImages);
  const [video, setVideo] = useState<string | null>(existingVideo || null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: "image" | "video") => {
    const formData = new FormData();
    formData.append(type, file);

    try {
      setUploading(true);
      setUploadProgress(0);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/upload/${type}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(progress);
          },
        }
      );

      if (response.data.success) {
        const url = response.data.data.url;
        console.log(`✅ ${type} uploaded successfully:`, url);
        return url;
      }
      throw new Error("Upload failed");
    } catch (error: any) {
      console.error(`❌ Upload error (${type}):`, error);
      console.error("Error details:", error.response?.data);
      toast.error(error.response?.data?.message || "Upload failed");
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    try {
      const uploadPromises = files.map((file) => uploadFile(file, "image"));
      const urls = await Promise.all(uploadPromises);
      const newImages = [...images, ...urls];
      console.log('📸 All images uploaded:', newImages);
      setImages(newImages);
      onImagesChange?.(newImages);
      toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error) {
      // Error already handled in uploadFile
    }

    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Video file too large. Maximum 500MB allowed");
      return;
    }

    try {
      const url = await uploadFile(file, "video");
      console.log('🎥 Video uploaded:', url);
      setVideo(url);
      onVideoChange?.(url);
      toast.success("Video uploaded successfully");
    } catch (error) {
      // Error already handled in uploadFile
    }

    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange?.(newImages);
  };

  const removeVideo = () => {
    setVideo(null);
    onVideoChange?.(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">Images</label>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className="w-full"
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Upload Images ({images.length}/{maxImages})
        </Button>

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {images.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={getFullMediaUrl(url)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Upload */}
      {allowVideo && (
        <div>
          <label className="block text-sm font-medium mb-2">Video (Optional)</label>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploading || !!video}
            className="w-full"
          >
            <VideoIcon className="w-4 h-4 mr-2" />
            {video ? "Video Uploaded" : "Upload Video"}
          </Button>

          {/* Video Preview */}
          {video && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="relative">
                  <video
                    src={getFullMediaUrl(video)}
                    controls
                    className="w-full rounded-lg"
                  >
                    <source src={getFullMediaUrl(video)} type="video/mp4" />
                  </video>
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Uploading...</p>
                <Progress value={uploadProgress} className="h-2" />
              </div>
              <span className="text-sm font-medium">{uploadProgress}%</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MediaUpload;
