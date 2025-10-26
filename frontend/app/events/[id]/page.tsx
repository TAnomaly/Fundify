"use client";

import { useState, useEffect, use } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, useScroll, useTransform } from "framer-motion";
import { isAuthenticated } from "@/lib/auth";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SocialShare from "@/components/SocialShare";
import EventPaymentModal from "@/components/EventPaymentModal";
import { Calendar, Clock, MapPin, Video, Users, Ticket, ArrowLeft, Share2, CheckCircle, HelpCircle, XCircle, Heart } from "lucide-react";

// Interfaces
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
    agenda?: any;
    tags: string[];
    host: EventHost;
    rsvpCount: number;
    userRsvpStatus?: "GOING" | "MAYBE" | "NOT_GOING";
    userRsvpIsPaid?: boolean;
}
interface RSVP { status: "GOING" | "MAYBE" | "NOT_GOING"; isPaid?: boolean; }

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRSVP, setUserRSVP] = useState<RSVP | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const { scrollY } = useScroll();
    const heroImageY = useTransform(scrollY, [0, 400], [0, -100]);
    const heroImageScale = useTransform(scrollY, [0, 400], [1, 1.1]);

    // Unwrap params Promise
    const resolvedParams = use(params);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        loadEvent();
    }, [resolvedParams.id]);

    const loadEvent = async () => {
        try {
            const token = isAuthenticated() ? localStorage.getItem("authToken") : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/events/${resolvedParams.id}`, { headers });

            if (response.data.success) {
                const raw = response.data.data;
                const host = raw.host ?? {};
                const normalized: Event = {
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
                    agenda: raw.agenda ?? undefined,
                    tags: raw.tags ?? [],
                    host: {
                        id: host.id ?? raw.host_id ?? "",
                        name: host.name ?? raw.host_name ?? raw.host_username ?? "Host",
                        username: host.username ?? raw.host_username ?? null,
                        avatar: host.avatar ?? raw.host_avatar ?? null,
                    },
                    rsvpCount: raw._count?.rsvps ?? raw.rsvp_count ?? 0,
                    userRsvpStatus: raw.userRsvpStatus,
                    userRsvpIsPaid: raw.userRsvpIsPaid,
                };
                setEvent(normalized);
                setUserRSVP(normalized.userRsvpStatus ? { status: normalized.userRsvpStatus, isPaid: normalized.userRsvpIsPaid || false } : null);
            } else {
                throw new Error("Event not found");
            }
        } catch (error) {
            toast.error("Failed to load event.");
            router.push("/explore");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRSVP = async (status: "GOING" | "MAYBE" | "NOT_GOING") => {
        if (!isAuthenticated() || !event) return toast.error("Please login to RSVP.");
        if (event.isPremium && event.price > 0 && status === "GOING" && !userRSVP?.isPaid) {
            setShowPaymentModal(true);
            return;
        }
        try {
            const token = localStorage.getItem("authToken");
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}/rsvp`, { status }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(status === "GOING" ? "You're going! 🎉" : status === "MAYBE" ? "Marked as maybe" : "RSVP cancelled");
            loadEvent();
        } catch (error) {
            toast.error("Failed to update RSVP.");
        }
    };

    const handlePaymentSuccess = () => {
        toast.success("Payment successful! You're going!");
        setShowPaymentModal(false);
        loadEvent();
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

    if (isLoading) return <EventSkeleton />;
    if (!event) return null;

    const isPastEvent = new Date(event.endTime) < new Date();
    const coverImageUrl = event.coverImage ? getFullMediaUrl(event.coverImage) ?? event.coverImage : null;
    const hostAvatarUrl = event.host.avatar ? getFullMediaUrl(event.host.avatar) ?? event.host.avatar : null;

    return (
        <div className="bg-background min-h-screen">
            {coverImageUrl && (
                <motion.div className="h-[50vh] min-h-[350px] w-full overflow-hidden relative" style={{ y: heroImageY }}>
                    <Image src={coverImageUrl} alt={event.title} fill className="object-cover" style={{ scale: heroImageScale }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                </motion.div>
            )}

            <main className="container mx-auto px-4 pb-12 -mt-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                    {/* Left Column: Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <BlurFade delay={0.25} inView>
                            <h1 className="text-5xl font-bold tracking-tight text-foreground">{event.title}</h1>
                            <div
                                className="mt-4 prose prose-lg dark:prose-invert max-w-none text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: event.description || "" }}
                            />
                        </BlurFade>

                        {event.agenda && (
                            <BlurFade delay={0.5} inView>
                                <div className="p-6 bg-muted/50 rounded-2xl border border-border/30">
                                    <h2 className="text-2xl font-bold mb-4">Agenda</h2>
                                    <div
                                        className="prose dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap"
                                        dangerouslySetInnerHTML={{ __html: event.agenda || "" }}
                                    />
                                </div>
                            </BlurFade>
                        )}

                        <BlurFade delay={0.75} inView>
                            <div className="p-6 bg-muted/50 rounded-2xl border border-border/30">
                                <h2 className="text-2xl font-bold mb-4">Location</h2>
                                <p className="text-muted-foreground mb-4">{event.location || "Virtual Event"}</p>
                                <div className="aspect-video bg-card rounded-lg overflow-hidden">
                                    <Image src="/map-placeholder.png" alt="Map" width={800} height={450} className="object-cover" />
                                </div>
                            </div>
                        </BlurFade>
                    </div>

                    {/* Right Column: Sticky Sidebar */}
                    <div className="lg:sticky top-24 space-y-6">
                        <BlurFade delay={0.5} inView>
                            <div className="p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    <div>
                                        <p className="font-semibold">{formatDate(event.startTime)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    <p className="font-semibold">{event.type === "VIRTUAL" ? "Online" : event.location}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-primary" />
                                    <p className="font-semibold">
                                        {event.rsvpCount || 0} going {event.maxAttendees ? `/ ${event.maxAttendees}` : ""}
                                    </p>
                                </div>
                            </div>
                        </BlurFade>

                        <BlurFade delay={0.65} inView>
                            <div className="p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30 space-y-4">
                                <Link href={`/creators/${event.host.id}`} className="flex items-center gap-3 group">
                                    {hostAvatarUrl ? (
                                        <Image src={hostAvatarUrl} alt={event.host.name} width={40} height={40} className="rounded-full bg-muted object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                            {(event.host.name || "H").charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-muted-foreground">Hosted by</p>
                                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                            {event.host.name}
                                        </p>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-2">
                                    <SocialShare
                                        url={typeof window !== "undefined" ? window.location.href : ""}
                                        title={event.title}
                                        trigger={<Button variant="outline" className="w-full"><Share2 className="w-4 h-4 mr-2" />Share</Button>}
                                    />
                                    <Button variant="outline" className="w-full"><Heart className="w-4 h-4 mr-2" />Follow</Button>
                                </div>
                            </div>
                        </BlurFade>

                        {!isPastEvent && (
                            <BlurFade delay={0.8} inView>
                                <div className="p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30 space-y-4">
                                    <p className="text-2xl font-bold text-center">{event.price > 0 ? `$${event.price}` : 'Free'}</p>
                                    {userRSVP?.status === 'GOING' ? (
                                        <div className="text-center space-y-2">
                                            <p className="font-semibold text-green-500 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> You are going!</p>
                                            {(event.price === 0 || userRSVP?.isPaid) && (
                                                <Button onClick={() => router.push(`/events/${event.id}/ticket`)} className="w-full">
                                                    <Ticket className="w-4 h-4 mr-2" />View Ticket
                                                </Button>
                                            )}
                                            <Button onClick={() => handleRSVP("NOT_GOING")} variant="link" className="text-xs text-muted-foreground">Cancel RSVP</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Button onClick={() => handleRSVP("GOING")} variant="gradient" size="lg" className="w-full">
                                                <Ticket className="w-5 h-5 mr-2" /> {event.price > 0 ? 'Get Tickets' : 'RSVP Now'}
                                            </Button>
                                            <Button onClick={() => handleRSVP("MAYBE")} variant="outline" className="w-full">Maybe</Button>
                                        </div>
                                    )}
                                </div>
                            </BlurFade>
                        )}
                    </div>
                </div>
            </main>

            {event && <EventPaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} eventId={event.id} eventTitle={event.title} eventPrice={event.price || 0} onSuccess={handlePaymentSuccess} />}
        </div>
    );
}

const EventSkeleton = () => (
    <div className="min-h-screen bg-background">
        <Skeleton className="h-[50vh] w-full" />
        <div className="container mx-auto px-4 pb-12 -mt-24 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <Skeleton className="h-16 w-3/4" />
                    <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="lg:sticky top-24 space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        </div>
    </div>
);
