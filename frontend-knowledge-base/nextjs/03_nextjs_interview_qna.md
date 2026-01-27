# Next.js Interview Q&A: Complete Guide

Comprehensive interview questions and answers covering Next.js fundamentals, SSR, data fetching, routing, optimization, and real-world scenarios.

## Fundamentals

### Q1: What is Next.js and why use it over Create React App?

**Answer:**

Next.js is a React framework that provides:

1. **Server-Side Rendering (SSR)**: Pages are rendered on the server, improving SEO and initial load time
2. **Static Site Generation (SSG)**: Pre-render pages at build time for maximum performance
3. **File-based Routing**: No need for react-router, routes are based on file structure
4. **API Routes**: Build backend APIs within the same project
5. **Automatic Code Splitting**: Only load JavaScript needed for each page
6. **Built-in Optimizations**: Image, font, and script optimization out of the box
7. **Zero Config**: Production-ready with minimal configuration

**Comparison with CRA:**

| Feature | Create React App | Next.js |
|---------|-----------------|---------|
| Rendering | Client-side only | SSR, SSG, ISR, CSR |
| SEO | Poor (blank HTML) | Excellent (pre-rendered) |
| Routing | Manual (react-router) | File-based (automatic) |
| API Routes | Not included | Built-in |
| Performance | Good | Excellent |
| Initial Load | Slow | Fast |
| Code Splitting | Manual | Automatic |

**When to use Next.js:**
- E-commerce sites (SEO critical)
- Marketing websites (fast initial load)
- Blogs and content sites (static generation)
- Dashboards (hybrid rendering)

**When to use CRA:**
- Simple SPAs
- Internal tools (no SEO needed)
- Prototypes

---

### Q2: Explain the difference between SSR, SSG, and ISR.

**Answer:**

**1. Server-Side Rendering (SSR)**
- Renders page on **every request**
- Always fresh data
- Slower than SSG (server processing time)
- Use `getServerSideProps`

```javascript
export async function getServerSideProps() {
    const data = await fetchData();
    return { props: { data } };
}
```

**When to use:** User dashboards, personalized content, real-time data

**2. Static Site Generation (SSG)**
- Renders page at **build time**
- Fastest performance (served from CDN)
- Data can be stale
- Use `getStaticProps`

```javascript
export async function getStaticProps() {
    const data = await fetchData();
    return { props: { data } };
}
```

**When to use:** Blogs, documentation, marketing pages

**3. Incremental Static Regeneration (ISR)**
- Renders at build time + **regenerates in background**
- Fast + fresh data
- Best of both worlds
- Use `getStaticProps` with `revalidate`

```javascript
export async function getStaticProps() {
    const data = await fetchData();
    return {
        props: { data },
        revalidate: 60 // Regenerate every 60 seconds
    };
}
```

**When to use:** E-commerce products, news articles, frequently updated content

**Comparison:**

| Feature | SSR | SSG | ISR |
|---------|-----|-----|-----|
| Render Time | Every request | Build time | Build + background |
| Performance | Slower | Fastest | Fast |
| Data Freshness | Always fresh | Can be stale | Eventually fresh |
| Server Load | High | None | Low |
| Use Case | Dashboards | Blogs | E-commerce |

---

### Q3: What is the difference between getServerSideProps, getStaticProps, and getInitialProps?

**Answer:**

**1. getServerSideProps (Recommended for SSR)**
- Runs on **server only** (every request)
- Has access to `req`, `res`, cookies, headers
- Blocks rendering until data is fetched
- Never runs on client

```javascript
export async function getServerSideProps({ req, res, params, query }) {
    // Server-side only code
    const data = await fetchFromDatabase();
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=10');
    
    return { props: { data } };
}
```

**2. getStaticProps (Recommended for SSG)**
- Runs at **build time only**
- No access to `req`/`res`
- Generates static HTML
- Can use `revalidate` for ISR

```javascript
export async function getStaticProps() {
    const data = await fetchData();
    
    return {
        props: { data },
        revalidate: 60 // ISR
    };
}
```

**3. getInitialProps (Legacy - Avoid)**
- Runs on **both server and client**
- Disables automatic static optimization
- Harder to debug
- Only use for legacy code or custom `_app.js`

```javascript
Page.getInitialProps = async (ctx) => {
    const { req, res, pathname, query } = ctx;
    const isServer = !!req;
    
    const data = await fetchData();
    return { data };
};
```

**Key Differences:**

