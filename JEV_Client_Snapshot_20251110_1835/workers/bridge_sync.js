/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:18.119Z */
export default {
  async fetch(request, env) {
    const { method } = request;
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' };

    if (method === 'OPTIONS') return new Response('', { headers: cors });

    // 盲赂颅忙聨搂氓鹿驴忙聮颅
    if (path === '/bridge/broadcast' && method === 'POST') {
      const body = await request.json();
      await env.INVITE_KV.put('system:broadcast', JSON.stringify({ msg: body.message, ts: Date.now() }));
      return new Response(JSON.stringify({ success: true, broadcast: body.message }), { headers: cors });
    }

    // 氓庐垄忙聹聧莽芦炉氓聬聦忙颅楼
    if (path === '/bridge/sync' && method === 'POST') {
      const body = await request.json();
      const agentKey = `agent:${body.agent}`;
      await env.INVITE_KV.put(agentKey, JSON.stringify({ ...body, last: Date.now() }));
      return new Response(JSON.stringify({ success: true }), { headers: cors });
    }

    // 猫聨路氓聫聳氓鹿驴忙聮颅忙露聢忙聛炉
    if (path === '/bridge/broadcast' && method === 'GET') {
      const msg = await env.INVITE_KV.get('system:broadcast');
      return new Response(msg || '{}', { headers: cors });
    }

    return new Response('Not Found', { status: 404, headers: cors });
  }
};