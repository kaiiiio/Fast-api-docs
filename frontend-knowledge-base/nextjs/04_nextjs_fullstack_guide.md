# Next.js Fullstack Application Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Project Setup](#project-setup)
3. [App Router vs Pages Router](#app-router-vs-pages-router)
4. [API Routes](#api-routes)
5. [Database Integration](#database-integration)
6. [Authentication](#authentication)
7. [Server Components & Client Components](#server-client-components)
8. [Server Actions](#server-actions)
9. [Middleware](#middleware)
10. [File Upload](#file-upload)
11. [Deployment](#deployment)
12. [Best Practices](#best-practices)

---

## Introduction

Next.js is a **fullstack React framework** that allows you to build complete web applications with both frontend and backend in a single codebase.

**Key Features:**
- ✅ Server-Side Rendering (SSR)
- ✅ API Routes (Backend)
- ✅ File-based Routing
- ✅ Server Components
- ✅ Server Actions
- ✅ Built-in Optimization
- ✅ TypeScript Support

---

## Project Setup

### Create New Project

```bash
# Create Next.js app (App Router - recommended)
npx create-next-app@latest my-app

# Options:
# ✓ TypeScript? Yes
# ✓ ESLint? Yes
# ✓ Tailwind CSS? Yes
# ✓ src/ directory? Yes
# ✓ App Router? Yes (recommended)
# ✓ Turbopack? Yes

cd my-app
npm run dev
```

### Project Structure

```
my-app/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   └── users/
│   │   │       └── route.ts
│   │   ├── (auth)/           # Route groups
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   └── globals.css
│   ├── components/           # React components
│   ├── lib/                  # Utilities
│   │   ├── db.ts            # Database connection
│   │   └── auth.ts          # Auth utilities
│   └── types/               # TypeScript types
├── public/                   # Static files
├── .env.local               # Environment variables
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## App Router vs Pages Router

### App Router (New - Recommended)

**Location:** `app/` directory

```tsx
// app/page.tsx - Home page
export default function Home() {
  return <h1>Home Page</h1>
}

// app/about/page.tsx - About page
export default function About() {
  return <h1>About Page</h1>
}

// app/blog/[slug]/page.tsx - Dynamic route
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <h1>Post: {params.slug}</h1>
}
```

### Entry Files & Configuration

**Root Layout (Required):** `app/layout.tsx`

```typescript
// Import Metadata type for SEO configuration (title, description, Open Graph, etc.)
import type { Metadata } from 'next';
// Import global styles that apply to all pages
import './globals.css';

export const metadata: Metadata = {
  title: 'My Next.js App',
  description: 'Fullstack application built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Global header */}
        <header className="bg-blue-600 text-white p-4">
          <nav className="max-w-7xl mx-auto flex gap-4">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/dashboard">Dashboard</a>
          </nav>
        </header>
        
        {/* Page content */}
        <main className="max-w-7xl mx-auto p-4">
          {children}
        </main>
        
        {/* Global footer */}
        <footer className="bg-gray-800 text-white p-4 text-center">
          © 2024 My App
        </footer>
      </body>
    </html>
  );
}
```

**Middleware (Root level):** `middleware.ts`

```typescript
// NextResponse - Used to create and manipulate HTTP responses in middleware and API routes
import { NextResponse } from 'next/server';
// NextRequest - Type definition for incoming requests with Next.js-specific properties
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Log all requests
  console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);
  
  // Check authentication for protected routes
  const token = request.cookies.get('auth-token')?.value;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/profile');
  
  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Redirect to dashboard if already logged in and trying to access auth pages
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-custom-header', 'my-value');
  
  return response;
}

// Specify which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**Global Error Handler:** `app/error.tsx`

```typescript
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Error:', error);
  }, [error]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Something went wrong!
        </h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

**Global Not Found:** `app/not-found.tsx`

```typescript
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-500 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

**Loading State:** `app/loading.tsx`

```typescript
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
```

**Environment Variables:** `.env.local`

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# API Keys
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Other
NODE_ENV="development"
```

**Next.js Config:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Image optimization
  images: {
    domains: ['example.com', 'cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true,
      },
    ];
  },
  
  // Rewrites (URL masking)
  async rewrites() {
    return [
      {
        source: '/api/external/:path*',
        destination: 'https://external-api.com/:path*',
      },
    ];
  },
  
  // Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

**TypeScript Config:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Features:**
- Server Components by default
- Nested layouts
- Loading & error states
- Server Actions
- Streaming

### Pages Router (Old)

**Location:** `pages/` directory

```tsx
// pages/index.tsx - Home page
export default function Home() {
  return <h1>Home Page</h1>
}

// pages/about.tsx - About page
export default function About() {
  return <h1>About Page</h1>
}

// pages/blog/[slug].tsx - Dynamic route
export default function BlogPost({ slug }: { slug: string }) {
  return <h1>Post: {slug}</h1>
}
```

**Recommendation:** Use **App Router** for new projects!

---

## API Routes

### Creating API Routes (App Router)

**File:** `app/api/users/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page') || '1';
  
  // Fetch from database
  const users = await db.user.findMany({
    skip: (parseInt(page) - 1) * 10,
    take: 10,
  });
  
  return NextResponse.json({ users, page });
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate
    if (!body.email || !body.name) {
      return NextResponse.json(
        { error: 'Email and name required' },
        { status: 400 }
      );
    }
    
    // Create user
    const user = await db.user.create({
      data: {
        email: body.email,
        name: body.name,
      },
    });
    
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT /api/users
export async function PUT(request: NextRequest) {
  const body = await request.json();
  // Update logic
  return NextResponse.json({ message: 'Updated' });
}

// DELETE /api/users
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  // Delete logic
  return NextResponse.json({ message: 'Deleted' });
}
```

### Dynamic API Routes

**File:** `app/api/users/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users/123
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.user.findUnique({
    where: { id: params.id },
  });
  
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(user);
}

// PATCH /api/users/123
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  
  const user = await db.user.update({
    where: { id: params.id },
    data: body,
  });
  
  return NextResponse.json(user);
}

// DELETE /api/users/123
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.user.delete({
    where: { id: params.id },
  });
  
  return NextResponse.json({ message: 'User deleted' });
}
```

### API Route with Authentication

```typescript
import { NextRequest, NextResponse } from 'next/server';
// getServerSession - Retrieves the current user's session on the server side
import { getServerSession } from 'next-auth';
// authOptions - Your NextAuth configuration (providers, callbacks, etc.)
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Check authentication - Returns session object if user is logged in, null otherwise
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Protected data
  const data = await db.sensitiveData.findMany({
    where: { userId: session.user.id },
  });
  
  return NextResponse.json(data);
}
```

---

## Backend Middleware for API Routes

### Middleware Architecture in Next.js

```
Request Flow:
┌─────────────────────────────────────────┐
│  Client Request                         │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  middleware.ts (ROOT LEVEL)             │
│  - Runs for ALL routes (pages + API)   │
│  - Authentication check                 │
│  - Logging                              │
│  - Headers                              │
└────────────┬────────────────────────────┘
             │
             ├─────────────┬──────────────┐
             ▼             ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │  Pages   │  │   API    │  │  Static  │
      │  /about  │  │ /api/... │  │  /public │
      └──────────┘  └────┬─────┘  └──────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  API Route Handler   │
              │  - Custom middleware │
              │  - Business logic    │
              └──────────────────────┘
```

### 1. Root Middleware (Affects Both Pages & API)

**File:** `middleware.ts` (root level)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // This runs for BOTH pages and API routes
  console.log(`[Middleware] ${request.method} ${pathname}`);
  
  // Check if it's an API route
  if (pathname.startsWith('/api')) {
    // Backend-specific logic
    const apiKey = request.headers.get('x-api-key');
    
    // Public API routes (no auth needed)
    if (pathname.startsWith('/api/public')) {
      return NextResponse.next();
    }
    
    // Protected API routes
    if (!apiKey && pathname.startsWith('/api/protected')) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',  // Only API routes
    // OR
    '/((?!_next/static|_next/image|favicon.ico).*)',  // All routes
  ],
};
```

### 2. API Route-Specific Middleware

**Custom Middleware Helper:** `src/lib/api-middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// Type for API handler
type ApiHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse>;

// Authentication middleware
export function withAuth(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Add user to request (TypeScript workaround)
    (request as any).user = session.user;
    
    return handler(request, context);
  };
}

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  limit: number = 10,
  windowMs: number = 60000
): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return async (request: NextRequest, context?: any) => {
      // Get client IP address - request.ip for direct connections, x-forwarded-for for proxied requests
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const now = Date.now();
      
      const record = rateLimitMap.get(ip);
      
      if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      } else if (record.count >= limit) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        );
      } else {
        record.count++;
      }
      
      return handler(request, context);
    };
  };
}

// CORS middleware
export function withCORS(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    const response = await handler(request, context);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  };
}

// Validation middleware
export function withValidation(
  schema: (data: any) => boolean
): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return async (request: NextRequest, context?: any) => {
      try {
        const body = await request.json();
        
        if (!schema(body)) {
          return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
          );
        }
        
        // Add validated body to request
        (request as any).validatedBody = body;
        
        return handler(request, context);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid JSON' },
          { status: 400 }
        );
      }
    };
  };
}

// Compose multiple middleware
export function compose(...middlewares: ((handler: ApiHandler) => ApiHandler)[]) {
  return (handler: ApiHandler): ApiHandler => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}
```

### 3. Using Middleware in API Routes

**Example 1: Protected API with Auth**

**File:** `app/api/users/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { db } from '@/lib/db';

// Wrap handler with auth middleware
export const GET = withAuth(async (request: NextRequest) => {
  // User is authenticated, access via (request as any).user
  const user = (request as any).user;
  
  const users = await db.user.findMany({
    where: { organizationId: user.organizationId },
  });
  
  return NextResponse.json(users);
});
```

**Example 2: Multiple Middleware (Auth + Rate Limit)**

**File:** `app/api/posts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { compose, withAuth, withRateLimit } from '@/lib/api-middleware';
import { db } from '@/lib/db';

// Compose multiple middleware
const handler = async (request: NextRequest) => {
  const user = (request as any).user;
  
  const posts = await db.post.findMany({
    where: { authorId: user.id },
  });
  
  return NextResponse.json(posts);
};

export const GET = compose(
  withAuth,
  withRateLimit(10, 60000)  // 10 requests per minute
)(handler);
```

**Example 3: CORS + Validation**

**File:** `app/api/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
// compose - Combines multiple middleware functions into one
// withCORS - Adds Cross-Origin Resource Sharing headers for external API access
// withValidation - Validates request body against a schema before processing
import { compose, withCORS, withValidation } from '@/lib/api-middleware';

// Validation schema
const webhookSchema = (data: any) => {
  return data && typeof data.event === 'string' && data.payload;
};

const handler = async (request: NextRequest) => {
  const body = (request as any).validatedBody;
  
  // Process webhook
  console.log('Webhook received:', body.event);
  
  return NextResponse.json({ received: true });
};

// Apply middleware to POST handler - CORS first, then validation, then handler
export const POST = compose(
  withCORS,
  withValidation(webhookSchema)
)(handler);
```

### 4. Advanced: Per-Route Middleware in route.ts

**File:** `app/api/admin/users/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Middleware function
async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });
  
  if (user?.role !== 'ADMIN') {
    throw new Error('Forbidden');
  }
  
  return user;
}

// Handler with inline middleware
export async function GET(request: NextRequest) {
  try {
    // Run middleware
    const admin = await requireAdmin(request);
    
    // Business logic
    const users = await db.user.findMany();
    
    return NextResponse.json(users);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await db.user.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Error handling...
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 5. Complete Example: API with All Middleware

**File:** `app/api/products/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
// compose - Combines multiple middleware functions
// withAuth - Ensures user is authenticated before accessing the route
// withRateLimit - Prevents abuse by limiting requests per time window
// withCORS - Enables cross-origin requests from external domains
import { compose, withAuth, withRateLimit, withCORS } from '@/lib/api-middleware';
import { db } from '@/lib/db';

// GET - Public (with CORS and rate limit)
const getHandler = async (request: NextRequest) => {
  const products = await db.product.findMany({
    where: { published: true },
  });
  
  return NextResponse.json(products);
};

export const GET = compose(
  withCORS,
  withRateLimit(100, 60000)  // 100 requests per minute
)(getHandler);

// POST - Protected (auth + rate limit + CORS)
const postHandler = async (request: NextRequest) => {
  const user = (request as any).user;
  const body = await request.json();
  
  const product = await db.product.create({
    data: {
      ...body,
      userId: user.id,
    },
  });
  
  return NextResponse.json(product, { status: 201 });
};

export const POST = compose(
  withAuth,
  withCORS,
  withRateLimit(10, 60000)  // 10 requests per minute
)(postHandler);
```

---

## Summary: Where Middleware Exists

| File Location | Scope | Use Case |
|---------------|-------|----------|
| `middleware.ts` (root) | **ALL routes** (pages + API) | Global auth, logging, headers |
| `app/api/*/route.ts` | **Specific API route** | Route-specific logic |
| `lib/api-middleware.ts` | **Reusable helpers** | Auth, CORS, rate limit, validation |

**Best Practice:**
- Use **root middleware** for global checks (authentication, logging)
- Use **custom middleware helpers** for reusable logic (auth, CORS, rate limiting)
- Use **inline middleware** in route handlers for route-specific logic

---

### Calling API Routes from Client

```typescript
'use client';

import { useState } from 'react';

export default function UserForm() {
  const [loading, setLoading] = useState(false);
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
    };
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create user');
      }
      
      const user = await response.json();
      console.log('Created user:', user);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

---

## Database Integration

### Prisma Setup

```bash
# Install Prisma
npm install prisma @prisma/client
npx prisma init
```

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**File:** `src/lib/db.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

**Environment Variables:** `.env.local`

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

**Run Migrations:**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Using Database in API Routes

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const posts = await db.post.findMany({
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const { title, content, authorId } = await request.json();
  
  const post = await db.post.create({
    data: {
      title,
      content,
      authorId,
    },
  });
  
  return NextResponse.json(post, { status: 201 });
}
```

### Using Database in Server Components

```typescript
// app/posts/page.tsx
import { db } from '@/lib/db';

export default async function PostsPage() {
  // Fetch directly in Server Component
  const posts = await db.post.findMany({
    include: { author: true },
  });
  
  return (
    <div>
      <h1>Posts</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>By {post.author.name}</p>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  );
}
```

---

## Authentication

### NextAuth.js Setup

```bash
npm install next-auth @next-auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

**File:** `src/lib/auth.ts`

```typescript
import { NextAuthOptions } from 'next-auth';
// CredentialsProvider - Allows email/password authentication
import CredentialsProvider from 'next-auth/providers/credentials';
// GoogleProvider - Enables "Sign in with Google" OAuth authentication
import GoogleProvider from 'next-auth/providers/google';
// PrismaAdapter - Connects NextAuth to Prisma database for storing users and sessions
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { db } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });
        
        if (!user || !user.password) {
          return null;
        }
        
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        
        if (!isValid) {
          return null;
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
```

**File:** `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### Protected Pages

```typescript
// app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {session.user?.name}!</p>
    </div>
  );
}
```

### Login Page

```typescript
// app/login/page.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    });
    
    if (result?.ok) {
      router.push('/dashboard');
    } else {
      alert('Login failed');
    }
    
    setLoading(false);
  }
  
  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input name="email" type="email" required />
        <input name="password" type="password" required />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <button onClick={() => signIn('google')}>
        Sign in with Google
      </button>
    </div>
  );
}
```

### Client-Side Auth Check

```typescript
'use client';

import { useSession } from 'next-auth/react';

export default function ProfileButton() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  
  if (!session) {
    return <a href="/login">Login</a>;
  }
  
  return (
    <div>
      <p>Welcome, {session.user?.name}</p>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}
```

---

## Server Components & Client Components

### Server Components (Default)

```typescript
// app/posts/page.tsx - Server Component
import { db } from '@/lib/db';

export default async function PostsPage() {
  // Can fetch data directly
  const posts = await db.post.findMany();
  
  // Can use async/await
  // Cannot use hooks (useState, useEffect)
  // Cannot use browser APIs
  // Cannot add event listeners
  
  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  );
}
```

### Client Components

```typescript
// components/Counter.tsx - Client Component
'use client';  // Required directive

import { useState } from 'react';

export default function Counter() {
  // Can use hooks
  const [count, setCount] = useState(0);
  
  // Can use browser APIs
  // Can add event listeners
  // Cannot fetch data directly (use useEffect)
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

### Mixing Server & Client Components

```typescript
// app/page.tsx - Server Component
import { db } from '@/lib/db';
import Counter from '@/components/Counter';  // Client Component

export default async function Home() {
  const posts = await db.post.findMany();  // Server-side fetch
  
  return (
    <div>
      <h1>Posts</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
      
      {/* Client Component for interactivity */}
      <Counter />
    </div>
  );
}
```

---

## Server Actions

Server Actions allow you to run server-side code directly from client components without creating API routes.

### Creating Server Actions

**File:** `src/actions/posts.ts`

```typescript
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  
  await db.post.create({
    data: {
      title,
      content,
      authorId: 'user-id',  // Get from session
    },
  });
  
  revalidatePath('/posts');  // Refresh posts page
}

