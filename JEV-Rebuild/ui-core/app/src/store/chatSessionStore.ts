import { create } from 'zustand';
import { eventBus } from '../utils/eventBus';

interface Message {
  id: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  role: 'customer' | 'operator';
  text?: string;
  media?: Array<{ url: string; type: string }>;
  timestamp: number;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
}

interface ChatSession {
  sessionId: string;
  contactId: string;
  channel: string;
  messages: Message[];
  isLoading: boolean;
}

interface ChatSessionState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  getOrCreateSession: (contactId: string, channel: string) => ChatSession;
  appendMessage: (sessionId: string, message: Omit<Message, 'id'>) => void;
  sendMessage: (sessionId: string, text: string) => Promise<void>;
  setActiveSession: (sessionId: string | null) => void;
  getSessionById: (sessionId: string) => ChatSession | undefined;
  getSessionByContactId: (contactId: string) => ChatSession | undefined;
}

// Generate sessionId from contactId
function generateSessionId(contactId: string): string {
  return `session:${contactId}`;
}

// Generate unique messageId
function generateMessageId(): string {
  return `msg:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useChatSessionStore = create<ChatSessionState>((set, get) => {
  // Listen for inbound messages to append to sessions
  eventBus.on('inbound:message', (event) => {
    const { channel, from, text, media, timestamp } = event;
    const contactId = `${channel}:${from}`;
    const session = get().getOrCreateSession(contactId, channel);
    
    get().appendMessage(session.sessionId, {
      channel,
      direction: 'inbound',
      role: 'customer',
      text,
      media,
      timestamp,
      status: 'delivered'
    });
  });

  // Listen for contact upserted events to create sessions if needed
  eventBus.on('contact:upserted', (event) => {
    const { contactId, channel } = event;
    get().getOrCreateSession(contactId, channel);
  });

  return {
    sessions: [],
    activeSessionId: null,

    getOrCreateSession: (contactId, channel) => {
      const sessionId = generateSessionId(contactId);
      const existingSession = get().getSessionById(sessionId);

      if (existingSession) {
        return existingSession;
      }

      // Create new session
      const newSession: ChatSession = {
        sessionId,
        contactId,
        channel,
        messages: [],
        isLoading: false
      };

      set((state) => ({
        sessions: [...state.sessions, newSession]
      }));

      // Emit session created event
      eventBus.emit('session:created', newSession);

      return newSession;
    },

    appendMessage: (sessionId, message) => {
      const fullMessage: Message = {
        ...message,
        id: generateMessageId()
      };

      set((state) => {
        const updatedSessions = state.sessions.map(session => 
          session.sessionId === sessionId
            ? {
                ...session,
                messages: [...session.messages, fullMessage]
              }
            : session
        );
        return { sessions: updatedSessions };
      });

      // Emit message added event
      eventBus.emit('chat:messageAdded', {
        sessionId,
        message: fullMessage
      });
    },

    sendMessage: async (sessionId, text) => {
      const session = get().getSessionById(sessionId);
      if (!session) return;

      // Create optimistic message
      const optimisticMessage: Omit<Message, 'id'> = {
        channel: session.channel,
        direction: 'outbound',
        role: 'operator',
        text,
        timestamp: Date.now(),
        status: 'sending'
      };

      // Append optimistic message
      get().appendMessage(sessionId, optimisticMessage);

      try {
        // In a real implementation, this would call the API to send the message
        // For now, we'll just simulate a delay and mark as sent
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update message status to sent
        set((state) => {
          const updatedSessions = state.sessions.map(session => {
            if (session.sessionId !== sessionId) return session;
            
            const lastMessageIndex = session.messages.length - 1;
            if (lastMessageIndex < 0) return session;
            
            const updatedMessages = [...session.messages];
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              status: 'sent'
            };
            
            return {
              ...session,
              messages: updatedMessages
            };
          });
          return { sessions: updatedSessions };
        });
      } catch (error) {
        // Update message status to failed
        set((state) => {
          const updatedSessions = state.sessions.map(session => {
            if (session.sessionId !== sessionId) return session;
            
            const lastMessageIndex = session.messages.length - 1;
            if (lastMessageIndex < 0) return session;
            
            const updatedMessages = [...session.messages];
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              status: 'failed'
            };
            
            return {
              ...session,
              messages: updatedMessages
            };
          });
          return { sessions: updatedSessions };
        });
      }
    },

    setActiveSession: (sessionId) => {
      set({ activeSessionId: sessionId });
    },

    getSessionById: (sessionId) => {
      return get().sessions.find(session => session.sessionId === sessionId);
    },

    getSessionByContactId: (contactId) => {
      const sessionId = generateSessionId(contactId);
      return get().getSessionById(sessionId);
    }
  };
});
