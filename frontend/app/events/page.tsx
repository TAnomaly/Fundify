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

interface Event {
  id: string;
  title: string;
  description: string;
  type: "VIRTUAL" | "IN_PERSON" | "HYBRID";
  startTime: string;
  endTime: string;
  location?: string;
  virtualLink?: string;
  coverImage?: string;
  maxAttendees?: number;
  price: number;
  host: {
    name: string;
    avatar?: string;
  };
  _count: {
    rsvps: number;
  };
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filter === "upcoming") params.append("upcoming", "true");

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/events?${params.toString()}`
      );

      if (response.data.success) {
        setEvents(response.data.data.events);
      }
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Failed to load events");
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
        <div className="mb-8 flex gap-3">
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All Events
          </Button>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <Card className="shadow-xl">
            <CardContent className="p-12 text-center">
              <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">No Events Found</h3>
              <p className="text-muted-foreground">
                No events scheduled at the moment
              </p>
            </CardContent>
          </Card>
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
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm flex items-center gap-1 text-sm font-semibold">
                    {getEventTypeIcon(event.type)}
                    {event.type}
                  </div>
                </div>

                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {event.title}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {event.description}
                  </p>

                  {/* Date & Time */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-purple-600" />
                      <span>{formatDate(event.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>
                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm">
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
                          {event.host.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium">{event.host.name}</span>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{event._count.rsvps} going</span>
                    </div>
                  </div>

                  {/* Price */}
                  {event.price > 0 && (
                    <div className="mt-4 text-center">
                      <span className="text-2xl font-bold text-green-600">
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

