"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";
import { getCurrentUser } from "@/lib/auth";

interface Event {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  type: "VIRTUAL" | "IN_PERSON" | "HYBRID";
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  startTime: string;
  endTime: string;
  location?: string;
  virtualLink?: string;
  maxAttendees?: number;
  price?: number;
  createdAt: string;
  _count?: {
    rsvps: number;
  };
}

export default function EventsManagement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 Loading my events...");

      const currentCreatorId = getCurrentUser()?.id;
      console.log("🔍 Current creator ID:", currentCreatorId);

      if (!currentCreatorId) {
        console.log("⚠️ No creator ID found, showing empty events list");
        setEvents([]);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://perfect-happiness-production.up.railway.app/api";
      const response = await authFetch(`${apiUrl}/events?hostId=${currentCreatorId}&status=PUBLISHED`);

      if (response.ok) {
        const data = await response.json();
        console.log("📡 Events response:", data);
        const eventsArray = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.events)
            ? data.data.events
            : [];
        setEvents(eventsArray);
      }
    } catch (error: any) {
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gradient">Events & Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">Schedule and manage your events</p>
        </div>
        <button
          onClick={() => router.push("/creator-dashboard/events/new")}
          className="px-6 py-3 bg-gradient-primary text-white rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Event
        </button>
      </div>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-glass-card rounded-2xl overflow-hidden shadow-soft hover:shadow-lg transition-shadow">
              {event.coverImage && (
                <img
                  src={event.coverImage}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.status === 'PUBLISHED' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    event.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                      event.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                    {event.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.type === 'VIRTUAL' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                    event.type === 'IN_PERSON' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                      'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300'
                    }`}>
                    {event.type}
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-2 line-clamp-2">{event.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                  {event.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(event.startTime)}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.location}
                    </div>
                  )}
                  {event._count && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {event._count.rsvps} attending
                      {event.maxAttendees && ` / ${event.maxAttendees} max`}
                    </div>
                  )}
                  {event.price !== undefined && event.price > 0 && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ${event.price.toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/creator-dashboard/events/${event.id}/edit`)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => window.open(`/events/${event.id}`, '_blank')}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-glass-card rounded-2xl p-12 text-center shadow-soft">
          <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-red-500 rounded-full mx-auto flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">No Events Scheduled</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first event to connect with your community through live sessions, workshops, or meetups.
          </p>
          <button
            onClick={() => router.push("/creator-dashboard/events/new")}
            className="px-8 py-4 bg-gradient-primary text-white rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            Schedule Your First Event
          </button>
        </div>
      )}
    </div>
  );
}
