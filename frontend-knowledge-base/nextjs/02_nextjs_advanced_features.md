# Next.js Advanced Features: Complete Guide

This guide covers advanced Next.js features including routing, layouts, API routes, middleware, optimization, caching, and deployment strategies.

## File-System Based Routing

### Pages Router (Legacy - Next.js 12 and below)

```javascript
// File structure
pages/
├── index.js              // Route: /
├── about.js              // Route: /about
├── blog/
│   ├── index.js          // Route: /blog
│   ├── [slug].js         // Route: /blog/:slug
│   └── [...slug].js      // Route: /blog/* (catch-all)
└── api/
    └── users.js          // API Route: /api/users

// pages/blog/[slug].js
export default function BlogPost({ slug }) {
    return <h1>Post: {slug}</h1>;
}
// IMP
export async function getServerSideProps({ params }) {
    return { props: { slug: params.slug } };
}
```

### App Router (New - Next.js 13+)

**Definition**: App Router uses the `app/` directory with React Server Components, streaming, and nested layouts.

```javascript
// File structure
app/
├── layout.js             // Root layout
├── page.js               // Route: /
├── loading.js            // Loading UI
├── error.js              // Error UI
├── not-found.js          // 404 UI
├── about/
│   └── page.js           // Route: /about
├── blog/
│   ├── layout.js         // Blog layout
│   ├── page.js           // Route: /blog
│   └── [slug]/
│       └── page.js       // Route: /blog/:slug
└── api/
    └── users/
        └── route.js      // API Route: /api/users

// app/layout.js (Root Layout)
export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <nav>Navigation</nav>
                {children}
                <footer>Footer</footer>
            </body>
        </html>
    );
}

// app/blog/layout.js (Nested Layout)
export default function BlogLayout({ children }) {
    return (
        <div>
            <aside>Blog Sidebar</aside>
            <main>{children}</main>
        </div>
    );
}

// app/blog/[slug]/page.js
export default async function BlogPost({ params }) {
    const post = await fetchPost(params.slug);
    
    return (
        <article>
            <h1>{post.title}</h1>
            <p>{post.content}</p>
        </article>
    );
}
```

### Dynamic Routes

```javascript
// 1. Single Dynamic Segment
// app/products/[id]/page.js → /products/1, /products/2
export default function Product({ params }) {
    return <div>Product ID: {params.id}</div>;
}

// 2. Catch-All Segments
// app/docs/[...slug]/page.js → /docs/a, /docs/a/b, /docs/a/b/c
export default function Docs({ params }) {
    // params.slug = ['a', 'b', 'c']
    return <div>Docs: {params.slug.join('/')}</div>;
}

// 3. Optional Catch-All Segments
// app/shop/[[...slug]]/page.js → /shop, /shop/a, /shop/a/b
export default function Shop({ params }) {
    // params.slug = undefined or ['a', 'b']
    return <div>Shop: {params.slug?.join('/') || 'Home'}</div>;
}

// 4. Parallel Routes
// app/dashboard/@analytics/page.js
// app/dashboard/@team/page.js
// app/dashboard/layout.js
export default function DashboardLayout({ children, analytics, team }) {
    return (
        <div>
            {children}
            {analytics}
            {team}
        </div>
    );
}

// 5. Intercepting Routes
// app/photos/[id]/page.js (Full page)
// app/@modal/(.)photos/[id]/page.js (Modal overlay)
```

## Layouts and Templates

### Layouts

**Definition**: Layouts wrap multiple pages and preserve state across navigation.

```javascript
// app/dashboard/layout.js
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }) {
    // Layout state persists across page changes
    return (
        <div className="dashboard">
            <Sidebar />
            <main>{children}</main>
        </div>
    );
}

// Nested layouts
// app/dashboard/settings/layout.js
export default function SettingsLayout({ children }) {
    return (
        <div>
            <h2>Settings</h2>
            {children}
        </div>
    );
}
```

### Templates

