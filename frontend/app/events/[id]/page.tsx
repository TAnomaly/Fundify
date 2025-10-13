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
    Clock,
    MapPin,
    Video,
    Users,
    DollarSign,
    ArrowLeft,
    Share2,
    Tag as TagIcon,
    CheckCircle,
    XCircle,
    HelpCircle,
} from "lucide-react";
import SocialShare from "@/components/SocialShare";
import EventPaymentModal from "@/components/EventPaymentModal";

interface Event {
    id: string;
    title: string;
    description: string;
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
    agenda?: string;
    tags: string[];
    host: {
        id: string;
        name: string;
        avatar?: string;
    };
    _count: {
        rsvps: number;
    };
}

interface RSVP {
    status: "GOING" | "MAYBE" | "NOT_GOING";
    isPaid?: boolean;
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRSVP, setUserRSVP] = useState<RSVP | null>(null);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        loadEvent();
    }, [params.id]);

    const loadEvent = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

            // Make request with auth token if user is authenticated
            const token = isAuthenticated() ? localStorage.getItem("authToken") : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.get(`${apiUrl}/events/${params.id}`, { headers });

            if (response.data.success) {
                const eventData = response.data.data;
                setEvent(eventData);

                // Set user's RSVP status from the event response
                if (eventData.userRSVPStatus) {
                    setUserRSVP({
                        status: eventData.userRSVPStatus,
                        isPaid: eventData.userRSVPIsPaid || false
                    });
                } else {
                    setUserRSVP(null);
                }
            }
        } catch (error: any) {
            console.error("Load event error:", error);
            toast.error("Failed to load event");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRSVP = async (status: "GOING" | "MAYBE" | "NOT_GOING") => {
        if (!isAuthenticated()) {
            toast.error("Please login to RSVP");
            router.push("/login");
            return;
        }

        if (!event) return;

        // If event is premium and user is trying to RSVP as GOING, show payment modal
        if (event.isPremium && event.price > 0 && status === "GOING") {
            // Check if user already paid
            if (userRSVP?.isPaid) {
                toast.success("You've already purchased a ticket for this event");
                return;
            }
            setShowPaymentModal(true);
            return;
        }

        // For free events or non-GOING status, proceed with regular RSVP
        try {
            const token = localStorage.getItem("authToken");
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

            await axios.post(
                `${apiUrl}/events/${event.id}/rsvp`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setUserRSVP({ status });
            toast.success(
                status === "GOING"
                    ? "You're going! 🎉"
                    : status === "MAYBE"
                        ? "Marked as maybe"
                        : "RSVP cancelled"
            );
            loadEvent();
        } catch (error: any) {
            console.error("RSVP error:", error);
            toast.error(error.response?.data?.message || "Failed to update RSVP");
        }
    };

    const handlePaymentSuccess = () => {
        setUserRSVP({ status: "GOING", isPaid: true });
        loadEvent();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
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
                return <Video className="w-5 h-5" />;
            case "IN_PERSON":
                return <MapPin className="w-5 h-5" />;
            case "HYBRID":
                return <Users className="w-5 h-5" />;
            default:
                return <CalendarIcon className="w-5 h-5" />;
        }
    };

    const getEventTypeLabel = (type: string) => {
        return type === "VIRTUAL"
            ? "Virtual Event"
            : type === "IN_PERSON"
                ? "In-Person Event"
                : "Hybrid Event";
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12">
                <div className="max-w-5xl mx-auto px-4">
                    <Skeleton className="h-12 w-32 mb-8" />
                    <Skeleton className="h-96 w-full mb-8" />
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
                    <Button onClick={() => router.push("/events")}>← Back to Events</Button>
                </div>
            </div>
        );
    }

    const isPastEvent = new Date(event.endTime) < new Date();

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
            {/* Cover Image */}
            {event.coverImage && (
                <div
                    className="h-96 bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${event.coverImage})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-4 py-8">
                <Button variant="outline" onClick={() => router.back()} className="mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Event Header */}
                        <Card>
                            <CardContent className="p-8">
                                <div className="flex items-center gap-2 mb-4">
                                    {getEventTypeIcon(event.type)}
                                    <span className="text-sm font-semibold text-purple-600">
                                        {getEventTypeLabel(event.type)}
                                    </span>
                                    {event.price > 0 && (
                                        <span className="ml-auto text-2xl font-bold text-purple-600">
                                            ${event.price}
                                        </span>
                                    )}
                                    {event.price === 0 && (
                                        <span className="ml-auto text-lg font-semibold text-green-600">FREE</span>
                                    )}
                                </div>

                                <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                                    {event.title}
                                </h1>

                                {/* Host Info */}
                                <div className="flex items-center gap-3 mb-6">
                                    {event.host.avatar ? (
                                        <img
                                            src={event.host.avatar}
                                            alt={event.host.name}
                                            className="w-12 h-12 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg">
                                            {event.host.name[0]}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Hosted by</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {event.host.name}
                                        </p>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-gray-700 dark:text-gray-300 text-lg whitespace-pre-line">
                                    {event.description}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Agenda */}
                        {event.agenda && (
                            <Card>
                                <CardContent className="p-8">
                                    <h2 className="text-2xl font-bold mb-4">Event Agenda</h2>
                                    <pre className="text-gray-700 dark:text-gray-300 whitespace-pre-line font-sans">
                                        {event.agenda}
                                    </pre>
                                </CardContent>
                            </Card>
                        )}

                        {/* Tags */}
                        {event.tags.length > 0 && (
                            <Card>
                                <CardContent className="p-8">
                                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                        <TagIcon className="w-5 h-5" />
                                        Tags
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {event.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Event Details Card */}
                        <Card className="sticky top-4">
                            <CardContent className="p-6 space-y-4">
                                {/* Date & Time */}
                                <div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                        <CalendarIcon className="w-5 h-5" />
                                        <span className="font-semibold">Date & Time</span>
                                    </div>
                                    <p className="text-gray-900 dark:text-white ml-7">
                                        {formatDate(event.startTime)}
                                    </p>
                                    <p className="text-gray-700 dark:text-gray-300 ml-7">
                                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                    </p>
                                </div>

                                {/* Location */}
                                {(event.type === "IN_PERSON" || event.type === "HYBRID") && event.location && (
                                    <div>
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                            <MapPin className="w-5 h-5" />
                                            <span className="font-semibold">Location</span>
                                        </div>
                                        <p className="text-gray-900 dark:text-white ml-7">{event.location}</p>
                                    </div>
                                )}

                                {/* Virtual Link */}
                                {(event.type === "VIRTUAL" || event.type === "HYBRID") && event.virtualLink && (
                                    <div>
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                            <Video className="w-5 h-5" />
                                            <span className="font-semibold">Virtual Link</span>
                                        </div>
                                        <a
                                            href={event.virtualLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:underline ml-7 block break-all"
                                        >
                                            Join Meeting
                                        </a>
                                    </div>
                                )}

                                {/* Attendees */}
                                <div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                        <Users className="w-5 h-5" />
                                        <span className="font-semibold">Attendees</span>
                                    </div>
                                    <p className="text-gray-900 dark:text-white ml-7">
                                        {event._count.rsvps} going
                                        {event.maxAttendees && ` / ${event.maxAttendees} max`}
                                    </p>
                                </div>

                                {/* RSVP Buttons */}
                                {!isPastEvent && (
                                    <div className="space-y-2 pt-4 border-t">
                                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            Are you attending?
                                        </p>
                                        <Button
                                            onClick={() => handleRSVP("GOING")}
                                            className={`w-full ${userRSVP?.status === "GOING"
                                                    ? "bg-green-600 hover:bg-green-700"
                                                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                                }`}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            {userRSVP?.status === "GOING" ? "You're Going! ✓" : "I'm Going"}
                                        </Button>
                                        <Button
                                            onClick={() => handleRSVP("MAYBE")}
                                            variant="outline"
                                            className={`w-full ${userRSVP?.status === "MAYBE" ? "border-yellow-500 text-yellow-600" : ""
                                                }`}
                                        >
                                            <HelpCircle className="w-4 h-4 mr-2" />
                                            {userRSVP?.status === "MAYBE" ? "Marked as Maybe" : "Maybe"}
                                        </Button>
                                        {userRSVP?.status === "GOING" && (
                                            <Button
                                                onClick={() => router.push(`/events/${event.id}/ticket`)}
                                                variant="outline"
                                                className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
                                            >
                                                🎟️ View My Ticket
                                            </Button>
                                        )}
                                        {userRSVP && (
                                            <Button
                                                onClick={() => handleRSVP("NOT_GOING")}
                                                variant="outline"
                                                className="w-full text-red-600 border-red-300"
                                            >
                                                <XCircle className="w-4 h-4 mr-2" />
                                                Cancel RSVP
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {isPastEvent && (
                                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                        <p className="text-gray-600 dark:text-gray-400">This event has ended</p>
                                    </div>
                                )}

                                {/* Share */}
                                <div className="pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setShowShareMenu(!showShareMenu)}
                                    >
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Share Event
                                    </Button>
                                    {showShareMenu && (
                                        <div className="mt-3">
                                            <SocialShare
                                                url={typeof window !== "undefined" ? window.location.href : ""}
                                                title={event.title}
                                                description={event.description}
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {event && (
                <EventPaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    eventId={event.id}
                    eventTitle={event.title}
                    eventPrice={event.price}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}

