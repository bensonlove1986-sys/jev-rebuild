export function inboxKeys(customerId: string) {
  const cid = String(customerId);

  return {
    index: `inbox:index:${cid}`,
    message: (ts: number) => `inbox:msg:${cid}:${ts}`,
  };
}