export async function deletePost(id: string) {
  await db.post.delete({
    where: { id },
  });
  
  revalidatePath('/posts');
}
```

### Using Server Actions

```typescript
// app/posts/new/page.tsx
import { createPost } from '@/actions/posts';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

### Server Actions with Client Components

```typescript
'use client';

import { createPost } from '@/actions/posts';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  );
}

export default function PostForm() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <SubmitButton />
    </form>
  );
}
```

---

## Middleware

Middleware runs before requests are completed, useful for authentication, redirects, etc.

**File:** `middleware.ts` (root level)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register');
  
  // Redirect to login if not authenticated
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Redirect to dashboard if already logged in
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
```

---

## File Upload

### File Upload API Route

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return NextResponse.json(
      { error: 'No file uploaded' },
      { status: 400 }
    );
  }
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Save to public/uploads
  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(process.cwd(), 'public/uploads', filename);
  
  await writeFile(filepath, buffer);
  
  return NextResponse.json({
    url: `/uploads/${filename}`,
    filename,
  });
}
```

### File Upload Component

```typescript
'use client';

import { useState } from 'react';

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    
    const formData = new FormData(e.currentTarget);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    setUrl(data.url);
    setUploading(false);
  }
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="file" name="file" required />
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      
      {url && <img src={url} alt="Uploaded" />}
    </div>
  );
}
```

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Environment Variables:**
- Add in Vercel dashboard
- Or use `vercel env add`

