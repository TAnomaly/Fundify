"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Html5QrcodeScanner } from "html5-qrcode";
import axios from "axios";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  Users,
  Search,
  Calendar,
  TrendingUp,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  startTime: string;
  hostId: string;
}

interface Attendee {
  id: string;
  ticketCode: string;
  status: string;
  checkedIn: boolean;
  checkedInAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function EventCheckInPage() {
  const router = useRouter();
  const params = useParams();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    pending: 0,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadEventAndAttendees();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [params.id]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (scannerActive && !scannerRef.current) {
      initScanner();
    }
  }, [scannerActive]);

  const loadEventAndAttendees = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please login to access check-in");
        router.push("/login");
        return;
      }

      // Load event details
      const eventResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/events/${params.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (eventResponse.data.success) {
        const eventData = eventResponse.data.data;
        setEvent(eventData);

        // Check if user is the host
        const userId = localStorage.getItem("userId");
        if (eventData.hostId !== userId) {
          toast.error("Only event host can access check-in");
          router.push(`/events/${params.id}`);
          return;
        }
      }

      // Load attendees
      const attendeesResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/events/${params.id}/rsvps`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (attendeesResponse.data.success) {
        const attendeeList = attendeesResponse.data.data;
        setAttendees(attendeeList);

        // Calculate stats
        const total = attendeeList.length;
        const checkedIn = attendeeList.filter((a: Attendee) => a.checkedIn).length;
        setStats({
          total,
          checkedIn,
          pending: total - checkedIn,
        });
      }
    } catch (error: any) {
      console.error("Load error:", error);
      toast.error("Failed to load event data");
    } finally {
      setIsLoading(false);
    }
  };

  const initScanner = () => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );

    scanner.render(onScanSuccess, onScanError);
    scannerRef.current = scanner;
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log("Scanned:", decodedText);
    await checkInAttendee(decodedText);
  };

  const onScanError = (error: any) => {
    // Ignore scanning errors (normal when no QR in view)
  };

  const checkInAttendee = async (ticketCode: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/events/checkin`,
        { ticketCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        if (response.data.alreadyCheckedIn) {
          toast.error(`${response.data.data.user.name} is already checked in!`);
        } else {
          toast.success(`✅ ${response.data.data.user.name} checked in!`);
        }

        // Reload attendees
        loadEventAndAttendees();
      }
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error(error.response?.data?.message || "Check-in failed");
    }
  };

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) {
      toast.error("Please enter a ticket code");
      return;
    }
    checkInAttendee(manualCode.trim());
    setManualCode("");
  };

  const toggleScanner = () => {
    if (scannerActive && scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScannerActive(!scannerActive);
  };

  const filteredAttendees = attendees.filter((a) =>
    a.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.ticketCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
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

          <h1 className="text-2xl font-bold">Event Check-In</h1>
        </div>

        {/* Event Info */}
        {event && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-2">{event.title}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {new Date(event.startTime).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total RSVPs</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Checked In</p>
                  <p className="text-3xl font-bold text-green-600">{stats.checkedIn}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                QR Code Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={toggleScanner}
                className="w-full"
                variant={scannerActive ? "destructive" : "default"}
              >
                {scannerActive ? "Stop Scanner" : "Start Scanner"}
              </Button>

              {scannerActive && (
                <div id="qr-reader" className="w-full"></div>
              )}

              {/* Manual Input */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-2">Manual Check-In</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter ticket code..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleManualCheckIn()}
                  />
                  <Button onClick={handleManualCheckIn}>Check In</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendee List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Attendee List ({filteredAttendees.length})
              </CardTitle>
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search attendees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              <div className="space-y-3">
                {filteredAttendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className={`p-4 rounded-lg border ${
                      attendee.checkedIn
                        ? "bg-green-50 border-green-200"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {attendee.user.avatar ? (
                          <img
                            src={attendee.user.avatar}
                            alt={attendee.user.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {attendee.user.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{attendee.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {attendee.user.email}
                          </p>
                        </div>
                      </div>

                      {attendee.checkedIn ? (
                        <Badge className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Checked In
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>

                    {attendee.checkedIn && attendee.checkedInAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Checked in at {new Date(attendee.checkedInAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                ))}

                {filteredAttendees.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? "No attendees found" : "No RSVPs yet"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
