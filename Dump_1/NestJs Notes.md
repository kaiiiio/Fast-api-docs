# 📘 COMPLETE NESTJS GUIDE FOR EXPRESS DEVELOPERS
# Every Import, Decorator, and Concept Explained
# ================================================================

## 🎯 TABLE OF CONTENTS
1. [Core Decorators & Imports](#core-decorators--imports)
2. [HTTP Method Decorators](#http-method-decorators)
3. [Parameter Decorators](#parameter-decorators)
4. [Validation & Transformation](#validation--transformation)
5. [Guards & Authorization](#guards--authorization)
6. [Interceptors & Middleware](#interceptors--middleware)
7. [Exception Handling](#exception-handling)
8. [Lifecycle Hooks](#lifecycle-hooks)
9. [Advanced Features](#advanced-features)
10. [Microservices & Lead Architecture](#microservices--lead-architecture)
11. [Database: SQL (TypeORM) & NoSQL (Mongoose)](#database-sql--nosql)
12. [File Handling & Streams](#file-handling--streams)
13. [Validation & DTOs](#validation--dtos)
14. [Caching (Redis / Cache Manager)](#caching-redis--cache-manager)
15. [Complete Code Examples](#complete-code-examples)
16. [Interview Questions & Answers](#interview-questions--answers)

================================================================

IMP

## 1️⃣ CORE DECORATORS & IMPORTS

### @Module() - FROM '@nestjs/common'

**What it is:**
A class decorator that defines a module - the fundamental building block of NestJS applications.  --- IMP

**Express Equivalent:**
None. Express doesn't have modules. You might manually organize code into folders, but there's no built-in module system.

**Import:**
```typescript
import { Module } from '@nestjs/common';
```

**Properties:**
- `imports: []` - Other modules to import
- `controllers: []` - Controllers in this module
- `providers: []` - Services/providers in this module
- `exports: []` - Providers to export to other modules

**Interview Explanation:**
"@Module is unique to NestJS. In Express, you might organize routes into separate files, but NestJS enforces this through modules. 

A module encapsulates related functionality - controllers, services, and their dependencies. The decorator tells NestJS how to wire everything together using metadata."

**Example:**
```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule],      // Import other modules
  controllers: [UserController],  // Register controllers
  providers: [UserService],       // Register services
  exports: [UserService]          // Export for other modules
})
export class UserModule {}
```

---

### @Controller() - FROM '@nestjs/common'

**What it is:**
A class decorator that marks a class as a controller and defines the base route path.

**Express Equivalent:**
```javascript
// Express
const router = express.Router();
app.use('/users', router);

// NestJS
@Controller('users')
export class UserController {}
```

**Import:**
```typescript
import { Controller } from '@nestjs/common';
```

**Interview Explanation:**  --- IMP

"@Controller replaces Express's router setup. Instead of creating a router and mounting it, you decorate a class with @Controller('path'). The path becomes the base route for all methods in that controller. It's more declarative and type-safe."

---

### @Injectable() - FROM '@nestjs/common'

**What it is:**
A class decorator that marks a class as a provider that can be injected via dependency injection.

**Express Equivalent:**
None. In Express, you manually import and instantiate services:
```javascript
// Express
const userService = require('./user.service');
const instance = new userService();

// NestJS
@Injectable()
export class UserService {}
// Automatically injected via constructor
```

**Import:**
```typescript
import { Injectable } from '@nestjs/common';
```

**Interview Explanation:**  --- IMP
"@Injectable tells NestJS's IoC container that this class can be managed and injected as a dependency. In Express, you manually create instances. In NestJS, you declare dependencies in the constructor and the framework provides them. This is a core difference - NestJS has built-in dependency injection, Express doesn't."

**Example:**
```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  findAll() {
    return ['user1', 'user2'];
  }
}

// Injected in controller
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}
  // userService is automatically provided by NestJS
}
```

---

## 2️⃣ HTTP METHOD DECORATORS

### @Get(), @Post(), @Put(), @Patch(), @Delete()

**What they are:**
Method decorators that define HTTP endpoints and their methods.

**Express Equivalent:**
```javascript
// Express
router.get('/users', (req, res) => {});
router.post('/users', (req, res) => {});
router.put('/users/:id', (req, res) => {});
router.delete('/users/:id', (req, res) => {});

// NestJS
@Get('users')
findAll() {}

@Post('users')
create() {}

@Put('users/:id')
update() {}

@Delete('users/:id')
remove() {}
```

**Import:**
```typescript
import { Get, Post, Put, Patch, Delete, Options, Head } from '@nestjs/common';
```

**Interview Explanation:**  
"These decorators replace Express's router.get(), router.post(), etc. They're more declarative and work with TypeScript's type system. The path is relative to the controller's base path. So @Controller('users') + @Get(':id') = GET /users/:id"

**Complete Example:**
```typescript
import { Controller, Get, Post, Put, Delete } from '@nestjs/common';

@Controller('users')
export class UserController {
  @Get()           // GET /users
  findAll() {}

  @Get(':id')      // GET /users/:id
  findOne() {}

  @Post()          // POST /users
  create() {}

  @Put(':id')      // PUT /users/:id
  update() {}

  @Delete(':id')   // DELETE /users/:id
  remove() {}
}
```

---

## 3️⃣ PARAMETER DECORATORS - FROM '@nestjs/common'

### @Param() - Extract Route Parameters

**What it is:**
Extracts route parameters from the URL.

**Express Equivalent:**
```javascript
// Express
app.get('/users/:id', (req, res) => {
  const id = req.params.id;
});

// NestJS
@Get(':id')
findOne(@Param('id') id: string) {}
```

**Import:**
```typescript
import { Param } from '@nestjs/common';
```

**Interview Explanation:**
"@Param extracts route parameters. In Express, you access req.params.id. In NestJS, you use @Param('id') as a parameter decorator. It's type-safe and more explicit about what data the method needs."

---

### @Body() - Extract Request Body

**What it is:**
Extracts and validates the request body.

**Express Equivalent:**
```javascript
// Express
app.post('/users', (req, res) => {
  const userData = req.body;
});

// NestJS
@Post()
create(@Body() createUserDto: CreateUserDto) {}
```

**Import:**
```typescript
import { Body } from '@nestjs/common';
```

**Interview Explanation:**
"@Body extracts the request body. Unlike Express where you just get req.body, NestJS can automatically validate it against a DTO class using validation pipes. This provides type safety and automatic validation."

---

### @Query() - Extract Query Parameters

**What it is:**
Extracts query string parameters.

**Express Equivalent:**
```javascript
// Express
app.get('/users', (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit;
});

// NestJS
@Get()
findAll(
  @Query('page') page: number,
  @Query('limit') limit: number
) {}
```

**Import:**
```typescript
import { Query } from '@nestjs/common';
```

---

### @Headers() - Extract Headers

**What it is:**
Extracts HTTP headers from the request.

**Express Equivalent:**
```javascript
// Express
app.get('/users', (req, res) => {
  const auth = req.headers['authorization'];
});

// NestJS
@Get()
findAll(@Headers('authorization') auth: string) {}
```

**Import:**
```typescript
import { Headers } from '@nestjs/common';
```

---

### @Req() and @Res() - Access Request/Response Objects

**What they are:**
Give access to the underlying Express request and response objects.

**Express Equivalent:**
```javascript
// Express - always available
app.get('/users', (req, res) => {
  // req and res always available
});

// NestJS - opt-in
@Get()
findAll(@Req() req: Request, @Res() res: Response) {}
```

**Import:**
```typescript
import { Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
```

**Interview Explanation:**
"@Req and @Res give you access to the raw Express request and response objects. However, using @Res() disables NestJS's automatic response handling, so you must manually send the response. It's generally better to use NestJS's parameter decorators and return values."

---

### Complete Parameter Decorators Example: --- IMP

```typescript
import {
  Controller, Get, Post,
  Param, Body, Query, Headers,
  Req, Res
} from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('users')
export class UserController {
  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Headers('authorization') auth: string
  ) {
    return { page, limit, auth };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return createUserDto;
  }

  @Get('raw')
  getRaw(@Req() req: Request, @Res() res: Response) {
    res.json({ message: 'Using raw Express objects' });
  }
}
```

---

## 4️⃣ VALIDATION & TRANSFORMATION

### PipeTransform - FROM '@nestjs/common'

**What it is:**
An interface that pipes must implement. Pipes transform or validate input data.

**Express Equivalent:**
```javascript
// Express - manual validation
app.post('/users', (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email required' });
  }
  // Continue...
});

// NestJS - automatic with pipes
@Post()
create(@Body(ValidationPipe) dto: CreateUserDto) {}
```

**Import:**
```typescript
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
```

**Interface Definition:**
```typescript
export interface PipeTransform<T = any, R = any> {
  transform(value: T, metadata: ArgumentMetadata): R;
}
```

**Interview Explanation:**  --- IMP
"PipeTransform is an interface for creating custom pipes. Pipes run before the controller method and can transform or validate input. In Express, you'd write middleware for validation. In NestJS, pipes are more focused and can be applied at parameter, method, controller, or global level."

**Custom Pipe Example:**
```typescript
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('Validation failed: must be a number');
    }
    return val;
  }
}

// Usage
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id is guaranteed to be a number
}
```

---

### ArgumentMetadata - FROM '@nestjs/common'

**What it is:**
Metadata about the argument being processed by a pipe.

**Import:**
```typescript
import { ArgumentMetadata } from '@nestjs/common';
```

**Properties:**
```typescript
export interface ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'custom';
  metatype?: Type<unknown>;
  data?: string;
}
```

**Interview Explanation:**
"ArgumentMetadata provides context about the parameter being validated. It tells you whether it's from @Body(), @Query(), @Param(), etc., what the expected type is, and the parameter name. This allows pipes to make intelligent decisions about how to transform or validate data."

---

### ValidationPipe - FROM '@nestjs/common'

**What it is:**
Built-in pipe that validates DTOs using class-validator decorators.

**Express Equivalent:**
```javascript
// Express - using Joi or manual validation
const Joi = require('joi');
const schema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).required()
});

app.post('/users', (req, res) => {
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json(error);
});

// NestJS - automatic with class-validator
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  name: string;
}

@Post()
create(@Body() dto: CreateUserDto) {}
// Automatically validated if ValidationPipe is enabled
```

**Import:**
```typescript
import { ValidationPipe } from '@nestjs/common';
```

**Setup (Global):**
```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,              // Strip non-DTO properties
    forbidNonWhitelisted: true,   // Throw error for extra properties
    transform: true,               // Auto-transform to DTO instance
    transformOptions: {
      enableImplicitConversion: true  // Auto-convert types
    }
  }));

  await app.listen(3000);
}
```

**Interview Explanation:**
"ValidationPipe is a game-changer compared to Express. Instead of writing validation logic in every route, you define validation rules on DTO classes using decorators from class-validator. The pipe automatically validates incoming data and returns detailed error messages if validation fails. This is much cleaner than Joi or manual validation in Express."

---

### class-validator Decorators - FROM 'class-validator'

**What they are:**
Decorators for validating DTO properties.

**Import:**
```typescript
import {
  IsString, IsNumber, IsEmail, IsBoolean, IsArray,
  IsOptional, IsNotEmpty, MinLength, MaxLength,
  Min, Max, IsEnum, IsDate, Matches, IsUrl
} from 'class-validator';
```

**Common Validators:**
```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(18)
  @Max(100)
  age: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(['admin', 'user', 'moderator'])
  role: string;

  @Matches(/^[A-Z0-9]{6}$/)
  code: string;

  @IsUrl()
  website: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
```

**Interview Explanation:**
"class-validator provides a rich set of decorators for validation. In Express, you'd use libraries like Joi or validator.js and write validation logic manually. With class-validator, you just decorate your DTO properties and ValidationPipe handles the rest. It's declarative, type-safe, and provides excellent error messages."

## 5️⃣ GUARDS & AUTHORIZATION

### CanActivate - FROM '@nestjs/common'

**What it is:**
An interface that guards must implement to determine if a request should be allowed.

**Express Equivalent:**
```javascript
// Express middleware for auth
function authMiddleware(req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/protected', authMiddleware, (req, res) => {});

// NestJS Guard
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.headers.authorization;
  }
}

@UseGuards(AuthGuard)
@Get('protected')
getProtected() {}
```

**Import:**
```typescript
import { CanActivate, ExecutionContext } from '@nestjs/common';
```

**Interface:**
```typescript
export interface CanActivate {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean>;
}
```

**Interview Explanation:**
"CanActivate is the interface for guards. Guards are like Express middleware but specifically for authorization. They return true to allow the request or false to deny it. The key difference is that guards have access to ExecutionContext, which provides more information about the request than Express's req object."

---

### ExecutionContext - FROM '@nestjs/common'

**What it is:**
Provides context about the current request execution, including HTTP details, WebSocket, or RPC context.

**Express Equivalent:**
None. Express only has req, res, next.

**Import:**
```typescript
import { ExecutionContext } from '@nestjs/common';
```

**Methods:**
```typescript
context.switchToHttp().getRequest()   // Get Express request
context.switchToHttp().getResponse()  // Get Express response
context.getClass()                     // Get controller class
context.getHandler()                   // Get handler method
context.getType()                      // 'http' | 'ws' | 'rpc'
```

**Interview Explanation:**
"ExecutionContext is more powerful than Express's req/res. It works across different contexts (HTTP, WebSocket, Microservices) and provides metadata about the controller and handler. This allows guards and interceptors to make intelligent decisions based on what method is being called, not just the request data."

**Example:**
```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    console.log('Handler:', handler.name);
    console.log('Controller:', controller.name);

    return !!request.headers.authorization;
  }
}
```

---

### @UseGuards() - FROM '@nestjs/common'

**What it is:**
Decorator to apply guards to controllers or methods.

**Import:**
```typescript
import { UseGuards } from '@nestjs/common';
```

**Usage Levels:**
```typescript
// Method level
@UseGuards(AuthGuard)
@Get('profile')
getProfile() {}

// Controller level (applies to all methods)
@UseGuards(AuthGuard)
@Controller('users')
export class UserController {}

// Global level (main.ts)
app.useGlobalGuards(new AuthGuard());

// Multiple guards
@UseGuards(AuthGuard, RolesGuard)
@Get('admin')
getAdmin() {}
```

---

### Reflector - FROM '@nestjs/core'

**What it is:**
Service for retrieving metadata attached to classes and methods.

**Express Equivalent:**
None. Express doesn't have metadata reflection.

**Import:**
```typescript
import { Reflector } from '@nestjs/core';
```

**Use Case - Role-Based Authorization:**
```typescript
// 1. Create custom decorator
import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// 2. Use Reflector in guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// 3. Usage
@Roles('admin', 'moderator')
@UseGuards(AuthGuard, RolesGuard)
@Delete(':id')
deleteUser() {}
```

**Interview Explanation:**
"Reflector allows you to read metadata attached to classes and methods via decorators. This is unique to NestJS and TypeScript. It enables patterns like role-based authorization where you attach metadata with @Roles('admin') and read it in a guard. Express has no equivalent - you'd have to manually pass configuration to middleware."

---

## 6️⃣ INTERCEPTORS

### NestInterceptor - FROM '@nestjs/common'

**What it is:**  
Interface for creating interceptors that can transform requests and responses. Interceptors are based on **Aspect-Oriented Programming (AOP)** techniques. They wrap the request/response cycle, allowing you to:
- Bind extra logic before/after method execution
- Transform the result returned from a function
- Transform the exception thrown from a function
- Extend basic function behavior
- Completely override a function depending on specific conditions (e.g., for caching)

**Express Equivalent:**
```javascript
// Express - middleware can only modify request
app.use((req, res, next) => {
  console.log('Before');
  next();
  // Can't easily run code after response
});

// NestJS - interceptor can modify both
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    console.log('Before'); // Code before the route handler
    
    // next.handle() triggers the route handler and returns an RxJS Observable
    return next.handle().pipe(
      tap(() => console.log('After')) // Code after the route handler
    );
  }
}
```

**Interview Tip:**  --- IMP
"Interceptors are inspired by **Aspect-Oriented Programming**. The main difference between Interceptors and Middleware is that Interceptors have access to the **CallHandler**, which allows us to wrap the execution of the handler and use RxJS operators (like `map`, `tap`, `catchError`) to transform the response stream. Middleware is just a function that runs before the request reaches the handler."

**Import:**
```typescript
import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
```

**Interface:**
```typescript
export interface NestInterceptor<T = any, R = any> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<R> | Promise<Observable<R>>;
}
```

**Interview Explanation:**
"NestInterceptor is more powerful than Express middleware. It can run code before AND after the route handler, and it can transform the response. It uses RxJS observables which allows powerful transformations. In Express, middleware can only modify the request; interceptors can modify both request and response."

---

### CallHandler - FROM '@nestjs/common'

**What it is:**
Represents the next handler in the chain. Calling `handle()` invokes the route handler.

**Import:**
```typescript
import { CallHandler } from '@nestjs/common';
```

**Methods:**
```typescript
next.handle()  // Returns Observable<any> - the route handler's response
```

**Interview Explanation:**
"CallHandler is similar to Express's next() but returns an Observable. You call next.handle() to invoke the route handler, then use RxJS operators to transform the response. This is what allows interceptors to modify responses, which Express middleware can't easily do."

---

### ExecutionContext & ArgumentsHost - FROM '@nestjs/common' --- IMP

These are two of the most important classes for building Guards, Interceptors, and Filters.

**1. ArgumentsHost:**
A wrapper around the arguments passed to the original handler. It allows you to switch to different execution contexts (HTTP, Microservices, or WebSockets) to get the `request` or `response` objects accurately across platforms.

**2. ExecutionContext:**
Extends `ArgumentsHost` with additional information about the current execution process. It provides information about the **class** and the **method** that is about to be executed.

**Import:**
```typescript
import { ArgumentsHost, ExecutionContext } from '@nestjs/common';
```

**Common Methods:**
```typescript
// From ArgumentsHost (Used in Filters)
const host: ArgumentsHost;
const ctx = host.switchToHttp();
const request = ctx.getRequest<Request>();
const response = ctx.getResponse<Response>();

// From ExecutionContext (Used in Guards/Interceptors)
const context: ExecutionContext;
const handler = context.getHandler(); // Reference to the route handler method
const controller = context.getClass(); // Reference to the controller class
```

**Interview Explanation:**
"ArgumentsHost is a generic interface that lets us access the underlying request/response regardless of the transport layer (HTTP, WS, or RPC). ExecutionContext builds on top of it, adding metadata about the handler itself. This is critical for things like reading custom metadata (using Reflector) in Guards or Interceptors."

---

### RxJS Operators - FROM 'rxjs' and 'rxjs/operators'

**What they are:**
Operators for transforming observables (used in interceptors).

**Import:**
```typescript
import { Observable } from 'rxjs';
import { tap, map, catchError, timeout } from 'rxjs/operators';
```

**Common Operators:**
```typescript
// tap - side effects without modifying data
tap(() => console.log('Logging'))

// map - transform the response
map(data => ({ success: true, data }))

// catchError - handle errors
catchError(err => throwError(() => new Error('Custom error')))

// timeout - add timeout
timeout(5000)
```

**Complete Interceptor Examples:**

Interceptors are extremely versatile. Here's a deeper look at the common patterns:

**1. Logging Interceptor**
Used to profile the performance of your requests and log the method/URL.
```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();

    console.log(`[${request.method}] ${request.url} - Started`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        console.log(`[${request.method}] ${request.url} - ${duration}ms`);
      })
    );
  }
}
```

**2. Transform Response Interceptor**
Standardizes the API response format globally (e.g., wrapping all responses in a `data` object).
```typescript
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        timestamp: new Date().toISOString(),
        data: data
      }))
    );
  }
}
```

**3. Timeout Interceptor**
Protects the server from hanging requests. If the handler takes longer than 5 seconds, it throws a `RequestTimeoutException`.
```typescript
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError(err => {
        if (err.name === 'TimeoutError') {
          throw new RequestTimeoutException();
        }
        throw err;
      })
    );
  }
}
```

**4. Cache Interceptor (Advanced)**
Manually handles caching logic. It checks the cache using the request URL as a key. If found, it returns the cached value as an RxJS `of()` observable, bypassing the route handler entirely.
```typescript
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = request.url;

    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse); // Return cached data immediately
    }

    return next.handle().pipe(
      tap(response => {
        this.cacheManager.set(cacheKey, response, 60); // Store in cache for 60s
      })
    );
  }
}
```

---

### @UseInterceptors() - FROM '@nestjs/common'  --- IMP

**What it is:**
A decorator used to bind interceptors to a specific scope (method, controller, or global). **Interceptors** are powerful tools that let you:
- Run logic **before** the route handler executes.
- Run logic **after** the route handler returns (transform the response).
- Extend or override the result of a handler.
- Handle exceptions thrown during execution.
- Add timeouts or cache strategies.

**Import:**
```typescript
import { UseInterceptors } from '@nestjs/common';
```

**Usage:**
```typescript
// Method level
@UseInterceptors(LoggingInterceptor)
@Get()
findAll() {}

// Controller level
@UseInterceptors(LoggingInterceptor)
@Controller('users')
export class UserController {}

// Global level
app.useGlobalInterceptors(new LoggingInterceptor());

// Multiple interceptors
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
@Get()
findAll() {}
```

---

## 7️⃣ MIDDLEWARE

### NestMiddleware - FROM '@nestjs/common'

**What it is:**
Interface for creating class-based middleware (similar to Express middleware).

**Express Equivalent:**
```javascript
// Express
function logger(req, res, next) {
  console.log(`[${req.method}] ${req.url}`);
  next();
}
app.use(logger);

// NestJS
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${req.method}] ${req.url}`);
    next();
  }
}
```

**Import:**
```typescript
import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
```

**Interview Explanation:**
"NestMiddleware is similar to Express middleware but class-based, allowing dependency injection. You can inject services into middleware, which isn't possible in Express. The use() method is identical to Express middleware signature."

---

### MiddlewareConsumer - FROM '@nestjs/common'

**What it is:**
Helper class for applying middleware to routes in a module.

**Express Equivalent:**
```javascript
// Express
app.use('/users', middleware);

// NestJS
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('users');
  }
}
```

**Import:**
```typescript
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
```

**Methods:**
```typescript
consumer
  .apply(LoggerMiddleware)              // Apply middleware
  .forRoutes('users')                   // To specific routes
  .forRoutes({ path: 'users', method: RequestMethod.GET })  // Specific method
  .forRoutes(UserController)            // To entire controller
  .exclude({ path: 'users/admin', method: RequestMethod.GET })  // Exclude routes
```

**Complete Example:**
```typescript
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${req.method}] ${req.url}`);
    next();
  }
}

@Module({
  controllers: [UserController],
  providers: [UserService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(
        { path: 'users', method: RequestMethod.ALL },
        { path: 'products', method: RequestMethod.GET }
      )
      .apply(AuthMiddleware)
      .exclude({ path: 'auth/login', method: RequestMethod.POST })
      .forRoutes('*');
  }
}
```

---

## 7️⃣ EXCEPTION HANDLING

### ExceptionFilter - FROM '@nestjs/common'

**What it is:**  
An interface used to create custom exception filters. It allows you to catch specific exceptions (or all of them) and format the response that the client receives.

**Customization Possibilities:**
1. **Response Logic**: Change the JSON structure (add `timestamp`, `path`, `traceId`).
2. **Logging**: Integrate with external services like Sentry or New Relic.
3. **Internal Errors**: Mask internal server errors while showing friendly messages for validation errors.
4. **Conditional Logic**: Show detailed stack traces only in Development mode.

**Express Equivalent:**
```javascript
// Express error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message
  });
});

// NestJS
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    response.status(status).json({ message: exception.message });
  }
}
```

**Import:**
```typescript
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
```

**Interview Explanation:**  --- IMP
"ExceptionFilter is like Express error-handling middleware but more structured. You can create filters for specific exception types using @Catch(). The filter receives the exception and ArgumentsHost, which provides access to the response object."

---

### @Catch() - FROM '@nestjs/common'

**What it is:**
Decorator that specifies which exception types a filter should catch.

**Import:**
```typescript
import { Catch } from '@nestjs/common';
```

**Usage:**
```typescript
@Catch(HttpException)           // Catch only HttpException
@Catch(NotFoundException)       // Catch only NotFoundException
@Catch()                        // Catch all exceptions
@Catch(HttpException, TypeError) // Catch multiple types
```

---

### ArgumentsHost - FROM '@nestjs/common'

**What it is:**
Provides access to the arguments being processed (request, response, etc.).

**Import:**
```typescript
import { ArgumentsHost } from '@nestjs/common';
```

**Methods:**
```typescript
host.switchToHttp().getRequest()   // Get request
host.switchToHttp().getResponse()  // Get response
host.switchToHttp().getNext()      // Get next function
host.getType()                     // 'http' | 'ws' | 'rpc'
```

---

### HttpException and Built-in Exceptions - FROM '@nestjs/common'

**What they are:**  
`HttpException` is the base class for all built-in HTTP exceptions in NestJS. Use it to throw custom errors with specific status codes and messages. The subclasses (like `BadRequestException`) are specialized versions that automatically set the correct HTTP status code.

**Import:**
```typescript
import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  NotAcceptableException,
  RequestTimeoutException,
  ConflictException,
  GoneException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
  InternalServerErrorException,
  NotImplementedException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException
} from '@nestjs/common';
```

**Express Equivalent:**
```javascript
// Express
res.status(404).json({ message: 'Not found' });

// NestJS
throw new NotFoundException('User not found');
```

**Usage:**
```typescript
// Generic HttpException
throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

// Specific exceptions (recommended)
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Invalid credentials');
throw new NotFoundException('User not found');
throw new ForbiddenException('Access denied');
throw new ConflictException('Email already exists');
throw new InternalServerErrorException('Server error');

// With custom response
throw new BadRequestException({
  statusCode: 400,
  message: 'Validation failed',
  errors: ['Email is invalid', 'Password too short']
});
```

**Complete Exception Filter Example:**
```typescript
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse['message'];
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message
    });
  }
}
```

---

## 8️⃣ LIFECYCLE HOOKS

### Lifecycle Hook Interfaces - FROM '@nestjs/common'

**What they are:**  
Interfaces that provide visibility into the application lifecycle. They allow you to run code at specific points (e.g., when a module is loaded or before the app shuts down).

- **OnModuleInit**: Runs once the host module's dependencies have been resolved.
- **OnApplicationBootstrap**: Runs once the entire application has fully started (useful for starting background tasks).
- **OnModuleDestroy**: Runs before the module is destroyed (clean up connections).
- **BeforeApplicationShutdown**: Runs after all `onModuleDestroy()` handlers have completed.
- **OnApplicationShutdown**: Runs after the connections are closed (final cleanup).
**Express Equivalent:**
None. Express has no native lifecycle hooks; you often end up with "callback hell" or manual `init()` calls during startup.

**Import:**
```typescript
import {
  OnModuleInit,
  OnApplicationBootstrap,
  OnModuleDestroy,
  BeforeApplicationShutdown,
  OnApplicationShutdown
} from '@nestjs/common';
```

**Execution Order:**  --- IMP
1. `OnModuleInit` - After module dependencies resolved
2. `OnApplicationBootstrap` - After all modules initialized
3. `OnModuleDestroy` - Before module destroyed
4. `BeforeApplicationShutdown` - Before app shutdown signal
5. `OnApplicationShutdown` - During app shutdown

**Interview Explanation:**
"Lifecycle hooks allow you to run code at specific points in the application lifecycle. For example, OnModuleInit is perfect for initializing database connections, OnModuleDestroy for cleanup. Express has no equivalent - you'd manually call initialization code. NestJS's hooks are more structured and automatic."

**Complete Example:**
```typescript
import {
  Injectable, OnModuleInit, OnApplicationBootstrap,
  OnModuleDestroy, BeforeApplicationShutdown, OnApplicationShutdown
} from '@nestjs/common';

@Injectable()
export class DatabaseService implements
  OnModuleInit,
  OnApplicationBootstrap,
  OnModuleDestroy,
  BeforeApplicationShutdown,
  OnApplicationShutdown
{
  private connection: any;

  async onModuleInit() {
    console.log('1. Module initialized - connecting to database...');
    this.connection = await this.connect();
  }

  async onApplicationBootstrap() {
    console.log('2. Application bootstrapped - running migrations...');
    await this.runMigrations();
  }

  async onModuleDestroy() {
    console.log('3. Module being destroyed - closing connections...');
    await this.connection.close();
  }

  async beforeApplicationShutdown(signal?: string) {
    console.log(`4. Before shutdown (signal: ${signal}) - saving state...`);
    await this.saveState();
  }

  async onApplicationShutdown(signal?: string) {
    console.log(`5. Application shutdown (signal: ${signal}) - final cleanup...`);
    await this.finalCleanup();
  }

  private async connect() { /* ... */ }
  private async runMigrations() { /* ... */ }
  private async saveState() { /* ... */ }
  private async finalCleanup() { /* ... */ }
}
```

---

## 🔟 ADVANCED IMPORTS & CONCEPTS

### NestFactory - FROM '@nestjs/core'

**What it is:**
Factory class for creating NestJS application instances.

**Import:**
```typescript
import { NestFactory } from '@nestjs/core';
```

**Methods:**
```typescript
// Create HTTP application
const app = await NestFactory.create(AppModule);

// Create microservice
const app = await NestFactory.createMicroservice(AppModule, options);

// Create with specific adapter
const app = await NestFactory.create(AppModule, new FastifyAdapter());
```

**Interview Explanation:**  --- IMP
"NestFactory is the entry point for creating a NestJS application. It's similar to express() in Express, but it bootstraps the entire dependency injection container and module system. You call NestFactory.create() with your root module, and it returns a configured application instance."

---

### ConfigService - FROM '@nestjs/config'

**What it is:**
Service for accessing environment variables and configuration.

**Express Equivalent:**
```javascript
// Express
require('dotenv').config();
const dbUrl = process.env.DATABASE_URL;

// NestJS
constructor(private configService: ConfigService) {}
const dbUrl = this.configService.get('DATABASE_URL');
```

**Import:**
```typescript
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
```

**Setup:**
```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        PORT: Joi.number().default(3000)
      })
    })
  ]
})
```

**Usage:**
```typescript
@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getDatabaseUrl() {
    return this.configService.get<string>('DATABASE_URL');
  }

  getPort() {
    return this.configService.get<number>('PORT', 3000); // with default
  }
}
```

## 9️⃣ ADVANCED FEATURES

**What it is:**  
A decorator used to attach custom "metadata" to a route or class. Metadata is just a key-value pair that doesn't affect logic by itself but can be read by **Guards** or **Interceptors** to make decisions.

**Import:**
```typescript
import { SetMetadata } from '@nestjs/common';
```

**Usage:**
```typescript
// Create custom decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Use it
@Roles('admin', 'moderator')
@Get('admin')
getAdmin() {}

// Read it in guard
const roles = this.reflector.get<string[]>('roles', context.getHandler());
```

---

## 📚 COMPLETE IMPORT REFERENCE

### FROM '@nestjs/common'
```typescript
// Decorators
Module, Controller, Injectable, Get, Post, Put, Delete, Patch,
Param, Body, Query, Headers, Req, Res,
UseGuards, UseInterceptors, UseFilters, UsePipes,
SetMetadata, Inject, Optional, Global,

// Interfaces
PipeTransform, CanActivate, NestInterceptor, ExceptionFilter, NestMiddleware,
OnModuleInit, OnApplicationBootstrap, OnModuleDestroy,

// Classes
HttpException, BadRequestException, UnauthorizedException, NotFoundException,
ForbiddenException, ConflictException, InternalServerErrorException,
ValidationPipe, ParseIntPipe, ParseBoolPipe,

// Types
ExecutionContext, ArgumentsHost, CallHandler, ArgumentMetadata,
MiddlewareConsumer, NestModule
```

### FROM '@nestjs/core'
```typescript
NestFactory, Reflector, ModuleRef
```

### FROM '@nestjs/config'
```typescript
ConfigModule, ConfigService
```

### FROM 'class-validator'
```typescript
IsString, IsNumber, IsEmail, IsBoolean, IsArray, IsOptional,
IsNotEmpty, MinLength, MaxLength, Min, Max, IsEnum, Matches
```

### FROM 'class-transformer'
```typescript
Exclude, Expose, Transform, Type
```

### FROM 'rxjs'
```typescript
Observable, of, throwError
```

### FROM 'rxjs/operators'
```typescript
tap, map, catchError, timeout, retry, debounceTime
```

---

## 1️⃣1️⃣ SERVER-SENT EVENTS (SSE) --- IMP

**What it is:**  
Server-Sent Events (SSE) allows the server to push real-time updates to the web page over HTTP. Unlike WebSockets, it is a one-way communication (Server -> Client).

**Use Cases:**
- Real-time stock price updates
- News feeds
- Social media notifications (Twitter/Facebook updates)
- Real-time analytics dashboards

**How to Implement in NestJS:**
Annotate the method handler with the `@Sse()` decorator. The handler must return an `Observable`.

**Example:**
```typescript
import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable, interval, map } from 'rxjs';

@Controller('updates')
export class UpdatesController {
  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((_) => ({ data: { hello: 'world' } } as MessageEvent))
    );
  }
}
```

**Client-Side Implementation:**
```javascript
const eventSource = new EventSource('/updates/sse');
eventSource.onmessage = ({ data }) => {
  console.log('New message:', JSON.parse(data));
};
```

**Advantages of SSE:**
1. **Built on HTTP**: Compatible with most firewalls and proxies without special config.
2. **Automatic Reconnection**: Browsers automatically try to reconnect if the connection is lost.
3. **Event IDs**: Supports event IDs to help clients resume from where they left off after a disconnect.
4. **Lightweight**: More efficient than long-polling for one-way real-time updates.

---

================================================================

## 🎯 QUICK COMPARISON CHART

| Feature | Express | NestJS |
|---------|---------|--------|
| **Routing** | `app.get('/users', handler)` | `@Get('users')` |
| **Dependency Injection** | Manual imports | `@Injectable()` + constructor injection |
| **Validation** | Manual (Joi, validator.js) | `ValidationPipe` + class-validator |
| **Error Handling** | Error middleware | `ExceptionFilter` + `@Catch()` |
| **Middleware** | `app.use(middleware)` | `NestMiddleware` + `MiddlewareConsumer` |
| **Authorization** | Custom middleware | `Guards` + `@UseGuards()` |
| **Response Transform** | Manual in routes | `Interceptors` + RxJS |
| **Configuration** | `dotenv` + `process.env` | `ConfigModule` + `ConfigService` |
| **Testing** | Manual setup | Built-in testing utilities |
| **Architecture** | Unopinionated | Modular + DI + Decorators |

================================================================

END OF COMPLETE NESTJS IMPORT & CONCEPT GUIDE

---

# ❓ NestJS Interview Questions & Answers   --- IMP

### What is NestJS?
Nest (NestJS) is a framework for building efficient, scalable Node.js server-side applications. It uses progressive JavaScript and is built with and fully supports TypeScript.

### Who developed NestJS? Why did they develop NestJS?
NestJS was developed by Kamil Myśliwiec, a Polish software engineer. He developed NestJS to address the lack of a consistent structure in Node.js applications and to bring powerful features of frameworks like Angular to the server-side.

### When was NestJS first released?
NestJS was first released on October 5, 2016.

### How can you install NestJS and set up a new project on your machine?
To install NestJS, you need Node.js and npm installed. Install the NestJS CLI globally:
```bash
$ npm i -g @nestjs/cli
```
Create a new project:
```bash
$ nest new project-name
```
Generate resources:
```bash
$ nest generate module users
$ nest g resource users
```

### What’s the difference between NestJS and Angular?
Angular is a framework for building client-side applications. NestJS is a framework for building server-side applications. NestJS is heavily inspired by Angular and shares similar concepts like modules, decorators, and dependency injection.

### Is it possible to use other languages like C++, Ruby or Python with NestJS?
NestJS itself runs on Node.js and relies on JavaScript/TypeScript. However, you can build separate services in other languages and have them communicate with your NestJS application via HTTP, gRPC, or other protocols (Microservices).

### What are the main components of a NestJS application?
- **Modules**: Organize related components into single blocks.
- **Controllers**: Handle incoming requests and return responses.
- **Services**: Handle business logic and data interaction.

### How to declare a class as a controller in NestJS?
Use the `@Controller()` decorator:
```typescript
import { Controller, Get } from "@nestjs/common";

@Controller("example")
class ExampleController {
  @Get()
  getHello(): string {
    return "Hello world!";
  }
}
```

### Explain use of decorators in NestJS controllers.
Decorators are special functions prefixed with `@` that add metadata to classes, methods, or properties.
- **Class decorators**: `@Controller()`, `@Module()`, `@Injectable()`.
- **Method decorators**: `@Get()`, `@Post()`, `@Put()`.
- **Parameter decorators**: `@Param()`, `@Body()`, `@Query()`.

### How can you use route parameters in a NestJS controller?
Access them using `@Param()`:
```typescript
@Get(":id")
findOne(@Param("id") id: number): string {
  return `This action returns a cat with the provided id`;
}
```

### What is the role of the @Body() decorator?
Extracts the entire body of the incoming HTTP request, commonly used in POST/PUT requests.

### What is an interceptor in NestJS?
A class annotated with `@Injectable()` that implements `NestInterceptor`. It can intercept requests/responses to add logic before/after execution (AOP).

### What are pipes in NestJS?
Classes used for validation or transformation of data before it reaches the route handler. Examples: `ParseIntPipe`, `ValidationPipe`.

### What are guards in NestJS?
Functions that determine whether a request will be handled by the route handler based on certain conditions (permissions, roles). Implements `CanActivate`.

### What are middlewares in NestJS?
Functions called before the route handler, with access to request/response objects and the `next()` function.

### Explain Dependency Injection in NestJS.
A design pattern where a class receives its dependencies from external sources. NestJS manages this via its IoC container. It promotes modularity and testability.

### What’s the difference between @Injectable() and @Inject()?
- `@Injectable()`: Marks a class as a provider for the DI system.
- `@Inject()`: Manually specifies a dependency to be injected (useful for non-class providers or string tokens).

### How does the Nest logger differ from console.log()?
Nest Logger includes context info, supports log levels (fatal, error, warn, debug, verbose), and is customizable/swappable.

### What is the difference between interceptors and middleware?  --- IMP
Interceptors have a broader scope (WebSockets, Microservices) and can manipulate the response. Middleware is specific to HTTP and cannot easily modify the response.

### What testing frameworks work best with NestJS?
Any Node.js testing framework works. NestJS comes with `@nestjs/testing` and supports **Jest** out of the box.

### Explain the purpose of DTOs (Data Transfer Objects).
DTOs define the structure of data exchanged between layers. They provide validation (via `class-validator`), documentation (Swagger), and type safety.

### How can you handle asynchronous operations in NestJS?
Using `async`/`await` and `Promises`. NestJS also has deep integration with **RxJS Observables**.

### Explain the purpose of @InjectRepository().
Used with TypeORM to inject a repository instance for a specific entity into a service.

### Explain the purpose of @nestjs/jwt.
Provides JWT functionality (generation, verification, decoding) for authentication and authorization.

### Difference between Authentication and Authorization?
- **Authentication**: Verifying who the user is.
- **Authorization**: Verifying what the user has permission to do.

### Why is token expiration important?
Security. Limits the window of opportunity for a stolen token to be used.

### Describe the mechanism for token refresh.
Issuing a long-lived "refresh token" alongside the short-lived "access token". The refresh token is used to obtain a new access token without re-authentication.

### What are Custom Providers in NestJS?
Providers that aren't just classes, but values, factories, or async factories.
```typescript
{
  provide: 'MAGIC_NUMBER',
  useValue: 42,
}
```

### How to generate API documentation using Swagger?
Use `@nestjs/swagger`. Configure in `main.ts` using `SwaggerModule.setup()`.

### Explain @ApiProperty() and @ApiOperation().
- `@ApiProperty()`: Adds metadata to DTO properties for Swagger.
- `@ApiOperation()`: Provides summary/description for controller methods in Swagger.

### Purpose of Dockerfile in NestJS?
To create a container image that includes the code, runtime, and dependencies, ensuring consistent execution across environments.

### How to use Docker Compose with NestJS?
To manage multi-container setups (e.g., App + Postgres) using a `docker-compose.yml` file.

### Purpose of @nestjs/passport?
Integrates Passport.js for flexible authentication strategies (JWT, OAuth, Local).

### How to handle file uploads in NestJS?
Using the `FileInterceptor` and the `@UploadedFile()` decorator, powered by **Multer**.

### What databases are supported?
TypeORM supports MySQL, Postgres, MongoDB, SQLite, etc. Mongoose for MongoDB. Prisma and Sequelize are also supported.

### What is a Circular Dependency and how to fix it?
When two classes depend on each other. Fixed using `forwardRef()` or the `ModuleRef` class.

### How does NestJS handle CORS?
Uses underlying platform (Express/Fastify) capabilities via `app.enableCors()`.

### Explain soft deletes.
Records are marked as deleted (e.g., `deletedAt` timestamp) but not removed from the DB. Supported in TypeORM via `@DeleteDateColumn`.

### How to handle Environment Variables?
Using `@nestjs/config` which uses `dotenv` to load `.env` files into `ConfigService`.

### Role of migration scripts in TypeORM?
Version control for database schema changes. Allows applying/reverting changes consistently across environments.

### Purpose of ExecutionContext?
Provides info about the current request, response, and specific handler being called. Used in guards/interceptors.

### Various types of Modules in NestJS?
- **Feature Modules**: Group related features.
- **Shared Modules**: Export providers for use in other modules.
- **Global Modules**: Available everywhere without importing.
- **Dynamic Modules**: Configurable at runtime (e.g., `ConfigModule.forRoot()`).

### How to secure a NestJS application?
- JWT Authentication
- Guard-based Authorization
- Data Validation (Pipes)
- Helmet/CORS/Rate Limiting
- HTTPS

### What is the difference between DI and IoC?
IoC is a general principle where control is inverted to a framework. DI is a specific pattern to implement IoC by "injecting" dependencies at runtime.

### How to implement Caching?
Using `@nestjs/cache-manager`. Can be applied at the controller level or injected as a service.

### Dependency Inversion Principle (DIP).
High-level modules should depend on abstractions (interfaces), not concrete implementations.

### How to schedule tasks?
Using `@nestjs/schedule` (wrapper for `node-cron`). Uses `@Cron()` decorators.

### How to implement versioning?
Using `app.enableVersioning()`. Supports URI, Header, and Media Type versioning.

### GraphQL in NestJS.
Use `@nestjs/graphql`.
- `@Resolver()`: Maps to GraphQL resolver logic.
- `@Scalar()`: Defines custom primitive types (e.g., Date).

### What is Serialization and Deserialization?
- **Serialization**: Converting objects to storage/transmission format (JSON).
- **Deserialization**: Reconstructing objects from data.

### Loose vs Tight Coupling?
- **Tight**: High interdependence; hard to change.
- **Loose**: Low interdependence; easy to maintain. NestJS achieves this via Modules and DI.

### Server-Sent Events (SSE).
One-way real-time server push. Supported via the `@Sse()` decorator.

---

## 1️⃣1️⃣ DATABASE: SQL (TypeORM) & NoSQL (Mongoose) --- IMP

NestJS is agnostic to database technologies, but TypeORM (SQL) and Mongoose (NoSQL) are the most popular choices.

### 🔹 [A] SQL with TypeORM (Standard)
TypeORM follows the **Data Mapper** pattern.

```typescript
// app.module.ts setup
TypeOrmModule.forRoot({
  type: 'postgres',
  entities: [User],
  synchronize: true, // Dev only
})
```

---

### 🔹 [B] NoSQL with MongoDB (Mongoose)
Mongoose is the standard for MongoDB in NestJS.

**1. Installation**
```bash
npm install --save @nestjs/mongoose mongoose
```

**2. Schema Definition (`user.schema.ts`)**
Instead of Entities, we use Schemas.
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ unique: true })
  email: string;

  @Prop()
  age: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

**3. Feature Setup (`user.module.ts`)**
```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

**4. Service & Repository Layer (`user.service.ts`)**
In NestJS with Mongoose, the "Repository" is effectively the injected `Model`.

```typescript
@Injectable()
export class UserService {
  // Model<User> acts as the Repository Layer
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(userDto: any): Promise<User> {
    const createdUser = new this.userModel(userDto);
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    // .exec() is used to return a real Promise (otherwise Mongoose returns a Query)
    return this.userModel.find().exec();
  }
}
```

**Comparison with Express:**
- **In Express**: You usually import the Model directly into the controller or a separate "repo" file. It's often tightly coupled and hard to mock for testing.
- **In NestJS**: We use **Dependency Injection**. The Model is injected, making it easy to swap with a Mock Model during unit testing. The structure follows the "Service Layer" pattern more strictly than a standard Express app.

**Comparison with Express Models (Side-by-Side):**

```javascript
// --- EXPRESS (Traditional) ---
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true }
});
UserSchema.methods.sayHi = function() { return `Hi ${this.name}`; };
module.exports = mongoose.model('User', UserSchema);

// --- NestJS (Standard) ---
@Schema()
export class User {
  @Prop() name: string;
  @Prop({ unique: true }) email: string;

  sayHi() { return `Hi ${this.name}`; } // Just a class method!
}
export const UserSchema = SchemaFactory.createForClass(User);
```
*Difference*: NestJS uses **Decorators** and **Classes**. This feels more natural for TypeScript and allows the `User` class to be used as a type throughout the app.

**Repository Layer for Mongoose:**
In large projects, don't use the `userModel` directly in the service. Create a `UserRepository`:
```typescript
@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(user: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(user);
    return newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }
}
```
*Benefit: If you ever switch from MongoDB to PostgreSQL, you only change the Repository implementation, not the Service/Business logic.*

---

## 1️⃣2️⃣ FILE HANDLING & STREAMS --- IMP

NestJS handles files using **Multer** interceptors and large data transfers using **StreamableFile**.

### 🔹 1. File Uploads (Multer)
To handle a single file upload, use the `FileInterceptor`.
```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(@UploadedFile() file: Express.Multer.File) {
  console.log(file.buffer); // Access raw buffer
  return { filename: file.originalname };
}
```

### 🔹 2. Multiple File Uploads
Use `FilesInterceptor` (plural) to accept an array of files.
```typescript
@Post('uploads')
@UseInterceptors(FilesInterceptor('files'))
uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
  return files.map(f => f.filename);
}
```

### 🔹 3. Streaming Files (`StreamableFile`)
Use `StreamableFile` to stream a file from the server to the client without loading it entirely into memory.
```typescript
import { StreamableFile, Header } from '@nestjs/common';
import { createReadStream } from 'fs';

@Get('download')
@Header('Content-Type', 'image/png')
downloadFile(): StreamableFile {
  const file = createReadStream('package.json');
  return new StreamableFile(file);
}
```

---

## 1️⃣3️⃣ VALIDATION & DTOs (The Standard) --- IMP

**DTOs (Data Transfer Objects)** combined with **ValidationPipe** are the core of NestJS request security.

### 🔹 1. Why DTOs for Validation?
1. **Type Safety**: TypeScript interface at compile time.
2. **Auto-validation**: `class-validator` decorators enforce rules at runtime.
3. **Data Sanitization**: Whitelisting helps strip extra/malicious fields from the request object.

### 🔹 2. DTO with class-validator
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3, { message: 'Name is too short!' })
  name: string;

  @IsEmail()
  email: string;
}
```

### 🔹 3. Enabling Global Validation
```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true, // Strips non-DTO properties
  forbidNonWhitelisted: true, // Throws error on extra properties
  transform: true, // Auto-converts simple types (string -> number)
}));
```

---

## 1️⃣4️⃣ CACHING (Redis / Cache Manager) --- IMP

Caching is essential for large-scale SaaS (Software as a Service - software delivered over the internet via subscription rather than installed locally) to reduce database load and improve response times.

### 🔹 1. Setup
NestJS provides a unified API for various cache stores.
```bash
npm install @nestjs/cache-manager cache-manager
# For Redis
npm install cache-manager-redis-yet
```

### 🔹 2. Global Configuration
```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 600, // 10 minutes
    }),
  ],
})
export class AppModule {}
```

### 🔹 3. Automatic Caching (Interceptors)
Apply to controllers or specific routes to automatically cache GET responses.

**How it works (Deep-Dive):**
When you use `@UseInterceptors(CacheInterceptor)`, NestJS wraps your route handler. 
1. **The Request**: It checks the `CacheManager` using the request path as a key.
2. **BE / Redis**: If you've configured Redis, it checks the Redis store. If not, it uses an in-memory store.
3. **RxJS Observable**: If data is found, the Interceptor cancels the route handler and returns the data immediately as an Observable.
4. **FE Benefit**: High speed (sub-10ms response), reduced server CPU/RAM usage, and better user experience (no loading spinners).

**Is it inbuilt or Redis?**
- **Inbuilt**: The `@UseInterceptors(CacheInterceptor)` logic and the `CacheModule` interface are part of the `@nestjs/cache-manager` package.
- **Redis**: Redis is an **external** store. NestJS uses "Adapters" (like `cache-manager-redis-yet`) to talk to Redis. 
- **The Magic**: You can switch from `InMemory` to `Redis` by just changing the configuration in `app.module.ts`. You don't have to touch your controllers/interceptors!

```typescript
@UseInterceptors(CacheInterceptor)
@Get()
findAll() {
  return this.usersService.findAll();
}
```

### 🔹 4. Manual Caching (Service level)
Inject the `CACHE_MANAGER` to have full control.
```typescript
@Injectable()
export class UserService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async findOne(id: number) {
    const value = await this.cacheManager.get(`user_${id}`);
    if (value) return value;

    const user = await this.usersRepository.findOneBy({ id });
    await this.cacheManager.set(`user_${id}`, user, 60000); // 60s
    return user;
  }
}
```

---

## 🔟 MICROSERVICES & LEAD-LEVEL ARCHITECTURE (Mastery Hub) --- IMP


### 🚀 1. NestJS Microservices: The Essentials
NestJS has a built-in module for microservices that abstracts away the underlying transport layer.

**Core Concept:** Instead of `NestFactory.create()`, you use `NestFactory.createMicroservice()`.

#### **Transport Layers (Transporters)**
| Transporter | Use Case | Difficulty |
| :--- | :--- | :--- |
| **TCP** | Simple service-to-service communication. | Easy |
| **Redis** | Fast, simple for small queues/pub-sub. | Easy |
| **RabbitMQ** | **Standard** for complex SaaS. Great for high reliability. | Medium |
| **gRPC** | Extremely fast, type-safe (protobufs). Best for high performance. | High |
| **NATS** | Cloud-native, high throughput. | Medium |

#### **Communication Patterns**
1. **Request-Response (`@MessagePattern`)**: When you need a result back (like asking an Auth service to verify a user).
2. **Event-Based (`@EventPattern`)**: "Fire and forget". Useful for logging, emails, or async tasks.

---

### 🐰 2. RabbitMQ in NestJS (The SaaS Favorite)
RabbitMQ is better than standard HTTP for SaaS because it handles **retries, dead-letter queues, and decoupling**.

**Setup Snippet:**
```typescript
// main.ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'cats_queue',
    queueOptions: { durable: false },
  },
});
```

**Controller Pattern:**
```typescript
@Controller()
export class OrdersController {
  @MessagePattern({ cmd: 'create_order' }) // Request-Response
  handleCreateOrder(data: any) {
    return { id: 1, status: 'Processing' };
  }

  @EventPattern('order_shipped') // Fire and Forget
  handleOrderShipped(data: any) {
    console.log('Update notification service...');
  }
}
```

---

### 🐂 3. BullMQ: Distributed Job Queues
When you have heavy tasks (Image processing, PDF generation, Bulk Emails), don't do them in the request. Use **BullMQ**. It uses **Redis** under the hood.

**Comparison for Interviews:**
- **RabbitMQ**: Messaging between *different* services.
- **BullMQ**: Background jobs *within* or across services (retries, delays, concurrency control).

**Code Pattern:**
```typescript
@Injectable()
export class EmailService {
  constructor(@InjectQueue('email_queue') private emailQueue: Queue) {}

  async sendWelcomeEmail(user: any) {
    await this.emailQueue.add('welcome_email', user, {
      attempts: 3,
      backoff: 5000, // wait 5s before retry
    });
  }
}
```

---

### 🏗️ 4. Lead-Level SaaS Architecture
For a Lead role, you must know **Multi-tenancy**.

1. **Shared Database, Shared Schema**: Add `tenant_id` to every table. (Cheapest, easiest to scale).
2. **Shared Database, Separate Schema**: Each client gets a `postgres schema`. Better isolation.
3. **Separate Database**: Highest isolation, hardest to maintain.

**Lead Tip:** Always mention **Horizontal Scaling**. "We Dockerize the NestJS app and deploy it on **AWS ECS or EKS** so we can spin up 10 instances if traffic peaks."

---

### ☁️ 5. DevOps & AWS for Leads (Simplified)
- **EC2 / Lambda**: Use Lambda for small CRON jobs or image processing. Use EC2/ECS/Fargate for the main SaaS server.
- **S3**: For storing user uploads (avatars, docs).
- **CI/CD**: Explain that you use **GitHub Actions** to run tests on every Push and auto-deploy to AWS on Merge to `main`.
- **Docker**: "Every service has a `Dockerfile`. This ensures 'It works on my machine' works on 'Production' too."

---

### 👑 6. Leadership & Code Review Mastery
As a Lead, you aren't just coding; you are protecting the codebase.
- **Enforce Clean Code**: Ensure services follow **SOLID** principles.
- **D-R-Y (Don't Repeat Yourself)**: Create `SharedModules` for common logic (Logger, Auth, Middlewares).
- **Mentorship**: "I do regular **1-on-1s** and review code not just for bugs, but to teach 'Why we do it this way'."

---

## 🎯 LEAD INTERVIEW Q&A (NestJS + SaaS Focus) --- IMP

### Q: Why NestJS over Express for a large SaaS?
**A:** "Express is great for small APIs, but for a 5-year project, you need structure. NestJS provides **DI (Dependency Injection)**, **Modules**, and **Typescript** out-of-the-box. It prevents the 'Spaghetti Code' problem that happens in large Express apps."

### Q: How do you handle failure in Microservices?
**A:** "We use **Retries** in RabbitMQ/BullMQ. If a service is down, the message stays in the queue until it's back up. For real-time failures, we implement the **Circuit Breaker Pattern** (using libraries like `opossum`) to stop calling a failing service and prevent a massive crash."

### Q: How do you optimize a slow NestJS API?
**A:** 
1. **Database**: Proper indexing and using **Prisma/TypeORM** effectively (avoid N+1 queries using `include` or `join`).
2. **Caching**: Use **Redis** via NestJS `@UseInterceptors(CacheInterceptor)`.
3. **Logic**: Move heavy tasks to **BullMQ** so the user doesn't wait.

---

## 1️⃣5️⃣ COMPLETE CODE EXAMPLES (Full-Stack CRUD) --- IMP

This example demonstrates a complete, production-ready implementation of a `Posts` module with SQL (TypeORM), Validation (DTOs), and Caching.

### 🔹 1. Create Post DTO (`create-post.dto.ts`)
```typescript
import { IsString, MinLength, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  authorId?: string;
}
```

### 🔹 2. Post Entity (`post.entity.ts`)
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 🔹 3. Post Service (`post.service.ts`)
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Post } from './post.entity';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create(dto);
    await this.cacheManager.del('all_posts'); // Invalidate cache
    return this.postsRepository.save(post);
  }

  async findAll(): Promise<Post[]> {
    const cachedPosts = await this.cacheManager.get<Post[]>('all_posts');
    if (cachedPosts) return cachedPosts;

    const posts = await this.postsRepository.find();
    await this.cacheManager.set('all_posts', posts, 1000 * 60); // Cache for 1 min
    return posts;
  }
}
```

### 🔹 4. Post Controller (`post.controller.ts`)
```typescript
import { Controller, Post, Get, Body, UsePipes, ValidationPipe, UseInterceptors } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() createPostDto: CreatePostDto) {
    return this.postService.create(createPostDto);
  }

  @Get()
  findAll() {
    return this.postService.findAll();
  }
}
```

---

# Next.js Complete Deep Dive Notes


## Table of Contents
1.[Introduction & Core Concepts](#introduction)
2.[Routing System](#routing)
3.[Layouts & Pages](#layouts - pages)
4.[Navigation & Linking](#navigation)
5.[Server vs Client Components](#components)
6.[Data Fetching](#data - fetching)
7.[Data Mutation & Actions](#data - mutation)
8.[Caching & Revalidation](#caching)
9.[Error Handling](#error - handling)
10.[Styling(CSS)](#styling)
11.[Image Optimization](#images)
12.[Font Optimization](#fonts)
13.[Route Handlers(API Routes)](#route - handlers)
14.[Proxy & Rewrites](#proxy)
15.[Deployment](#deployment)
16.[Upgrading](#upgrading)
17.[Accessibility](#accessibility)
18.[Fast Refresh](#fast - refresh)
19.[Next.js vs React](#comparison)

---

## 1. Introduction & Core Concepts { #introduction }

### What is Next.js ?
  Next.js is a React framework that provides:
- ** Server - Side Rendering(SSR) ** - Pages rendered on server
- ** Static Site Generation(SSG) ** - Pre - built HTML at build time
- ** File - based Routing ** - No need for react - router
- ** API Routes ** - Backend endpoints in same project
- ** Automatic Code Splitting ** - Only load what's needed
- ** Image & Font Optimization ** - Built -in optimizations

### App Router vs Pages Router
  - ** App Router ** (app directory) - New, recommended since Next.js 13 +
- ** Pages Router ** (pages directory) - Legacy, still supported

  ** These notes focus on App Router.**

    ---

## 2. Routing System { #routing }

### Basic Routing
Next.js uses ** file - system based routing **.Every folder in `app/` directory becomes a route.

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
  - `loading.tsx` - Loading UI(Suspense boundary)
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

  ** Example: Blog Post Page **
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

  ** Example:**
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

### Catch - All Routes
Catch unlimited segments using `[...slug]`:

```
app/
└── docs/
    └── [...slug]/
        └── page.tsx    → /docs/a, /docs/a/b, /docs/a/b/c
