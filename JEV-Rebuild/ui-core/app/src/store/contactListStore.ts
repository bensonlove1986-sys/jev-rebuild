import { create } from 'zustand';
import { eventBus } from '../utils/eventBus';

interface Contact {
  contactId: string;
  channel: 'whatsapp' | string;
  peerId: string;
  displayName: string;
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
}

interface ContactListState {
  contacts: Contact[];
  selectedContactId: string | null;
  selectContact: (contactId: string | null) => void;
  upsertContact: (event: {
    channel: string;
    from: string;
    text?: string;
    media?: Array<{ url: string; type: string }>;
    timestamp: number;
  }) => void;
  getContactById: (contactId: string) => Contact | undefined;
  getContactByPeerId: (peerId: string, channel: string) => Contact | undefined;
  markAsRead: (contactId: string) => void;
}

// Generate contactId from channel and peerId
function generateContactId(channel: string, peerId: string): string {
  return `${channel}:${peerId}`;
}

// Get display name from peerId (for WhatsApp, this is the phone number)
function getDisplayNameFromPeerId(peerId: string): string {
  return peerId;
}

export const useContactListStore = create<ContactListState>((set, get) => {
  // Listen for inbound messages to upsert contacts
  eventBus.on('inbound:message', (event) => {
    get().upsertContact(event);
  });

  return {
    contacts: [],
    selectedContactId: null,

    selectContact: (contactId) => {
      set({ selectedContactId: contactId });
      if (contactId) {
        get().markAsRead(contactId);
      }
    },

    upsertContact: (event) => {
      const { channel, from, text, media, timestamp } = event;
      const peerId = from;
      const contactId = generateContactId(channel, peerId);
      const displayName = getDisplayNameFromPeerId(peerId);
      const lastMessage = text || (media && media.length > 0 ? 'Media message' : 'New message');

      set((state) => {
        const existingContactIndex = state.contacts.findIndex(c => c.contactId === contactId);
        const isSelected = state.selectedContactId === contactId;

        if (existingContactIndex >= 0) {
          // Update existing contact and move to top
          const updatedContacts = [...state.contacts];
          const updatedContact = {
            ...updatedContacts[existingContactIndex],
            lastMessage,
            lastTimestamp: timestamp,
            unreadCount: isSelected ? 0 : updatedContacts[existingContactIndex].unreadCount + 1
          };
          // Remove the existing contact and add it to the beginning
          updatedContacts.splice(existingContactIndex, 1);
          return { contacts: [updatedContact, ...updatedContacts] };
        } else {
          // Create new contact
          const newContact: Contact = {
            contactId,
            channel,
            peerId,
            displayName,
            lastMessage,
            lastTimestamp: timestamp,
            unreadCount: 1
          };
          return { contacts: [newContact, ...state.contacts] };
        }
      });

      // Emit contact upserted event
      eventBus.emit('contact:upserted', {
        contactId,
        channel,
        peerId,
        displayName,
        lastMessage,
        lastTimestamp: timestamp
      });
    },

    getContactById: (contactId) => {
      return get().contacts.find(contact => contact.contactId === contactId);
    },

    getContactByPeerId: (peerId, channel) => {
      const contactId = generateContactId(channel, peerId);
      return get().getContactById(contactId);
    },

    markAsRead: (contactId) => {
      set((state) => {
        const updatedContacts = state.contacts.map(contact => 
          contact.contactId === contactId 
            ? { ...contact, unreadCount: 0 } 
            : contact
        );
        return { contacts: updatedContacts };
      });
    }
  };
});