### Docker Deployment

**Dockerfile:**

```dockerfile
FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t my-nextjs-app .
docker run -p 3000:3000 my-nextjs-app
```

---

## Best Practices

### 1. Use Server Components by Default

```typescript
// ✅ Good - Server Component
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// ❌ Avoid - Unnecessary Client Component
'use client';
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetchData().then(setData);
  }, []);
  return <div>{data}</div>;
}
```

### 2. Use Server Actions Instead of API Routes

```typescript
// ✅ Good - Server Action
'use server';
export async function createUser(formData: FormData) {
  await db.user.create({ data: {...} });
}

// ❌ Avoid - Unnecessary API route
// app/api/users/route.ts
export async function POST(req) {
  await db.user.create({ data: {...} });
}
```

### 3. Optimize Images

```typescript
import Image from 'next/image';

// ✅ Good
<Image 
  src="/photo.jpg" 
  alt="Photo" 
  width={500} 
  height={300}
  priority  // For above-fold images
/>

// ❌ Avoid
<img src="/photo.jpg" alt="Photo" />
```

### 4. Use Loading States

```typescript
// app/posts/loading.tsx
export default function Loading() {
  return <div>Loading posts...</div>;
}

// app/posts/page.tsx
export default async function PostsPage() {
  const posts = await fetchPosts();  // Shows loading.tsx while fetching
  return <div>{posts}</div>;
}
```

