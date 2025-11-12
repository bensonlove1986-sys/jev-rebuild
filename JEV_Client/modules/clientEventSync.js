import { apiRequest } from './clientBridge.js';

export async function startSync(updateUI) {
  async function loop() {
    try {
      const status = await apiRequest('/agents/status');
      if (updateUI) updateUI(status);
      console.log('[EventSync] heartbeat active');
    } catch (err) {
      console.error('[EventSync Error]', err);
    } finally {
      setTimeout(loop, 10000);
    }
  }
  loop();
}
