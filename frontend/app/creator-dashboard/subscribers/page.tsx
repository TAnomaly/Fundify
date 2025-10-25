"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, Search, Filter } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export default function SubscribersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showBulkMessage, setShowBulkMessage] = useState(false);
  const [bulkMessage, setBulkMessage] = useState({ subject: "", content: "" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadSubscribers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/subscribers?${params}`
      );

      const data = await response.json();
      if (data.success) {
        setSubscribers(data.data.subscribers || []);
      }
    } catch (error) {
      toast.error("Failed to load subscribers");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  const sendBulkMessage = async () => {
    if (!bulkMessage.subject || !bulkMessage.content) {
      toast.error("Subject and content are required");
      return;
    }

    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/bulk-message`,
        {
          method: "POST",
          body: JSON.stringify(bulkMessage),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setShowBulkMessage(false);
        setBulkMessage({ subject: "", content: "" });
      }
    } catch (error) {
      toast.error("Failed to send message");
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

      <h1 className="text-4xl font-bold mb-2 text-gradient">Subscribers</h1>
      <p className="text-muted-foreground mb-8">Manage your supporters</p>

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Button onClick={() => setShowBulkMessage(true)}>
          <Mail className="w-4 h-4 mr-2" />
          Send Bulk Message
        </Button>
      </div>

      {/* Subscribers List */}
      <Card className="p-6">
        {subscribers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No subscribers found
          </div>
        ) : (
          <div className="space-y-4">
            {subscribers.map((sub: any) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold">
                    {sub.subscriber.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{sub.subscriber.name}</p>
                    <p className="text-sm text-gray-600">{sub.subscriber.email}</p>
                    <p className="text-sm text-gray-500">
                      {sub.tier.name} - ${sub.tier.price}/{sub.tier.interval.toLowerCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sub.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : sub.status === "PAUSED"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {sub.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Since {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bulk Message Modal */}
      {showBulkMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-6 m-4">
            <h2 className="text-2xl font-bold mb-4">Send Bulk Message</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={bulkMessage.subject}
                  onChange={(e) =>
                    setBulkMessage({ ...bulkMessage, subject: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Message subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={bulkMessage.content}
                  onChange={(e) =>
                    setBulkMessage({ ...bulkMessage, content: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg h-32"
                  placeholder="Your message..."
                />
              </div>
              <div className="flex gap-4">
                <Button onClick={sendBulkMessage} className="flex-1">
                  Send Message
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkMessage(false)}
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
