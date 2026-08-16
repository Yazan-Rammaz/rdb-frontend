To make your library professional and easy to use, your `README.md` should reflect the simplified integration. By using the `serverActions` wrapper you just created, the user no longer needs to create local action files.

Here is the complete, ready-to-copy `README.md` in English:

---

```markdown
# Ramaaz Digital Banking (RDB) Integration Guide

This guide explains how to integrate the **RDB** library into a Next.js application using pre-configured Server Actions.

## 🚀 Quick Start

### 1. Configure Next.js
Since the library uses Server Actions and custom CSS, you must allow Next.js to transpile the package. Update your `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['rdb'], 
};

export default nextConfig;

```

### 2. Import Styles

Import the library's global styles in your root `layout.tsx` to ensure all components render correctly:

```tsx
// src/app/layout.tsx
import 'rdb/dist/styles.css'; 

```

### 3. Usage in Client Components

You can now import the `serverActions` object directly from the library. You do not need to create any local bridge files.

```tsx
'use client';

import { RDB } from 'rdb';
import { serverActions } from 'rdb/server';

export default function BankingPage() {
  return (
    <main className="h-screen w-full">
      <RDB
        baseUrl={process.env.NEXT_PUBLIC_API_URL!}
        actions={serverActions} // Passed directly from the library
        authToken="your-session-token"
        local="en-US"
        handleUnauthenticated={() => {
            // Your custom logout or redirect logic
            window.location.href = '/login';
        }}
      />
    </main>
  );
}

```

---

## 🎨 Theming & Customization

The library uses dynamic CSS variables. If your IDE shows "Unresolved custom property" warnings (e.g., `--primary-light`), you can safely ignore them as they are injected at runtime. To provide static fallbacks, add them to your `globals.css`:

```css
:root {
  --primary: #3066CC;
  --primary-light: #5A85DB;
  --font-quicksand: 'Quicksand', sans-serif;
}

```

---

## 🛠️ Architecture Overview

The library follows a **Server-First** approach. Even though you pass the actions object in a Client Component, Next.js recognizes the internal functions as valid Server Actions. This ensures:

1. **Security:** API calls and logic remain on the server.
2. **Performance:** Reduced client-side bundle size.
3. **Simplicity:** No need to write repetitive wrapper functions in your local project.

---

## Troubleshooting

* **Module not found:** Ensure you have correctly installed the library and added it to `transpilePackages` in your Next config.
* **CSS not loading:** Verify that `rdb/dist/styles.css` is imported in your `layout.tsx`.

```

---

### Important Note for your Library Entry Point:
To make `import { serverActions } from 'rdb/server'` work as shown above, ensure your library's `package.json` has the following export:

```json
"exports": {
  "./server": "./dist/server/actions-wrapper.js"
}

```

