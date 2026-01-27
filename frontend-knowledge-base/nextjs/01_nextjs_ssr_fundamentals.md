# Next.js SSR Fundamentals: Complete Guide --> 

IMP

Next.js is a React framework that enables server-side rendering (SSR), static site generation (SSG), and hybrid rendering strategies. This guide covers all data fetching methods and SSR concepts for interviews.

## What is Next.js?

**Next.js** is a production-ready React framework that provides:
- **Server-Side Rendering (SSR)**: Render pages on the server
- **Static Site Generation (SSG)**: Pre-render pages at build time
- **Incremental Static Regeneration (ISR)**: Update static pages after build
- **API Routes**: Build backend APIs within Next.js
- **File-based Routing**: Automatic routing based on file structure
- **Automatic Code Splitting**: Load only necessary JavaScript
- **Image & Font Optimization**: Built-in optimizations

### Why Next.js?

```javascript
// Traditional React (CSR - Client-Side Rendering)
// - Blank HTML sent to browser
// - JavaScript downloads and executes
// - Content appears (slow initial load, poor SEO)

// Next.js (SSR/SSG)
// - Fully rendered HTML sent to browser
// - Content visible immediately (fast initial load, great SEO)
// - JavaScript hydrates the page
```

## Server-Side Rendering (SSR)
IMP
### getServerSideProps

**Definition**: `getServerSideProps` runs on **every request** on the server. It fetches data and passes it as props to the page component.

**When to Use**:
- Data changes frequently
- Need request-specific data (cookies, headers, query params)
- SEO is critical and data must be fresh

```javascript
// pages/user/[id].js
export async function getServerSideProps(context) {
    const { params, req, res, query } = context;
    
    // Access request details
    const userId = params.id;
    const cookies = req.cookies;
    const userAgent = req.headers['user-agent'];
    
    // Fetch data from API
    const response = await fetch(`https://api.example.com/users/${userId}`);
    const user = await response.json();
    
    // Return props to page component
    return {
        props: {
            user,
            timestamp: new Date().toISOString()
        }
    };
}

export default function UserPage({ user, timestamp }) {
    return (
        <div>
            <h1>{user.name}</h1>
            <p>Fetched at: {timestamp}</p>
        </div>
    );
}
```

**Key Points**:
- Runs on **server only** (never in browser)
- Has access to Node.js APIs, file system, databases
- Can access `req` and `res` objects
- Blocks rendering until data is fetched
- Slower than SSG but always fresh data

### getServerSideProps Context Object

```javascript
export async function getServerSideProps(context) {
    const {
        params,        // Dynamic route parameters: { id: '123' }
        req,           // HTTP request object
        res,           // HTTP response object
        query,         // Query string: { search: 'hello' }
        preview,       // Preview mode boolean
        previewData,   // Preview mode data
        resolvedUrl,   // Normalized request URL
        locale,        // Active locale (i18n)
        locales,       // All locales (i18n)
        defaultLocale  // Default locale (i18n)
    } = context;
    
    // Set custom headers
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
    
    // Redirect
    if (!user) {
        return {
            redirect: {
                destination: '/login',
                permanent: false
            }
        };
    }
    
    // Not found
    if (!data) {
        return {
            notFound: true
        };
    }
    
    return { props: { data } };
}
```

## Static Site Generation (SSG)

### getStaticProps
IMP
**Definition**: `getStaticProps` runs at **build time** only. It generates static HTML pages that are served from CDN.

**When to Use**:
- Data doesn't change often
- Same data for all users
- Maximum performance needed
- SEO is critical

```javascript
// pages/blog/[slug].js
export async function getStaticProps(context) {
    const { params } = context;
    
    // Fetch data at build time
    const response = await fetch(`https://api.example.com/posts/${params.slug}`);
    const post = await response.json();
    
    return {
        props: {
            post
        },
        revalidate: 60 // ISR: Regenerate page every 60 seconds
    };
}

export default function BlogPost({ post }) {
    return (
        <article>
            <h1>{post.title}</h1>
            <div>{post.content}</div>
        </article>
    );
}
```

**Key Points**:
- Runs at **build time** only
- Generates static HTML files
- Fastest performance (served from CDN)
- Can use `revalidate` for ISR
- No access to `req`/`res` objects

### getStaticPaths

**Definition**: `getStaticPaths` defines which dynamic routes to pre-render at build time.

**When to Use**:
- Using `getStaticProps` with dynamic routes
- Need to specify which paths to pre-generate

```javascript
// pages/products/[id].js
export async function getStaticPaths() {
    // Fetch list of products
    const response = await fetch('https://api.example.com/products');
    const products = await response.json();
    
    // Generate paths for each product
    const paths = products.map(product => ({
        params: { id: product.id.toString() }
    }));
    
    return {
        paths,
        fallback: 'blocking' // or true, false
    };
}

