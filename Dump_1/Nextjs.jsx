# Next.js Complete Deep Dive Notes

## Table of Contents
1. [Introduction & Core Concepts](#introduction)
2. [Routing System](#routing)
3. [Layouts & Pages](#layouts-pages)
4. [Navigation & Linking](#navigation)
5. [Server vs Client Components](#components)
6. [Data Fetching](#data-fetching)
7. [Data Mutation & Actions](#data-mutation)
8. [Caching & Revalidation](#caching)
9. [Error Handling](#error-handling)
10. [Styling (CSS)](#styling)
11. [Image Optimization](#images)
12. [Font Optimization](#fonts)
13. [Route Handlers (API Routes)](#route-handlers)
14. [Proxy & Rewrites](#proxy)
15. [Deployment](#deployment)
16. [Upgrading](#upgrading)
17. [Accessibility](#accessibility)
18. [Fast Refresh](#fast-refresh)
19. [Next.js vs React](#comparison)

---

## 1. Introduction & Core Concepts {#introduction}

### What is Next.js?
Next.js is a React framework that provides:
- **Server-Side Rendering (SSR)** - Pages rendered on server
- **Static Site Generation (SSG)** - Pre-built HTML at build time
- **File-based Routing** - No need for react-router
- **API Routes** - Backend endpoints in same project
- **Automatic Code Splitting** - Only load what's needed
- **Image & Font Optimization** - Built-in optimizations

### App Router vs Pages Router
- **App Router** (app directory) - New, recommended since Next.js 13+
- **Pages Router** (pages directory) - Legacy, still supported

**These notes focus on App Router.**

---

## 2. Routing System {#routing}

### Basic Routing
Next.js uses **file-system based routing**. Every folder in `app/` directory becomes a route.

```
app/
├── page.tsx          → /
├── about/
│   └── page.tsx      → /about
├── blog/
│   └── page.tsx      → /blog
└── contact/
    └── page.tsx      → /contact
```

### Special Files
- `page.tsx` - Makes route publicly accessible
- `layout.tsx` - Shared UI for route segment
- `loading.tsx` - Loading UI (Suspense boundary)
- `error.tsx` - Error UI
- `not-found.tsx` - 404 UI
- `route.ts` - API endpoint

### Nested Routes
Create deeper route hierarchies:

```
app/
├── blog/
│   ├── page.tsx                    → /blog
│   ├── [slug]/
│   │   └── page.tsx                → /blog/post-title
│   └── category/
│       ├── page.tsx                → /blog/category
│       └── [categoryId]/
│           └── page.tsx            → /blog/category/tech
```

**Example: Blog Post Page**
```tsx
// app/blog/[slug]/page.tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return (
    <div>
      <h1>Blog Post: {params.slug}</h1>
      <p>Reading article about {params.slug}</p>
    </div>
  );
}

// Accessible at: /blog/my-first-post, /blog/nextjs-tutorial, etc.
```

### Dynamic Routes with Multiple Segments

```
app/
└── shop/
    └── [category]/
        └── [productId]/
            └── page.tsx            → /shop/electronics/laptop-123
```

**Example:**
```tsx
// app/shop/[category]/[productId]/page.tsx
export default function ProductPage({ 
  params 
}: { 
  params: { category: string; productId: string } 
}) {
  return (
    <div>
      <h1>Category: {params.category}</h1>
      <h2>Product ID: {params.productId}</h2>
    </div>
  );
}

// URL: /shop/electronics/laptop-123
// params = { category: 'electronics', productId: 'laptop-123' }
```

### Catch-All Routes
Catch unlimited segments using `[...slug]`:

```
app/
└── docs/
    └── [...slug]/
        └── page.tsx    → /docs/a, /docs/a/b, /docs/a/b/c
```

**Example:**
```tsx
// app/docs/[...slug]/page.tsx
export default function DocsPage({ 
  params 
}: { 
  params: { slug: string[] } 
}) {
  return (
    <div>
      <h1>Documentation</h1>
      <p>Path: {params.slug.join(' / ')}</p>
    </div>
  );
}

// URL: /docs/getting-started/installation
// params.slug = ['getting-started', 'installation']
```

### Optional Catch-All Routes
Use `[[...slug]]` to make catch-all optional:

```
app/
└── shop/
    └── [[...categories]]/
        └── page.tsx    → /shop, /shop/electronics, /shop/electronics/laptops
```

### Route Groups
Organize routes without affecting URL structure using `(folder)`:

```
app/
├── (marketing)/
│   ├── about/
│   │   └── page.tsx        → /about
│   └── pricing/
│       └── page.tsx        → /pricing
└── (shop)/
    ├── products/
    │   └── page.tsx        → /products
    └── cart/
        └── page.tsx        → /cart
```

Route groups allow different layouts for different sections without changing URLs.

### Parallel Routes
Load multiple pages in same layout using `@folder`:

```
app/
├── @dashboard/
│   └── page.tsx
├── @analytics/
│   └── page.tsx
└── layout.tsx
```

**Example:**
```tsx
// app/layout.tsx
export default function Layout({
  children,
  dashboard,
  analytics,
}: {
  children: React.ReactNode;
  dashboard: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2">
        {dashboard}
        {analytics}
      </div>
    </div>
  );
}
```

### Intercepting Routes
Intercept routes for modals using `(..)folder`:

```
app/
├── photos/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
└── @modal/
    └── (..)photos/
        └── [id]/
            └── page.tsx
```

---

## 3. Layouts & Pages {#layouts-pages}

### Root Layout (Required)
Every app needs a root layout:

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header>My Site Header</header>
        <main>{children}</main>
        <footer>© 2024 My Site</footer>
      </body>
    </html>
  );
}
```

**Key Points:**
- Must include `<html>` and `<body>` tags
- Cannot be a Client Component
- Shared across all pages
- Only re-renders children, not the layout itself

### Nested Layouts
Create layouts for specific route segments:

```
app/
├── layout.tsx                  (Root Layout)
├── page.tsx                    → /
├── blog/
│   ├── layout.tsx              (Blog Layout)
│   ├── page.tsx                → /blog
│   └── [slug]/
│       └── page.tsx            → /blog/post
```

**Example: Blog Layout**
```tsx
// app/blog/layout.tsx
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <aside>
        <h2>Blog Sidebar</h2>
        <nav>
          <ul>
            <li>Recent Posts</li>
            <li>Categories</li>
          </ul>
        </nav>
      </aside>
      <article>{children}</article>
    </div>
  );
}
```

Layouts nest automatically. When visiting `/blog/post`, you get:
```
Root Layout
  └── Blog Layout
      └── Post Page
```

### Pages
Pages are UI unique to a route:

```tsx
// app/dashboard/page.tsx
export default function DashboardPage() {
  return <h1>Dashboard</h1>;
}
```

### Templates
Similar to layouts but create new instance on navigation:

```tsx
// app/template.tsx
export default function Template({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

**Layout vs Template:**
- **Layout** - Persists across navigation, state preserved
- **Template** - New instance on each navigation, state reset

### Metadata
Add SEO metadata:

```tsx
// app/blog/[slug]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ 
  params 
}: { 
  params: { slug: string } 
}): Promise<Metadata> {
  const post = await getPost(params.slug);
  
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default function BlogPost({ params }) {
  // ...
}
```

---

## 4. Navigation & Linking {#navigation}

### Link Component
Use `<Link>` for client-side navigation:

```tsx
import Link from 'next/link';

export default function Nav() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/blog">Blog</Link>
      
      {/* Dynamic route */}
      <Link href="/blog/my-post">My Post</Link>
      
      {/* With query params */}
      <Link href="/search?q=nextjs">Search</Link>
      
      {/* Replace history */}
      <Link href="/login" replace>Login</Link>
      
      {/* Prefetch disabled */}
      <Link href="/heavy-page" prefetch={false}>Heavy Page</Link>
    </nav>
  );
}
```

### useRouter Hook
Programmatic navigation:

```tsx
'use client';

import { useRouter } from 'next/navigation';

export default function LoginButton() {
  const router = useRouter();

  const handleLogin = async () => {
    const success = await loginUser();
    
    if (success) {
      router.push('/dashboard');      // Navigate
      // router.replace('/dashboard');   // Replace history
      // router.back();                  // Go back
      // router.forward();               // Go forward
      // router.refresh();               // Refresh current route
    }
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

### usePathname Hook
Get current pathname:

```tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav>
      <Link 
        href="/" 
        className={pathname === '/' ? 'active' : ''}
      >
        Home
      </Link>
      <Link 
        href="/about" 
        className={pathname === '/about' ? 'active' : ''}
      >
        About
      </Link>
    </nav>
  );
}
```

### useSearchParams Hook
Access query parameters:

```tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function SearchPage() {
  const searchParams = useSearchParams();
  
  const query = searchParams.get('q');
  const category = searchParams.get('category');

  return (
    <div>
      <h1>Search Results</h1>
      <p>Query: {query}</p>
      <p>Category: {category}</p>
    </div>
  );
}

// URL: /search?q=nextjs&category=tutorials
// query = 'nextjs'
// category = 'tutorials'
```

### Scroll Behavior
Control scroll on navigation:

```tsx
// Disable scroll to top
<Link href="/about" scroll={false}>About</Link>

// Programmatic
router.push('/about', { scroll: false });
```

### Prefetching
Next.js automatically prefetches visible links:

```tsx
// Prefetch enabled (default in production)
<Link href="/about">About</Link>

// Prefetch disabled
<Link href="/about" prefetch={false}>About</Link>
```

---

## 5. Server vs Client Components {#components}

### Server Components (Default)
All components in `app/` are Server Components by default:

```tsx
// app/blog/page.tsx
// This is a Server Component
async function getPosts() {
  const res = await fetch('https://api.example.com/posts');
  return res.json();
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ Direct database/API access
- ✅ Secure (secrets stay on server)
- ✅ Smaller bundle size
- ✅ Better SEO
- ✅ Can use async/await directly

**Limitations:**
- ❌ No useState, useEffect, event handlers
- ❌ No browser APIs
- ❌ No client-side interactivity

### Client Components
Add `'use client'` directive:

```tsx
'use client';

// app/components/Counter.tsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

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

**When to use Client Components:**
- Event handlers (onClick, onChange, etc.)
- State and lifecycle (useState, useEffect)
- Browser APIs (localStorage, geolocation)
- Custom hooks
- React class components

### Composition Pattern
Mix Server and Client Components:

```tsx
// app/dashboard/page.tsx (Server Component)
import ClientSidebar from './ClientSidebar';
import { getUser, getPosts } from '@/lib/db';

export default async function Dashboard() {
  const user = await getUser();
  const posts = await getPosts();

  return (
    <div>
      {/* Server Component renders data */}
      <header>
        <h1>Welcome, {user.name}</h1>
      </header>

      {/* Client Component for interactivity */}
      <ClientSidebar posts={posts} />

      {/* Server Component for content */}
      <main>
        {posts.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
          </article>
        ))}
      </main>
    </div>
  );
}
```

```tsx
'use client';

// app/dashboard/ClientSidebar.tsx
import { useState } from 'react';

export default function ClientSidebar({ posts }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle Sidebar
      </button>
      {isOpen && (
        <ul>
          {posts.map(post => (
            <li key={post.id}>{post.title}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
```

### Important Rules
1. **Server → Client:** Can pass Server Components as props to Client Components
2. **Client ↛ Server:** Cannot import Server Components into Client Components directly
3. **Props:** Must be serializable (no functions, classes, Date objects)

**Example: Passing Server Component to Client**
```tsx
// ✅ Correct
'use client';

export default function ClientWrapper({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(true);
  
  return <div>{isOpen && children}</div>;
}

// app/page.tsx (Server Component)
import ClientWrapper from './ClientWrapper';
import ServerContent from './ServerContent';

export default function Page() {
  return (
    <ClientWrapper>
      <ServerContent />  {/* Server Component passed as children */}
    </ClientWrapper>
  );
}
```

---

## 6. Data Fetching {#data-fetching}

### Server Components (Recommended)
Fetch data directly in Server Components:

```tsx
// app/posts/page.tsx
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    cache: 'force-cache', // Default: cache forever (SSG)
  });
  
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

### Fetch Options

#### 1. Static Data (SSG)
```tsx
// Cached forever, built at build time
const res = await fetch('https://api.example.com/posts', {
  cache: 'force-cache', // Default
});
```

#### 2. Dynamic Data (SSR)
```tsx
// Fetched on every request
const res = await fetch('https://api.example.com/posts', {
  cache: 'no-store',
});
```

#### 3. Revalidated Data (ISR)
```tsx
// Cached, revalidated every 60 seconds
const res = await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 },
});
```

### Parallel Data Fetching
```tsx
async function getUser() {
  const res = await fetch('https://api.example.com/user');
  return res.json();
}

async function getPosts() {
  const res = await fetch('https://api.example.com/posts');
  return res.json();
}

export default async function Dashboard() {
  // Fetch in parallel
  const [user, posts] = await Promise.all([
    getUser(),
    getPosts(),
  ]);

  return (
    <div>
      <h1>{user.name}</h1>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

### Sequential Data Fetching
```tsx
export default async function ProfilePage({ params }) {
  // Wait for user first
  const user = await getUser(params.id);
  
  // Then fetch posts (depends on user data)
  const posts = await getUserPosts(user.id);

  return (
    <div>
      <h1>{user.name}</h1>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

### Database Queries
```tsx
// lib/db.ts
import { sql } from '@vercel/postgres';

export async function getPosts() {
  const { rows } = await sql`
    SELECT * FROM posts 
    ORDER BY created_at DESC
  `;
  return rows;
}

// app/blog/page.tsx
import { getPosts } from '@/lib/db';

export default async function BlogPage() {
  const posts = await getPosts();
  
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

### Client-Side Fetching
When you need client-side data fetching:

```tsx
'use client';

import { useState, useEffect } from 'react';

export default function ClientPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

### Using SWR (Recommended for Client)
```tsx
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Posts() {
  const { data, error, isLoading } = useSWR('/api/posts', fetcher);

  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

---

## 7. Data Mutation & Actions {#data-mutation}

### Server Actions
Server-side mutations without API routes:

```tsx
// app/posts/create/page.tsx
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Server Action
async function createPost(formData: FormData) {
  'use server';
  
  const title = formData.get('title');
  const content = formData.get('content');

  // Save to database
  await db.posts.create({
    data: { title, content },
  });

  // Revalidate cache
  revalidatePath('/posts');
  
  // Redirect
  redirect('/posts');
}

export default function CreatePostPage() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

### Server Actions with useFormState
Handle form state:

```tsx
'use client';

import { useFormState } from 'react-dom';
import { createPost } from './actions';

export default function CreatePostForm() {
  const [state, formAction] = useFormState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      
      {state?.error && (
        <p className="error">{state.error}</p>
      )}
      
      <button type="submit">Create Post</button>
    </form>
  );
}
```

```tsx
// app/posts/create/actions.ts
'use server';

import { z } from 'zod';

const schema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

export async function createPost(prevState: any, formData: FormData) {
  const validatedFields = schema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!validatedFields.success) {
    return {
      error: 'Invalid fields',
    };
  }

  try {
    await db.posts.create({
      data: validatedFields.data,
    });
    
    revalidatePath('/posts');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to create post' };
  }
}
```

### Server Actions with useFormStatus
Show pending state:

```tsx
'use client';

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  );
}

export default function CreatePostForm() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Title" />
      <textarea name="content" placeholder="Content" />
      <SubmitButton />
    </form>
  );
}
```

### Optimistic Updates
Update UI before server responds:

```tsx
'use client';

import { useOptimistic } from 'react';
import { addTodo } from './actions';

export default function TodoList({ todos }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, newTodo]
  );

  async function handleSubmit(formData: FormData) {
    const title = formData.get('title');
    
    // Add optimistically
    addOptimisticTodo({
      id: Date.now(),
      title,
      completed: false,
    });

    // Send to server
    await addTodo(formData);
  }

  return (
    <div>
      <form action={handleSubmit}>
        <input name="title" placeholder="Add todo" />
        <button type="submit">Add</button>
      </form>

      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Route Handlers (API Routes)
Alternative to Server Actions:

```tsx
// app/api/posts/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const posts = await db.posts.findMany();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  const post = await db.posts.create({
    data: body,
  });
  
  return NextResponse.json(post, { status: 201 });
}
```

---

## 8. Caching & Revalidation {#caching}

Next.js has multiple caching layers:

### 1. Request Memoization
Automatic deduplication of identical requests:

```tsx
async function getUser() {
  const res = await fetch('https://api.example.com/user');
  return res.json();
}

export default async function Page() {
  // These 3 calls only make 1 network request
  const user1 = await getUser();
  const user2 = await getUser();
  const user3 = await getUser();

  return <div>{user1.name}</div>;
}
```

### 2. Data Cache
Persistent cache across requests:

```tsx
// Cached forever (default)
await fetch('https://api.example.com/posts', {
  cache: 'force-cache',
});

// Never cached
await fetch('https://api.example.com/posts', {
  cache: 'no-store',
});

// Cached with revalidation
await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 }, // Revalidate every 60 seconds
});
```

### 3. Full Route Cache
Next.js caches rendered routes at build time:

```tsx
// app/blog/page.tsx
// This page is cached at build time
export default async function BlogPage() {
  const posts = await fetch('https://api.example.com/posts', {
    cache: 'force-cache',
  });

  return <div>{/* ... */}</div>;
}
```

### 4. Router Cache
Client-side cache of visited routes (30 seconds default):

```tsx
// Prefetched links are cached
<Link href="/about">About</Link>
```

### Revalidation Strategies

#### 1. Time-based Revalidation
```tsx
// Revalidate every 60 seconds
const res = await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 },
});
```

#### 2. On-Demand Revalidation
```tsx
// app/actions.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function createPost() {
  // Save to database
  await db.posts.create({ /* ... */ });

  // Revalidate specific path
  revalidatePath('/blog');
  
  // Or revalidate by tag
  revalidateTag('posts');
}
```

#### 3. Tag-based Revalidation
```tsx
// Fetch with tags
const res = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'] },
});

// Revalidate all requests with 'posts' tag
revalidateTag('posts');
```

### Route Segment Config
Configure caching at route level:

```tsx
// app/blog/page.tsx

// Opt out of caching
export const dynamic = 'force-dynamic';

// Set revalidation period
export const revalidate = 60; // seconds

// Set dynamic params behavior
export const dynamicParams = true; // true | false

// Set fetch cache
export const fetchCache = 'default-cache'; // Options: 'auto' | 'default-cache' | 'only-cache' | 'force-cache' | 'force-no-store' | 'default-no-store' | 'only-no-store'

export default async function BlogPage() {
  // This page is dynamic (not cached)
  const posts = await fetch('https://api.example.com/posts');
  return <div>{/* ... */}</div>;
}
```

### Opting Out of Cache
```tsx
// Option 1: Using cache option
fetch('https://api.example.com/data', { cache: 'no-store' });

// Option 2: Using revalidate
fetch('https://api.example.com/data', { next: { revalidate: 0 } });

// Option 3: Route segment config
export const dynamic = 'force-dynamic';

// Option 4: Using cookies or headers (auto opts out)
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = cookies();
  // This page is now dynamic
}
```

### generateStaticParams
Pre-generate dynamic routes at build time:

```tsx
// app/blog/[slug]/page.tsx

export async function generateStaticParams() {
  const posts = await fetch('https://api.example.com/posts').then(r => r.json());

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);
  return <div>{post.title}</div>;
}

// At build time, Next.js generates:
// /blog/post-1
// /blog/post-2
// /blog/post-3
// etc.
```

---

## 9. Error Handling {#error-handling}

### error.tsx
Catch errors in route segments:

```tsx
'use client'; // Error components must be Client Components

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

**How it works:**
- Wraps route segment in React Error Boundary
- Catches errors in Server Components, Client Components, and data fetching
- `reset()` function re-renders the segment

### Error Boundary Hierarchy
```
app/
├── error.tsx              → Catches errors in root layout
├── blog/
│   ├── error.tsx          → Catches errors in blog section
│   └── [slug]/
│       ├── error.tsx      → Catches errors in specific post
│       └── page.tsx
```

**Example: Blog Error Handler**
```tsx
'use client';

import { useEffect } from 'react';

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Blog error:', error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>Failed to load blog posts</h2>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Reload posts</button>
    </div>
  );
}
```

### global-error.tsx
Catch errors in root layout:

```tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

**Note:** Must define `<html>` and `<body>` tags since it replaces root layout.

### not-found.tsx
Handle 404 errors:

```tsx
// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div>
      <h2>404 - Page Not Found</h2>
      <p>Could not find requested resource</p>
      <Link href="/">Return Home</Link>
    </div>
  );
}
```

**Trigger manually:**
```tsx
import { notFound } from 'next/navigation';

async function getPost(slug: string) {
  const post = await db.posts.findUnique({ where: { slug } });
  
  if (!post) {
    notFound(); // Triggers not-found.tsx
  }
  
  return post;
}

export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);
  return <div>{post.title}</div>;
}
```

### Nested not-found.tsx
```
app/
├── not-found.tsx           → Root 404
└── blog/
    ├── not-found.tsx       → Blog-specific 404
    └── [slug]/
        └── page.tsx
```

### Error Handling in Server Actions
```tsx
'use server';

export async function createPost(formData: FormData) {
  try {
    const post = await db.posts.create({
      data: {
        title: formData.get('title'),
        content: formData.get('content'),
      },
    });
    
    revalidatePath('/blog');
    return { success: true, post };
  } catch (error) {
    return { 
      success: false, 
      error: 'Failed to create post' 
    };
  }
}
```

### Error Handling in Route Handlers
```tsx
// app/api/posts/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const posts = await db.posts.findMany();
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
```

### Loading States with Suspense
```tsx
// app/blog/page.tsx
import { Suspense } from 'react';

async function Posts() {
  const posts = await getPosts();
  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}

export default function BlogPage() {
  return (
    <div>
      <h1>Blog</h1>
      <Suspense fallback={<div>Loading posts...</div>}>
        <Posts />
      </Suspense>
    </div>
  );
}
```

### loading.tsx
Automatic loading UI:

```tsx
// app/blog/loading.tsx
export default function Loading() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Loading blog posts...</p>
    </div>
  );
}
```

**Wraps page in Suspense automatically:**
```tsx
<Suspense fallback={<Loading />}>
  <Page />
</Suspense>
```

### Streaming with Suspense
Stream different parts independently:

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

async function Analytics() {
  const data = await getAnalytics(); // Slow query
  return <div>{/* Analytics UI */}</div>;
}

async function RecentActivity() {
  const activity = await getActivity(); // Fast query
  return <div>{/* Activity UI */}</div>;
}

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Fast content loads first */}
      <Suspense fallback={<div>Loading activity...</div>}>
        <RecentActivity />
      </Suspense>

      {/* Slow content streams in later */}
      <Suspense fallback={<div>Loading analytics...</div>}>
        <Analytics />
      </Suspense>
    </div>
  );
}
```

---

## 10. Styling (CSS) {#styling}

### 1. CSS Modules
Scoped CSS files:

```tsx
// app/components/Button.module.css
.button {
  background: blue;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
}

.button:hover {
  background: darkblue;
}
```

```tsx
// app/components/Button.tsx
import styles from './Button.module.css';

export default function Button({ children }) {
  return (
    <button className={styles.button}>
      {children}
    </button>
  );
}
```

### 2. Global CSS
```css
/* app/globals.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
}
```

```tsx
// app/layout.tsx
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Tailwind CSS
Install and configure:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

```js
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
      },
    },
  },
  plugins: [],
};
```

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```tsx
// Usage
export default function Button() {
  return (
    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      Click me
    </button>
  );
}
```

### 4. CSS-in-JS (styled-components, emotion)

**styled-components:**
```tsx
// app/registry.tsx
'use client';

import { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export default function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    styledComponentsStyleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') return <>{children}</>;

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
      {children}
    </StyleSheetManager>
  );
}
```

```tsx
// app/layout.tsx
import StyledComponentsRegistry from './registry';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <StyledComponentsRegistry>
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
```

```tsx
// app/components/Button.tsx
'use client';

import styled from 'styled-components';

const StyledButton = styled.button`
  background: blue;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  
  &:hover {
    background: darkblue;
  }
`;

export default function Button({ children }) {
  return <StyledButton>{children}</StyledButton>;
}
```

### 5. Sass/SCSS
```bash
npm install sass
```

```scss
// app/styles/theme.scss
$primary-color: #3b82f6;
$secondary-color: #64748b;

@mixin button {
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: bold;
}

.button-primary {
  @include button;
  background: $primary-color;
  color: white;
}
```

```tsx
import './styles/theme.scss';

export default function Button() {
  return <button className="button-primary">Click me</button>;
}
```

### 6. CSS Variables
```css
/* app/globals.css */
:root {
  --primary: #3b82f6;
  --secondary: #64748b;
  --spacing: 1rem;
}

[data-theme='dark'] {
  --primary: #60a5fa;
  --secondary: #94a3b8;
}
```

```tsx
export default function Button() {
  return (
    <button style={{ 
      background: 'var(--primary)', 
      padding: 'var(--spacing)' 
    }}>
      Click me
    </button>
  );
}
```

---

## 11. Image Optimization {#images}

### next/image Component
Automatic image optimization:

```tsx
import Image from 'next/image';

