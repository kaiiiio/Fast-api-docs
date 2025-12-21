# 📘 COMPLETE NESTJS GUIDE FOR EXPRESS DEVELOPERS
# Every Import, Decorator, and Concept Explained
# ================================================================

## 🎯 TABLE OF CONTENTS
1. Core Decorators & Imports
2. HTTP Method Decorators
3. Parameter Decorators
4. Validation & Transformation
5. Guards & Authorization
6. Interceptors & Middleware
7. Exception Handling
8. Lifecycle Hooks
9. Advanced Features
10. Complete Code Examples

================================================================

## 1️⃣ CORE DECORATORS & IMPORTS

### @Module() - FROM '@nestjs/common'

**What it is:**
A class decorator that defines a module - the fundamental building block of NestJS applications.

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
"@Module is unique to NestJS. In Express, you might organize routes into separate files, but NestJS enforces this through modules. A module encapsulates related functionality - controllers, services, and their dependencies. The decorator tells NestJS how to wire everything together using metadata."

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

**Interview Explanation:**
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

**Interview Explanation:**
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

## 2️⃣ HTTP METHOD DECORATORS - FROM '@nestjs/common'

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

### Complete Parameter Decorators Example:

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

**Interview Explanation:**
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

---

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
Interface for creating interceptors that can transform requests/responses.

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
    console.log('Before');
    return next.handle().pipe(
      tap(() => console.log('After'))
    );
  }
}
```

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
```typescript
// 1. Logging Interceptor
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

// 2. Transform Response Interceptor
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

// 3. Timeout Interceptor
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

// 4. Cache Interceptor
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = request.url;

    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    return next.handle().pipe(
      tap(response => {
        this.cacheManager.set(cacheKey, response, 60); // 60 seconds TTL
      })
    );
  }
}
```

---

### @UseInterceptors() - FROM '@nestjs/common'

**What it is:**
Decorator to apply interceptors.

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

## 8️⃣ EXCEPTION HANDLING

### ExceptionFilter - FROM '@nestjs/common'

**What it is:**
Interface for creating custom exception filters.

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

**Interview Explanation:**
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
Built-in exception classes for common HTTP errors.

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

## 9️⃣ LIFECYCLE HOOKS

### Lifecycle Hook Interfaces - FROM '@nestjs/common'

**What they are:**
Interfaces for hooking into module/provider lifecycle events.

**Express Equivalent:**
None. Express has no lifecycle hooks.

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

**Execution Order:**
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

**Interview Explanation:**
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

---

### @SetMetadata() - FROM '@nestjs/common'

**What it is:**
Decorator to attach custom metadata to classes or methods.

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