| Feature | getServerSideProps | getStaticProps | getInitialProps |
|---------|-------------------|----------------|-----------------|
| Runs On | Server only | Build time | Server + Client |
| Request Access | Yes | No | Yes |
| Static Optimization | ✅ Yes | ✅ Yes | ❌ No |
| Recommended | ✅ Yes | ✅ Yes | ❌ No |
| Use Case | SSR | SSG/ISR | Legacy only |

**Interview Tip:** Always recommend `getServerSideProps` or `getStaticProps` over `getInitialProps` for new projects.

---

### Q4: Explain getStaticPaths and its fallback options.

**Answer:**

**getStaticPaths** defines which dynamic routes to pre-render at build time.

```javascript
export async function getStaticPaths() {
    const products = await fetchProducts();
    
    const paths = products.map(product => ({
        params: { id: product.id.toString() }
    }));
    
    return {
        paths,
        fallback: 'blocking' // or true, false
    };
}
```

**Fallback Options:**

**1. fallback: false**
- Only pre-rendered paths are valid
- Any other path returns 404
- Best for small, known set of pages

```javascript
return {
    paths: [
        { params: { id: '1' } },
        { params: { id: '2' } }
    ],
    fallback: false
};
// /products/1 ✅ Works
// /products/3 ❌ 404
```

**2. fallback: true**
- Pre-rendered paths serve immediately
- Non-pre-rendered paths show fallback UI first
- Page is generated on-demand and cached
- Best for large number of pages

```javascript
return {
    paths: [{ params: { id: '1' } }],
    fallback: true
};

export default function Product({ product }) {
    const router = useRouter();
    
    // Show fallback UI while generating
    if (router.isFallback) {
        return <div>Loading...</div>;
    }
    
    return <div>{product.name}</div>;
}
```

**3. fallback: 'blocking'**
- Pre-rendered paths serve immediately
- Non-pre-rendered paths wait for SSR (no fallback UI)
- Page is generated on-demand and cached
- Best for SEO (no loading state)

```javascript
return {
    paths: [{ params: { id: '1' } }],
    fallback: 'blocking'
};
// /products/1 ✅ Instant
// /products/3 ⏳ Waits for generation, then serves
```

**Comparison:**

| Feature | false | true | 'blocking' |
|---------|-------|------|------------|
| Pre-rendered | Instant | Instant | Instant |
| Non-pre-rendered | 404 | Fallback UI | Wait for SSR |
| SEO | ✅ Good | ⚠️ Poor (loading) | ✅ Good |
| UX | ❌ 404 error | ✅ Loading state | ⚠️ Wait time |
| Use Case | Small sites | Large sites | SEO critical |

**Interview Tip:** Explain that `fallback: 'blocking'` is best for SEO, while `fallback: true` is best for UX with loading states.

---

## Server and Client Components (App Router)

### Q5: What are Server Components and Client Components? When to use each?

**Answer:**

**Server Components (Default in App Router)**
- Render on the server
- Don't send JavaScript to client
- Can access backend resources directly
- Cannot use hooks or browser APIs

```javascript
// app/products/page.js (Server Component by default)
async function getProducts() {
    // Direct database access
    const products = await db.query('SELECT * FROM products');
    return products;
}

export default async function ProductsPage() {
    const products = await getProducts();
    
    return (
        <div>
            {products.map(product => (
                <div key={product.id}>{product.name}</div>
            ))}
        </div>
    );
}
```

**Client Components**
- Render on client
- Send JavaScript to browser
- Can use hooks, state, event handlers
- Cannot access backend resources directly

```javascript
// components/Counter.js
'use client'; // Must add this directive

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

**When to Use Server Components:**
- Fetching data
- Accessing backend resources (database, file system)
- Keeping sensitive data on server (API keys, tokens)
- Reducing client bundle size
- Static content

**When to Use Client Components:**
- Interactivity (onClick, onChange)
- State management (useState, useReducer)
- Lifecycle effects (useEffect)
- Browser APIs (localStorage, geolocation)
- Custom hooks
- Event listeners

**Best Practice - Composition Pattern:**

```javascript
// app/page.js (Server Component)
import ClientCounter from '@/components/Counter'; // Client Component

