"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  type: "VIRTUAL" | "IN_PERSON" | "HYBRID";
  status: string;
  startTime: string;
  endTime: string;
  location?: string;
  virtualLink?: string;
  price?: number;
  _count?: {
    rsvps: number;
  };
}

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const imageSrc = getFullMediaUrl(event.coverImage) || "/placeholder.png";

  const getEventTypeBadge = () => {
    switch (event.type) {
      case "VIRTUAL":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">Virtual</Badge>;
      case "IN_PERSON":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">In-Person</Badge>;
      case "HYBRID":
        return <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300">Hybrid</Badge>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-card/50 dark:bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30 overflow-hidden h-full flex flex-col sm:flex-row group"
    >
      <div className="sm:w-1/3 relative h-48 sm:h-auto overflow-hidden">
        <Link href={`/events/${event.id}`} className="block w-full h-full">
            <Image
              src={imageSrc}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
        </Link>
      </div>

      <div className="p-5 flex flex-col flex-grow sm:w-2/3">
        <div className="flex items-center justify-between mb-2">
            {getEventTypeBadge()}
            {event.price !== undefined && event.price > 0 ? (
                <span className="font-bold text-primary">${event.price.toFixed(2)}</span>
            ) : (
                <Badge variant="outline">Free</Badge>
            )}
        </div>
        
        <Link href={`/events/${event.id}`} className="block">
          <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-2">
            {event.title}
          </h3>
        </Link>

        <div className="text-sm text-muted-foreground mt-2 space-y-2 flex-grow">
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0"/>
                <span>{new Date(event.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'})}</span>
            </div>
            {event.location && (
                 <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0"/>
                    <span className="line-clamp-1">{event.location}</span>
                </div>
            )}
        </div>

        <div className="mt-4 pt-4 border-t border-border/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4"/>
                <span>{event._count?.rsvps || 0} attending</span>
            </div>
            <Link href={`/events/${event.id}`}>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                    View Event <ArrowRight className="w-4 h-4 ml-1"/>
                </Button>
            </Link>
        </div>
      </div>
    </motion.div>
  );
}
