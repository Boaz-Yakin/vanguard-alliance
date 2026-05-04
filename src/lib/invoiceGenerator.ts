import { supabase } from "./supabaseClient";

interface InvoiceData {
  orderId: string;
  userId: string;
  date: string;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  taxId?: string;
  items: {
    name: string;
    qty: number;
    price: number;
    total: number;
  }[];
  grandTotal: number;
}

// Minimal transformation: only fallback if empty. 
// Otherwise, keep the exact string passed from the database.
const keepRaw = (str: string | undefined, fallback: string) => {
  if (!str || str.trim() === "") return fallback;
  return str;
};

export const generateAmazonInvoice = async (data: InvoiceData, download: boolean = false) => {
  if (typeof window === "undefined") return null;

  try {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- 1. Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("VANGUARD ALLIANCE", 20, 25);
    doc.setFontSize(12);
    doc.text("INVOICE", pageWidth - 20, 25, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Order ID: #${data.orderId.substring(0, 10)}`, pageWidth - 20, 31, { align: "right" });
    doc.text(`Date: ${data.date}`, pageWidth - 20, 36, { align: "right" });
    doc.line(20, 42, pageWidth - 20, 42);

    // --- 2. Information Section ---
    let y = 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("BILL TO / SHIP TO:", 20, y);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    // Name
    doc.setFont("helvetica", "bold");
    doc.text("Store Name:", 20, y + 7);
    doc.setFont("helvetica", "normal");
    doc.text(keepRaw(data.restaurantName, "Valued Member"), 50, y + 7);
    
    // Address
    doc.setFont("helvetica", "bold");
    doc.text("Address:", 20, y + 13);
    doc.setFont("helvetica", "normal");
    const addr = keepRaw(data.restaurantAddress, "Registered Business Address");
    doc.text(doc.splitTextToSize(addr, 130), 50, y + 13);
    
    // Phone & Tax ID
    y += 19;
    doc.setFont("helvetica", "bold");
    doc.text("Phone:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.restaurantPhone || "N/A", 50, y);
    
    doc.setFont("helvetica", "bold");
    doc.text("Tax ID:", 120, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.taxId || "Exempt", 140, y); // EXACT TAX ID

    // --- 3. Items Table ---
    y += 15;
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y, pageWidth - 40, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Description", 25, y + 6);
    doc.text("Qty", 120, y + 6);
    doc.text("Total", pageWidth - 25, y + 6, { align: "right" });

    doc.setFont("helvetica", "normal");
    y += 15;
    data.items.forEach(item => {
      // EXACT ITEM NAME FROM ADMIN
      doc.text(keepRaw(item.name, "Big Deal Item"), 25, y);
      doc.text(item.qty.toString(), 120, y);
      doc.text(`$${item.total.toFixed(2)}`, pageWidth - 25, y, { align: "right" });
      y += 8;
    });

    doc.line(20, y + 2, pageWidth - 20, y + 2);

    // --- 4. Totals ---
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("GRAND TOTAL:", pageWidth - 90, y);
    doc.text(`$${data.grandTotal.toFixed(2)}`, pageWidth - 25, y, { align: "right" });

    // --- Output ---
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    const fileName = `Invoice_${data.orderId.substring(0, 8)}.pdf`;
    
    // Trigger direct download if running on client and requested
    if (download) {
      doc.save(fileName);
    }

    const pdfBlob = doc.output("blob");
    supabase.storage.from("invoices").upload(`${data.userId}/${data.orderId}.pdf`, pdfBlob, { upsert: true });

    return { pdfBase64, fileName };
  } catch (err: any) {
    console.error("[PDF] Generation Error:", err);
    return null;
  }
};