```

  ** Example:**
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

### Optional Catch - All Routes
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

  ** Example:**
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
Intercept routes for modals using`(..)folder`:

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

## 3. Layouts & Pages { #layouts - pages }

### Root Layout(Required)
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

  ** Key Points:**
    - Must include `<html>` and `<body>` tags
      - Cannot be a Client Component
        - Shared across all pages
          - Only re - renders children, not the layout itself

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

    ** Example: Blog Layout **
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

Layouts nest automatically.When visiting`/blog/post`, you get:
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

  ** Layout vs Template:**
- ** Layout ** - Persists across navigation, state preserved
  - ** Template ** - New instance on each navigation, state reset

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

## 4. Navigation & Linking { #navigation }

### Link Component
Use `<Link>` for client - side navigation:

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
The `usePathname` hook is a Client Component hook that lets you read the current URL's **pathname**.

  ** Example: Highlighting Active Links **
    ```tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav>
      <Link href="/dashboard" className={pathname === '/dashboard' ? 'text-blue-500' : 'text-gray-500'}>
        Dashboard
      </Link>
      <Link href="/profile" className={pathname === '/profile' ? 'text-blue-500' : 'text-gray-500'}>
        Profile
      </Link>
    </nav>
  );
}
```

    > [!NOTE]
    > `usePathname` only works in ** Client Components **.If you need the pathname in a Server Component, you must pass it down from a layout or middleware.
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
A Client Component hook that lets you read the current URL's **query parameters**. It returns a read-only version of the `URLSearchParams` interface.

  ** Example: Reading and Updating Search Params **
    ```tsx
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function SearchBar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    // Update the URL without a full page reload
    replace(`${ pathname }?${ params.toString() } `);
  }

  return (
    <input
      placeholder="Search..."
      onChange={(e) => handleSearch(e.target.value)}
      defaultValue={searchParams.get('query')?.toString()}
    />
  );
}
```
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

## 5. Server vs Client Components { #components }

### Server Components(Default)
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

  ** Benefits:**
    - ✅ Direct database / API access
      - ✅ Secure(secrets stay on server)
        - ✅ Smaller bundle size
          - ✅ Better SEO
            - ✅ Can use async /await directly

              ** Limitations:**
                - ❌ No useState, useEffect, event handlers
                  - ❌ No browser APIs
                    - ❌ No client - side interactivity

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

  ** When to use Client Components:**
    - Event handlers(onClick, onChange, etc.)
      - State and lifecycle(useState, useEffect)
        - Browser APIs(localStorage, geolocation)
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
1. ** Server → Client:** Can pass Server Components as props to Client Components
2. ** Client ↛ Server:** Cannot import Server Components into Client Components directly
3. ** Props:** Must be serializable(no functions, classes, Date objects)

  ** Example: Passing Server Component to Client **
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

## 6. Data Fetching { #data - fetching }

### Server Components(Recommended)
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

#### 1. Static Data(SSG)
  ```tsx
