// src/core/server-client-proxy.ts
async function rpcCall(req) {
  const res = await fetch("/api/rdb", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req)
  });
  const payload = await res.json();
  if (!payload.success) throw new Error(payload.error || "Unknown error");
  return payload.data;
}
var serverActions = new Proxy({}, {
  get(_, namespace) {
    return new Proxy({}, {
      get(_2, action) {
        return (args) => rpcCall({ namespace, action, args });
      }
    });
  }
});
export {
  serverActions
};