### 5. Error Handling

```typescript
// app/posts/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## Complete Fullstack Example: Todo App

Let's build a complete Todo app from scratch to see how everything works together!

### Step 1: Setup Project

```bash
npx create-next-app@latest todo-app
cd todo-app
npm install prisma @prisma/client
npx prisma init
```

### Step 2: Database Schema

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // Using SQLite for simplicity
  url      = "file:./dev.db"
}

model Todo {
  id        String   @id @default(cuid())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Run migration:**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Step 3: Database Client

**File:** `src/lib/db.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

### Step 4: Server Actions

**File:** `src/actions/todos.ts`

```typescript
'use server';

import { db } from '@/lib/db';
// revalidatePath - Clears Next.js cache for a specific route to show fresh data after mutations
import { revalidatePath } from 'next/cache';

export async function getTodos() {
  return await db.todo.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTodo(formData: FormData) {
  const title = formData.get('title') as string;
  
  if (!title || title.trim().length === 0) {
    throw new Error('Title is required');
  }
  
  await db.todo.create({
    data: { title: title.trim() },
  });
  
  revalidatePath('/');
}

export async function toggleTodo(id: string) {
  const todo = await db.todo.findUnique({
    where: { id },
  });
  
  if (!todo) {
    throw new Error('Todo not found');
  }
  
  await db.todo.update({
    where: { id },
    data: { completed: !todo.completed },
  });
  
  revalidatePath('/');
}

export async function deleteTodo(id: string) {
  await db.todo.delete({
    where: { id },
  });
  
  revalidatePath('/');
}

export async function updateTodo(id: string, title: string) {
  await db.todo.update({
    where: { id },
    data: { title },
  });
  
  revalidatePath('/');
}
```