export default function ProfilePage() {
  return (
    <div>
      {/* Local image */}
      <Image
        src="/profile.jpg"
        alt="Profile picture"
        width={500}
        height={500}
      />

      {/* Remote image */}
      <Image
        src="https://example.com/photo.jpg"
        alt="Photo"
        width={800}
        height={600}
      />
    </div>
  );
}
```

### Image Props

```tsx
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  
  // Priority: Load immediately (above fold)
  priority
  
  // Quality: 1-100 (default: 75)
  quality={90}
  
  // Placeholder: blur effect while loading
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  
  // Fill parent container
  fill
  style={{ objectFit: 'cover' }}
  
  // Sizes for responsive images
  sizes="(max-width: 768px) 100vw, 50vw"
  
  // Loading strategy
  loading="lazy" // or "eager"
  
  // Callback when loaded
  onLoad={() => console.log('Image loaded')}
/>
```

### Fill Container Pattern
```tsx
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
  <Image
    src="/hero.jpg"
    alt="Hero"
    fill
    style={{ objectFit: 'cover' }}
    sizes="100vw"
  />
</div>
```

### Responsive Images
```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  sizes="(max-width: 640px) 100vw, 
         (max-width: 1024px) 50vw, 
         33vw"
/>
```

### Remote Images
Configure allowed domains:

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
    ],
  },
};
```

