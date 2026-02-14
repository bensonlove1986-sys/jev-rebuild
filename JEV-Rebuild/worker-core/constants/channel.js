/**
 * @FREEZE
 * Channel ID Constants - System Level Hard Isolation
 * This file defines the only valid channel IDs for the system.
 * Any change to these values will break existing functionality.
 */

/**
 * Channel IDs for different platforms
 * @enum {number}
 */
export const CHANNEL = {
  /** WhatsApp channel ID */
  WHATSAPP: 19,
  /** Instagram channel ID */
  INSTAGRAM: 29
};

/**
 * Valid channel IDs array
 * @type {number[]}
 */
export const VALID_CHANNEL_IDS = Object.values(CHANNEL);

/**
 * Get channel name from channel ID
 * @param {number} channel_id - The channel ID
 * @returns {string} - The channel name
 */
export const getChannelName = (channel_id) => {
  switch (channel_id) {
    case CHANNEL.WHATSAPP:
      return 'whatsapp';
    case CHANNEL.INSTAGRAM:
      return 'instagram';
    default:
      return 'unknown';
  }
};

/**
 * Get platform name from channel ID
 * @param {number} channel_id - The channel ID
 * @returns {string} - The platform name
 */
export const getPlatformName = (channel_id) => {
  switch (channel_id) {
    case CHANNEL.WHATSAPP:
      return 'whatsapp';
    case CHANNEL.INSTAGRAM:
      return 'instagram';
    default:
      return 'unknown';
  }
};