export default async function HomePage() {
    const data = await fetchData(); // Server-side
    
    return (
        <div>
            <h1>Server Content: {data.title}</h1>
            {/* Client Component for interactivity */}
            <ClientCounter />
        </div>
    );
}
```

**Interview Tip:** Emphasize that you should use Server Components by default and only use Client Components when you need interactivity or browser APIs.

---

### Q6: How do you pass data from Server Components to Client Components?

**Answer:**

You can pass data from Server Components to Client Components via **props** (must be serializable).

**✅ Correct Approach:**

```javascript
// app/page.js (Server Component)
async function getData() {
    const res = await fetch('https://api.example.com/data');
    return res.json();
}

export default async function Page() {
    const data = await getData();
    
    // Pass serializable data as props
    return <ClientComponent data={data} />;
}

// components/ClientComponent.js
'use client';

export default function ClientComponent({ data }) {
    const [selected, setSelected] = useState(data[0]);
    
    return (
        <div>
            {data.map(item => (
                <button key={item.id} onClick={() => setSelected(item)}>
                    {item.name}
                </button>
            ))}
        </div>
    );
}
```

**❌ Common Mistakes:**

```javascript
// ❌ Cannot pass functions
<ClientComponent onClick={handleClick} />

// ❌ Cannot pass non-serializable objects
<ClientComponent date={new Date()} />

