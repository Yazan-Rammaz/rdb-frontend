type RpcRequest = { namespace: string; action: string; args?: any };

async function rpcCall(req: RpcRequest) {
    const res = await fetch('/api/rdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
    });
    const payload = await res.json();
    if (!payload.success) throw new Error(payload.error || 'Unknown error');
    return payload.data;
}

export const serverActions = new Proxy({} as any, {
    get(_, namespace: string) {
        return new Proxy({}, {
            get(_, action: string) {
                return (args: any) => rpcCall({ namespace, action, args });
            }
        });
    }
});