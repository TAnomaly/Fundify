"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, Plus, Trash2, Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export default function WelcomeMessagesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    content: "",
    tierId: "",
    delay: 0,
    isActive: true,
  });

  useEffect(() => {
    loadWelcomeMessages();
  }, []);

  const loadWelcomeMessages = async () => {
    setIsLoading(true);
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/welcome-messages`
      );

      const data = await response.json();
      if (data.success) {
        setMessages(data.data || []);
      }
    } catch (error) {
      toast.error("Failed to load welcome messages");
    } finally {
      setIsLoading(false);
    }
  };

  const createWelcomeMessage = async () => {
    if (!formData.subject || !formData.content) {
      toast.error("Subject and content are required");
      return;
    }

    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/welcome-messages`,
        {
          method: "POST",
          body: JSON.stringify({
            ...formData,
            tierId: formData.tierId || null,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Welcome message created!");
        setShowCreateModal(false);
        setFormData({
          subject: "",
          content: "",
          tierId: "",
          delay: 0,
          isActive: true,
        });
        loadWelcomeMessages();
      } else {
        toast.error(data.message || "Failed to create message");
      }
    } catch (error) {
      toast.error("Failed to create message");
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/welcome-messages/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({ isActive: !currentStatus }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(
          `Message ${!currentStatus ? "activated" : "deactivated"}`
        );
        loadWelcomeMessages();
      }
    } catch (error) {
      toast.error("Failed to update message");
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this welcome message?"))
      return;

    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/welcome-messages/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Welcome message deleted");
        loadWelcomeMessages();
      }
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gradient">
            Welcome Messages
          </h1>
          <p className="text-muted-foreground">
            Automatically welcome new subscribers
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Message
        </Button>
      </div>

      {/* Welcome Messages List */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card className="p-12 text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">
              No welcome messages yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create automated welcome messages for your new subscribers
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Message
            </Button>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">{message.subject}</h3>
                    {message.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        Inactive
                      </span>
                    )}
                    {message.tier ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        {message.tier.name}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        All Tiers
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-3 whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div>
                      Delay:{" "}
                      {message.delay === 0
                        ? "Send immediately"
                        : `${message.delay} minutes`}
                    </div>
                    <div>Sent: {message.sentCount} times</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggleActive(message.id, message.isActive)
                    }
                  >
                    {message.isActive ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMessage(message.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create Welcome Message</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Welcome to my page!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Message *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg h-32"
                  placeholder="Thank you for subscribing! Here's what you can expect..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tier (Optional)
                </label>
                <select
                  value={formData.tierId}
                  onChange={(e) =>
                    setFormData({ ...formData, tierId: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">All Tiers</option>
                  {/* Add your tiers here - you'll need to fetch them */}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to send to all new subscribers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Delay (minutes)
                </label>
                <input
                  type="number"
                  value={formData.delay}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      delay: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  min="0"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  0 = send immediately, or set minutes to delay
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm">
                  Active (start sending immediately)
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={createWelcomeMessage} className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  Create Message
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
