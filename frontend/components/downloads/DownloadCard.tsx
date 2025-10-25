"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Download {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  downloadCount: number;
  hasAccess: boolean;
  thumbnailUrl?: string;
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function DownloadCard({ download }: { download: Download }) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleDownload = async () => {
    if (!download.hasAccess) {
      toast.error("Subscribe to unlock this download");
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/downloads/${download.id}/record`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        // Open download URL
        window.open(data.data.fileUrl, "_blank");
        toast.success("Download started!");
      } else {
        toast.error(data.message || "Download failed");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className={!download.hasAccess ? "border-purple-300" : ""}>
      <CardHeader>
        <div className="flex items-start gap-4">
          {download.thumbnailUrl && (
            <img
              src={download.thumbnailUrl}
              alt={download.title}
              className="w-20 h-20 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{download.title}</CardTitle>
            {download.description && (
              <CardDescription>{download.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{download.fileType}</span>
            <span>•</span>
            <span>{formatFileSize(download.fileSize)}</span>
            <span>•</span>
            <span>{download.downloadCount} downloads</span>
          </div>
          <Button
            onClick={handleDownload}
            disabled={isDownloading || !download.hasAccess}
            className={download.hasAccess ? "bg-gradient-primary" : ""}
          >
            {isDownloading ? "Downloading..." : download.hasAccess ? "Download" : "🔒 Locked"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
