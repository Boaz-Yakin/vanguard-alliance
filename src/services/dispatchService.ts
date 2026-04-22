/**
 * Generic Dispatch Engine
 * Handles splitting orders and routing to different channels (Email, SMS, etc.)
 */

export interface DispatchRecipient {
  name: string;
  email?: string;
  phone?: string;
  preferredChannel: 'email' | 'sms' | 'whatsapp';
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vendorId: string;
}

export interface DispatchResult {
  success: boolean;
  channel: string;
  recipient: string;
  timestamp: string;
  message?: string;
}

export class DispatchService {
  /**
   * Core logic: Split a multi-vendor cart into separate orders
   */
  static splitOrderByVendor(items: OrderItem[]): Record<string, OrderItem[]> {
    return items.reduce((acc, item) => {
      if (!acc[item.vendorId]) {
        acc[item.vendorId] = [];
      }
      acc[item.vendorId].push(item);
      return acc;
    }, {} as Record<string, OrderItem[]>);
  }

  /**
   * Generic Dispatch Router
   * In a real implementation, this would call specific adapters.
   */
  static async dispatch(
    recipient: DispatchRecipient,
    content: { subject: string; body: string; attachments?: any[] }
  ): Promise<DispatchResult> {
    const { preferredChannel, email, phone, name } = recipient;

    console.log(`[DispatchService] Routing to ${preferredChannel} for ${name}`);

    // Mocking the channel adapters
    switch (preferredChannel) {
      case 'email':
        if (!email) throw new Error("Email address missing for email channel");
        return await this.sendEmail(email, content);
      case 'sms':
        if (!phone) throw new Error("Phone number missing for SMS channel");
        return await this.sendSMS(phone, content.body);
      default:
        return { 
          success: false, 
          channel: preferredChannel, 
          recipient: name, 
          timestamp: new Date().toISOString(),
          message: "Unsupported channel"
        };
    }
  }

  private static async sendEmail(to: string, content: any): Promise<DispatchResult> {
    // Integration point for Resend/SendGrid
    console.log(`[EmailAdapter] Sending to ${to}: ${content.subject}`);
    return {
      success: true,
      channel: 'email',
      recipient: to,
      timestamp: new Date().toISOString()
    };
  }

  private static async sendSMS(to: string, body: string): Promise<DispatchResult> {
    // Integration point for Twilio
    console.log(`[SMSAdapter] Sending to ${to}: ${body.substring(0, 20)}...`);
    return {
      success: true,
      channel: 'sms',
      recipient: to,
      timestamp: new Date().toISOString()
    };
  }
}
