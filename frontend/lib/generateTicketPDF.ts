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

  // Generate high-quality QR Code
  const qrCodeDataUrl = await QRCode.toDataURL(ticketData.ticketCode, {
    width: 500,
    margin: 1,
    color: {
      dark: "#1a1a1a",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });

  // ==================== STUNNING HEADER ====================
  // Gradient background
  const gradientSteps = 15;
  for (let i = 0; i < gradientSteps; i++) {
    const purple = 147 - (i * 10);
    const blue = 51 + (i * 20);
    const alpha = 1 - (i * 0.03);
    pdf.setFillColor(purple, blue, 234);
    pdf.setGState(pdf.GState({ opacity: alpha }));
    pdf.rect(0, i * 3, pageWidth, 4, "F");
  }
  pdf.setGState(pdf.GState({ opacity: 1 }));

  // Decorative accents
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.15 }));
  pdf.circle(pageWidth - 15, 15, 30, "F");
  pdf.circle(15, 15, 25, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  // Title with shadow
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(30);
  pdf.setFont("helvetica", "bold");
  pdf.text("EVENT TICKET", pageWidth / 2 + 0.5, 21.5, { align: "center" });
  pdf.setTextColor(255, 255, 255);
  pdf.text("EVENT TICKET", pageWidth / 2, 21, { align: "center" });

  // Subtitle
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("Your Digital Pass • Powered by Fundify", pageWidth / 2, 29, { align: "center" });

  // Ticket ID
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.25 }));
  pdf.roundedRect(pageWidth / 2 - 35, 34, 70, 8, 2, 2, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));
  pdf.setFontSize(8);
  pdf.text(`TICKET #${ticketData.ticketCode.substring(0, 12).toUpperCase()}`, pageWidth / 2, 39, { align: "center" });

  // ==================== STATUS BADGE ====================
  let yPos = 55;
  if (ticketData.isPaid) {
    pdf.setFillColor(34, 197, 94);
  } else {
    pdf.setFillColor(59, 130, 246);
  }
  pdf.roundedRect(pageWidth - 40, yPos - 5, 30, 10, 2, 2, "F");
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text(ticketData.isPaid ? "PREMIUM" : "FREE", pageWidth - 25, yPos, { align: "center" });

  // ==================== EVENT TITLE ====================
  yPos = 65;
  pdf.setTextColor(147, 51, 234);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  const eventTitle = pdf.splitTextToSize(ticketData.event.title, pageWidth - 40);
  pdf.text(eventTitle, pageWidth / 2, yPos, { align: "center" });
  yPos += eventTitle.length * 9;

  // Decorative line
  pdf.setDrawColor(147, 51, 234);
  pdf.setLineWidth(1.5);
  pdf.line(pageWidth / 2 - 30, yPos, pageWidth / 2 + 30, yPos);
  yPos += 12;

  pdf.setTextColor(40, 40, 40);

  // ==================== DATE & TIME BOX ====================
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(20, yPos, pageWidth - 40, 30, 4, 4, "F");

  // Icon circle (no emoji)
  pdf.setFillColor(147, 51, 234);
  pdf.circle(30, yPos + 15, 6, "F");

  const startDate = new Date(ticketData.event.startTime);
  const endDate = new Date(ticketData.event.endTime);

  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Date & Time", 42, yPos + 10);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(75, 85, 99);
  pdf.text(startDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }), 42, yPos + 17);

  pdf.text(`${startDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${endDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`, 42, yPos + 24);

  yPos += 37;

  // ==================== LOCATION BOX ====================
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(20, yPos, pageWidth - 40, 24, 4, 4, "F");

  // Icon circle
  pdf.setFillColor(59, 130, 246);
  pdf.circle(30, yPos + 12, 6, "F");

  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(ticketData.event.type === "VIRTUAL" ? "Virtual Event" :
           ticketData.event.type === "HYBRID" ? "Hybrid Event" : "Location", 42, yPos + 10);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(75, 85, 99);
  const locationText = ticketData.event.location || "Join online via virtual link";
  const wrappedLocation = pdf.splitTextToSize(locationText, pageWidth - 64);
  pdf.text(wrappedLocation, 42, yPos + 17);

  yPos += 32;

  // ==================== DIVIDER ====================
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;

  // ==================== ATTENDEE & ORGANIZER ====================
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(147, 51, 234);
  pdf.text("ATTENDEE DETAILS", 20, yPos);
  yPos += 10;

  // Attendee box
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(20, yPos, (pageWidth - 50) / 2, 28, 4, 4, "F");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "normal");
  pdf.text("Full Name", 27, yPos + 7);
  pdf.setFontSize(11);
  pdf.setTextColor(40, 40, 40);
  pdf.setFont("helvetica", "bold");
  const userName = pdf.splitTextToSize(ticketData.user.name, ((pageWidth - 50) / 2) - 14);
  pdf.text(userName, 27, yPos + 13);
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "normal");
  pdf.text("Email", 27, yPos + 20);
  pdf.setFontSize(9);
  pdf.setTextColor(40, 40, 40);
  const userEmail = pdf.splitTextToSize(ticketData.user.email, ((pageWidth - 50) / 2) - 14);
  pdf.text(userEmail, 27, yPos + 25);

  // Organizer box
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect((pageWidth / 2) + 5, yPos, (pageWidth - 50) / 2, 28, 4, 4, "F");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "normal");
  pdf.text("Organized By", (pageWidth / 2) + 12, yPos + 7);
  pdf.setFontSize(11);
  pdf.setTextColor(40, 40, 40);
  pdf.setFont("helvetica", "bold");
  const hostName = pdf.splitTextToSize(ticketData.host.name, ((pageWidth - 50) / 2) - 14);
  pdf.text(hostName, (pageWidth / 2) + 12, yPos + 13);
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "normal");
  pdf.text("Contact", (pageWidth / 2) + 12, yPos + 20);
  pdf.setFontSize(9);
  pdf.setTextColor(40, 40, 40);
  const hostEmail = pdf.splitTextToSize(ticketData.host.email, ((pageWidth - 50) / 2) - 14);
  pdf.text(hostEmail, (pageWidth / 2) + 12, yPos + 25);

  yPos += 36;

  // ==================== QR CODE ====================
  pdf.setLineDash([2, 2]);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  pdf.setLineDash([]);
  yPos += 12;

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(147, 51, 234);
  pdf.text("CHECK-IN QR CODE", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  const qrSize = 70;
  const qrX = (pageWidth - qrSize) / 2;

  // QR shadow & border
  pdf.setFillColor(0, 0, 0);
  pdf.setGState(pdf.GState({ opacity: 0.1 }));
  pdf.roundedRect(qrX + 2, yPos + 2, qrSize, qrSize, 4, 4, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(qrX - 3, yPos - 3, qrSize + 6, qrSize + 6, 5, 5, "F");
  pdf.addImage(qrCodeDataUrl, "PNG", qrX, yPos, qrSize, qrSize);
  yPos += qrSize + 8;

  // Ticket code text below QR
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(107, 114, 128);
  pdf.text(`CODE: ${ticketData.ticketCode.toUpperCase()}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // ==================== CHECK-IN STATUS ====================
  if (ticketData.checkedIn) {
    pdf.setFillColor(236, 253, 245);
    pdf.setDrawColor(167, 243, 208);
    pdf.setLineWidth(1);
    pdf.roundedRect(30, yPos, pageWidth - 60, 18, 4, 4, "FD");
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(22, 163, 74);
    pdf.text("CHECKED IN", pageWidth / 2, yPos + 9, { align: "center" });
    if (ticketData.checkedInAt) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(75, 85, 99);
      pdf.text(`on ${new Date(ticketData.checkedInAt).toLocaleString("en-US")}`, pageWidth / 2, yPos + 15, { align: "center" });
    }
    yPos += 23;
  } else {
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.setLineWidth(1);
    pdf.roundedRect(30, yPos, pageWidth - 60, 15, 4, 4, "FD");
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(59, 130, 246);
    pdf.text("AWAITING CHECK-IN", pageWidth / 2, yPos + 10, { align: "center" });
    yPos += 20;
  }

  // ==================== INSTRUCTIONS ====================
  pdf.setFillColor(254, 252, 232);
  pdf.roundedRect(20, yPos, pageWidth - 40, 22, 4, 4, "F");
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(161, 98, 7);
  pdf.text("How to Use This Ticket:", 27, yPos + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 80, 20);
  const instructions = pdf.splitTextToSize("Show this QR code at event entrance. Staff will scan it to check you in. Keep this ticket on your device or print it.", pageWidth - 54);
  pdf.text(instructions, 27, yPos + 14);

  // ==================== FOOTER ====================
  yPos = pageHeight - 22;
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 5;

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(156, 163, 175);
  pdf.text("Non-transferable. Valid only for person named above.", pageWidth / 2, yPos, { align: "center" });
  yPos += 4;
  pdf.text(`Generated on ${new Date().toLocaleDateString("en-US")} at ${new Date().toLocaleTimeString("en-US")}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 4;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(147, 51, 234);
  pdf.text("Powered by Fundify", pageWidth / 2, yPos, { align: "center" });

  const fileName = `Fundify_Ticket_${ticketData.event.title.replace(/[^a-z0-9]/gi, "_").substring(0, 30)}.pdf`;
  pdf.save(fileName);
}
