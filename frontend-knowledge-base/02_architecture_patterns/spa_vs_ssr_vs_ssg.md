# SPA vs SSR vs SSG: Frontend Architecture Patterns

Understanding Single Page Applications (SPA), Server-Side Rendering (SSR), and Static Site Generation (SSG) helps choose the right architecture.

## Single Page Application (SPA)

**SPA** loads a single HTML page and updates content dynamically via JavaScript.

### How SPA Works

```
Initial Load:
  ┌─────────────┐
  │  index.html │ ← Single HTML file
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  JavaScript │ ← Handles routing, rendering
  └─────────────┘

Navigation:
  ┌─────────────┐
  │  /about     │ ← JavaScript updates DOM
  └─────────────┘
```

### SPA Example

```javascript
// React Router (SPA)
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
            </Routes>
        </BrowserRouter>
    );
}

// Navigation updates DOM, no page reload
```

### SPA Pros and Cons

**Pros:**
- Fast navigation (no page reload)
- Rich interactivity
- Better UX
- Client-side routing

**Cons:**
- Slower initial load
- SEO challenges
- Requires JavaScript
- More complex state management

## Server-Side Rendering (SSR)

**SSR** renders HTML on the server for each request.

### How SSR Works

```
Request:
  ┌─────────────┐
  │  GET /about │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │   Server    │ ← Renders HTML
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  HTML Page  │ ← Fully rendered
  └─────────────┘
```

### SSR Example

```javascript
// Next.js (SSR)
export async function getServerSideProps(context) {
    const data = await fetchData();
    return {
        props: { data }
    };
}

function About({ data }) {
    return <div>{data.title}</div>;
}

// Server renders HTML for each request
```

### SSR Pros and Cons

**Pros:**
- SEO friendly
- Fast initial load
- Works without JavaScript
- Better for content sites

**Cons:**
- Slower server response
- Higher server load
- More complex setup
- Requires server for each request

## Static Site Generation (SSG)

**SSG** pre-renders HTML at build time.

### How SSG Works

```
Build Time:
  ┌─────────────┐
  │  Build      │ ← Generate HTML files
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  /index.html│
  │  /about.html│
  │  /contact.html│
  └─────────────┘

Request:
  ┌─────────────┐
  │  GET /about │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  /about.html│ ← Pre-rendered
  └─────────────┘
```

### SSG Example

```javascript
// Next.js (SSG)
export async function getStaticProps() {
    const data = await fetchData();
    return {
        props: { data }
    };
}

function About({ data }) {
    return <div>{data.title}</div>;
}

// HTML generated at build time
```

### SSG Pros and Cons

**Pros:**
- Fastest load time
- SEO friendly
- Works without server
- CDN friendly
- Secure (no server)

**Cons:**
- No dynamic content
- Rebuild required for changes
- Limited interactivity
- Build time increases

## When to Use Each

### Use SPA When:
- Rich interactivity needed
- Dashboard/application
- Real-time updates
- Complex state management

### Use SSR When:
- SEO critical
- Content-heavy sites
- Dynamic content per request
- Social media sharing

### Use SSG When:
- Static content
- Blog/documentation
- Marketing sites
- Maximum performance needed

## Hybrid Approaches

### Incremental Static Regeneration (ISR)

```javascript
// Next.js ISR
export async function getStaticProps() {
    const data = await fetchData();
    return {
        props: { data },
        revalidate: 60  // Regenerate every 60 seconds
    };
}
```

## Best Practices

1. **Choose Right Pattern**: Based on requirements
2. **Hybrid**: Use ISR for dynamic static content
3. **Performance**: Optimize for chosen pattern
4. **SEO**: Consider SSR/SSG for SEO
5. **Complexity**: Balance complexity vs benefits

## Summary

**SPA vs SSR vs SSG:**

1. **SPA**: Client-side rendering, fast navigation
2. **SSR**: Server renders per request, SEO friendly
3. **SSG**: Pre-rendered at build, fastest load
4. **Choose**: Based on requirements
5. **Hybrid**: ISR for best of both

**Key Takeaway:**
SPA provides rich interactivity but slower initial load. SSR provides SEO and fast initial load but requires server. SSG provides fastest load and SEO but no dynamic content. Choose based on requirements. Use hybrid approaches (ISR) for dynamic static content.

