// ping 路由
import { ok } from '../utils/response.js';

export const pingHandler = async (request) => {
  return ok(request, {
    timestamp: Date.now(),
    message: 'pong'
  });
};
