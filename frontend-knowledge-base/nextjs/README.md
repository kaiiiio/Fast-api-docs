# Next.js Knowledge Base

Comprehensive Next.js documentation covering fundamentals, advanced features, and interview preparation.

## 📚 Contents

### 1. [SSR Fundamentals](01_nextjs_ssr_fundamentals.md)
Complete guide to Next.js server-side rendering and data fetching methods:
- **What is Next.js?** - Framework overview and benefits
- **Server-Side Rendering (SSR)** - getServerSideProps deep dive
- **Static Site Generation (SSG)** - getStaticProps and getStaticPaths
- **getInitialProps** - Legacy method (when to avoid)
- **Incremental Static Regeneration (ISR)** - Best of both worlds
- **Client-Side Fetching** - SWR and React Query
- **Rendering Strategies** - When to use SSR, SSG, ISR, CSR
- **Hybrid Rendering** - Combining strategies for optimal performance
- **Best Practices** - Error handling, caching strategies

### 2. [Advanced Features](02_nextjs_advanced_features.md)
Advanced Next.js features and optimization techniques:
- **Routing** - File-based routing, dynamic routes, parallel routes
- **Layouts & Templates** - Nested layouts, root layout, templates
- **Server & Client Components** - React Server Components, composition patterns
- **API Routes** - Route handlers, streaming, dynamic routes
- **Middleware** - Authentication, redirects, A/B testing, rate limiting
- **Image Optimization** - next/image, responsive images, blur placeholders
- **Font Optimization** - next/font, Google Fonts, local fonts
- **Metadata & SEO** - Static/dynamic metadata, OG image generation
- **Caching & Revalidation** - Fetch caching, tag-based revalidation, ISR
- **Error Handling** - Error boundaries, loading states, 404 pages
- **Deployment** - Vercel, Docker, environment variables

### 3. [Interview Q&A](03_nextjs_interview_qna.md)
Interview-ready questions and answers with detailed explanations:
- **Fundamentals** - Next.js vs CRA, SSR vs SSG vs ISR
- **Data Fetching** - getServerSideProps vs getStaticProps vs getInitialProps
- **Server Components** - When to use Server vs Client Components
- **Routing** - File-based routing, Link vs router.push
- **Caching** - How caching works, cache strategies
- **Optimization** - Image/font optimization, performance tuning
- **Real-World Scenarios** - Authentication, error handling, performance optimization

## 🎯 Quick Reference

### Data Fetching Methods

| Method | When | Runs | Use Case |
|--------|------|------|----------|
| `getServerSideProps` | Every request | Server | User dashboards, personalized content |
| `getStaticProps` | Build time | Build | Blogs, documentation, marketing |
| `getStaticProps` + `revalidate` | Build + background | Build + ISR | E-commerce, news, frequently updated |
| Client-side (SWR) | On mount | Client | Real-time data, non-SEO critical |

### Rendering Strategies

```javascript
// SSR - Fresh data every request
export async function getServerSideProps() {
    const data = await fetchData();
    return { props: { data } };
}

// SSG - Static at build time
export async function getStaticProps() {
    const data = await fetchData();
    return { props: { data } };
}

// ISR - Static + revalidation
export async function getStaticProps() {
    const data = await fetchData();
    return {
        props: { data },
        revalidate: 60 // Regenerate every 60 seconds
    };
}

// CSR - Client-side only
function Page() {
    const { data } = useSWR('/api/data', fetcher);
    return <div>{data}</div>;
}
```

### Server vs Client Components

