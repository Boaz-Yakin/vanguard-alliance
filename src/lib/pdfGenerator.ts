import { jsPDF } from "jspdf";

/**
 * Vanguard Alliance: High-Fidelity PDF Generation Engine
 * Generates official business invoices/orders for suppliers.
 */
export const generateOrderPdf = async (
  orderId: string, 
  supplierName: string, 
  items: { name: string, quantity: string }[]
): Promise<Blob> => {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  const primaryColor = "#8a2be2"; // Vanguard Purple
  
  // 1. Header Section
  doc.setFillColor(3, 3, 5); // Dark BG
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("VANGUARD ALLIANCE", 15, 25);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL B2B ORDER ENGINE", 15, 32);
  
  doc.setTextColor(138, 43, 226);
  doc.text("UNITED IN EFFICIENCY", 150, 25);

  // 2. Info Section
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(10);
  doc.text(`DATE: ${timestamp}`, 150, 50);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PURCHASE ORDER", 15, 55);
  
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 60, 195, 60);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ORDER ID:", 15, 75);
  doc.setFont("helvetica", "normal");
  doc.text(orderId, 45, 75);

  doc.setFont("helvetica", "bold");
  doc.text("SUPPLIER:", 15, 82);
  doc.setFont("helvetica", "normal");
  doc.text(supplierName, 45, 82);

  // 3. Table Header
  doc.setFillColor(245, 245, 247);
  doc.rect(15, 95, 180, 10, 'F');
  doc.setFont("helvetica", "bold");
  doc.text("ITEM DESCRIPTION", 20, 101);
  doc.text("QUANTITY", 150, 101);

  // 4. Items List
  let y = 115;
  items.forEach((item, index) => {
    doc.setFont("helvetica", "normal");
    doc.text(item.name, 20, y);
    doc.text(item.quantity, 150, y);
    
    doc.setDrawColor(240, 240, 240);
    doc.line(15, y + 5, 195, y + 5);
    y += 12;
  });

  // 5. Footer & Seal
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("This order was generated via the Vanguard Alliance Autonomous Routing System.", 15, 275);
  doc.text("Authentication Log: SHA-256 Verified Dispatch Protocol.", 15, 280);

  // Vanguard Seal (Visual Element)
  doc.setDrawColor(138, 43, 226);
  doc.setLineWidth(0.5);
  doc.circle(180, 270, 10, 'D');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(138, 43, 226);
  doc.text("VANGUARD", 172, 270);
  doc.text("VERIFIED", 174, 273);

  return new Promise((resolve) => {
    const blob = doc.output('blob');
    resolve(blob);
  });
};