// Cached forever, built at build time
const res = await fetch('https://api.example.com/posts', {
  cache: 'force-cache', // Default
});
```

#### 2. Dynamic Data(SSR)
  ```tsx
// Fetched on every request
const res = await fetch('https://api.example.com/posts', {
  cache: 'no-store',
});
```

#### 3. Revalidated Data(ISR)
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

### Client - Side Fetching
When you need client - side data fetching:

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
### Using SWR (Recommended for Client-Side Fetching)
SWR (Stale-While-Revalidate) is a React Hooks library for data fetching. It handles caching, revalidation, focus tracking, and more.

```tsx
'use client';

import useSWR from 'swr';

// 1. Define a fetcher function (can use fetch or axios)
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Profile() {
  // 2. Use the hook
  const { data, error, isLoading } = useSWR('/api/user/123', fetcher);

  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;

  return <div>Hello {data.name}!</div>;
}
```

#### Global Configuration
You can provide global configuration using the `SWRConfig` provider in your layout.

```tsx
// app/layout.tsx
import { SWRConfig } from 'swr';

export default function RootLayout({ children }) {
  return (
    <SWRConfig
      value={{
        fetcher: (resource, init) => fetch(resource, init).then(res => res.json()),
        revalidateOnFocus: false, // Optional: Disable auto-refresh on window focus
        dedupingInterval: 5000,   // Optional: De-duplicate requests within 5s
      }}
    >
      {children}
    </SWRConfig>
  );
}
```

#### Optimistic UI Updates
SWR allows you to update the UI instantly before the server responds.

```tsx
const { data, mutate } = useSWR('/api/user', fetcher);