**Definition**: Templates are similar to layouts but create a new instance on each navigation (don't preserve state).

```javascript
// app/dashboard/template.js
export default function DashboardTemplate({ children }) {
    // Re-mounts on every navigation
    // Useful for animations, analytics
    return (
        <div className="animate-fade-in">
            {children}
        </div>
    );
}
```

## Server and Client Components

### Server Components (Default in App Router)

**Definition**: Server Components render on the server and don't send JavaScript to the client.

```javascript
// app/products/page.js (Server Component by default)
async function getProducts() {
    const res = await fetch('https://api.example.com/products', {
        cache: 'no-store' // Disable caching
    });
    return res.json();
}

export default async function ProductsPage() {
    const products = await getProducts();
    
    return (
        <div>
            {products.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}
```

**Server Component Benefits**:
- Direct database access
- Keep sensitive data on server
- Reduce client bundle size
- Automatic code splitting
- Better SEO

### Client Components

**Definition**: Client Components use client-side JavaScript for interactivity.

```javascript
// components/Counter.js
'use client'; // Mark as Client Component

import { useState } from 'react';

export default function Counter() {
    const [count, setCount] = useState(0);
    
    return (
        <button onClick={() => setCount(count + 1)}>
            Count: {count}
        </button>
    );
}
```

**When to Use Client Components**:
- Event listeners (onClick, onChange)
- State and lifecycle (useState, useEffect)
- Browser APIs (localStorage, geolocation)
- Custom hooks
- Class components

### Composition Pattern

```javascript
// app/page.js (Server Component)
import ClientCounter from '@/components/Counter'; // Client Component

export default async function HomePage() {
    const data = await fetchData(); // Server-side data fetching
    
    return (
        <div>
            <h1>Server-rendered content</h1>
            <p>{data.message}</p>
            
            {/* Client Component for interactivity */}
            <ClientCounter />
        </div>
    );
}
```

## API Routes

### Pages Router API Routes

```javascript
// pages/api/users.js
export default async function handler(req, res) {
    const { method } = req;
    
    switch (method) {
        case 'GET':
            const users = await getUsers();
            res.status(200).json(users);
            break;
            
        case 'POST':
            const { name, email } = req.body;
            const user = await createUser({ name, email });
            res.status(201).json(user);
            break;
            
        default:
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${method} Not Allowed`);
    }
}

// Dynamic API routes
// pages/api/users/[id].js
export default async function handler(req, res) {
    const { id } = req.query;
    const user = await getUser(id);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json(user);
}
```

### App Router Route Handlers

```javascript
// app/api/users/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
    const users = await getUsers();
    return NextResponse.json(users);
}

export async function POST(request) {
    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json(user, { status: 201 });
}

// Dynamic route handlers
// app/api/users/[id]/route.js
export async function GET(request, { params }) {
    const user = await getUser(params.id);
    
    if (!user) {
        return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
        );
    }
    
    return NextResponse.json(user);
}

export async function DELETE(request, { params }) {
    await deleteUser(params.id);
    return new NextResponse(null, { status: 204 });
}
```

### Advanced API Features

```javascript
// app/api/data/route.js
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

export async function GET(request) {
    // Access cookies
    const cookieStore = cookies();
    const token = cookieStore.get('token');
    
    // Access headers
    const headersList = headers();
    const userAgent = headersList.get('user-agent');
    
    // Access search params  IMP
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    
    // Set cookies in response
    const response = NextResponse.json({ data: 'success' });
    response.cookies.set('session', 'abc123', {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 24 * 7 // 1 week
    });
    
    return response;
}

// Streaming responses
export async function GET() {
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
        async start(controller) {
            for (let i = 0; i < 10; i++) {
                controller.enqueue(encoder.encode(`Data chunk ${i}\n`));
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            controller.close();
        }
    });
    
    return new Response(stream);
}
```

## Middleware

**Definition**: Middleware runs before a request is completed, allowing you to modify the response.

```javascript
// middleware.js (root level)
import { NextResponse } from 'next/server';

export function middleware(request) {
    // 1. Authentication check
    const token = request.cookies.get('token');
    
    if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // 2. Add custom headers
    const response = NextResponse.next();
    response.headers.set('x-custom-header', 'my-value');
    
    // 3. Rewrite URL
    if (request.nextUrl.pathname === '/old-path') {
        return NextResponse.rewrite(new URL('/new-path', request.url));
    }
    
    return response;
}