**Architecture Strategy:**
- SPA for applications
- SSR for content sites
- SSG for static sites
- Hybrid for flexibility
- Optimize accordingly

**Next Steps:**
- Learn [State Management](state_management_patterns.md) for SPA
- Study [Routing](client_side_routing.md) for navigation
- Master [Performance](../07_performance/) for optimization

---

## 🎯 Interview Questions: Frontend

### Q1: Explain the differences between SPA (Single Page Application), SSR (Server-Side Rendering), and SSG (Static Site Generation), including when to use each approach, their trade-offs, and performance implications. Provide examples showing how each works.

**Answer:**

**Architecture Patterns Overview:**

Modern web applications use different rendering strategies based on requirements. Understanding SPA, SSR, and SSG helps choose the right architecture for your use case, balancing performance, SEO, complexity, and user experience.

**Single Page Application (SPA):**

**How SPA Works:**

**Initial Load:**
```
1. Browser requests: GET /index.html
2. Server returns: Single HTML file + JavaScript bundle
3. JavaScript executes: Renders initial content
4. User navigates: JavaScript updates DOM (no page reload)
```

**Visual Flow:**
```
Initial Request:
┌─────────────┐
│ index.html  │ ← Single HTML file
│ + app.js    │ ← JavaScript bundle (large)
└─────────────┘
     │
     ▼
┌─────────────┐
│  Browser    │
│  Renders    │ ← Client-side rendering
│  Content    │
└─────────────┘

Navigation:
┌─────────────┐
│ /about      │ ← JavaScript route change
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  JavaScript │ ← Updates DOM
│  Updates    │ ← No server request
│  Content    │
└─────────────┘
```

**SPA Characteristics:**

**Pros:**
- ✅ **Fast Navigation**: No page reloads, instant transitions
- ✅ **Rich Interactivity**: Complex client-side interactions
- ✅ **Better UX**: Smooth, app-like experience
- ✅ **Client-Side Routing**: Fast route changes
- ✅ **State Management**: Persistent state across navigation

**Cons:**
- ❌ **Slower Initial Load**: Large JavaScript bundle must download
- ❌ **SEO Challenges**: Search engines may not execute JavaScript
- ❌ **Requires JavaScript**: Doesn't work without JS
- ❌ **Complex State Management**: Need state management solution
- ❌ **Longer Time to Interactive**: Must wait for JS to execute

**SPA Example:**
```javascript
// React Router (SPA)
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/products" element={<Products />} />
            </Routes>
        </BrowserRouter>
    );
}

// Navigation updates DOM, no page reload
// JavaScript handles routing client-side
```

**Initial Load Performance:**
```
SPA Load Time:
1. HTML download: ~50ms
2. JavaScript download: ~2,000ms (large bundle)
3. JavaScript parse: ~500ms
4. Initial render: ~200ms
Total: ~2,750ms (2.75 seconds)
```

**Server-Side Rendering (SSR):**

**How SSR Works:**

**Request Flow:**
```
1. Browser requests: GET /about
2. Server executes: JavaScript on server
3. Server renders: HTML with data
4. Server returns: Complete HTML page
5. Browser displays: Immediate content
6. JavaScript hydrates: Makes interactive
```

**Visual Flow:**
```
Request:
┌─────────────┐
│ GET /about  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Server    │
│  Executes   │ ← Runs React/JS on server
│  JavaScript │
│             │
│  Renders    │ ← Generates HTML
│  HTML       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Complete    │ ← Fully rendered HTML
│ HTML Page   │ ← With data included
└─────────────┘
       │
       ▼
┌─────────────┐
│  Browser    │ ← Displays immediately
│  Shows      │ ← Content visible fast
│  Content    │
└─────────────┘
       │
       ▼
┌─────────────┐
│ JavaScript  │ ← Hydrates (makes interactive)
│  Hydrates   │
└─────────────┘
```

**SSR Characteristics:**

**Pros:**
- ✅ **SEO Friendly**: Search engines see full HTML
- ✅ **Fast Initial Load**: Content visible immediately
- ✅ **Works Without JS**: Content displays even if JS fails
- ✅ **Social Sharing**: Meta tags work correctly
- ✅ **Better First Paint**: Faster Time to First Byte (TTFB)