async function updateName(newName) {
  // Update local data immediately, but don't revalidate yet
  mutate({ ...data, name: newName }, false);

  // Send request to server
  await fetch('/api/user', {
    method: 'POST',
    body: JSON.stringify({ name: newName })
  });

  // Revalidate to ensure local data matches server
  mutate();
}
```

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

## 7. Data Mutation & Actions { #data - mutation }

### Server Actions
Server - side mutations without API routes:

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
  // safeParse() is a Zod method that validates data without throwing an error.
  // Instead of a try/catch block, it returns an object:
  // - If successful: { success: true, data: validatedData }
  // - If failed: { success: false, error: ZodError }
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

### Route Handlers(API Routes)
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

## 8. Caching & Revalidation { #caching }

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
Client - side cache of visited routes(30 seconds default ):

```tsx
// Prefetched links are cached
<Link href="/about">About</Link>
```

### Revalidation Strategies

#### 1. Time - based Revalidation
  ```tsx
// Revalidate every 60 seconds
const res = await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 },
});
```

#### 2. On - Demand Revalidation
On - demand revalidation basically means "bhai, jab data change ho, tabhi cache update karo." Instead of waiting for a timer(ISR), you manually tell Next.js to dump the old cache.

- ** revalidatePath **: Yeh poore route ka cache clear kar deta hai.Agar tumne `/blog` pe kuch naya post dala, toh`revalidatePath('/blog')` karne se Next.js blog page ko piche(background) mein rebuild kar lega.
- ** revalidateTag **: Yeh zyada powerful hai.Tum fetch requests ko 'tags' de sakte ho.Jab tum `revalidateTag('posts')` bolte ho, toh jahan jahan 'posts' tag wala data use ho raha hai, woh sab ek saath update ho jata hai.

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

#### 3. Tag - based Revalidation
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
Pre - generate dynamic routes at build time:

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

## 9. Error Handling { #error - handling }

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

  ** How it works:**
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

  ** Example: Blog Error Handler **
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

### global - error.tsx
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

  ** Note:** Must define `<html>` and `<body>` tags since it replaces root layout.

### not - found.tsx
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

  ** Trigger manually:**
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

### Nested not - found.tsx
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

  ** Wraps page in Suspense automatically:**
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

## 10. Styling(CSS) { #styling }

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

### 4. CSS -in-JS (styled-components, emotion)

  ** styled - components:**
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
border - radius: 4px;
  
  &:hover {
  background: darkblue;
}
`;