export async function getStaticProps({ params }) {
    const response = await fetch(`https://api.example.com/products/${params.id}`);
    const product = await response.json();
    
    return {
        props: { product },
        revalidate: 3600 // Revalidate every hour
    };
}

export default function ProductPage({ product }) {
    return <div>{product.name}</div>;
}
```

**Fallback Options**:

```javascript
// fallback: false
// - Only pre-rendered paths are valid
// - 404 for any other path
return { paths, fallback: false };

// fallback: true
// - Pre-rendered paths serve immediately
// - Non-pre-rendered paths show fallback UI first
// - Page is generated on-demand and cached
return { paths, fallback: true };

// fallback: 'blocking'
// - Pre-rendered paths serve immediately
// - Non-pre-rendered paths wait for SSR (no fallback UI)
// - Page is generated on-demand and cached
return { paths, fallback: 'blocking' };
```

## getInitialProps (Legacy)

**Definition**: `getInitialProps` is the **legacy** data fetching method that runs on both server and client.

**When to Use**:
- Maintaining legacy code
- Custom `_app.js` or `_document.js`
- **NOT recommended** for new projects (use `getServerSideProps` or `getStaticProps`)

```javascript
// pages/legacy.js
function LegacyPage({ data }) {
    return <div>{data.message}</div>;
}

LegacyPage.getInitialProps = async (context) => {
    const { req, res, query, pathname, asPath } = context;
    
    // Check if running on server or client
    const isServer = !!req;
    
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    
    return { data };
};

export default LegacyPage;
```

**Key Differences from getServerSideProps**:

| Feature | getInitialProps | getServerSideProps |
|---------|----------------|-------------------|
| Runs on | Server + Client | Server only |
| Automatic Static Optimization | ❌ Disabled | ✅ Enabled |
| TypeScript Support | Limited | Full |
| Recommended | ❌ No | ✅ Yes |
| Use Case | Legacy code | New projects |

**Why getInitialProps is Deprecated**:
- Runs on client-side navigation (security risk)
- Disables automatic static optimization
- More complex error handling
- Harder to debug

## Incremental Static Regeneration (ISR)
IMP
**Definition**: ISR allows you to update static pages **after build** without rebuilding the entire site.

```javascript
// pages/products/[id].js
export async function getStaticProps({ params }) {
    const product = await fetchProduct(params.id);
    
    return {
        props: { product },
        revalidate: 10 // Regenerate page every 10 seconds
    };
}

export async function getStaticPaths() {
    return {
        paths: [
            { params: { id: '1' } },
            { params: { id: '2' } }
        ],
        fallback: 'blocking' // Generate other pages on-demand
    };
}

export default function ProductPage({ product }) {
    return <div>{product.name}</div>;
}
```

**How ISR Works**:
1. Initial request serves stale page (from cache)
2. Next.js triggers regeneration in background
3. Once regenerated, cache is updated
4. Subsequent requests get fresh page

**ISR Strategies**:

```javascript
// Strategy 1: Time-based revalidation
return {
    props: { data },
    revalidate: 60 // Revalidate every 60 seconds
};

// Strategy 2: On-demand revalidation (Next.js 12.2+)
// API Route: pages/api/revalidate.js
export default async function handler(req, res) {
    try {
        await res.revalidate('/products/1');
        return res.json({ revalidated: true });
    } catch (err) {
        return res.status(500).send('Error revalidating');
    }
}
```

## Client-Side Data Fetching

### SWR (Stale-While-Revalidate)

**Definition**: SWR is a React Hooks library for client-side data fetching with caching, revalidation, and real-time updates.

```javascript
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(res => res.json());

function Profile() {
    const { data, error, isLoading } = useSWR('/api/user', fetcher);
    
    if (error) return <div>Failed to load</div>;
    if (isLoading) return <div>Loading...</div>;
    
    return <div>Hello {data.name}!</div>;
}
```

**SWR Features**:
- Automatic caching
- Automatic revalidation
- Focus revalidation
- Interval polling
- Optimistic UI updates

```javascript
// Advanced SWR usage
function UserProfile({ userId }) {
    const { data, error, mutate } = useSWR(
        `/api/users/${userId}`,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            refreshInterval: 3000, // Poll every 3 seconds
            dedupingInterval: 2000
        }
    );
    
    // Optimistic update
    const updateUser = async (newData) => {
        // Update UI immediately
        mutate({ ...data, ...newData }, false);
        
        // Send request to API
        await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(newData)
        });
        
        // Revalidate
        mutate();
    };
    
    return <div>{data?.name}</div>;
}
```

## Rendering Strategies Comparison
IMP
```javascript
// 1. SSR (Server-Side Rendering)
// - Fresh data on every request
// - Slower initial load
// - Good for personalized content
export async function getServerSideProps() {
    const data = await fetchData();
    return { props: { data } };
}