**Cons:**
- ❌ **Slower Server Response**: Server must render for each request
- ❌ **Higher Server Load**: More CPU/memory usage
- ❌ **More Complex Setup**: Need Node.js server
- ❌ **Hydration Overhead**: Must hydrate on client
- ❌ **Slower Navigation**: Each route needs server request

**SSR Example:**
```javascript
// Next.js (SSR)
export async function getServerSideProps(context) {
    // Runs on server for each request
    const data = await fetchData();
    return {
        props: { data }
    };
}

function About({ data }) {
    // Server renders this with data
    return <div>{data.title}</div>;
}

// Server renders HTML for each request
// HTML sent to browser with data included
```

**Performance:**
```
SSR Load Time:
1. Server request: ~200ms
2. Server render: ~300ms
3. HTML download: ~100ms
4. Browser render: ~50ms
Total: ~650ms (much faster initial load!)
```

**Static Site Generation (SSG):**

**How SSG Works:**

**Build Time:**
```
1. Build process: Runs JavaScript
2. Pre-renders: Generates HTML files
3. Output: Static HTML files
4. Deploy: Files to CDN
```

**Request Flow:**
```
1. Browser requests: GET /about
2. CDN serves: Pre-rendered HTML file
3. Browser displays: Immediate content
```

**Visual Flow:**
```
Build Time:
┌─────────────┐
│  Build      │ ← npm run build
│  Process    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Pre-render │ ← Generate HTML files
│  All Pages  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ /index.html │
│ /about.html │ ← Static HTML files
│ /contact.html│
└─────────────┘
       │
       ▼
┌─────────────┐
│    CDN      │ ← Deploy to CDN
└─────────────┘

Request:
┌─────────────┐
│ GET /about  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    CDN      │ ← Serves pre-rendered file
│  Returns    │
│ about.html  │
└─────────────┘
```

**SSG Characteristics:**

**Pros:**
- ✅ **Fastest Load**: Pre-rendered, served from CDN
- ✅ **SEO Friendly**: Full HTML, search engines love it
- ✅ **No Server Needed**: Can host on CDN/static hosting
- ✅ **Secure**: No server to attack
- ✅ **Scalable**: CDN handles traffic easily
- ✅ **Cost Effective**: No server costs

**Cons:**
- ❌ **No Dynamic Content**: Can't personalize per request
- ❌ **Rebuild Required**: Must rebuild for content changes
- ❌ **Build Time**: Large sites take time to build
- ❌ **Limited Interactivity**: Less dynamic than SPA
- ❌ **No User-Specific Data**: Can't show user-specific content

**SSG Example:**
```javascript
// Next.js (SSG)
export async function getStaticProps() {
    // Runs at build time
    const data = await fetchData();
    return {
        props: { data }
    };
}

function About({ data }) {
    return <div>{data.title}</div>;
}

// HTML generated at build time
// Served as static file
```

**Performance:**
```
SSG Load Time:
1. CDN request: ~50ms (from edge)
2. HTML download: ~50ms
3. Browser render: ~50ms
Total: ~150ms (fastest possible!)
```

**When to Use Each:**

**Use SPA When:**
- Dashboard applications
- Admin panels
- Rich interactivity needed
- Real-time updates
- Complex state management
- SEO not critical

**Use SSR When:**
- Content-heavy sites (blogs, news)
- SEO critical
- Social media sharing important
- Dynamic content per user
- E-commerce product pages
- User authentication pages

**Use SSG When:**
- Static content (documentation, blogs)
- Marketing sites
- Maximum performance needed
- No user-specific content
- Content changes infrequently
- Cost-effective hosting needed

**Hybrid Approaches:**

**Incremental Static Regeneration (ISR):**
```javascript
// Next.js ISR
export async function getStaticProps() {
    const data = await fetchData();
    return {
        props: { data },
        revalidate: 60  // Regenerate every 60 seconds
    };
}

// Benefits:
// - Pre-rendered at build (fast)
// - Regenerates in background (fresh)
// - Best of both worlds
```

**Performance Comparison:**

**Initial Load Time:**
```
SSG:  ~150ms  (fastest - pre-rendered)
SSR:  ~650ms  (fast - server rendered)
SPA:  ~2,750ms (slower - must download JS)
```

**Navigation Time:**
```
SPA:  ~50ms   (fastest - client-side)
SSR:  ~650ms  (slower - server request)
SSG:  ~150ms  (fast - but limited)
```

