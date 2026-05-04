import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    console.log("[API/Sheets] Received payload:", payload);
    console.log("[API/Sheets] Using webhook URL:", webhookUrl);
    
    // Server-side call avoids CORS issues
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain", 
      },
      body: JSON.stringify(payload),
    });

    const result = await response.text();
    console.log("[API/Sheets] Google response status:", response.status);
    console.log("[API/Sheets] Google response text:", result);

    return NextResponse.json({ success: true, googleResponse: result });
  } catch (error: any) {
    console.error("[API/Sheets] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