// 2. SSG (Static Site Generation)
// - Fastest performance
// - Data at build time
// - Good for blogs, marketing pages
export async function getStaticProps() {
    const data = await fetchData();
    return { props: { data } };
}

// 3. ISR (Incremental Static Regeneration)
// - Fast + Fresh data
// - Best of both worlds
// - Good for e-commerce, news
export async function getStaticProps() {
    const data = await fetchData();
    return {
        props: { data },
        revalidate: 60
    };
}

// 4. CSR (Client-Side Rendering)
// - No SEO
// - Fast navigation
// - Good for dashboards, admin panels
function Page() {
    const { data } = useSWR('/api/data', fetcher);
    return <div>{data}</div>;
}
```

## Hybrid Rendering Example

```javascript
// pages/product/[id].js
// Combines SSG + CSR for optimal performance

export async function getStaticProps({ params }) {
    // Fetch static product data at build time
    const product = await fetchProduct(params.id);
    
    return {
        props: { product },
        revalidate: 3600 // Revalidate every hour
    };
}

export async function getStaticPaths() {
    // Pre-render top 100 products
    const topProducts = await fetchTopProducts(100);
    const paths = topProducts.map(p => ({ params: { id: p.id } }));
    
    return {
        paths,
        fallback: 'blocking'
    };
}

export default function ProductPage({ product }) {
    // Fetch dynamic data (reviews, inventory) on client
    const { data: reviews } = useSWR(`/api/reviews/${product.id}`, fetcher);
    const { data: inventory } = useSWR(`/api/inventory/${product.id}`, fetcher, {
        refreshInterval: 5000 // Real-time inventory updates
    });
    
    return (
        <div>
            {/* Static product info (SEO-friendly) */}
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            
            {/* Dynamic inventory (real-time) */}
            <p>In stock: {inventory?.quantity || 'Loading...'}</p>
            
            {/* Dynamic reviews (client-side) */}
            <div>
                {reviews?.map(review => (
                    <Review key={review.id} review={review} />
                ))}
            </div>
        </div>
    );
}
```

## Data Fetching Best Practices

### 1. Choose the Right Method

```javascript
// Use SSG for:
// - Marketing pages, blogs, documentation
// - Data that doesn't change often
export async function getStaticProps() { /* ... */ }

// Use ISR for:
// - E-commerce product pages
// - News articles
// - Content that updates periodically
export async function getStaticProps() {
    return {
        props: { data },
        revalidate: 60
    };
}

// Use SSR for:
// - User dashboards
// - Personalized content
// - Request-specific data
export async function getServerSideProps() { /* ... */ }

// Use CSR for:
// - Admin panels
// - Real-time data
// - Non-SEO critical content
function Page() {
    const { data } = useSWR('/api/data', fetcher);
}
```

### 2. Error Handling

```javascript
export async function getServerSideProps() {
    try {
        const data = await fetchData();
        return { props: { data } };
    } catch (error) {
        console.error('Error fetching data:', error);
        
        // Option 1: Return error props
        return {
            props: {
                error: error.message
            }
        };
        
        // Option 2: Redirect to error page
        return {
            redirect: {
                destination: '/error',
                permanent: false
            }
        };
        
        // Option 3: Show 404
        return {
            notFound: true
        };
    }
}
```

### 3. Caching Strategies

```javascript
export async function getServerSideProps({ res }) {
    // Cache for 10 seconds, serve stale for 59 seconds
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=10, stale-while-revalidate=59'
    );
    
    const data = await fetchData();
    return { props: { data } };
}
```

## Summary

**Next.js Data Fetching Methods**:

1. **getServerSideProps**: Server-side rendering on every request
2. **getStaticProps**: Static generation at build time
3. **getStaticPaths**: Define dynamic routes for SSG
4. **getInitialProps**: Legacy method (avoid in new projects)
5. **ISR**: Incremental static regeneration
6. **CSR**: Client-side rendering with SWR/React Query

**Key Takeaways**:
- Use SSG/ISR for best performance
- Use SSR for personalized/fresh data
- Combine strategies for hybrid rendering
- Avoid `getInitialProps` in new projects
- Use SWR for client-side data fetching

**Interview Tips**:
- Explain when to use each method
- Understand fallback options
- Know ISR revalidation strategies
- Explain hybrid rendering benefits
- Discuss caching strategies