### Static Import (Automatic size detection)
```tsx
import profilePic from './profile.jpg';
import Image from 'next/image';

export default function Profile() {
  return (
    <Image
      src={profilePic}
      alt="Profile"
      // width and height automatically set
      placeholder="blur" // Automatic blur placeholder
    />
  );
}
```

### Dynamic Images from API
```tsx
async function getPost(slug: string) {
  const res = await fetch(`https://api.example.com/posts/${slug}`);
  return res.json();
}

export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);

  return (
    <div>
      <Image
        src={post.coverImage}
        alt={post.title}
        width={1200}
        height={630}
        priority
      />
      <h1>{post.title}</h1>
    </div>
  );
}
```

### Image Loader
Custom image transformation:

```js
// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './lib/imageLoader.js',
  },
};
```

```js
// lib/imageLoader.js
export default function cloudinaryLoader({ src, width, quality }) {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  return `https://res.cloudinary.com/demo/image/upload/${params.join(',')}${src}`;
}
```

### Background Images
```tsx
<div className="relative h-screen">
  <Image
    src="/background.jpg"
    alt="Background"
    fill
    style={{ objectFit: 'cover', zIndex: -1 }}
    quality={100}
  />
  <div className="relative z-10">
    <h1>Content on top</h1>
  </div>