export default function Button({ children }) {
  return <StyledButton>{children}</StyledButton>;
}
```

### 5. Sass / SCSS
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

## 11. Image Optimization { #images }

### next / image Component
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

### Static Import(Automatic size detection)
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
  < div className = "relative h-screen" >
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
</div >
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
  .font - sans {
  font - family: var(--font - inter);
}

.font - serif {
  font - family: var(--font - playfair);
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
npm i - g vercel

# Deploy
vercel

# Production deployment
vercel--prod
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
FROM node: 18 - alpine AS base

# Dependencies
FROM base AS deps
RUN apk add--no - cache libc6 - compat
WORKDIR / app

COPY package.json package - lock.json./
  RUN npm ci

# Builder
FROM base AS builder
WORKDIR / app
COPY--from = deps / app / node_modules./ node_modules
COPY. .

RUN npm run build

# Runner
FROM base AS runner
WORKDIR / app

ENV NODE_ENV production

RUN addgroup--system--gid 1001 nodejs
RUN adduser--system--uid 1001 nextjs

COPY--from = builder / app / public./ public
COPY--from = builder--chown = nextjs: nodejs / app /.next / standalone./
  COPY--from = builder--chown = nextjs: nodejs / app /.next / static./.next / static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD["node", "server.js"]
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
PORT = 8080 npm start
  ```

