# Setup From Scratch Commands

Bhai, if you want to initialize everything from zero (scratch se), use these commands:

## 1. Project Root
```powershell
mkdir Decodeup
cd Decodeup
```

## 2. Backend (NestJS) Setup
```powershell
# Install Nest CLI globally if not already
npm install -g @nestjs/cli

# Create new Nest project (skip git and pick npm)
nest new backend --skip-git --package-manager npm
cd backend

# Install dependencies for Lead-level setup
npm install @nestjs/swagger swagger-ui-express
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @prisma/client bcrypt class-transformer class-validator
npm install -D prisma @types/passport-jwt @types/bcrypt

# Initialize Prisma
npx prisma init
```

## 3. Frontend (React) Setup
```powershell
cd .. # Back to root
# Create Vite React TS project
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install dependencies
npm install react-router-dom
npm install # To install default vite deps
```

## 4. Running the App (Development)

### Backend
1. Edit `backend/.env` with your DB URL.
2. Run migrations:
```powershell
npx prisma migrate dev --name init
```
3. Start dev server:
```powershell
npm run start:dev
```

### Frontend
```powershell
npm run dev
```

## 5. Docker Setup (Alternative)
If you have Docker installed, just run this in the root:
```powershell
docker-compose up --build
```