</div>
```

---

## 12. Font Optimization {#fonts}

### next/font/google
Automatic Google Fonts optimization:

```tsx
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### Multiple Fonts
```tsx
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
});

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

```css
/* globals.css */
.font-sans {
  font-family: var(--font-inter);
}

.font-serif {
  font-family: var(--font-playfair);
}
```

### Local Fonts
```tsx
import localFont from 'next/font/local';

const myFont = localFont({
  src: './fonts/MyFont.woff2',
  display: 'swap',
});

// Multiple weights
const customFont = localFont({
  src: [
    {
      path: './fonts/CustomFont-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/CustomFont-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-custom',
});
```

### Font Options
```tsx
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap', // 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
  variable: '--font-inter',
});
```

### Using Fonts in Components
```tsx
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  weight: '400',
  subsets: ['latin'],
});

export default function Article() {
  return (
    <article className={roboto.className}>
      <h1>Article Title</h1>
      <p>Article content...</p>
    </article>
  );
}
```

---

## 13. Route Handlers (API Routes) {#route-handlers}

### Basic Route Handler
```tsx
// app/api/hello/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Hello World' });
}
```

### All HTTP Methods
```tsx
// app/api/posts/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const posts = await db.posts.findMany();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const post = await db.posts.create({ data: body });
  return NextResponse.json(post, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const post = await db.posts.update({
    where: { id: body.id },
    data: body,
  });
  return NextResponse.json(post);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  await db.posts.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const post = await db.posts.update({
    where: { id: body.id },
    data: body,
  });
  return NextResponse.json(post);
}
```

### Dynamic Route Handlers
```tsx
// app/api/posts/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const post = await db.posts.findUnique({
    where: { id: params.id },
  });

  if (!post) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(post);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await db.posts.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
```

### Request Object
```tsx
export async function GET(request: Request) {
  // URL and query params
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const page = searchParams.get('page') || '1';

  // Headers
  const token = request.headers.get('authorization');
  const userAgent = request.headers.get('user-agent');

  // Cookies
  const { cookies } = await import('next/headers');
  const cookieStore = cookies();
  const session = cookieStore.get('session');

  return NextResponse.json({ query, page, token });
}

export async function POST(request: Request) {
  // JSON body
  const body = await request.json();

  // FormData
  const formData = await request.formData();
  const name = formData.get('name');

  // Text
  const text = await request.text();

  return NextResponse.json({ body });
}
```

### Response Types
```tsx
// JSON
return NextResponse.json({ data: 'value' });

// With status and headers
return NextResponse.json(
  { error: 'Not found' },
  { 
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'X-Custom-Header': 'value',
    },
  }
);

// Redirect
return NextResponse.redirect(new URL('/login', request.url));

// Rewrite (internal redirect)
return NextResponse.rewrite(new URL('/api/v2/posts', request.url));

// Set cookies
const response = NextResponse.json({ success: true });
response.cookies.set('session', 'token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 1 week
});
return response;

