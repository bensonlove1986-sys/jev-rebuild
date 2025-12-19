// ping 路由

export const pingHandler = async (request) => {
  return new Response(JSON.stringify({
    success: true,
    timestamp: Date.now(),
    message: 'pong'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