// Specify which routes to run middleware on
export const config = {
    matcher: [
        '/dashboard/:path*',
        '/api/:path*',
        '/((?!_next/static|_next/image|favicon.ico).*)'
    ]
};
```

### Advanced Middleware Examples

```javascript
// A/B Testing
export function middleware(request) {
    const bucket = Math.random() < 0.5 ? 'a' : 'b';
    const response = NextResponse.next();
    response.cookies.set('bucket', bucket);
    
    if (bucket === 'b') {
        return NextResponse.rewrite(new URL('/experiment-b', request.url));
    }
    
    return response;
}

// Geolocation-based redirects
export function middleware(request) {
    const country = request.geo?.country || 'US';
    
    if (country === 'IN' && !request.nextUrl.pathname.startsWith('/in')) {
        return NextResponse.redirect(new URL('/in', request.url));
    }
    
    return NextResponse.next();
}

// Rate limiting
const rateLimit = new Map();

export function middleware(request) {
    const ip = request.ip || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100;
    
    const requests = rateLimit.get(ip) || [];
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
        return new NextResponse('Too Many Requests', { status: 429 });
    }
    
    recentRequests.push(now);
    rateLimit.set(ip, recentRequests);
    
    return NextResponse.next();
}
```

## Image Optimization

**Definition**: Next.js Image component automatically optimizes images for performance.

```javascript
import Image from 'next/image';

// 1. Local images (automatic width/height)
import profilePic from '../public/profile.jpg';

export default function Avatar() {
    return <Image src={profilePic} alt="Profile" />;
}

// 2. Remote images (must specify width/height)
export default function RemoteImage() {
    return (
        <Image
            src="https://example.com/image.jpg"
            alt="Remote image"
            width={500}
            height={300}
        />
    );
}

// 3. Fill container (responsive)
export default function ResponsiveImage() {
    return (
        <div style={{ position: 'relative', width: '100%', height: '400px' }}>
            <Image
                src="/hero.jpg"
                alt="Hero"
                fill
                style={{ objectFit: 'cover' }}
            />
        </div>
    );
}

// 4. Priority loading (above the fold)
export default function HeroImage() {
    return (
        <Image
            src="/hero.jpg"
            alt="Hero"
            width={1200}
            height={600}
            priority
        />
    );
}

// 5. Lazy loading with blur placeholder
export default function LazyImage() {
    return (
        <Image
            src="/product.jpg"
            alt="Product"
            width={400}
            height={400}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,..."
        />
    );
}
```

### Image Configuration

```javascript
// next.config.js
module.exports = {
    images: {
        domains: ['example.com', 'cdn.example.com'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.example.com',
                port: '',
                pathname: '/images/**'
            }
        ],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60
    }
};
```

## Font Optimization

**Definition**: Next.js automatically optimizes fonts with zero layout shift.

```javascript
// app/layout.js
import { Inter, Roboto_Mono } from 'next/font/google';

// Google Fonts
const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter'
});

const robotoMono = Roboto_Mono({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto-mono'
});

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
            <body className={inter.className}>{children}</body>
        </html>
    );
}

// Local fonts
import localFont from 'next/font/local';

const myFont = localFont({
    src: './my-font.woff2',
    display: 'swap',
    variable: '--font-my-font'
});

// Multiple font weights
const roboto = Roboto({
    weight: ['400', '700'],
    style: ['normal', 'italic'],
    subsets: ['latin'],
    display: 'swap'
});
```

## Metadata and SEO

### Static Metadata

```javascript
// app/page.js
export const metadata = {
    title: 'Home Page',
    description: 'Welcome to my website',
    keywords: ['Next.js', 'React', 'JavaScript'],
    authors: [{ name: 'John Doe' }],
    openGraph: {
        title: 'Home Page',
        description: 'Welcome to my website',
        url: 'https://example.com',
        siteName: 'My Website',
        images: [
            {
                url: 'https://example.com/og-image.jpg',
                width: 1200,
                height: 630
            }
        ],
        locale: 'en_US',
        type: 'website'
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Home Page',
        description: 'Welcome to my website',
        images: ['https://example.com/twitter-image.jpg']
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1
        }
    }
};