// Stream response
const stream = new ReadableStream({
  async start(controller) {
    controller.enqueue('data chunk 1');
    controller.enqueue('data chunk 2');
    controller.close();
  },
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked',
  },
});
```

### CORS
```tsx
export async function GET(request: Request) {
  const response = NextResponse.json({ data: 'value' });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

### Middleware in Route Handlers
```tsx
// lib/auth.ts
export function withAuth(handler: Function) {
  return async (request: Request, context: any) => {
    const token = request.headers.get('authorization');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Add user to context
    context.user = user;
    return handler(request, context);
  };
}

// app/api/protected/route.ts
import { withAuth } from '@/lib/auth';

async function handler(request: Request, { user }: any) {
  return NextResponse.json({ message: `Hello ${user.name}` });
}

export const GET = withAuth(handler);
```

### Edge Runtime
```tsx
// app/api/edge/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  return NextResponse.json({ 
    message: 'Running on edge',
    region: process.env.VERCEL_REGION,
  });
}
```

---

## 14. Proxy & Rewrites {#proxy}

### Rewrites in next.config.js
```js
// next.config.js
module.exports = {
  async rewrites() {
    return [
      // Simple rewrite
      {
        source: '/blog/:slug',
        destination: '/news/:slug',
      },
      
      // API proxy
      {
        source: '/api/:path*',
        destination: 'https://api.example.com/:path*',
      },
      
      // Multiple rewrites
      {
        source: '/old-blog/:slug',
        destination: '/blog/:slug',
      },
    ];
  },
};
```

### Redirects
```js
// next.config.js
module.exports = {
  async redirects() {
    return [
      // Permanent redirect (308)
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true,
      },
      
      // Temporary redirect (307)
      {
        source: '/temporary',
        destination: '/temp-destination',
        permanent: false,
      },
      
      // Wildcard redirect
      {
        source: '/blog/:slug*',
        destination: '/news/:slug*',
        permanent: true,
      },
      
      // Regex redirect
      {
        source: '/post/:slug(\\d{1,})',
        destination: '/news/:slug',
        permanent: false,
      },
    ];
  },
};
```

### Headers
```js
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE',
          },
        ],
      },
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
```

### Middleware for Advanced Proxying
```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Proxy API requests
  if (request.nextUrl.pathname.startsWith('/api/external')) {
    const url = new URL(request.nextUrl.pathname.replace('/api/external', ''), 'https://api.example.com');
    url.search = request.nextUrl.search;

    return NextResponse.rewrite(url);
  }

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('X-Custom-Header', 'value');
  
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
```

---

## 15. Deployment {#deployment}

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url"
  }
}
```

### Docker
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
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

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

```js
// next.config.js
module.exports = {
  output: 'standalone',
};
```

### Static Export
```js
// next.config.js
module.exports = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};
```

```bash
npm run build
# Output in /out directory
```

**Limitations:**
- No Server Components
- No API Routes
- No Dynamic Routes without generateStaticParams
- No Image Optimization
- No Middleware

### Self-Hosting
```bash
# Build
npm run build

# Start production server
npm start

# Custom port
PORT=8080 npm start
```

### Environment Variables
```bash
# .env.local (not committed)
DATABASE_URL=postgresql://...
API_KEY=secret123

# .env.production
NEXT_PUBLIC_API_URL=https://api.production.com
```

```tsx
// Server-side
const dbUrl = process.env.DATABASE_URL;

// Client-side (must start with NEXT_PUBLIC_)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### Performance Optimization
```js
// next.config.js
module.exports = {
  // Compress responses
  compress: true,
  
  // Generate ETags
  generateEtags: true,
  
  // Power by header
  poweredByHeader: false,
  
  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash', 'date-fns'],
  },
};
```

---

## 16. Upgrading Next.js {#upgrading}

### Check Current Version
```bash
npm list next
```

### Upgrade to Latest
```bash
npm install next@latest react@latest react-dom@latest
```

### Upgrade Specific Version
```bash
npm install next@14.0.0
```

### Codemods (Automated Migration)
```bash
# Upgrade from Pages to App Router
npx @next/codemod@latest app-router-recipe

# Upgrade from Pages Router API routes
npx @next/codemod@latest app-dir-api-routes

# New Link component
npx @next/codemod@latest new-link

# Image imports
npx @next/codemod@latest next-image-to-legacy-image
```

### Breaking Changes Checklist

#### Next.js 13 → 14
- Minimum Node.js version: 18.17
- `ImageResponse` moved from `next/server` to `next/og`
- Turbopack improvements

#### Next.js 12 → 13 (App Router)
- New `app/` directory
- Server Components by default
- New routing system
- `next/link` no longer needs `<a>` tag
- `next/image` uses native lazy loading

### Migration Example: Pages → App Router

**Before (Pages Router):**
```tsx
// pages/blog/[slug].tsx
import { GetStaticProps, GetStaticPaths } from 'next';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts();
  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = await getPost(params.slug);
  return { props: { post } };
};

export default function BlogPost({ post }) {
  return <div>{post.title}</div>;
}
```

**After (App Router):**
```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(p => ({ slug: p.slug }));
}

export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);
  return <div>{post.title}</div>;
}
```

---

## 17. Accessibility {#accessibility}

### Semantic HTML
```tsx
export default function Article() {
  return (
    <article>
      <header>
        <h1>Article Title</h1>
        <time dateTime="2024-01-01">January 1, 2024</time>
      </header>
      
      <main>
        <p>Article content...</p>
      </main>
      
      <footer>
        <nav aria-label="Article navigation">
          <a href="/prev">Previous</a>
          <a href="/next">Next</a>
        </nav>
      </footer>
    </article>
  );
}
```

### ARIA Attributes
```tsx
'use client';

import { useState } from 'react';

export default function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="dropdown-menu"
        aria-haspopup="true"
      >
        Menu
      </button>
      
      {isOpen && (
        <ul
          id="dropdown-menu"
          role="menu"
          aria-labelledby="menu-button"
        >
          <li role="menuitem">
            <a href="/profile">Profile</a>
          </li>
          <li role="menuitem">
            <a href="/settings">Settings</a>
          </li>
        </ul>
      )}
    </div>
  );
}
```

### Focus Management
```tsx
'use client';

import { useRef, useEffect } from 'react';

export default function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
    >
      <h2 id="modal-title">Modal Title</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### Keyboard Navigation
```tsx
'use client';