### Step 5: Todo Item Component

**File:** `src/components/TodoItem.tsx`

```typescript
'use client';

import { useState } from 'react';
import { toggleTodo, deleteTodo, updateTodo } from '@/actions/todos';

type TodoItemProps = {
  id: string;
  title: string;
  completed: boolean;
};

export default function TodoItem({ id, title, completed }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  
  async function handleToggle() {
    await toggleTodo(id);
  }
  
  async function handleDelete() {
    if (confirm('Delete this todo?')) {
      await deleteTodo(id);
    }
  }
  
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (editTitle.trim()) {
      await updateTodo(id, editTitle.trim());
      setIsEditing(false);
    }
  }
  
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={completed}
        onChange={handleToggle}
        className="w-5 h-5 cursor-pointer"
      />
      
      {/* Title */}
      {isEditing ? (
        <form onSubmit={handleUpdate} className="flex-1 flex gap-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 px-2 py-1 border rounded"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditTitle(title);
              setIsEditing(false);
            }}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <span
            className={`flex-1 ${completed ? 'line-through text-gray-500' : ''}`}
          >
            {title}
          </span>
          
          {/* Edit Button */}
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit
          </button>
          
          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}
```

### Step 6: Add Todo Form Component

**File:** `src/components/AddTodoForm.tsx`