### Environment Variables
```bash
#.env.local(not committed)
DATABASE_URL = postgresql://...
API_KEY = secret123

#.env.production
NEXT_PUBLIC_API_URL = https://api.production.com
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
npm install next @latest react @latest react - dom@latest
  ```

### Upgrade Specific Version
```bash
npm install next @14.0.0
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
- `ImageResponse` moved from `next / server` to `next / og`
- Turbopack improvements

#### Next.js 12 → 13 (App Router)
- New `app / ` directory
- Server Components by default
- New routing system
- `next / link` no longer needs ` < a > ` tag
- `next / image` uses native lazy loading

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
  const modalRef = useRef < HTMLDivElement > (null);
  const previousFocusRef = useRef < HTMLElement | null > (null);

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
  .skip - link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: white;
  padding: 8px;
  z - index: 100;
}

.skip - link:focus {
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
  font - size: 24px;
}

/* Don't rely on color alone */
.error {
  color: #d32f2f;
  border - left: 4px solid #d32f2f; /* Visual indicator */
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
  < img src = "/large-image.jpg" alt = "Photo" />
    // Need to:
    // - Manually resize images
    // - Create multiple sizes
    // - Implement lazy loading
    // - Handle different formats
    ```

**Next.js:**
```tsx
  // Automatic optimization
  < Image
src = "/large-image.jpg"
alt = "Photo"
width = { 800}
height = { 600}
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
  < !--Crawlers see empty div-- >
<div id="root"></div>
<script src="/bundle.js"></script>
```

