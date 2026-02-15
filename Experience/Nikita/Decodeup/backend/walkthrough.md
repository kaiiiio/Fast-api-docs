# Full Stack Lead Developer Demo - Walkthrough

This project demonstrates a production-ready Full Stack application architecture using **NestJS**, **React**, and **Docker**.

## 🏗️ Architecture Stack

### Backend (NestJS + TypeScript)
- **Modular Design:** Separate modules for [Auth](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/Experience/Nikita/Decodeup/backend/src/auth/auth.module.ts#9-23), [Users](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/Experience/Nikita/Decodeup/backend/src/users/users.module.ts#4-9), and [Tasks](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/Experience/Nikita/Decodeup/backend/src/tasks/tasks.module.ts#5-10).
- **Database:** PostgreSQL with **Prisma ORM** for type-safe database queries.
- **Security:** JWT-based authentication using `Passport.js`.
- **Validation:** Implementation of `class-validator` for global request validation.
- **API Documentation:** Integrated **Swagger UI** (`/api/docs`) for live testing.

### Frontend (React + Vite + TypeScript)
- **Custom Data Fetching:** Built a reusable [useFetch](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/Experience/Nikita/Decodeup/frontend/src/hooks/useFetch.ts#7-46) hook to handle loading, error states, and JWT injection without external libraries like RTK Query.
- **State Management:** Used React state and hooks for a lightweight, performant UI.
- **Styling:** Clean, responsive Vanilla CSS with modern variables.
- **Routing:** Secure [PrivateRoute](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/Experience/Nikita/Decodeup/frontend/src/App.tsx#7-11) implementation with `react-router-dom`.

### DevOps & Deployment
- **Docker Orchestration:** `docker-compose` for running the entire system (PostgreSQL + NestJS + React + Nginx).
- **Multi-stage Builds:** Optimized Dockerfiles for both services.
- **Microservices-Ready:** Designed with best practices for future decomposition. See [microservices_best_practices.md](file:///C:/Users/nikit/.gemini/antigravity/brain/70023252-36b3-47c8-a2b3-490d01c7bcc4/microservices_best_practices.md) for a deep dive into Lead-level patterns.

## 🚀 How to Run

### Option 1: Docker (Recommended)
```bash
docker-compose up --build
```
- Frontend: `http://localhost:80`
- Backend: `http://localhost:3000`
- API Docs: `http://localhost:3000/api/docs`

### Option 2: Local Setup
Refer to the [README.md](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/Experience/Nikita/Decodeup/README.md) for step-by-step local installation instructions.

## 💡 Lead-Level Decisions Included
1. **Repository Pattern Principles:** Abstracted database logic into Prisma Services.
2. **Global Error Handling:** Consistent API response format via NestJS filters.
3. **Environment Security:** Built-in [.env.example](file:///C:/Users/nikit/Downloads/Nikita/Prepare/Knowledge-base/Experience/Nikita/Decodeup/backend/.env.example) and Docker-based env injection.
4. **Code Quality:** Configured Linting, Prettier, and TypeScript strict mode.