```typescript
'use client';

import { createTodo } from '@/actions/todos';
import { useRef } from 'react';

export default function AddTodoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  
  async function handleSubmit(formData: FormData) {
    await createTodo(formData);
    formRef.current?.reset();
  }
  
  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex gap-2 mb-6"
    >
      <input
        type="text"
        name="title"
        placeholder="What needs to be done?"
        required
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        Add Todo
      </button>
    </form>
  );
}
```

### Step 7: Main Page (Server Component)

**File:** `src/app/page.tsx`

```typescript
import { getTodos } from '@/actions/todos';
import AddTodoForm from '@/components/AddTodoForm';
import TodoItem from '@/components/TodoItem';

export default async function Home() {
  // Fetch todos on server
  const todos = await getTodos();
  
  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📝 My Todo App
          </h1>
          <p className="text-gray-600">
            {completedCount} of {totalCount} completed
          </p>
        </div>
        
        {/* Add Todo Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <AddTodoForm />
        </div>
        
        {/* Todo List */}
        <div className="space-y-3">
          {todos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-xl">No todos yet!</p>
              <p className="text-sm">Add one above to get started 🚀</p>
            </div>
          ) : (
            todos.map((todo) => (
              <TodoItem
                key={todo.id}
                id={todo.id}
                title={todo.title}
                completed={todo.completed}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
```