**Next.js:**
```html
  < !--Crawlers see full HTML-- >
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
npx create - next - app@latest
npm run dev
# Everything works out of the box:
# - Routing
# - Fast Refresh
# - TypeScript
# - CSS / Sass
# - Environment variables
  ```

**React:**
```bash
npx create - react - app my - app
# Then manually add:
# - Routing(react - router - dom)
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
  < div id = "react-widget" ></div >
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

## 10. SWR (Stale-While-Revalidate)

SWR is a React Hooks library for data fetching. The name "SWR" is derived from `stale -while-revalidate`, a HTTP cache invalidation strategy.

### Basic Usage
```tsx
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher);

  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  return <div>hello {data.name}!</div>;
}
```

### Key Features
1. **Real-time Revalidation**: Re-fetches data when you refocus the tab.
2. **Interval Fetching**: Polling data every X seconds.
3. **Optimistic UI (Mutate)**: Update the local UI immediately while the server request is pending.

### Hinglish (Hindi) Oral Explanation
- **Concept**: SWR ka funda simple hai—pehle "stale" (purana) data dikhao cache se, fir piche background mein "revalidate" (naya fetch) karo, aur jaise hi naya data mile UI update kar do.
- **Focus Revalidation**: Users jab doosre tab se wapas aate hain, SWR automatically API call maar deta hai taaki latest data dikhe.
- **Mutate**: Agar tumne naya comment dala, toh SWR se bina server reply ke screen pe dikha sakte ho (`optimistic updates`). Agar server fail hua, toh SWR khud wapas purane state pe aa jayega.

---

## 21. Best Practices Summary

### Performance
- ✅ Use Server Components by default
- ✅ Use `next / image` for all images
- ✅ Use `next / font` for fonts
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
app /
├── (auth) /              # Route group
│   ├── login /
│   └── register /
├── (marketing) /
│   ├── about /
│   └── pricing /
├── dashboard /
│   ├── layout.tsx
│   └── page.tsx
├── api /
│   └── posts /
│       └── route.ts
└── components /          # Shared components
    ├── ui /              # UI components
    └── forms /           # Form components
lib /                     # Utilities
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


---

# PART 2: NEXT.JS DEEP DIVE


# Next.js Complete Deep Dive Notes

## Table of Contents
1.[Introduction & Core Concepts](#introduction)
2.[Routing System](#routing)
3.[Layouts & Pages](#layouts - pages)
4.[Navigation & Linking](#navigation)
5.[Server vs Client Components](#components)
6.[Data Fetching](#data - fetching)
7.[Data Mutation & Actions](#data - mutation)
8.[Caching & Revalidation](#caching)
9.[Error Handling](#error - handling)
10.[Styling(CSS)](#styling)
11.[Image Optimization](#images)
12.[Font Optimization](#fonts)
13.[Route Handlers(API Routes)](#route - handlers)
14.[Proxy & Rewrites](#proxy)
15.[Deployment](#deployment)
16.[Upgrading](#upgrading)
17.[Accessibility](#accessibility)
18.[Fast Refresh](#fast - refresh)
19.[Next.js vs React](#comparison)

---

## 1. Introduction & Core Concepts { #introduction }

### What is Next.js ?
  Next.js is a React framework that provides:
- ** Server - Side Rendering(SSR) ** - Pages rendered on server
  - ** Static Site Generation(SSG) ** - Pre - built HTML at build time
    - ** File - based Routing ** - No need for react - router
      - ** API Routes ** - Backend endpoints in same project
        - ** Automatic Code Splitting ** - Only load what's needed
          - ** Image & Font Optimization ** - Built -in optimizations

### App Router vs Pages Router
  - ** App Router ** (app directory) - New, recommended since Next.js 13 +
- ** Pages Router ** (pages directory) - Legacy, still supported

  ** These notes focus on App Router.**

    ---

## 2. Routing System { #routing }

### Basic Routing
Next.js uses ** file - system based routing **.Every folder in `app/` directory becomes a route.

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
      - `loading.tsx` - Loading UI(Suspense boundary)
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

  ** Example: Blog Post Page **
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

  ** Example:**
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

### Catch - All Routes
Catch unlimited segments using `[...slug]`:

```
app/
└── docs/
    └── [...slug]/
        └── page.tsx    → /docs/a, /docs/a/b, /docs/a/b/c
```

  ** Example:**
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

### Optional Catch - All Routes
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

  ** Example:**
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
Intercept routes for modals using`(..)folder`:

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

## 3. Layouts & Pages { #layouts - pages }

### Root Layout(Required)
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

  ** Key Points:**
    - Must include `<html>` and `<body>` tags
      - Cannot be a Client Component
        - Shared across all pages
          - Only re - renders children, not the layout itself

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

    ** Example: Blog Layout **
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

Layouts nest automatically.When visiting`/blog/post`, you get:
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

  ** Layout vs Template:**
- ** Layout ** - Persists across navigation, state preserved
  - ** Template ** - New instance on each navigation, state reset

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

## 4. Navigation & Linking { #navigation }

### Link Component
Use `<Link>` for client - side navigation:

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
The `usePathname` hook is a Client Component hook that lets you read the current URL's **pathname**.

  ** Example: Highlighting Active Links **
    ```tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav>
      <Link href="/dashboard" className={pathname === '/dashboard' ? 'text-blue-500' : 'text-gray-500'}>
        Dashboard
      </Link>
      <Link href="/profile" className={pathname === '/profile' ? 'text-blue-500' : 'text-gray-500'}>
        Profile
      </Link>
    </nav>
  );
}
```

    > [!NOTE]
    > `usePathname` only works in ** Client Components **.If you need the pathname in a Server Component, you must pass it down from a layout or middleware.
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
A Client Component hook that lets you read the current URL's **query parameters**. It returns a read-only version of the `URLSearchParams` interface.

  ** Example: Reading and Updating Search Params **
    ```tsx
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function SearchBar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    // Update the URL without a full page reload
    replace(`${ pathname }?${ params.toString() } `);
  }

  return (
    <input
      placeholder="Search..."
      onChange={(e) => handleSearch(e.target.value)}
      defaultValue={searchParams.get('query')?.toString()}
    />
  );
}
```
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

## 5. Server vs Client Components { #components }

### Server Components(Default)
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

  ** Benefits:**
    - ✅ Direct database / API access
      - ✅ Secure(secrets stay on server)
        - ✅ Smaller bundle size
          - ✅ Better SEO
            - ✅ Can use async /await directly

              ** Limitations:**
                - ❌ No useState, useEffect, event handlers
                  - ❌ No browser APIs
                    - ❌ No client - side interactivity

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

  ** When to use Client Components:**
    - Event handlers(onClick, onChange, etc.)
      - State and lifecycle(useState, useEffect)
        - Browser APIs(localStorage, geolocation)
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
1. ** Server → Client:** Can pass Server Components as props to Client Components
2. ** Client ↛ Server:** Cannot import Server Components into Client Components directly
3. ** Props:** Must be serializable(no functions, classes, Date objects)

  ** Example: Passing Server Component to Client **
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

## 6. Data Fetching { #data - fetching }

### Server Components(Recommended)
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

#### 1. Static Data(SSG)
  ```tsx
// Cached forever, built at build time
const res = await fetch('https://api.example.com/posts', {
  cache: 'force-cache', // Default
});
```

#### 2. Dynamic Data(SSR)
  ```tsx
// Fetched on every request
const res = await fetch('https://api.example.com/posts', {
  cache: 'no-store',
});
```

#### 3. Revalidated Data(ISR)
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

### Client - Side Fetching
When you need client - side data fetching:

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
### Using SWR (Recommended for Client-Side Fetching)
SWR (Stale-While-Revalidate) is a React Hooks library for data fetching. It handles caching, revalidation, focus tracking, and more.

```tsx
'use client';

import useSWR from 'swr';

// 1. Define a fetcher function (can use fetch or axios)
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Profile() {
  // 2. Use the hook
  const { data, error, isLoading } = useSWR('/api/user/123', fetcher);

  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;

  return <div>Hello {data.name}!</div>;
}
```

#### Global Configuration
You can provide global configuration using the `SWRConfig` provider in your layout.

```tsx
// app/layout.tsx
import { SWRConfig } from 'swr';

export default function RootLayout({ children }) {
  return (
    <SWRConfig
      value={{
        fetcher: (resource, init) => fetch(resource, init).then(res => res.json()),
        revalidateOnFocus: false, // Optional: Disable auto-refresh on window focus
        dedupingInterval: 5000,   // Optional: De-duplicate requests within 5s
      }}
    >
      {children}
    </SWRConfig>
  );
}
```

#### Optimistic UI Updates
SWR allows you to update the UI instantly before the server responds.

```tsx
const { data, mutate } = useSWR('/api/user', fetcher);

async function updateName(newName) {
  // Update local data immediately, but don't revalidate yet
  mutate({ ...data, name: newName }, false);

  // Send request to server
  await fetch('/api/user', {
    method: 'POST',
    body: JSON.stringify({ name: newName })
  });

  // Revalidate to ensure local data matches server
  mutate();
}
```

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

## 7. Data Mutation & Actions { #data - mutation }

### Server Actions
Server - side mutations without API routes:

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
  // safeParse() is a Zod method that validates data without throwing an error.
  // Instead of a try/catch block, it returns an object:
  // - If successful: { success: true, data: validatedData }
  // - If failed: { success: false, error: ZodError }
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

### Route Handlers(API Routes)
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

## 8. Caching & Revalidation { #caching }

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
Client - side cache of visited routes(30 seconds default ):

```tsx
// Prefetched links are cached
<Link href="/about">About</Link>
```

### Revalidation Strategies

#### 1. Time - based Revalidation
  ```tsx
// Revalidate every 60 seconds
const res = await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 },
});
```

#### 2. On - Demand Revalidation
On - demand revalidation basically means "bhai, jab data change ho, tabhi cache update karo." Instead of waiting for a timer(ISR), you manually tell Next.js to dump the old cache.

- ** revalidatePath **: Yeh poore route ka cache clear kar deta hai.Agar tumne `/blog` pe kuch naya post dala, toh`revalidatePath('/blog')` karne se Next.js blog page ko piche(background) mein rebuild kar lega.
- ** revalidateTag **: Yeh zyada powerful hai.Tum fetch requests ko 'tags' de sakte ho.Jab tum `revalidateTag('posts')` bolte ho, toh jahan jahan 'posts' tag wala data use ho raha hai, woh sab ek saath update ho jata hai.

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

#### 3. Tag - based Revalidation
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
Pre - generate dynamic routes at build time:

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

## 9. Error Handling { #error - handling }

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

  ** How it works:**
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

  ** Example: Blog Error Handler **
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

### global - error.tsx
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

  ** Note:** Must define `<html>` and `<body>` tags since it replaces root layout.

### not - found.tsx
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

  ** Trigger manually:**
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

### Nested not - found.tsx
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

  ** Wraps page in Suspense automatically:**
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

## 10. Styling(CSS) { #styling }

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

### 4. CSS -in-JS (styled-components, emotion)

  ** styled - components:**
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
border - radius: 4px;
  
  &:hover {
  background: darkblue;
}
`;