**SEO:**
```
SSG:  ✅ Excellent (full HTML)
SSR:  ✅ Excellent (full HTML)
SPA:  ⚠️  Requires JS execution
```

**System Design Consideration**: Choosing the right architecture depends on:
1. **Performance Requirements**: Initial load vs navigation
2. **SEO Needs**: Search engine visibility
3. **Content Type**: Static vs dynamic
4. **User Experience**: Interactivity needs
5. **Infrastructure**: Server availability and costs

SPA provides rich interactivity but slower initial load. SSR provides SEO and fast initial load but requires server resources. SSG provides fastest load and SEO but no dynamic content. Choose based on your specific requirements. Hybrid approaches like ISR combine benefits of multiple strategies.

---

### Q2: Explain the trade-offs between SPA, SSR, and SSG in detail, including performance metrics, SEO implications, and infrastructure requirements. Provide examples showing how to choose the right architecture for different use cases.

**Answer:**

**Detailed Trade-offs Analysis:**

Understanding the trade-offs between rendering strategies is crucial for making informed architectural decisions. Each approach has different implications for performance, SEO, infrastructure, and user experience.

**Performance Trade-offs:**

**1. Initial Load Time:**

**SPA:**
```
Metrics:
- HTML: ~50ms (small)
- JavaScript: ~2,000ms (large bundle)
- Parse/Execute: ~500ms
- First Paint: ~2,550ms
- Time to Interactive: ~3,000ms

Bottleneck: JavaScript bundle size
Optimization: Code splitting, lazy loading
```

**SSR:**
```
Metrics:
- Server Request: ~200ms
- Server Render: ~300ms
- HTML Transfer: ~100ms
- First Paint: ~600ms
- Time to Interactive: ~1,200ms (after hydration)

Bottleneck: Server render time
Optimization: Caching, edge rendering
```

**SSG:**
```
Metrics:
- CDN Request: ~50ms (edge location)
- HTML Transfer: ~50ms
- First Paint: ~100ms
- Time to Interactive: ~500ms

Bottleneck: None (pre-rendered)
Optimization: CDN optimization
```

**2. Navigation Performance:**

**SPA:**
```javascript
// Navigation: Client-side routing
// Time: ~50ms (instant)
// No server request needed
// JavaScript updates DOM
```

**SSR:**
```javascript
// Navigation: Server request required
// Time: ~650ms per navigation
// Server must render each page
// Full page reload
```

**SSG:**
```javascript
// Navigation: Static file served
// Time: ~150ms
// But limited to pre-rendered pages
// No dynamic content
```

**SEO Implications:**

**SPA SEO Challenges:**
```javascript
// Problem: Search engines may not execute JavaScript
// Initial HTML:
<html>
  <body>
    <div id="root"></div>  // Empty!
    <script src="app.js"></script>
  </body>
</html>

// Search engine sees: Empty page
// Solution: Pre-rendering, SSR, or SSG
```

**SSR SEO Benefits:**
```javascript
// Server renders full HTML
// Search engine sees:
<html>
  <body>
    <h1>About Us</h1>
    <p>Content here...</p>  // Full content visible
  </body>
</html>

// SEO: ✅ Excellent
// Meta tags: ✅ Included
// Social sharing: ✅ Works
```

**SSG SEO Benefits:**
```javascript
// Pre-rendered HTML
// Search engine sees:
<html>
  <head>
    <title>About Us</title>
    <meta name="description" content="...">
  </head>
  <body>
    <h1>About Us</h1>
    <p>Content here...</p>
  </body>
</html>

// SEO: ✅ Excellent
// Fast indexing: ✅ Yes
// Social sharing: ✅ Perfect
```

**Infrastructure Requirements:**

**SPA Infrastructure:**
```
Requirements:
- Static hosting (CDN)
- No server needed
- Simple deployment
- Low cost

Example:
- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages

Cost: $0-20/month
```

**SSR Infrastructure:**
```
Requirements:
- Node.js server
- Server resources (CPU, memory)
- Database access
- More complex setup

Example:
- Vercel (serverless)
- AWS Lambda
- DigitalOcean
- Heroku

Cost: $20-200/month
```

**SSG Infrastructure:**
```
Requirements:
- Static hosting
- Build process
- CDN for distribution
- Simple deployment

Example:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

Cost: $0-20/month
```

