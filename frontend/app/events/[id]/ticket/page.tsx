"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Download,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  Video,
  Share2,
  FileDown
} from "lucide-react";
import { generateTicketPDF } from "@/lib/generateTicketPDF";
import { getApiUrl } from "@/lib/config";

interface Ticket {
  id: string;
  ticketCode: string;
  status: string;
  checkedIn: boolean;
  checkedInAt?: string;
  isPaid: boolean;
  event: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    virtualLink?: string;
    type: string;
    coverImage?: string;
    host?: {
      name: string;
      email: string;
    };
  };
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function EventTicketPage() {
  const router = useRouter();
  const params = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadTicket();
  }, [params.id]);

  const loadTicket = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please login to view your ticket");
        router.push("/login");
        return;
      }

      const apiUrl = getApiUrl();
      const response = await axios.get(
        `${apiUrl}/events/${params.id}/ticket`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setTicket(response.data.data);
      }
    } catch (error: any) {
      console.error("Load ticket error:", error);
      toast.error(error.response?.data?.message || "Failed to load ticket");
      router.push(`/events/${params.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTicketPDF = async () => {
    if (!ticket) return;

    try {
      toast.loading("Generating PDF ticket...");

      // Prepare ticket data with host information
      const ticketData = {
        ticketCode: ticket.ticketCode,
        event: {
          title: ticket.event.title,
          startTime: ticket.event.startTime,
          endTime: ticket.event.endTime,
          location: ticket.event.location,
          virtualLink: ticket.event.virtualLink,
          type: ticket.event.type,
          coverImage: ticket.event.coverImage,
        },
        user: {
          name: ticket.user.name,
          email: ticket.user.email,
        },
        host: ticket.event.host || {
          name: "Event Organizer",
          email: "organizer@fundify.com",
        },
        isPaid: ticket.isPaid,
        status: ticket.status,
        checkedIn: ticket.checkedIn,
        checkedInAt: ticket.checkedInAt,
      };

      await generateTicketPDF(ticketData);
      toast.dismiss();
      toast.success("PDF ticket downloaded successfully!");
    } catch (error) {
      console.error("Download PDF error:", error);
      toast.dismiss();
      toast.error("Failed to generate PDF ticket");
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h1 className="text-3xl font-bold mb-4">Ticket Not Found</h1>
          <Button onClick={() => router.push(`/events/${params.id}`)}>
            Back to Event
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(`/events/${params.id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Button>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={downloadTicketPDF}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Ticket Card */}
        <Card className="overflow-hidden shadow-2xl">
          {/* Cover Image */}
          {ticket.event.coverImage && (
            <div
              className="h-48 bg-cover bg-center"
              style={{ backgroundImage: `url(${ticket.event.coverImage})` }}
            />
          )}

          <CardContent className="p-8">
            {/* Event Title */}
            <h1 className="text-3xl font-bold mb-6 text-center">
              {ticket.event.title}
            </h1>

            {/* QR Code */}
            <div className="bg-white p-6 rounded-xl shadow-inner mb-6 flex justify-center">
              <QRCodeSVG
                value={ticket.ticketCode}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Ticket Code */}
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mb-1">Ticket Code</p>
              <p className="text-xl font-mono font-bold">{ticket.ticketCode}</p>
            </div>

            {/* Check-in Status */}
            {ticket.checkedIn && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-semibold">
                  Checked In {ticket.checkedInAt && `on ${formatDate(ticket.checkedInAt)}`}
                </span>
              </div>
            )}

            {/* Event Details */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-purple-600 mt-1" />
                <div>
                  <p className="font-semibold">Date & Time</p>
                  <p className="text-muted-foreground">
                    {formatDate(ticket.event.startTime)}
                  </p>
                  <p className="text-muted-foreground">
                    {formatTime(ticket.event.startTime)} - {formatTime(ticket.event.endTime)}
                  </p>
                </div>
              </div>

              {ticket.event.type === "VIRTUAL" ? (
                <div className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-semibold">Virtual Event</p>
                    {ticket.event.virtualLink && (
                      <a
                        href={ticket.event.virtualLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Join Meeting
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                ticket.event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-600 mt-1" />
                    <div>
                      <p className="font-semibold">Location</p>
                      <p className="text-muted-foreground">{ticket.event.location}</p>
                    </div>
                  </div>
                )
              )}

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-600 mt-1" />
                <div>
                  <p className="font-semibold">Attendee</p>
                  <p className="text-muted-foreground">{ticket.user.name}</p>
                  <p className="text-sm text-muted-foreground">{ticket.user.email}</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>📱 At the event:</strong> Show this QR code at check-in. Event staff
                will scan it to admit you.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Keep this ticket safe. You&apos;ll need it to check in at the event.</p>
        </div>
      </div>
    </div>
  );
}