export default function Button({ children }) {
  return <StyledButton>{children}</StyledButton>;
}
```

### 5. Sass / SCSS
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

## 11. Image Optimization { #images }

### next / image Component
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

### Static Import(Automatic size detection)
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
  < div className = "relative h-screen" >
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
</div >
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
  .font - sans {
  font - family: var(--font - inter);
}

.font - serif {
  font - family: var(--font - playfair);
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
npm i - g vercel

# Deploy
vercel

# Production deployment
vercel--prod
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
FROM node: 18 - alpine AS base

# Dependencies
FROM base AS deps
RUN apk add--no - cache libc6 - compat
WORKDIR / app

COPY package.json package - lock.json./
  RUN npm ci

# Builder
FROM base AS builder
WORKDIR / app
COPY--from = deps / app / node_modules./ node_modules
COPY. .

RUN npm run build

# Runner
FROM base AS runner
WORKDIR / app

ENV NODE_ENV production

RUN addgroup--system--gid 1001 nodejs
RUN adduser--system--uid 1001 nextjs

COPY--from = builder / app / public./ public
COPY--from = builder--chown = nextjs: nodejs / app /.next / standalone./
  COPY--from = builder--chown = nextjs: nodejs / app /.next / static./.next / static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD["node", "server.js"]
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
PORT = 8080 npm start
  ```

### Environment Variables
```bash
#.env.local(not committed)
DATABASE_URL = postgresql://...
API_KEY = secret123

#.env.production
NEXT_PUBLIC_API_URL = https://api.production.com
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
npm install next @latest react @latest react - dom@latest
  ```

### Upgrade Specific Version
```bash
npm install next @14.0.0
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
- `ImageResponse` moved from `next / server` to `next / og`
- Turbopack improvements

#### Next.js 12 → 13 (App Router)
- New `app / ` directory
- Server Components by default
- New routing system
- `next / link` no longer needs ` < a > ` tag
- `next / image` uses native lazy loading

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
  const modalRef = useRef < HTMLDivElement > (null);
  const previousFocusRef = useRef < HTMLElement | null > (null);

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
  .skip - link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: white;
  padding: 8px;
  z - index: 100;
}

.skip - link:focus {
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
  font - size: 24px;
}

/* Don't rely on color alone */
.error {
  color: #d32f2f;
  border - left: 4px solid #d32f2f; /* Visual indicator */
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
  < img src = "/large-image.jpg" alt = "Photo" />
    // Need to:
    // - Manually resize images
    // - Create multiple sizes
    // - Implement lazy loading
    // - Handle different formats
    ```

**Next.js:**
```tsx
  // Automatic optimization
  < Image
src = "/large-image.jpg"
alt = "Photo"
width = { 800}
height = { 600}
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
  < !--Crawlers see empty div-- >
<div id="root"></div>
<script src="/bundle.js"></script>
```

**Next.js:**
```html
  < !--Crawlers see full HTML-- >
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
npx create - next - app@latest
npm run dev
# Everything works out of the box:
# - Routing
# - Fast Refresh
# - TypeScript
# - CSS / Sass
# - Environment variables
  ```

**React:**
```bash
npx create - react - app my - app
# Then manually add:
# - Routing(react - router - dom)
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
  < div id = "react-widget" ></div >
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

## 10. SWR (Stale-While-Revalidate)

SWR is a React Hooks library for data fetching. The name "SWR" is derived from `stale -while-revalidate`, a HTTP cache invalidation strategy.

### Basic Usage
```tsx
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher);

  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  return <div>hello {data.name}!</div>;
}
```

### Key Features
1. **Real-time Revalidation**: Re-fetches data when you refocus the tab.
2. **Interval Fetching**: Polling data every X seconds.
3. **Optimistic UI (Mutate)**: Update the local UI immediately while the server request is pending.

### Hinglish (Hindi) Oral Explanation
- **Concept**: SWR ka funda simple hai—pehle "stale" (purana) data dikhao cache se, fir piche background mein "revalidate" (naya fetch) karo, aur jaise hi naya data mile UI update kar do.
- **Focus Revalidation**: Users jab doosre tab se wapas aate hain, SWR automatically API call maar deta hai taaki latest data dikhe.
- **Mutate**: Agar tumne naya comment dala, toh SWR se bina server reply ke screen pe dikha sakte ho (`optimistic updates`). Agar server fail hua, toh SWR khud wapas purane state pe aa jayega.

---

## 21. Best Practices Summary

### Performance
- ✅ Use Server Components by default
- ✅ Use `next / image` for all images
- ✅ Use `next / font` for fonts
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
app /
├── (auth) /              # Route group
│   ├── login /
│   └── register /
├── (marketing) /
│   ├── about /
│   └── pricing /
├── dashboard /
│   ├── layout.tsx
│   └── page.tsx
├── api /
│   └── posts /
│       └── route.ts
└── components /          # Shared components
    ├── ui /              # UI components
    └── forms /           # Form components
lib /                     # Utilities
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




---

## 🎨 LEAD REACT PATTERNS (SaaS Scale) --- IMP

### 🚀 1. State Management Strategy
As a Lead, you must choose the right tool for the job.
- **Server State**: Use **React Query (TanStack Query)** or **SWR**. Don't put API data in Redux!
- **Client State**: Use **Zustand** for simple, scalable global state. Use **Redux Toolkit** only if the state is extremely complex with many transitions.
- **Form State**: Use **React Hook Form** + **Zod** for high-performance validation.

### 🧩 2. Component Architecture
- **Compound Components**: For flexible UI components (like Tabs, Selects).
- **Control Props**: Allows parent components to \"drive\" the internal state of children.
- **Design System**: Use **Tailwind CSS** or **Styled Components** with a strict theme. Enforce a components/ui folder for reusable atomic elements.

### ⚡ 3. Performance for Large Apps
- **Code Splitting**: Use React.lazy and Suspense to avoid heavy bundles.
- **Virtualization**: Use 
eact-window or 
eact-virtuoso for rendering lists with 10k+ items.
- **Memoization**: Use useMemo and useCallback properly to prevent expensive re-calculations and keeping stable references.

---

## 👔 LEADERSHIP & PROJECT DELIVERY (JD Specific) --- IMP

### 🛠️ 1. Managing Large-Scale SaaS
- **Feature Flags**: Use tools like LaunchDarkly to enable features for specific users without redeploying.
- **Analytics & Logging**: Mention **Sentry** (for errors) and **PostHog** (for user behavior).
- **Service Level Agreements (SLAs)**: Focus on \"99.9% Uptime\" and \"Sub-200ms API response times\".

### 🤝 2. Mentorship & Quality
- **Review Strategy**: Focus on \"Logic > Readability > Style\".
- **Documentation**: Use **Swagger** for APIs and **Storybook** for UI components.
- **CI/CD**: Enforce 80%+ test coverage before merging to production.

---

## ⚡ CORE JAVASCRIPT: ASYNC & DATA FETCHING --- IMP

### 🔹 1. Axios vs Fetch (Interview Deep-Dive)

| Feature | `fetch` (Native Web API) | `axios` (Third-party Library) |
| :--- | :--- | :--- |
| **Mechanism** | Standard Fetch API | Uses XMLHttpRequests under the hood |
| **Data Parsing** | Must call `.json()` manually | Automatic JSON transformation |
| **Error Handling** | **Only** rejects on network failure (not 404/500) | Rejects on any status code outside 2xx range |
| **Interceptors** | None (requires wrapping) | Built-in Request & Response Interceptors |
| **Timeouts** | Requires `AbortController` (complex) | Simple `timeout: 5000` property |
| **Protection** | No built-in CSRF | Automatic CSRF protection |

**Lead Advice**: Use **Axios** for enterprise apps where you need global error handling (like auto-refreshing tokens on 401) and standardized response structures. Use **Fetch** only if you want zero dependencies.

#### **Syntax Comparison:**

```javascript
// --- FETCH ---
const getDataFetch = async () => {
  try {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error('Network error'); // Manual check required
    const data = await response.json(); // Manual parsing required
    console.log(data);
  } catch (err) {
    console.error(err);
  }
};

// --- AXIOS ---
import axios from 'axios';
const getDataAxios = async () => {
  try {
    const { data } = await axios.get('https://api.example.com/data'); // Auto-parsing
    console.log(data); // Rejects automatically on 4xx/5xx
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
};

// Global Interceptor Example (Axios Only)
axios.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

### 🔹 2. Promises vs Async/Await (The Core)

**What's the difference?**
- **Promises**: The primitive mechanism. Uses `.then()` and `.catch()`. Can lead to "Promise Chaining" which is still hard to read.
- **Async/Await**: Syntactic sugar over Promises. It makes async code look synchronous.

**Top Interview Concepts:**

1. **Error Handling**: 
   - Promises use `.catch()`. 
   - Async/Await uses `try/catch` block (much more standard for developers).
   
2. **Parallel vs Sequential**:
   - `await fetch1(); await fetch2();` -> **Sequential** (Slow! Total time = T1 + T2).
   - `Promise.all([fetch1(), fetch2()])` -> **Parallel** (Fast! Total time = max(T1, T2)).

3. **Return Value**: An `async` function **always** returns a Promise, even if you return a simple string.

#### **Syntax Comparison:**

```javascript
// --- PROMISE CHAINING ---
fetchData()
  .then(user => getProfile(user.id))
  .then(profile => console.log(profile))
  .catch(err => console.error(err));

// --- ASYNC / AWAIT (Cleaner) ---
const showProfile = async () => {
  try {
    const user = await fetchData();
    const profile = await getProfile(user.id);
    console.log(profile);
  } catch (err) {
    console.error(err);
  }
};

// --- OPTIMIZATION (Parallel) ---
const parallelTasks = async () => {
  // Promise.all runs them simultaneously
  const [res1, res2] = await Promise.all([
    fetch('/api/data1'),
    fetch('/api/data2')
  ]);
};
```

**Hinglish (Hindi) Summary:**
- `Async/await` code ko "saaf" dikhata hai, par piche `Promises` hi chal rahe hote hain.
- Interviewer ko hamesha bolo ki `Promise.all` tab use karo jab multiple independent API calls ek saath karni ho (optimization).

---

## 📋 THE LEAD FULL-STACK CHECKLIST (Pre-Interview)
- [ ] Can I explain **NestJS Microservices** (RabbitMQ vs BullMQ)?
- [ ] Can I design a **Multi-tenant SaaS** architecture?
- [ ] Do I know how to **Dockerize** and deploy to **AWS (ECS/Lambda)**?
- [ ] Can I articulate why **React Query** is better for server state than Redux?
- [ ] Am I ready to lead a team through **Sprint Planning** and **Code Reviews**?
