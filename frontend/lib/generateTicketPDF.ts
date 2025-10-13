import { jsPDF } from "jspdf";
import QRCode from "qrcode";

interface TicketData {
  ticketCode: string;
  event: {
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    virtualLink?: string;
    type: string;
    coverImage?: string;
  };
  user: {
    name: string;
    email: string;
  };
  host: {
    name: string;
    email: string;
  };
  isPaid: boolean;
  status: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export async function generateTicketPDF(ticketData: TicketData): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Generate QR Code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(ticketData.ticketCode, {
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  // Background gradient effect (using rectangles)
  pdf.setFillColor(147, 51, 234); // Purple
  pdf.rect(0, 0, pageWidth, 40, "F");

  pdf.setFillColor(59, 130, 246); // Blue
  pdf.rect(0, 40, pageWidth, 20, "F");

  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");
  pdf.text("EVENT TICKET", pageWidth / 2, 20, { align: "center" });

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("Fundify Platform", pageWidth / 2, 30, { align: "center" });

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // Event Information Section
  let yPos = 70;

  // Event Title
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  const eventTitle = pdf.splitTextToSize(ticketData.event.title, pageWidth - 40);
  pdf.text(eventTitle, pageWidth / 2, yPos, { align: "center" });
  yPos += eventTitle.length * 8 + 10;

  // Date & Time
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  const startDate = new Date(ticketData.event.startTime);
  const endDate = new Date(ticketData.event.endTime);

  pdf.setFont("helvetica", "bold");
  pdf.text("📅 Date & Time:", 20, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    20,
    yPos + 7
  );
  pdf.text(
    `${startDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${endDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    20,
    yPos + 14
  );
  yPos += 25;

  // Location
  pdf.setFont("helvetica", "bold");
  if (ticketData.event.type === "IN_PERSON" && ticketData.event.location) {
    pdf.text("📍 Location:", 20, yPos);
    pdf.setFont("helvetica", "normal");
    const locationText = pdf.splitTextToSize(
      ticketData.event.location,
      pageWidth - 40
    );
    pdf.text(locationText, 20, yPos + 7);
    yPos += locationText.length * 7 + 10;
  } else if (ticketData.event.type === "VIRTUAL") {
    pdf.text("💻 Virtual Event", 20, yPos);
    yPos += 10;
  } else if (ticketData.event.type === "HYBRID") {
    pdf.text("🌐 Hybrid Event", 20, yPos);
    pdf.setFont("helvetica", "normal");
    if (ticketData.event.location) {
      pdf.text(ticketData.event.location, 20, yPos + 7);
    }
    yPos += 15;
  }

  yPos += 5;

  // Divider line
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // Attendee Information
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("ATTENDEE INFORMATION", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Name:", 20, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(ticketData.user.name, 50, yPos);
  yPos += 7;

  pdf.setFont("helvetica", "bold");
  pdf.text("Email:", 20, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(ticketData.user.email, 50, yPos);
  yPos += 7;

  pdf.setFont("helvetica", "bold");
  pdf.text("Ticket Status:", 20, yPos);
  pdf.setFont("helvetica", "normal");

  // Status with color
  if (ticketData.isPaid) {
    pdf.setTextColor(34, 197, 94); // Green
    pdf.text("✓ PAID", 50, yPos);
  } else {
    pdf.setTextColor(59, 130, 246); // Blue
    pdf.text("✓ FREE", 50, yPos);
  }
  pdf.setTextColor(0, 0, 0);
  yPos += 10;

  // Divider line
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // Organizer Information
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("ORGANIZED BY", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Host:", 20, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(ticketData.host.name, 50, yPos);
  yPos += 7;

  pdf.setFont("helvetica", "bold");
  pdf.text("Contact:", 20, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(ticketData.host.email, 50, yPos);
  yPos += 15;

  // QR Code Section
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(147, 51, 234); // Purple
  pdf.text("SCAN TO CHECK-IN", pageWidth / 2, yPos, { align: "center" });
  pdf.setTextColor(0, 0, 0);
  yPos += 5;

  // Add QR Code (centered)
  const qrSize = 60;
  const qrX = (pageWidth - qrSize) / 2;
  pdf.addImage(qrCodeDataUrl, "PNG", qrX, yPos, qrSize, qrSize);
  yPos += qrSize + 5;

  // Ticket Code
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Ticket Code: ${ticketData.ticketCode}`, pageWidth / 2, yPos, {
    align: "center",
  });
  yPos += 10;

  // Check-in Status
  if (ticketData.checkedIn) {
    pdf.setFillColor(34, 197, 94, 0.1); // Light green background
    pdf.roundedRect(20, yPos, pageWidth - 40, 15, 3, 3, "F");

    pdf.setTextColor(34, 197, 94); // Green
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("✓ CHECKED IN", pageWidth / 2, yPos + 7, { align: "center" });

    if (ticketData.checkedInAt) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      const checkInDate = new Date(ticketData.checkedInAt);
      pdf.text(
        checkInDate.toLocaleString("en-US"),
        pageWidth / 2,
        yPos + 12,
        { align: "center" }
      );
    }
    yPos += 20;
  } else {
    pdf.setFillColor(59, 130, 246, 0.1); // Light blue background
    pdf.roundedRect(20, yPos, pageWidth - 40, 12, 3, 3, "F");

    pdf.setTextColor(59, 130, 246); // Blue
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("⏳ NOT CHECKED IN YET", pageWidth / 2, yPos + 8, {
      align: "center",
    });
    yPos += 17;
  }

  pdf.setTextColor(0, 0, 0);

  // Footer
  yPos = pageHeight - 30;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 7;

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    "This ticket is valid only for the person named above.",
    pageWidth / 2,
    yPos,
    { align: "center" }
  );
  yPos += 5;
  pdf.text(
    "Please present this QR code at the event entrance for check-in.",
    pageWidth / 2,
    yPos,
    { align: "center" }
  );
  yPos += 5;
  pdf.text(
    `Generated on ${new Date().toLocaleString("en-US")} via Fundify Platform`,
    pageWidth / 2,
    yPos,
    { align: "center" }
  );

  // Save the PDF
  const fileName = `Fundify_Ticket_${ticketData.event.title
    .replace(/[^a-z0-9]/gi, "_")
    .substring(0, 30)}_${ticketData.ticketCode.substring(0, 8)}.pdf`;

  pdf.save(fileName);
}