### Step 8: Layout (Optional - Add Metadata)

**File:** `src/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Todo App - Next.js Fullstack',
  description: 'A simple fullstack todo app built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Step 9: Run the App

```bash
npm run dev
```

Visit `http://localhost:3000` and you have a fully functional fullstack app! 🎉

---

## Alternative: Using API Routes Instead of Server Actions

If you prefer traditional API routes, here's how:

### API Routes Version

**File:** `src/app/api/todos/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/todos
export async function GET() {
  const todos = await db.todo.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(todos);
}

// POST /api/todos
export async function POST(request: NextRequest) {
  const { title } = await request.json();
  
  if (!title || title.trim().length === 0) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    );
  }
  
  const todo = await db.todo.create({
    data: { title: title.trim() },
  });
  
  return NextResponse.json(todo, { status: 201 });
}
```

**File:** `src/app/api/todos/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/todos/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  
  const todo = await db.todo.update({
    where: { id: params.id },
    data: body,
  });
  
  return NextResponse.json(todo);
}

// DELETE /api/todos/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.todo.delete({
    where: { id: params.id },
  });
  
  return NextResponse.json({ message: 'Deleted' });
}
```

**Client Component with API Calls:**

```typescript
'use client';

import { useState, useEffect } from 'react';

type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  
  // Fetch todos
  useEffect(() => {
    fetch('/api/todos')
      .then(res => res.json())
      .then(setTodos);
  }, []);
  
  // Add todo
  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    
    const newTodo = await response.json();
    setTodos([newTodo, ...todos]);
    setTitle('');
  }
  
  // Toggle todo
  async function toggleTodo(id: string) {
    const todo = todos.find(t => t.id === id);
    
    const response = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo?.completed }),
    });
    
    const updated = await response.json();
    setTodos(todos.map(t => t.id === id ? updated : t));
  }
  
  // Delete todo
  async function deleteTodo(id: string) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    setTodos(todos.filter(t => t.id !== id));
  }
  
  return (
    <div>
      <form onSubmit={addTodo}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add todo"
          required
        />
        <button type="submit">Add</button>
      </form>
      
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Key Differences: Server Actions vs API Routes

| Feature | Server Actions | API Routes |
|---------|---------------|------------|
| **Code Location** | `actions/` folder | `app/api/` folder |
| **Usage** | Direct function calls | HTTP fetch calls |
| **Type Safety** | ✅ Full TypeScript | ⚠️ Manual typing |
| **Boilerplate** | ✅ Less code | ❌ More code |
| **Revalidation** | ✅ Built-in | ❌ Manual |
| **Client State** | ✅ Automatic | ❌ Manual useState |
| **Best For** | Forms, mutations | External APIs, webhooks |

**Recommendation:** Use **Server Actions** for internal app logic, **API Routes** for external integrations or when you need REST endpoints.

---

## Summary

Next.js is a powerful fullstack framework that combines:
- **Frontend**: React with Server Components
- **Backend**: API Routes & Server Actions
- **Database**: Easy integration with Prisma/other ORMs
- **Auth**: NextAuth.js for authentication
- **Deployment**: Vercel for seamless deployment

**Key Takeaways:**
- Use App Router for new projects
- Server Components for data fetching
- Client Components for interactivity
- Server Actions for mutations
- Middleware for auth/redirects
- Prisma for database
- NextAuth for authentication

This guide covers everything you need to build a complete fullstack Next.js application! 🚀