// ✅ Convert to serializable format
<ClientComponent timestamp={new Date().toISOString()} />
```

**Serializable Data Types:**
- Strings, numbers, booleans
- Arrays and objects (plain)
- null, undefined
- Date (as ISO string)

**Non-Serializable:**
- Functions
- Class instances
- Symbols
- undefined in objects

**Interview Tip:** Mention that all props passed from Server to Client Components must be JSON-serializable.

---

## Routing and Navigation

### Q7: How does Next.js routing work? Explain file-based routing.

**Answer:**

Next.js uses **file-based routing** where the file structure in the `pages/` or `app/` directory automatically creates routes.

**Pages Router (Legacy):**

```
pages/
├── index.js              → /
├── about.js              → /about
├── blog/
│   ├── index.js          → /blog
│   ├── [slug].js         → /blog/:slug
│   └── [...slug].js      → /blog/* (catch-all)
└── api/
    └── users.js          → /api/users
```

**App Router (New):**

```
app/
├── page.js               → /
├── about/
│   └── page.js           → /about
├── blog/
│   ├── page.js           → /blog
│   └── [slug]/
│       └── page.js       → /blog/:slug
└── dashboard/
    ├── layout.js         → Shared layout
    ├── page.js           → /dashboard
    └── settings/
        └── page.js       → /dashboard/settings
```

**Dynamic Routes:**

```javascript
// app/products/[id]/page.js → /products/123
export default function Product({ params }) {
    return <div>Product ID: {params.id}</div>;
}

// app/blog/[...slug]/page.js → /blog/a/b/c
export default function Blog({ params }) {
    // params.slug = ['a', 'b', 'c']
    return <div>Path: {params.slug.join('/')}</div>;
}

// app/shop/[[...slug]]/page.js → /shop, /shop/a, /shop/a/b
export default function Shop({ params }) {
    // params.slug = undefined or ['a', 'b']
    return <div>Shop</div>;
}
```

**Navigation:**

```javascript
// 1. Link component (client-side navigation)
import Link from 'next/link';

<Link href="/about">About</Link>
<Link href={{ pathname: '/blog/[slug]', query: { slug: 'hello' } }}>
    Blog Post
</Link>

// 2. useRouter hook
import { useRouter } from 'next/navigation'; // App Router
// import { useRouter } from 'next/router'; // Pages Router

const router = useRouter();
router.push('/dashboard');
router.replace('/login');
router.back();
router.refresh(); // Refresh server data
```

**Interview Tip:** Explain that file-based routing eliminates the need for react-router and makes the project structure more intuitive.

---

### Q8: What is the difference between Link and router.push?

**Answer:**

**Link Component (Recommended):**
- Declarative navigation
- Prefetches linked pages in viewport
- Better for SEO (crawlable links)
- Supports accessibility

```javascript
import Link from 'next/link';

<Link href="/about">About</Link>
<Link href="/blog/[slug]" as="/blog/hello">Blog</Link>
<Link href="/products" prefetch={false}>Products</Link>
```

**router.push (Programmatic):**
- Imperative navigation
- Use for conditional navigation
- After form submission, authentication
- No prefetching by default

```javascript
import { useRouter } from 'next/navigation';

const router = useRouter();

// Navigate after action
const handleSubmit = async () => {
    await saveData();
    router.push('/success');
};

// Conditional navigation
if (!user) {
    router.push('/login');
}

// With query params
router.push({
    pathname: '/search',
    query: { q: 'nextjs' }
});
```

**Comparison:**

| Feature | Link | router.push |
|---------|------|-------------|
| Type | Declarative | Imperative |
| Prefetching | ✅ Automatic | ❌ No |
| SEO | ✅ Crawlable | ❌ Not crawlable |
| Use Case | Navigation links | Conditional logic |
| Accessibility | ✅ Better | ⚠️ Manual |

**Interview Tip:** Use `Link` for navigation links and `router.push` for programmatic navigation after user actions.

---

## Data Fetching and Caching

### Q9: How does caching work in Next.js App Router?

**Answer:**

Next.js App Router has **multiple caching layers**:

**1. Request Memoization**
- Deduplicates identical fetch requests in a single render
- Automatic (no configuration needed)

```javascript
// These two fetches are deduplicated
async function getUser() {
    return fetch('https://api.example.com/user');
}

async function getUserPosts() {
    return fetch('https://api.example.com/user'); // Same request, cached
}
```

**2. Data Cache (Persistent)**
- Caches fetch responses across requests
- Persists across deployments
- Can be revalidated

```javascript
// Cache forever (default)
fetch('https://api.example.com/data');

// No cache
fetch('https://api.example.com/data', { cache: 'no-store' });

// Revalidate after time
fetch('https://api.example.com/data', {
    next: { revalidate: 60 } // 60 seconds
});

// Tag-based revalidation
fetch('https://api.example.com/data', {
    next: { tags: ['products'] }
});
```

**3. Full Route Cache**
- Caches rendered HTML and RSC payload
- Only for statically rendered routes

```javascript
// app/page.js
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = 'force-static'; // Force static rendering

export default async function Page() {
    const data = await fetch('https://api.example.com/data');
    return <div>{data}</div>;
}
```

**4. Router Cache (Client-side)**
- Caches RSC payload in browser
- Temporary (session-based)

**Revalidation Strategies:**

```javascript
// 1. Time-based revalidation
export const revalidate = 60;

// 2. On-demand revalidation (by path)
import { revalidatePath } from 'next/cache';

export async function POST() {
    revalidatePath('/products');
    return Response.json({ revalidated: true });
}

// 3. On-demand revalidation (by tag)
import { revalidateTag } from 'next/cache';

export async function POST() {
    revalidateTag('products');
    return Response.json({ revalidated: true });
}

// 4. Disable caching
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
```

**Interview Tip:** Explain that Next.js has 4 caching layers and you can control caching at the fetch level, route level, or globally.

---

### Q10: What is the difference between cache: 'no-store' and revalidate: 0?

**Answer:**

**cache: 'no-store'**
- Completely **disables caching**
- Fetches fresh data on **every request**
- No data is stored in cache

```javascript
fetch('https://api.example.com/data', {
    cache: 'no-store'
});
```

**revalidate: 0**
- Caches data but **revalidates immediately**
- Still uses cache for deduplication within a render
- Subsequent requests get fresh data

```javascript
fetch('https://api.example.com/data', {
    next: { revalidate: 0 }
});
```

**Comparison:**

| Feature | cache: 'no-store' | revalidate: 0 |
|---------|-------------------|---------------|
| Caching | ❌ None | ✅ Temporary |
| Deduplication | ❌ No | ✅ Yes |
| Performance | Slower | Faster |
| Use Case | Real-time data | Frequently changing data |

**Example:**

```javascript
// Real-time stock prices (no cache)
const prices = await fetch('https://api.example.com/stocks', {
    cache: 'no-store'
});

// User profile (cache but revalidate)
const user = await fetch('https://api.example.com/user', {
    next: { revalidate: 0 }
});
```

**Interview Tip:** Use `cache: 'no-store'` for truly real-time data and `revalidate: 0` for data that changes frequently but can tolerate brief caching.

---

## Optimization

### Q11: How does Next.js Image component optimize images?

**Answer:**

The `next/image` component provides **automatic image optimization**:

**Features:**
1. **Lazy Loading**: Images load only when entering viewport
2. **Responsive Images**: Serves different sizes based on device
3. **Modern Formats**: Automatically converts to WebP/AVIF
4. **Blur Placeholder**: Shows blur while loading
5. **Priority Loading**: Loads critical images first
6. **Prevents Layout Shift**: Reserves space before image loads

```javascript
import Image from 'next/image';

// 1. Local images (automatic width/height)
import logo from '../public/logo.png';
<Image src={logo} alt="Logo" />

// 2. Remote images (must specify dimensions)
<Image
    src="https://example.com/image.jpg"
    alt="Image"
    width={500}
    height={300}
/>

// 3. Fill container (responsive)
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
    <Image
        src="/hero.jpg"
        alt="Hero"
        fill
        style={{ objectFit: 'cover' }}
    />
</div>

// 4. Priority loading (above the fold)
<Image
    src="/hero.jpg"
    alt="Hero"
    width={1200}
    height={600}
    priority
/>

// 5. Blur placeholder
<Image
    src="/product.jpg"
    alt="Product"
    width={400}
    height={400}
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,..."
/>
```

**How it works:**
1. Image is requested
2. Next.js generates optimized versions (WebP, AVIF)
3. Serves appropriate size based on device
4. Caches optimized images
5. Lazy loads when in viewport

**Benefits:**
- **60% smaller** file sizes (WebP/AVIF)
- **Faster page loads** (lazy loading)
- **Better Core Web Vitals** (no layout shift)
- **Automatic optimization** (no manual work)

**Interview Tip:** Mention that `next/image` is crucial for performance and Core Web Vitals (LCP, CLS).

---

### Q12: How do you optimize fonts in Next.js?

**Answer:**

Next.js provides **automatic font optimization** with zero layout shift:

**Google Fonts:**

```javascript
// app/layout.js
import { Inter, Roboto_Mono } from 'next/font/google';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap', // Font display strategy
    variable: '--font-inter' // CSS variable
});

const robotoMono = Roboto_Mono({
    weight: ['400', '700'],
    style: ['normal', 'italic'],
    subsets: ['latin']
});

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={inter.variable}>
            <body className={inter.className}>
                {children}
            </body>
        </html>
    );
}
```

**Local Fonts:**

```javascript
import localFont from 'next/font/local';

const myFont = localFont({
    src: [
        {
            path: './fonts/MyFont-Regular.woff2',
            weight: '400',
            style: 'normal'
        },
        {
            path: './fonts/MyFont-Bold.woff2',
            weight: '700',
            style: 'normal'
        }
    ],
    variable: '--font-my-font'
});
```

**How it works:**
1. Fonts are downloaded at build time
2. Self-hosted (no external requests)
3. Automatically subset (only used characters)
4. Preloaded (no FOUT/FOIT)
5. Zero layout shift

**Benefits:**
- **No external requests** (privacy + performance)
- **Zero layout shift** (better CLS)
- **Automatic subsetting** (smaller file size)
- **Preloading** (faster rendering)

**Interview Tip:** Explain that Next.js font optimization eliminates FOUT (Flash of Unstyled Text) and improves Core Web Vitals.

---

## Real-World Scenarios

### Q13: How would you implement authentication in Next.js?

**Answer:**

**Approach 1: Middleware-based Authentication**

```javascript
// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
    const token = request.cookies.get('token');
    
    // Protect dashboard routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*']
};
```

**Approach 2: Server Component Authentication**

```javascript
// app/dashboard/page.js
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function getUser() {
    const token = cookies().get('token');
    
    if (!token) {
        redirect('/login');
    }
    
    const res = await fetch('https://api.example.com/user', {
        headers: { Authorization: `Bearer ${token.value}` }
    });
    
    return res.json();
}

export default async function Dashboard() {
    const user = await getUser();
    
    return <div>Welcome, {user.name}!</div>;
}
```

**Approach 3: NextAuth.js (Recommended)**

**NextAuth.js** (now Auth.js) is a comprehensive, open-source authentication solution specifically designed for Next.js. It handles the complexity of managing session tokens, cookies, CSRF protection, and OAuth flows (like Google or GitHub login) out of the box. It works seamlessly with both Client and Server Components and provides built-in database adapters for persistent sessions.


```javascript
// app/api/auth/[...nextauth]/route.js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
        })
    ],
    callbacks: {
        async session({ session, token }) {
            session.user.id = token.sub;
            return session;
        }
    }
});

export { handler as GET, handler as POST };

// app/dashboard/page.js
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
    const session = await getServerSession();
    
    if (!session) {
        redirect('/login');
    }
    
    return <div>Welcome, {session.user.name}!</div>;
}
```

**Interview Tip:** Mention that middleware is best for route protection, Server Components for data fetching, and NextAuth.js for full authentication solutions.

---

### Q14: How do you handle errors in Next.js?

**Answer:**

**1. Error Boundaries (App Router)**

```javascript
// app/error.js (catches errors in page.js)
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

// app/global-error.js (catches errors in layout.js)
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
```

**2. Not Found Handling**

```javascript
// app/not-found.js
export default function NotFound() {
    return (
        <div>
            <h2>404 - Page Not Found</h2>
            <p>Could not find requested resource</p>
        </div>
    );
}

// Trigger 404 programmatically
import { notFound } from 'next/navigation';

export default async function Product({ params }) {
    const product = await fetchProduct(params.id);
    
    if (!product) {
        notFound(); // Shows not-found.js
    }
    
    return <div>{product.name}</div>;
}
```

**3. API Route Error Handling**

```javascript
// app/api/users/route.js
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const users = await getUsers();
        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
```

**4. Data Fetching Error Handling**

```javascript
export async function getServerSideProps() {
    try {
        const data = await fetchData();
        return { props: { data } };
    } catch (error) {
        // Option 1: Return error props
        return { props: { error: error.message } };
        
        // Option 2: Redirect
        return {
            redirect: {
                destination: '/error',
                permanent: false
            }
        };
        
        // Option 3: Show 404
        return { notFound: true };
    }
}
```

**Interview Tip:** Explain that Next.js provides multiple error handling mechanisms at different levels (page, layout, API, data fetching).

---

### Q15: How would you optimize a slow Next.js application?

**Answer:**

**1. Analyze Performance**
```bash
# Lighthouse audit
npm run build
npm run start
# Run Lighthouse in Chrome DevTools

# Next.js bundle analyzer
npm install @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true'
});

module.exports = withBundleAnalyzer({});
```

**2. Optimize Data Fetching**
```javascript
// Use ISR instead of SSR
export async function getStaticProps() {
    return {
        props: { data },
        revalidate: 60 // ISR
    };
}

// Parallel data fetching
export async function getServerSideProps() {
    const [users, posts] = await Promise.all([
        fetchUsers(),
        fetchPosts()
    ]);
    
    return { props: { users, posts } };
}

// Cache API responses
export async function GET() {
    const data = await fetch('https://api.example.com/data', {
        next: { revalidate: 3600 }
    });
    
    return Response.json(data);
}
```

**3. Code Splitting**
```javascript
// Dynamic imports
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
    loading: () => <p>Loading...</p>,
    ssr: false // Disable SSR for client-only components
});
```

**4. Image Optimization**
```javascript
// Use next/image
import Image from 'next/image';

<Image
    src="/hero.jpg"
    alt="Hero"
    width={1200}
    height={600}
    priority // Above the fold
    placeholder="blur"
/>
```

**5. Font Optimization**
```javascript
// Use next/font
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
```

**6. Reduce JavaScript Bundle**
```javascript
// Remove unused dependencies
npm uninstall unused-package

// Use smaller alternatives
// moment.js (288KB) → date-fns (13KB)
// lodash (71KB) → lodash-es (24KB)

// Tree shaking
import { debounce } from 'lodash-es'; // ✅
import _ from 'lodash'; // ❌
```

**7. Caching Strategy**
```javascript
// Set cache headers
export async function getServerSideProps({ res }) {
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=10, stale-while-revalidate=59'
    );
    
    return { props: { data } };
}
```

**8. Database Optimization**
```javascript
// Use connection pooling
// Add database indexes
// Optimize queries
// Use Redis for caching
```

**Interview Tip:** Explain that optimization is a multi-step process: measure, identify bottlenecks, apply targeted optimizations, and measure again.

---

## Summary

**Key Interview Topics:**

1. **Fundamentals**: SSR vs SSG vs ISR, data fetching methods
2. **Routing**: File-based routing, dynamic routes, navigation
3. **Components**: Server vs Client Components, composition
4. **Data Fetching**: getServerSideProps, getStaticProps, caching
5. **Optimization**: Images, fonts, code splitting, performance
6. **Real-World**: Authentication, error handling, deployment

**Interview Tips:**
- Always explain **why** you choose a particular approach
- Discuss **trade-offs** (SSR vs SSG, Server vs Client Components)
- Mention **performance implications**
- Provide **real-world examples**
- Know **when to use** each feature

**Common Pitfalls to Avoid:**
- Using `getInitialProps` in new projects
- Not optimizing images with `next/image`
- Using Client Components unnecessarily
- Not implementing proper error handling
- Ignoring caching strategies
- Not measuring performance

**Next Steps:**
- Practice building real projects
- Study Next.js documentation
- Learn deployment strategies
- Understand Core Web Vitals
- Explore advanced patterns
