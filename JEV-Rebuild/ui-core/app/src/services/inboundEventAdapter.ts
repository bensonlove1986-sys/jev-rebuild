import { eventBus } from '../utils/eventBus';

// Unified inbound event format
interface UnifiedInboundEvent {
  channel: string;
  from: string;
  text?: string;
  media?: Array<{ url: string; type: string }>;
  timestamp: number;
}

/**
 * InboundEventAdapter - Handles incoming events from various sources
 * and converts them to a unified format for the application.
 */
export class InboundEventAdapter {
  /**
   * Initialize the event adapter to listen for incoming events
   */
  static init(): void {
    console.log('[InboundEventAdapter] Initializing...');
    
    // For now, we'll set up listeners for mock events
    // In a real implementation, this would connect to WebSockets, SSE, etc.
    this.setupMockEventListeners();
  }

  /**
   * Set up mock event listeners for testing purposes
   */
  private static setupMockEventListeners(): void {
    // This is just for testing - in production, we'd use real event sources
    console.log('[InboundEventAdapter] Setting up mock event listeners');
  }

  /**
   * Process a raw inbound event and convert it to the unified format
   */
  static processRawEvent(rawEvent: Record<string, any>): void {
    console.log('[InboundEventAdapter] Processing raw event:', rawEvent);
    
    // Determine the event source type
    let unifiedEvent: UnifiedInboundEvent | null = null;
    
    // Handle Twilio WhatsApp webhook events
    if (rawEvent.From && rawEvent.Body !== undefined) {
      unifiedEvent = this.convertTwilioEvent(rawEvent);
    }
    
    // Handle other event types here as needed (Telegram, Email, etc.)
    
    if (unifiedEvent) {
      this.emitUnifiedEvent(unifiedEvent);
    } else {
      console.warn('[InboundEventAdapter] Could not process raw event:', rawEvent);
    }
  }

  /**
   * Convert Twilio WhatsApp webhook event to unified format
   */
  private static convertTwilioEvent(twilioEvent: Record<string, any>): UnifiedInboundEvent {
    const { From, Body, NumMedia } = twilioEvent;
    const fromWithoutWhatsapp = From.replace('whatsapp:', '');
    const numMedia = parseInt(NumMedia, 10);
    
    const media: Array<{ url: string; type: string }> = [];
    
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = twilioEvent[`MediaUrl${i}`];
      const mediaType = twilioEvent[`MediaContentType${i}`] || 'application/octet-stream';
      
      if (mediaUrl) {
        media.push({ url: mediaUrl, type: mediaType });
      }
    }
    
    return {
      channel: 'whatsapp',
      from: fromWithoutWhatsapp,
      text: Body || undefined,
      media: media.length > 0 ? media : undefined,
      timestamp: Date.now()
    };
  }

  /**
   * Emit a unified inbound event to the event bus
   */
  static emitUnifiedEvent(event: UnifiedInboundEvent): void {
    console.log('[InboundEventAdapter] Emitting unified event:', event);
    eventBus.emit('inbound:message', event);
  }

  /**
   * Simulate an inbound event (for testing)
   */
  static simulateInboundEvent(event: UnifiedInboundEvent): void {
    console.log('[InboundEventAdapter] Simulating inbound event:', event);
    this.emitUnifiedEvent(event);
  }
}

// Initialize the event adapter when the module is loaded
InboundEventAdapter.init();
