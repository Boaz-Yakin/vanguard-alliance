import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dealId, supplierName, supplierEmail, itemName, totalVolume } = body;

    if (!supplierEmail) {
      return NextResponse.json({ error: "Missing supplier email" }, { status: 400 });
    }

    // SIMULATED VENDOR DISPATCH LOGIC
    console.log("==================================================");
    console.log("🚀 VANGUARD DISPATCH INITIATED");
    console.log("==================================================");
    console.log(`📡 Target Vendor: ${supplierName} <${supplierEmail}>`);
    console.log(`📦 Deal ID      : ${dealId}`);
    console.log(`📝 Order Detail : ${itemName}`);
    console.log(`⚖️ Total Volume : ${totalVolume}`);
    console.log("--------------------------------------------------");
    console.log("✓ PDF Purchase Order Generated (Simulated)");
    console.log("✓ Email Transmitted via Edge Function (Simulated)");
    console.log("==================================================");

    // In the real Phase 3, this would use Resend/SendGrid and pdf-lib
    // e.g. await resend.emails.send({ to: supplierEmail, subject: "New B2B Order", ... })

    return NextResponse.json({ 
      success: true, 
      message: "Order dispatched to supplier successfully.",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("VANGUARD Dispatch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