**Use Case Analysis:**

**1. E-commerce Product Page:**

**Requirements:**
- SEO critical (product discovery)
- Dynamic content (prices, inventory)
- User-specific (recommendations)
- Fast initial load

**Best Choice: SSR**
```javascript
// Next.js SSR
export async function getServerSideProps(context) {
    const product = await getProduct(context.params.id);
    const recommendations = await getRecommendations(context.req.user);
    
    return {
        props: {
            product,
            recommendations
        }
    };
}

// Benefits:
// - SEO friendly (full HTML)
// - Dynamic content per request
// - User-specific recommendations
// - Fast initial load
```

**2. Blog/Documentation Site:**

**Requirements:**
- SEO critical
- Static content
- Fast load time
- Low cost

**Best Choice: SSG**
```javascript
// Next.js SSG
export async function getStaticProps() {
    const posts = await getPosts();
    return { props: { posts } };
}

export async function getStaticPaths() {
    const posts = await getPosts();
    return {
        paths: posts.map(post => `/posts/${post.slug}`),
        fallback: false
    };
}

// Benefits:
// - Fastest load (pre-rendered)
// - Excellent SEO
// - Low cost (static hosting)
// - CDN distribution
```

**3. Dashboard Application:**

**Requirements:**
- Rich interactivity
- Real-time updates
- Complex state
- SEO not critical

**Best Choice: SPA**
```javascript
// React SPA
function Dashboard() {
    const [data, setData] = useState(null);
    
    useEffect(() => {
        // Real-time updates
        const ws = new WebSocket('ws://...');
        ws.onmessage = (event) => {
            setData(JSON.parse(event.data));
        };
    }, []);
    
    return <ComplexInteractiveDashboard data={data} />;
}

// Benefits:
// - Rich interactivity
// - Fast navigation
// - Real-time updates
// - Complex state management
```

**4. Marketing Landing Page:**

**Requirements:**
- SEO critical
- Fast load time
- Static content
- Social sharing

**Best Choice: SSG**
```javascript
// Pre-rendered at build
// Benefits:
// - Fastest possible load
// - Perfect SEO
// - Social sharing works
// - Low cost
```

**Hybrid Approach: ISR (Incremental Static Regeneration)**

**Best of Both Worlds:**
```javascript
// Next.js ISR
export async function getStaticProps() {
    const data = await fetchData();
    return {
        props: { data },
        revalidate: 60  // Regenerate every 60 seconds
    };
}

// How it works:
// 1. First request: Serves pre-rendered page (fast)
// 2. After 60s: Regenerates in background
// 3. Next request: Serves regenerated page (fresh)

// Benefits:
// - Fast initial load (SSG benefit)
// - Fresh content (SSR benefit)
// - No server for every request
// - Best performance + freshness
```

**Performance Metrics Summary:**

**Initial Load:**
```
SSG:  ~150ms  ⭐⭐⭐⭐⭐
SSR:  ~650ms  ⭐⭐⭐⭐
SPA:  ~2,750ms ⭐⭐
```

**Navigation:**
```
SPA:  ~50ms   ⭐⭐⭐⭐⭐
SSG:  ~150ms  ⭐⭐⭐⭐
SSR:  ~650ms  ⭐⭐⭐
```

**SEO:**
```
SSG:  ⭐⭐⭐⭐⭐
SSR:  ⭐⭐⭐⭐⭐
SPA:  ⭐⭐ (with pre-rendering)
```

**Cost:**
```
SSG:  $0-20/month  ⭐⭐⭐⭐⭐
SPA:  $0-20/month  ⭐⭐⭐⭐⭐
SSR:  $20-200/month ⭐⭐⭐
```

**System Design Consideration**: Architecture choice impacts:
1. **Performance**: Load time and navigation speed
2. **SEO**: Search engine visibility
3. **Infrastructure**: Server requirements and costs
4. **User Experience**: Interactivity and responsiveness
5. **Maintainability**: Complexity and deployment

The choice between SPA, SSR, and SSG depends on your specific requirements. SSG is fastest and most cost-effective for static content. SSR provides dynamic content with good SEO. SPA offers best interactivity but slower initial load. Hybrid approaches like ISR combine benefits. Consider performance, SEO, infrastructure, and user experience when choosing.