export default function HomePage() {
    return <h1>Home</h1>;
}
```

### Dynamic Metadata

```javascript
// app/blog/[slug]/page.js
export async function generateMetadata({ params }) {
    const post = await fetchPost(params.slug);
    
    return {
        title: post.title,
        description: post.excerpt,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            images: [post.coverImage]
        }
    };
}

export default async function BlogPost({ params }) {
    const post = await fetchPost(params.slug);
    return <article>{post.content}</article>;
}
```

### OG Image Generation

```javascript
// app/api/og/route.jsx
import { ImageResponse } from 'next/og';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#000',
                    color: '#fff',
                    fontSize: 60
                }}
            >
                {title}
            </div>
        ),
        {
            width: 1200,
            height: 630
        }
    );
}
```

## Caching and Revalidation

### Fetch Caching

```javascript
// 1. Force cache (default)
fetch('https://api.example.com/data', { cache: 'force-cache' });

// 2. No cache
fetch('https://api.example.com/data', { cache: 'no-store' });

// 3. Revalidate after time
fetch('https://api.example.com/data', {
    next: { revalidate: 60 } // Revalidate every 60 seconds
});

// 4. Tag-based revalidation
fetch('https://api.example.com/data', {
    next: { tags: ['products'] }
});

// Revalidate by tag
// app/api/revalidate/route.js
import { revalidateTag } from 'next/cache';

export async function POST() {
    revalidateTag('products');
    return Response.json({ revalidated: true });
}
```

### Route Segment Config

```javascript
// app/page.js
export const dynamic = 'force-dynamic'; // SSR
export const revalidate = 60; // ISR every 60 seconds
export const fetchCache = 'force-no-store'; // Disable fetch cache
export const runtime = 'edge'; // Use Edge Runtime

export default async function Page() {
    const data = await fetchData();
    return <div>{data}</div>;
}
```

## Error Handling

```javascript
// app/error.js (Error boundary)
'use client';

export default function Error({ error, reset }) {
    return (
        <div>
            <h2>Something went wrong!</h2>
            <p>{error.message}</p>
            <button onClick={() => reset()}>Try again</button>
        </div>
    );
}

// app/global-error.js (Root error boundary)
'use client';

export default function GlobalError({ error, reset }) {
    return (
        <html>
            <body>
                <h2>Application Error</h2>
                <button onClick={() => reset()}>Try again</button>
            </body>
        </html>
    );
}

// app/not-found.js (404 page)
export default function NotFound() {
    return (
        <div>
            <h2>Page Not Found</h2>
            <p>Could not find requested resource</p>
        </div>
    );
}

// app/loading.js (Loading UI)
export default function Loading() {
    return <div>Loading...</div>;
}
```

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

```javascript
// next.config.js
module.exports = {
    output: 'standalone'
};
```

### Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://api.example.com
SECRET_KEY=abc123
```

```javascript
// Access in Server Components
const dbUrl = process.env.DATABASE_URL;

// Access in Client Components (must be prefixed with NEXT_PUBLIC_)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

## Summary

**Next.js Advanced Features**:

1. **Routing**: File-based routing, dynamic routes, parallel routes
2. **Layouts**: Nested layouts, templates, root layout
3. **Components**: Server Components (default), Client Components ('use client')
4. **API Routes**: Route handlers, streaming, middleware
5. **Optimization**: Image, font, metadata optimization
6. **Caching**: Fetch caching, tag-based revalidation, ISR
7. **Error Handling**: Error boundaries, loading states, 404 pages
8. **Deployment**: Vercel, Docker, self-hosting

**Key Takeaways**:
- Use Server Components by default
- Optimize images with next/image
- Implement proper metadata for SEO
- Use middleware for auth and redirects
- Cache strategically with revalidation
- Handle errors gracefully

**Interview Tips**:
- Explain Server vs Client Components
- Understand caching strategies
- Know when to use middleware
- Discuss image optimization benefits
- Explain metadata generation