```javascript
// Server Component (default in App Router)
async function ServerComponent() {
    const data = await fetchData(); // Direct DB access
    return <div>{data}</div>;
}

// Client Component (interactive)
'use client';
function ClientComponent() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Routing Patterns

```
app/
├── page.js                    → /
├── about/page.js              → /about
├── blog/[slug]/page.js        → /blog/:slug
├── shop/[...slug]/page.js     → /shop/* (catch-all)
└── products/[[...slug]]/page.js → /products, /products/* (optional catch-all)
```

### Image Optimization

```javascript
import Image from 'next/image';

// Local image
import logo from '../public/logo.png';
<Image src={logo} alt="Logo" />

// Remote image
<Image src="https://example.com/image.jpg" alt="Image" width={500} height={300} />

// Responsive fill
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
    <Image src="/hero.jpg" alt="Hero" fill style={{ objectFit: 'cover' }} />
</div>

// Priority loading (above the fold)
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />
```

### Caching Strategies

```javascript
// No cache (real-time data)
fetch('https://api.example.com/data', { cache: 'no-store' });

// Cache with revalidation
fetch('https://api.example.com/data', { next: { revalidate: 60 } });

// Tag-based revalidation
fetch('https://api.example.com/data', { next: { tags: ['products'] } });

// Revalidate by tag
import { revalidateTag } from 'next/cache';
revalidateTag('products');
```

## 🚀 Getting Started

### Installation

```bash
# Create new Next.js app
npx create-next-app@latest my-app

# With TypeScript
npx create-next-app@latest my-app --typescript

# With App Router (recommended)
npx create-next-app@latest my-app --app

# Navigate to project
cd my-app

# Run development server
npm run dev
```

### Project Structure

```
my-app/
├── app/                  # App Router (Next.js 13+)
│   ├── layout.js         # Root layout
│   ├── page.js           # Home page
│   ├── loading.js        # Loading UI
│   ├── error.js          # Error UI
│   └── api/              # API routes
├── public/               # Static assets
├── components/           # React components
├── lib/                  # Utility functions
├── next.config.js        # Next.js configuration
└── package.json          # Dependencies
```

## 💡 Best Practices

### 1. Choose the Right Rendering Strategy
- Use **SSG** for content that doesn't change often (blogs, marketing)
- Use **ISR** for content that updates periodically (e-commerce, news)
- Use **SSR** for personalized content (dashboards, user profiles)
- Use **CSR** for real-time data (admin panels, analytics)

### 2. Optimize Images and Fonts
- Always use `next/image` for images
- Use `next/font` for fonts
- Add `priority` to above-the-fold images
- Use blur placeholders for better UX

### 3. Server Components by Default
- Use Server Components for data fetching
- Only use Client Components when needed (interactivity, hooks)
- Pass serializable data from Server to Client Components

### 4. Implement Proper Caching
- Use ISR for frequently updated content
- Set appropriate `revalidate` times
- Use tag-based revalidation for on-demand updates
- Cache API responses with `next: { revalidate }`

### 5. Error Handling
- Create `error.js` for error boundaries
- Create `not-found.js` for 404 pages
- Create `loading.js` for loading states
- Handle errors in API routes and data fetching

### 6. Performance Optimization
- Use dynamic imports for code splitting
- Minimize client-side JavaScript
- Optimize database queries
- Use connection pooling
- Implement proper caching headers

## 📖 Learning Path

### Beginner
1. Read [SSR Fundamentals](01_nextjs_ssr_fundamentals.md)
2. Understand SSR, SSG, and ISR
3. Learn data fetching methods
4. Practice with simple projects

### Intermediate
1. Read [Advanced Features](02_nextjs_advanced_features.md)
2. Master App Router and Server Components
3. Learn image and font optimization
4. Implement authentication and middleware

### Advanced
1. Read [Interview Q&A](03_nextjs_interview_qna.md)
2. Optimize performance
3. Implement complex caching strategies
4. Deploy to production
5. Monitor and debug

## 🎓 Interview Preparation

### Must-Know Topics
- [ ] SSR vs SSG vs ISR differences
- [ ] getServerSideProps vs getStaticProps
- [ ] Server Components vs Client Components
- [ ] File-based routing
- [ ] Image and font optimization
- [ ] Caching strategies
- [ ] Error handling
- [ ] Performance optimization

### Common Interview Questions
1. What is Next.js and why use it?
2. Explain SSR, SSG, and ISR
3. When to use getServerSideProps vs getStaticProps?
4. What are Server Components?
5. How does caching work in Next.js?
6. How do you optimize images in Next.js?
7. How would you implement authentication?
8. How do you handle errors in Next.js?

See [Interview Q&A](03_nextjs_interview_qna.md) for detailed answers.

## 🔗 Additional Resources

### Official Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Learn](https://nextjs.org/learn)
- [Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples)

### Related Topics
- [React Fundamentals](../react/react_deep_dive.md)
- [React Hooks](../react/react_hooks_advanced.md)
- [React Reconciliation](../react/react_reconciliation.md)

### Tools
- [Vercel](https://vercel.com) - Deployment platform
- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance audit

## 📝 Summary

Next.js is a powerful React framework that provides:
- **Multiple rendering strategies** (SSR, SSG, ISR, CSR)
- **File-based routing** (no react-router needed)
- **Server Components** (reduce client bundle size)
- **Built-in optimizations** (images, fonts, code splitting)
- **API routes** (full-stack framework)
- **Production-ready** (zero configuration)

**Key Takeaway:** Choose the right rendering strategy for each page, optimize images and fonts, use Server Components by default, and implement proper caching for optimal performance.
