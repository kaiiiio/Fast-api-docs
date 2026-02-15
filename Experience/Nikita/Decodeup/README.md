# Setup Instructions

## Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- PostgreSQL (if running locally without Docker)

## Backend (NestJS)
1. `cd backend`
2. `npm install`
3. Create `.env` from `.env.example`
4. `npx prisma migrate dev`
5. `npm run start:dev`

## Frontend (React)
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Docker (Production-like)
1. `docker-compose up --build`
