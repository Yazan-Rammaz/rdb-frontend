
Markdown
# RDB (Ramaaz Digital Banking) SDK

A robust Next.js-optimized library for digital banking integration. This SDK supports hybrid execution modes: **Server Action Bridge** (for hidden network requests) and **Standard Client RPC**.

---

## 🚀 Quick Start

### 1. Build the Library
From the root of the library repository, run:
npm run lib:build
2. Install in Host Project
Add the library to your host project via file: dependency in package.json:

Then run npm install.

🛠 Hybrid Implementation Modes
Mode A: Server Action Bridge (Recommended - Hidden Network)
Use this mode to hide API calls from the browser's Network tab and leverage Next.js Server Actions for maximum security.

// into layout.tsx
```bash
import 'rdb/styles';
```
1. Create the Bridge in the Host App:
src/utils/rdb/server.ts

TypeScript

```bash
"use server";

import { getServerActions } from 'rdb/server';

export async function rdbActionBridge(namespace: string, action: string, args: any) {
    const allActions = await getServerActions();
    const ns = (allActions as any)[namespace];

    if (!ns || typeof ns[action] !== 'function') {
        throw new Error(`Action ${namespace}.${action} not found`);
    }

    return await ns[action](args);
}
```
2. Create the Client Proxy:
src/utils/rdb/index.ts

TypeScript

```bash
import { rdbActionBridge } from './server';

export const serverActions = new Proxy({} as any, {
    get(_, namespace: string) {
        return new Proxy({}, {
            get(_, action: string) {
                return (args: any) => rdbActionBridge(namespace, action, args);
            }
        });
    }
});
```
3. Usage in Client Component:

TypeScript

```bash
'use client';
import { RDB } from 'rdb';
import { serverActions } from '@/utils/rdb';

export default function Dashboard() {
  return <RDB baseUrl="[https://api.ramaaz.dev](https://api.ramaaz.dev)" actions={serverActions} />;
}
```
Mode B: Automatic Client Mode (Fallback)
If you do not pass the actions prop, the library automatically operates in Client Mode. It will attempt to call a local API route /api/rdb via standard fetch.

Usage:

TypeScript

```bash
'use client';
import { RDB } from 'rdb';

export default function QuickView() {
  // If no actions prop is provided, it defaults to Client Fetch Mode
  return <RDB baseUrl="[https://api.ramaaz.dev](https://api.ramaaz.dev)" />;
}
```
Note: This mode requires implementing app/api/rdb/route.ts in the host project to handle the incoming POST requests.

📁 Library Structure
dist/index.mjs — Main UI Components.

dist/server/index.mjs — Real Server-side Logic (use server).

dist/server/browser.mjs — Automatic Proxy for Client-side fallback.

dist/styles/styles.css — Essential SDK Styles.

🔒 Security Tips
Server Actions: By using Mode A, your API Tokens and Keys never leave the host server.

API Routes: If using Mode B, ensure you wrap your /api/rdb route with proper authentication middleware.