"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MediaUpload from "@/components/MediaUpload";
import { isAuthenticated } from "@/lib/auth";
import { Calendar, Clock, MapPin, Users, Video, DollarSign, Tag } from "lucide-react";

type EventType = "VIRTUAL" | "IN_PERSON" | "HYBRID";
type EventStatus = "DRAFT" | "PUBLISHED";

export default function NewEventPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "VIRTUAL" as EventType,
    status: "PUBLISHED" as EventStatus,
    startTime: "",
    endTime: "",
    timezone: "UTC",
    location: "",
    virtualLink: "",
    maxAttendees: "",
    isPublic: true,
    isPremium: false,
    price: "0",
    agenda: "",
    tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      toast.error("Please login to create events");
      router.push("/login");
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error("Please enter event title");
      return;
    }

    if (!formData.startTime) {
      toast.error("Please select start date and time");
      return;
    }

    if (!formData.endTime) {
      toast.error("Please select end date and time");
      return;
    }

    if (formData.type === "VIRTUAL" && !formData.virtualLink.trim()) {
      toast.error("Please provide virtual meeting link");
      return;
    }

    if (formData.type === "IN_PERSON" && !formData.location.trim()) {
      toast.error("Please provide event location");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      // Parse tags
      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const eventData = {
        title: formData.title,
        description: formData.description,
        coverImage: coverImage || undefined,
        type: formData.type,
        status: formData.status,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        timezone: formData.timezone,
        location: formData.location || undefined,
        virtualLink: formData.virtualLink || undefined,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        isPublic: formData.isPublic,
        isPremium: formData.isPremium,
        price: parseFloat(formData.price) || 0,
        agenda: formData.agenda || undefined,
        tags: tagsArray,
      };

      console.log("Creating event:", eventData);

      const response = await axios.post(`${apiUrl}/events`, eventData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Event created:", response.data);

      toast.success(
        formData.status === "PUBLISHED" ? "Event published! 🎉" : "Event saved as draft"
      );
      router.push("/events");
    } catch (error: any) {
      console.error("Create event error:", error);
      toast.error(error.response?.data?.message || "Failed to create event");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (images: string[]) => {
    if (images.length > 0) {
      setCoverImage(images[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Back
          </Button>
          <h1 className="text-4xl font-bold mb-2">Create New Event 📅</h1>
          <p className="text-muted-foreground">
            Host virtual or in-person events for your community
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Basic Information</h2>

            {/* Title */}
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Live Q&A Session, Workshop, Meetup..."
                className="mt-2"
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your event, what attendees will learn or experience..."
                className="mt-2 min-h-[150px]"
                required
              />
            </div>

            {/* Cover Image */}
            <div>
              <Label>Cover Image</Label>
              <p className="text-sm text-gray-500 mb-3">
                Upload an eye-catching cover image for your event
              </p>
              <MediaUpload
                onImagesChange={handleImageUpload}
                onVideoChange={() => {}}
                maxImages={1}
                allowVideo={false}
                allowAttachments={false}
              />
              {coverImage && (
                <div className="mt-3">
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="rounded-lg max-h-48 object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Event Type & Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Event Details</h2>

            {/* Event Type */}
            <div>
              <Label htmlFor="type">Event Type *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as EventType })
                }
                className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="VIRTUAL">🌐 Virtual (Online)</option>
                <option value="IN_PERSON">📍 In-Person (Physical Location)</option>
                <option value="HYBRID">🔄 Hybrid (Both Online & In-Person)</option>
              </select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date & Time *
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  End Date & Time *
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
            </div>

            {/* Location / Virtual Link */}
            {(formData.type === "IN_PERSON" || formData.type === "HYBRID") && (
              <div>
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location {formData.type === "IN_PERSON" && "*"}
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="123 Main St, City, State, Country"
                  className="mt-2"
                  required={formData.type === "IN_PERSON"}
                />
              </div>
            )}

            {(formData.type === "VIRTUAL" || formData.type === "HYBRID") && (
              <div>
                <Label htmlFor="virtualLink" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Virtual Meeting Link {formData.type === "VIRTUAL" && "*"}
                </Label>
                <Input
                  id="virtualLink"
                  type="url"
                  value={formData.virtualLink}
                  onChange={(e) => setFormData({ ...formData, virtualLink: e.target.value })}
                  placeholder="https://zoom.us/j/123456789 or Google Meet link"
                  className="mt-2"
                  required={formData.type === "VIRTUAL"}
                />
              </div>
            )}

            {/* Max Attendees */}
            <div>
              <Label htmlFor="maxAttendees" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Maximum Attendees (Optional)
              </Label>
              <Input
                id="maxAttendees"
                type="number"
                value={formData.maxAttendees}
                onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                placeholder="Leave empty for unlimited"
                className="mt-2"
                min="1"
              />
            </div>

            {/* Agenda */}
            <div>
              <Label htmlFor="agenda">Event Agenda (Optional)</Label>
              <Textarea
                id="agenda"
                value={formData.agenda}
                onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                placeholder="10:00 - Welcome&#10;10:15 - Main Session&#10;11:00 - Q&A"
                className="mt-2 min-h-[100px] font-mono text-sm"
              />
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="tags" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags (Optional)
              </Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="workshop, webinar, networking (comma separated)"
                className="mt-2"
              />
            </div>
          </div>

          {/* Access & Pricing */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Access & Pricing</h2>

            {/* Public/Private */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="isPublic" className="cursor-pointer">
                Public Event (Anyone can see and join)
              </Label>
            </div>

            {/* Premium */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPremium"
                checked={formData.isPremium}
                onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="isPremium" className="cursor-pointer">
                Premium Event (Requires subscription)
              </Label>
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="price" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Ticket Price
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="mt-2"
                min="0"
                step="0.01"
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter 0 for free events
              </p>
            </div>
          </div>

          {/* Status & Submit */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Publish Settings</h2>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as EventStatus })
                }
                className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="DRAFT">📝 Save as Draft</option>
                <option value="PUBLISHED">🚀 Publish Now</option>
              </select>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isLoading ? "Creating..." : formData.status === "PUBLISHED" ? "Publish Event 🎉" : "Save Draft"}
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
          </div>
        </form>
      </div>
    </div>
  );
}

