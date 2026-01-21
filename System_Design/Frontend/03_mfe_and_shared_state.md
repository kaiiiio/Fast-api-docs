# Frontend System Design: Micro-Frontends (MFE)

## 🎯 Problem Statement
**Challenge**: Scaling a large application across 50+ engineers by breaking it into independent, deployable sub-apps (Search, Checkout, Profile).

## 🏗️ Integration Patterns
### 1. Module Federation (Webpack 5)
- **Concept**: Runtime sharing of code blocks.
- **Host**: Orchestrates the shell.
- **Remote**: Independent apps that "Expose" components.
- **Shared**: Common libs (React, TanStack Query) are loaded only once.

### 2. State Sharing & Communication
- **Custom Events**: `window.dispatchEvent` for decoupled communication.
- **Reactive Stores**: Shared Zustand or Redux stores (Caution: tight coupling).
- **Shell Prop Drilling**: The Shell passes a `user_id` to every child MFE.

## 🧠 Technical Deep Dive
- **Version Skew**: How to handle MFE-A using React 18 and MFE-B using React 17? (Use `singleton: true` in federation or iframes as last resort).
- **Styling Isolation**: Use **Shadow DOM** or **CSS-in-JS (Styled Components)** with unique prefixes to prevent MFE-A styles from leaking into MFE-B.
- **Dependency Management**: Ensure consistent design system tokens across teams.

## 🚀 Why This Works
- **Independent Deploys**: Team A can deploy a bug fix to Checkout without touching the Search app.
- **Tech Agnostic**: Allows gradual migration (e.g., migrating a legacy Angular module to React).