export default function Tabs() {
  const [activeTab, setActiveTab] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      setActiveTab((index + 1) % 3);
    } else if (e.key === 'ArrowLeft') {
      setActiveTab((index - 1 + 3) % 3);
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Content tabs">
        {['Tab 1', 'Tab 2', 'Tab 3'].map((tab, index) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`panel-${index}`}
            id={`tab-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        Content for tab {activeTab + 1}
      </div>
    </div>
  );
}
```

### Skip Links
```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        
        <header>Navigation</header>
        
        <main id="main-content">
          {children}
        </main>
        
        <footer>Footer</footer>
      </body>
    </html>
  );
}
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: white;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Image Alt Text
```tsx
import Image from 'next/image';

export default function Gallery() {
  return (
    <div>
      {/* Informative image */}
      <Image
        src="/chart.png"
        alt="Bar chart showing 50% increase in sales over 2024"
        width={800}
        height={400}
      />

      {/* Decorative image */}
      <Image
        src="/decoration.png"
        alt=""
        width={100}
        height={100}
      />

      {/* Functional image */}
      <button>
        <Image
          src="/search-icon.png"
          alt="Search"
          width={20}
          height={20}
        />
      </button>
    </div>
  );
}
```

### Form Accessibility
```tsx
export default function ContactForm() {
  return (
    <form>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          aria-required="true"
          aria-describedby="name-error"
        />
        <span id="name-error" role="alert">
          {/* Error message */}
        </span>
      </div>

      <fieldset>
        <legend>Preferences</legend>
        <div>
          <input
            type="checkbox"
            id="newsletter"
            name="newsletter"
          />
          <label htmlFor="newsletter">Subscribe to newsletter</label>
        </div>
      </fieldset>

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Color Contrast
```css
/* Ensure 4.5:1 contrast ratio for normal text */
.text {
  color: #333;
  background: #fff;
}

/* 3:1 for large text (18px+ or 14px+ bold) */
.heading {
  color: #666;
  background: #fff;
  font-size: 24px;
}

/* Don't rely on color alone */
.error {
  color: #d32f2f;
  border-left: 4px solid #d32f2f; /* Visual indicator */
}

.error::before {
  content: "⚠ "; /* Icon indicator */
}
```

---

## 18. Fast Refresh {#fast-refresh}

### What is Fast Refresh?
Fast Refresh preserves component state while editing:

```tsx
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

// Edit the button text → Fast Refresh preserves count
// Add a console.log → Fast Refresh preserves count
// Change component logic → Full reload
```

### When Fast Refresh Works
✅ **Preserves state:**
- Editing JSX
- Adding/removing imports
- Changing styles
- Adding console.logs

❌ **Full reload required:**
- Adding/removing exports
- Editing non-component functions
- Syntax errors
- Runtime errors in module initialization

### Best Practices
```tsx
// ✅ Good: Named export preserves state
export function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// ✅ Good: Default export preserves state
export default function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// ❌ Bad: Anonymous export may not preserve state
export default () => {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
};

// ✅ Good: Component-scoped helper
function Counter() {
  const [count, setCount] = useState(0);
  
  const formatCount = (n: number) => `Count: ${n}`;
  
  return <div>{formatCount(count)}</div>;
}

// ⚠️ Warning: Module-level helpers may cause full reload
const formatCount = (n: number) => `Count: ${n}`;

function Counter() {
  const [count, setCount] = useState(0);
  return <div>{formatCount(count)}</div>;
}
```

### Error Recovery
Fast Refresh automatically recovers from errors:

```tsx
export default function Component() {
  // ❌ This will show error overlay
  throw new Error('Oops!');
  
  return <div>Hello</div>;
}

// Fix the error → Fast Refresh automatically recovers
export default function Component() {
  // ✅ Error fixed
  return <div>Hello</div>;
}
```

### Disabling Fast Refresh
```tsx
// Add at top of file to disable for that file
// @refresh reset

export default function Component() {
  // This component will always remount on changes
  return <div>Hello</div>;
}
```

---

## 19. Next.js vs React {#comparison}

### Next.js Advantages Over React

#### 1. **Built-in Routing**
**React:**
```tsx
// Need to install react-router-dom
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/blog/:slug" element={<Blog />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Next.js:**
```tsx
// File-system routing - no configuration needed
// app/page.tsx → /
// app/about/page.tsx → /about
// app/blog/[slug]/page.tsx → /blog/:slug
```

#### 2. **Server-Side Rendering (SSR)**
**React:**
```tsx
// Complex SSR setup with Express
import express from 'express';
import { renderToString } from 'react-dom/server';

const app = express();

app.get('*', async (req, res) => {
  const data = await fetchData();
  const html = renderToString(<App data={data} />);
  res.send(`<!DOCTYPE html><html>...</html>`);
});
```

**Next.js:**
```tsx
// SSR is automatic
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

#### 3. **API Routes**
**React:**
```tsx
// Need separate backend (Express, etc.)
// Backend (Express)
app.get('/api/posts', async (req, res) => {
  const posts = await db.posts.findMany();
  res.json(posts);
});

// Frontend (React)
useEffect(() => {
  fetch('http://localhost:4000/api/posts')
    .then(r => r.json())
    .then(setPosts);
}, []);
```

**Next.js:**
```tsx
// Backend and frontend in one project
// app/api/posts/route.ts
export async function GET() {
  const posts = await db.posts.findMany();
  return NextResponse.json(posts);
}

// app/page.tsx
const res = await fetch('http://localhost:3000/api/posts');
const posts = await res.json();
```

#### 4. **Image Optimization**
**React:**
```tsx
// Manual optimization
<img src="/large-image.jpg" alt="Photo" />
// Need to:
// - Manually resize images
// - Create multiple sizes
// - Implement lazy loading
// - Handle different formats
```

**Next.js:**
```tsx
// Automatic optimization
<Image
  src="/large-image.jpg"
  alt="Photo"
  width={800}
  height={600}
  // Auto: resizing, lazy loading, WebP/AVIF, responsive
/>
```

#### 5. **Code Splitting**
**React:**
```tsx
// Manual code splitting
const Heavy = lazy(() => import('./Heavy'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Heavy />
    </Suspense>
  );
}
```

**Next.js:**
```tsx
// Automatic code splitting per route
// Each page automatically code-split
// app/heavy/page.tsx is only loaded when visited
```

#### 6. **SEO**
**React (SPA):**
```html
<!-- Crawlers see empty div -->
<div id="root"></div>
<script src="/bundle.js"></script>
```

**Next.js:**
```html
<!-- Crawlers see full HTML -->
<div id="root">
  <h1>My Page Title</h1>
  <p>Actual content visible to crawlers</p>
</div>
```

#### 7. **Data Fetching**
**React:**
```tsx
function Posts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(data => {
        setPosts(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{posts.map(...)}</div>;
}
```

**Next.js:**
```tsx
async function Posts() {
  const posts = await fetch('/api/posts').then(r => r.json());
  return <div>{posts.map(...)}</div>;
}
```

#### 8. **Performance**
**Next.js Advantages:**
- ✅ Automatic static optimization
- ✅ Incremental Static Regeneration
- ✅ Edge runtime support
- ✅ Built-in caching
- ✅ Prefetching
- ✅ Image/Font optimization
- ✅ Server Components (zero JS to client)

**React:**
- ⚠️ All optimizations manual
- ⚠️ No built-in caching
- ⚠️ Client-side only by default

#### 9. **Developer Experience**
**Next.js:**
```bash
npx create-next-app@latest
npm run dev
# Everything works out of the box:
# - Routing
# - Fast Refresh
# - TypeScript
# - CSS/Sass
# - Environment variables
```

**React:**
```bash
npx create-react-app my-app
# Then manually add:
# - Routing (react-router-dom)
# - API layer
# - SSR setup
# - Image optimization
# - SEO tools
```

### When React is Better Than Next.js

#### 1. **Purely Client-Side Apps**
If you need **only** client-side rendering:
```tsx
// React is simpler for pure SPAs
// No need for server concepts
// Easier to deploy (static hosting)
```

#### 2. **Mobile Apps (React Native)**
```tsx
// React Native uses React
// Next.js is web-only
```

#### 3. **Embedding in Existing Sites**
```tsx
// React can be embedded in any page
<div id="react-widget"></div>
<script>
  ReactDOM.render(<Widget />, document.getElementById('react-widget'));
</script>

// Next.js is full-page framework
```

#### 4. **Maximum Flexibility**
```tsx
// React gives you complete control
// Next.js has conventions you must follow
// (file-based routing, folder structure, etc.)
```

#### 5. **Learning Curve**
```tsx
// React: Learn one thing (React)
// Next.js: Learn React + Next.js concepts
// (Server Components, App Router, etc.)
```

#### 6. **Non-Web Targets**
```tsx
// React can render to:
// - Canvas (react-three-fiber)
// - PDF (react-pdf)
// - Native (React Native)
// - VR (React 360)

// Next.js is web-focused
```

### Comparison Table

| Feature | React | Next.js |
|---------|-------|---------|
| **Routing** | Manual (react-router) | File-based ✅ |
| **SSR** | Manual setup | Built-in ✅ |
| **SSG** | Manual | Built-in ✅ |
| **API Routes** | Separate backend | Built-in ✅ |
| **Code Splitting** | Manual | Automatic ✅ |
| **Image Optimization** | Manual | Automatic ✅ |
| **SEO** | Poor (SPA) | Excellent ✅ |
| **Performance** | Good | Excellent ✅ |
| **Learning Curve** | Moderate | Steeper |
| **Flexibility** | Maximum ✅ | Opinionated |
| **Bundle Size** | Smaller ✅ | Larger |
| **Deployment** | Any static host | Vercel best ✅ |
| **Dev Experience** | Good | Excellent ✅ |

---

## 20. Additional Advanced Topics

### Middleware
```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Authentication
  const token = request.cookies.get('token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Geolocation
  const country = request.geo?.country || 'US';
  const response = NextResponse.next();
  response.cookies.set('user-country', country);

  // A/B Testing
  const bucket = Math.random() < 0.5 ? 'a' : 'b';
  response.cookies.set('ab-test', bucket);

  // Custom headers
  response.headers.set('x-version', '1.0.0');

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};
```

### Internationalization (i18n)
```tsx
// middleware.ts
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['en', 'es', 'fr'];
const defaultLocale = 'en';

function getLocale(request: NextRequest): string {
  const headers = { 'accept-language': request.headers.get('accept-language') || '' };
  const languages = new Negotiator({ headers }).languages();
  return match(languages, locales, defaultLocale);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}
```

```tsx
// app/[lang]/page.tsx
const dictionaries = {
  en: () => import('./dictionaries/en.json').then(m => m.default),
  es: () => import('./dictionaries/es.json').then(m => m.default),
};

export default async function Page({ params: { lang } }) {
  const dict = await dictionaries[lang]();
  
  return (
    <div>
      <h1>{dict.welcome}</h1>
      <p>{dict.description}</p>
    </div>
  );
}
```

### Monitoring & Analytics
```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Environment-Specific Builds
```js
// next.config.js
const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  reactStrictMode: true,
  
  // Production only
  ...(isProd && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'],
      },
    },
  }),
  
  // Development only
  ...(!isProd && {
    logging: {
      fetches: {
        fullUrl: true,
      },
    },
  }),
};
```

### Custom Server (Advanced)
```tsx
// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Custom handling
    if (parsedUrl.pathname === '/custom') {
      res.end('Custom handler');
      return;
    }

    handle(req, res, parsedUrl);
  }).listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
