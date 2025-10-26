"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAuthenticated } from "@/lib/auth";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Calendar as CalendarIcon,
  MapPin,
  Video,
  Users,
  Clock,
  Plus,
  Filter,
} from "lucide-react";

interface EventHost {
  id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  type: "VIRTUAL" | "IN_PERSON" | "HYBRID";
  status: string;
  startTime: string;
  endTime: string;
  location?: string;
  virtualLink?: string;
  coverImage?: string;
  maxAttendees?: number;
  price: number;
  isPremium: boolean;
  host: EventHost;
  rsvpCount: number;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filter === "upcoming") params.append("upcoming", "true");
      if (filter === "past") params.append("past", "true");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      console.log('Events API URL:', apiUrl);
      const response = await axios.get(`${apiUrl}/events?${params.toString()}`);
      console.log('Events API Response:', response.data);

      if (response.data.success) {
        const normalized: Event[] = (response.data.data || []).map((raw: any) => {
          const host = raw.host ?? {};
          const hostName = host.name ?? raw.host_name ?? raw.host_username ?? "Host";
          return {
            id: raw.id,
            title: raw.title,
            description: raw.description ?? "",
            type: (raw.type || raw.event_type || "VIRTUAL") as Event["type"],
            status: raw.status ?? "PUBLISHED",
            startTime: raw.start_time ?? raw.startTime,
            endTime: raw.end_time ?? raw.endTime ?? raw.start_time,
            location: raw.location ?? undefined,
            virtualLink: raw.virtual_link ?? undefined,
            coverImage: raw.cover_image ?? undefined,
            maxAttendees: raw.max_attendees ?? undefined,
            price: typeof raw.price === "number" ? raw.price : Number(raw.price ?? 0),
            isPremium: Boolean(raw.is_premium ?? raw.isPremium),
            host: {
              id: host.id ?? raw.host_id ?? "",
              name: hostName,
              username: host.username ?? raw.host_username ?? null,
              avatar: host.avatar ?? raw.host_avatar ?? null,
            },
            rsvpCount: raw._count?.rsvps ?? raw.rsvp_count ?? 0,
          };
        });
        setEvents(normalized);
      } else {
        console.log('Events API failed:', response.data);
        setEvents([]);
      }
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Failed to load events");
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "VIRTUAL":
        return <Video className="w-4 h-4" />;
      case "IN_PERSON":
        return <MapPin className="w-4 h-4" />;
      case "HYBRID":
        return <Users className="w-4 h-4" />;
      default:
        return <CalendarIcon className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-sm font-semibold">Creator Events</span>
            </div>

            <h1 className="text-5xl font-bold mb-4">
              Join Amazing <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
                Creative Events
              </span>
            </h1>

            <p className="text-xl text-white/90 mb-6">
              Connect with creators through workshops, Q&As, and meetups
            </p>

            {isAuthenticated() && (
              <Button
                onClick={() => router.push("/events/new")}
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Filters */}
        <div className="flex gap-4 mb-8">
          {[
            { key: "upcoming", label: "Upcoming" },
            { key: "all", label: "All Events" },
            { key: "past", label: "Past" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${filter === tab.key
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="text-center py-20">
            <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Events Found</h3>
            <p className="text-gray-500 mb-6">
              {filter === "upcoming"
                ? "No upcoming events at the moment."
                : filter === "past"
                  ? "No past events to show."
                  : "Be the first to create an event!"}
            </p>
            {isAuthenticated() && (
              <Button
                onClick={() => router.push("/events/new")}
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card
                key={event.id}
                className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                onClick={() => router.push(`/events/${event.id}`)}
              >
                {/* Cover */}
                <div className="relative h-40 bg-gradient-to-br from-indigo-400 to-purple-400">
                  {event.coverImage && (
                    <img
                      src={event.coverImage}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {getEventTypeIcon(event.type)}
                    {event.type}
                  </div>
                </div>

                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors text-gray-900 dark:text-gray-100">
                    {event.title}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 text-gray-600 dark:text-gray-300">
                    {event.description}
                  </p>

                  {/* Date & Time */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CalendarIcon className="w-4 h-4 text-purple-600" />
                      <span>{formatDate(event.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>
                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Host & Stats */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      {event.host.avatar ? (
                        <img
                          src={event.host.avatar}
                          alt={event.host.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                          {(event.host.name || "H").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {event.host.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{event.rsvpCount} going</span>
                    </div>
                  </div>

                  {/* Price */}
                  {event.price > 0 && (
                    <div className="mt-4 text-center">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${event.price}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