```

**Note:** Custom servers disable many Next.js optimizations. Use sparingly.

---

## 21. Best Practices Summary

### Performance
- ✅ Use Server Components by default
- ✅ Use `next/image` for all images
- ✅ Use `next/font` for fonts
- ✅ Implement proper caching strategies
- ✅ Use streaming with Suspense
- ✅ Minimize client-side JavaScript
- ✅ Use Route Handlers instead of external APIs when possible

### SEO
- ✅ Generate metadata for all pages
- ✅ Use semantic HTML
- ✅ Implement proper heading hierarchy
- ✅ Add alt text to images
- ✅ Create sitemap.xml and robots.txt
- ✅ Use Server Components for content

### Security
- ✅ Use environment variables for secrets
- ✅ Implement CSRF protection
- ✅ Sanitize user input
- ✅ Use HTTPS in production
- ✅ Set security headers
- ✅ Validate on both client and server

### Code Organization
```
app/
├── (auth)/              # Route group
│   ├── login/
│   └── register/
├── (marketing)/
│   ├── about/
│   └── pricing/
├── dashboard/
│   ├── layout.tsx
│   └── page.tsx
├── api/
│   └── posts/
│       └── route.ts
└── components/          # Shared components
    ├── ui/              # UI components
    └── forms/           # Form components
lib/                     # Utilities
├── db.ts
├── auth.ts
└── utils.ts
```

### Testing
```tsx
// __tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import Page from '@/app/page';

describe('Page', () => {
  it('renders heading', () => {
    render(<Page />);
    const heading = screen.getByRole('heading');
    expect(heading).toBeInTheDocument();
  });
});
```

---

## Conclusion

Next.js is a powerful framework that extends React with:
- **Server-side capabilities** (SSR, SSG, ISR)
- **Better performance** (automatic optimization)
- **Improved DX** (file-based routing, built-in features)
- **Better SEO** (server rendering by default)

**Use Next.js when:**
- Building production web applications
- SEO is important
- You need server-side rendering
- You want built-in optimizations

**Use React when:**
- Building mobile apps (React Native)
- Creating embeddable widgets
- Need maximum flexibility
- Building purely client-side apps

The App Router represents the future of Next.js with Server Components, improved data fetching, and better performance. Master these concepts to build modern, performant web applications.