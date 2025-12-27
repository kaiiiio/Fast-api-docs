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

// https://github.com/gasangw/NestJS-Interview-Questions-And-Answers?tab=readme-ov-file#what-is-nestjs



// ///////////////////////////
// What is Nestjs?
// Nest(NestJS) is a framework for building efficient, scalable Node.js server side applications. It uses progressive JavaScript and its built with and fully suports Typescript.

// Who developed NestJS? Why did they develop NestJS?
// NestJS was developed by Kamil Myśliwiec, who is a Polish software engineer. He developed NestJS to address the lack of a consistent structure in Node.js applications and to bring powerful features of frameworks like Angular to the server-side.

// When was NestJS first released?
// NestJS was first released on October 5, 2016.

// How can you install NestJS and set up a new project on your machine?
// To install NestJS on your machine, you need to have Node.js and npm (Node Package Manager) installed. Once you have those, you can install the NestJS CLI (Command Line Interface) globally on your machine using the following command:

//   $ npm i -g @nestjs/cli
// This command installs the NestJS CLI globally, which allows you to use the nest command from anywhere on your machine. With the NestJS CLI, you can create new projects using

//   $ nest new project-name
// and after creating a project you can generate NestJS modules, services, etc.

//  $ nest generate module users
// running

//   $ nest g resource users
// will several files that work together to handle CRUD (Create, Read, Update, Delete) operations for a particular entity, in this case, "users". It will generate: A controller for handling HTTP requests (e.g., users.controller.ts)

// A service for business logic (e.g., users.service.ts)

// A module to encapsulate the resource (e.g., users.module.ts)

// If you choose to generate a REST API, it will also generate DTO (Data Transfer Object) classes for handling input data (e.g., create-user.dto.ts, update-user.dto.ts) If you choose to generate a GraphQL API, it will also generate a resolver (e.g., users.resolver.ts)

// What’s the difference between NestJS and Angular?
// Angular is a framework for building client-side applications and It provides a way to organize your frontend code using components, modules, services, etc.

// while NestJS is a framework for building server-side applications. NestJS is built on top of TypeScript and Express, and it aims to provide a more robust and scalable architecture for enterprise-level applications. However It's heavily inspired by Angular and shares similar concepts like modules, decorators, and dependency injection.

// Is it possible to use other languages like C++, Ruby or Python with NestJS? If yes, then how?
// Yes, it is possible to use other languages with NestJS. NestJS is language agnostic, meaning that it can work with any language that can compile to JavaScript.

// As for Python, Ruby, or other languages, they can't be used directly with NestJS because NestJS relies on the Node.js runtime, which executes JavaScript. As for Python, Ruby, or other languages, they can't be used directly with NestJS because NestJS relies on the Node.js runtime, which executes JavaScript.

// However, you can certainly build separate services in Python, Ruby, or any other language, and have them communicate with your NestJS application via HTTP, gRPC, or any other communication protocol. This is a common pattern in microservices architecture.

// What are the main components of a NestJS application?
// The main contents of the nestjs application inlcude: Modules: Modules are a way of organizing related components into a single block. They provide a way to structure your application.

// Controllers: Controllers are responsible for handling incoming requests and returning responses to the client.Controllers organize routes and handle HTTP requests that come to those routes.

// Services: services are responsible for business logic and interacting with data sources. They can be injected into controllers or other services, promoting code reusability and separation of concerns.

// How to declare a class as a controller in Nest.js
// In Nest.js we can declare a class as a controller by using the @Controller() decorator. Here is a basic example.

// import { Controller, Get } from "@nestjs/common";

// @Controller("example")
// class ExampleController {
//   @Get()
//   getHello(): string {
//     return "Hello world!";
//   }
// }
// In this example the ExampleController is a controller class. @Controller('example') decorator tells Nest.js that this class is a controller that should handle requests to the example route. The @Get() decorator on the getHello method indicates that this method should handle HTTP GET requests.

// ⬆ Back to Top

// Can you explain how to use decorators in a NestJS controller?
// Before explaining how to use decorators, let me explain more about what are decorators:

// decorators are special functions that are prefixed with an @ symbol and can be attached to classes, methods, or properties. They are used to add metadata, methods, properties, or observe the behavior of the classes, methods, or properties they are attached to.

// NestJS provides several built-in decorators, and you can also create custom decorators. Here are some examples of built-in decorators in NestJS:

// Class decorators like @Controller(), @Module(), @Injectable(), etc. These are used to annotate classes.

// Method decorators like @Get(), @Post(), @Put(), etc. These are used to annotate methods within controller classes to handle specific routes.

// Parameter decorators like @Req(), @Res(), @Body(), etc. These are used to annotate parameters within route handling methods.

// Property decorators like @Inject(). These are used to annotate properties within classes.

// Custom decorators. You can create your own decorators to handle common tasks across your application.

// For example, below is how method decorators are used to handle GET, POST, PUT, DELETE requests respectively.

// import {
//   Controller,
//   Get,
//   Param,
//   Body,
//   Post,
//   Patch,
//   Delete,
// } from "@nestjs/common";

// @Controller("cats")
// export class CatsController {
//   @Get()
//   findAll(): string {
//     return "This action returns all cats";
//   }

//   @Get(":id")
//   findOne(@Param("id") id: number): string {
//     return `This action returns a cat with the provided id`;
//   }

//   @Post()
//   create(@Body() body: any): string {
//     return `This action returns the body of the cat`;
//   }

//   @Patch("id")
//   update(@Param("id") id: number, @Body() body: any): string {
//     return `This action updates the body of the cat`;
//   }

//   @Delete("id")
//   remove(@Param("id") id: number): string {
//     return `This action removes a cat`;
//   }
// }
// ⬆ Back to Top

// How can you use route parameters in a NestJS controller?
// Route parameters in a NestJS controller can be accessed using the @Param() decorator in the controller methods.

//     @Patch('id')
//     update(@Param('id') id: number, @Body() body: any ): string {
//        return `This action updates the body of the cat`;
//     }
// ⬆ Back to Top

// What is the role of the @Body() decorator?
// The @Body() decorator in NestJS is used to extract the entire body of the incoming HTTP request. It's commonly used in methods that handle POST and PUT requests where data is sent in the body of the request.

// For example, if you have a method in your controller to create a new user, you might use the @Body() decorator to get the user data from the request:

//  @Post()
//  create(@Body() createUserDto: CreateUserDto) {
//   return this.usersService.create(createUserDto);
//  }
// In this example, createUserDto is an object that contains the data sent in the request body. The @Body() decorator automatically parses the JSON request body and assigns it to the createUserDto parameter.

// ⬆ Back to Top

// What is an interceptor in the context of NestJS?
// An interceptor is a class annotated with the @Injectable() decorator and implements the NestInterceptor interface.

// An Interceptor is function that can be used to intercept incoming requests to a NestJS application and perform some sort of manipulation before the request is handled by the route handler. This can be useful for things like logging, authentication and so on.

// An Interceptor has a set of useful capabilities which are inspired by the Aspect Oriented Programming (AOP) technique.

// Aspect Oriented Programming is a programming paradigm that aims to increase modularity by allowing the separation of cross-cutting concern.

// Interceptors make it possible to:

// Binding extra logic before / after method execution: An Interceptor can execute logic before and after a method is executed. This can be useful for tasks like logging, transforming the result of a method, or handling errors.

// Transforming the result returned from a function: An Interceptor can transform the response returned from a method. For example, you could use an interceptor to transform all responses to have a specific format.

// Handling errors: An Interceptor can also handle errors thrown within your application. This can be useful for logging or transforming errors before they're sent to the client. Here is an example of an interceptor that logs the user interactions as shown in the Nestjs document

// import {
//   Injectable,
//   NestInterceptor,
//   ExecutionContext,
//   CallHandler,
// } from "@nestjs/common";
// import { Observable } from "rxjs";
// import { tap } from "rxjs/operators";

// @Injectable()
// export class LoggingInterceptor implements NestInterceptor {
//   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//     console.log("Before...");

//     const now = Date.now();
//     return next
//       .handle()
//       .pipe(tap(() => console.log(`After... ${Date.now() - now}ms`)));
//   }
// }
// ⬆ Back to Top

// What are pipes in the context of NestJS?
// Pipes are a feature of NestJS that allows for validation or transformation of data before it is passed to a route handler and can either return the arguments as is, modify them, or throw an exception. A pipe is a class annotated with the @Injectable() decorator, which implements the PipeTransform interface

// Validation: This is the most common use case for pipes. They can be used to validate incoming data to ensure it matches a certain data schema. If the data is invalid, the pipe can throw an exception to prevent the route handler from being executed.

// Transformation: Pipes can transform incoming data into a desired format. For example, you might want to automatically convert incoming strings to numbers, or convert an entity's ID into the entity itself. Here's an example of a simple pipe that validates and transforms an incoming string into a number:

// import {
//   PipeTransform,
//   Injectable,
//   ArgumentMetadata,
//   BadRequestException,
// } from "@nestjs/common";

// @Injectable()
// export class ParseIntPipe implements PipeTransform<string, number> {
//   transform(value: string, metadata: ArgumentMetadata): number {
//     const val = parseInt(value, 10);
//     if (isNaN(val)) {
//       throw new BadRequestException("Validation failed");
//     }
//     return val;
//   }
// }
// This ParseIntPipe is therefore used in this way

//   @Get()
//   async findOne(@Query('id', ParseIntPipe) id: number) {
//     return this.usersService.findOne(id);
//   }
// Nest comes with nine pipes available out-of-the-box: ParseIntPipe: This pipe transforms an incoming string into an integer. If the string cannot be parsed into an integer, it throws an exception. As shown above.

// ValidationPipe: This pipe validates that the incoming request body matches a specific DTO (Data Transfer Object). If the data is invalid, it throws an exception.

// ParseFloatPipe: Similar to ParseIntPipe, but transforms an incoming string into a float.

// ParseBoolPipe: This pipe transforms an incoming string into a boolean. It accepts 'true' and 'false' as valid boolean strings.

// ParseArrayPipe: This pipe transforms a comma-separated string into an array. It can also validate the items in the array if you provide a validation schema.

// ParseUUIDPipe: This pipe validates that an incoming string is a valid UUID. If the string is not a valid UUID, it throws an exception.

// ParseEnumPipe: This pipe validates that an incoming string is a valid value of a specific TypeScript enum.

// DefaultValuePipe: This pipe provides a default value if the incoming value is undefined or null.

// ParseFilePipe: This pipe is used to handle file uploads or parse file data in some way.

// ⬆ Back to Top

// What are guards in the context of NestJS?
// Guards are functions that have a single responsibility. They determine whether a given request will be handled by the route handler or not, depending on certain conditions (like permissions, roles, ACLs, etc.) present at run-time. For example, you might use a guard to check if a user is logged in before allowing them to access a route.

// A guard is a class annotated with the @Injectable() decorator, which implements the CanActivate interface. This interface should return a boolean or a Promise that resolves to a boolean. If it returns true, the request proceeds to the route handler. If it returns false, the request is denied and the route handler is not executed. Here's an example of a basic guard:

// import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";

// @Injectable()
// export class AuthGuard implements CanActivate {
//   canActivate(context: ExecutionContext): boolean | Promise<boolean> {
//     const request = context.switchToHttp().getRequest();
//     // Add your authentication logic here
//     // For example, check if a valid JWT token exists in the request headers
//     return true; // or false if the request should be denied
//   }
// }
// In this example, AuthGuard allows all requests to proceed. In a real application, you would add your authentication logic in the canActivate method.

// ⬆ Back to Top

// What are middlewares in the context of NestJS?
// Middleware is a function which is called before the route handler. Middleware functions have access to the request and response objects, and the next() middleware function in the application’s request-response cycle.

// The next middleware function is commonly denoted by a variable named next. Middlewares can be used for a variety of purposes, such as logging, authentication, and authorization. These functions are used to execute any code, make changes to the request and the response objects, end the request-response cycle, or call the next middleware function in the stack.

// Middlewares can perform the following tasks:

// Execute any code.
// Make changes to the request and the response objects.
// End the request-response cycle.
// Call the next middleware function in the stack. If the current middleware function does not end the request-response cycle, it must call next() to pass control to the next middleware function. Otherwise, the request will be left hanging. On how to create a middleware check the Nestjs Documentation
// ⬆ Back to Top

// Explain the concept of Dependency Injection in NestJS. How does it help in building modular and testable applications?
// Dependency Injection (DI) is a design pattern in which a class receives its dependencies from external sources rather than creating them itself. This pattern is fundamental to the way NestJS is designed. dependency injection involves letting the framework manage the creation and injection of dependencies into the components (controllers, services, and more) as needed.

// This is achieved through decorators, providers, and the NestJS IoC (Inversion of Control) container Here is an example:

// import { Injectable } from "@nestjs/common";

// @Injectable()
// export class AppService {
//   getHello(): string {
//     return "Hello World!";
//   }
// }
//   import { Controller, Get } from '@nestjs/common';
//   import { AppService } from './app.service';

//   @Controller()
//   export class AppController {
//     constructor(private appService: AppService) {}

//       @Get()
//        getHello(): string {
//         return this.appService.getHello();
//       }
//   }
// In this example, AppService is a provider that is injected into AppController through the constructor. When AppController is created, NestJS automatically creates an instance of AppService and passes it to the constructor.

// DI enables us build modular and testable applications in several ways:

// Modularity: By injecting dependencies, you can easily swap out one implementation for another. This is useful when you want to change the behavior of parts of your application without changing the classes that use them.

// Testability: DI makes it easy to unit test your classes, as you can inject mock versions of dependencies for testing purposes.

// Separation of Concerns: Each class focuses on its own behavior, delegating the behavior of its dependencies to the classes that implement those dependencies. This leads to cleaner, more readable code

// ⬆ Back to Top

// What’s the difference between @injectable() and @inject() decorators?
// @Injectable(): This decorator marks a class as a provider that can be managed by the NestJS dependency injection system. It means that NestJS will create an instance of this class and can inject it where it's needed.

// It's typically used on services, which can then be injected into controllers or other services.

// @Injectable()
// export class CatsService {
//   // ...
// }
// @Inject():This decorator is used inside a class to inject a dependency. It's used in the constructor of a class to specify a dependency that should be injected.

// If you're injecting a class provider, you don't need to use @Inject() because TypeScript's reflection system can infer the type. But if you're injecting a non-class provider (like a value or a factory), or if you're working in JavaScript, you need to use @Inject() to tell NestJS what to inject.

//   export class CatsController {
//     constructor(@Inject('CatsService') private catsService: CatsService) {}
//   }
// ⬆ Back to Top

// How does the Nest logger differ from the standard console.log() and when would you prefer one over the other?
// The NestJS Logger provides additional features compared to console.log(). It includes context information, supports log levels such as (log, fatal, error,warn, debug, and verbose), and can be customized.

// Use console.log() for quick debugging or simple logging needs.

// Use NestJS Logger when you need more control over your logs, such as in larger or production applications. It helps in filtering logs based on levels and provides context, making it easier to trace the source of the log.

// On how the Nest logger is implemented checkout Nestjs Documentation

// ⬆ Back to Top

// What is the difference between interceptors and middleware?
// In NestJS, both interceptors and middleware can be used to add extra logic before or after HTTP requests. However, they have some key differences:

// Interceptors: have a more comprehensive scope than middleware. They can be used with both HTTP requests and other types of transport like WebSockets and microservices.

// Interceptors can also manipulate the response sent back to the client, for example by transforming the response object, adding extra headers, or changing the status code. They can also be used to implement performance tracking, logging, caching, etc.

// Middleware: in NestJS is similar to Express middleware. It's specific to the HTTP request-response cycle and can't be used with other types of transport. Middleware functions have access to the request and response objects, and they can end the request-response cycle or call the next middleware function in the stack.

// They are useful for tasks like logging, error handling, or validating request data.

// In general, if you're working with HTTP requests and you need to add logic that doesn't modify the response sent to the client, middleware can be a good choice. If you need to add logic that applies to other types of transport such as WebSockets and microservices, or if you need to modify the response, use an interceptor.

// ⬆ Back to Top

// What testing frameworks work best with NestJS?
// NestJS is a Node.js framework, so any testing framework that works with Node.js will work with NestJS. Some popular options include Jest, Mocha, and Jasmine. NestJS is built with testing in mind and it comes with its own testing module called @nestjs/testing. This module provides utilities for testing, such as a testing module and HTTP testing utilities.

// ⬆ Back to Top

// Explain the purpose of DTOs (Data Transfer Objects) in NestJS.
// DTOs are used to define the structure of data exchanged between different layers of an application. They define the shape of data for a specific operation, such as creating, updating, or returning data.

// DTOs serve several purposes which include: Validation: With the class-validator package, you can add validation rules to the fields in your DTOs. NestJS can automatically validate incoming requests against these rules and return an error if the request is invalid.

// Documentation: DTOs provide a clear model of what the data should look like. This can be helpful for other developers, and for tools like Swagger to automatically generate API documentation.

// Type Safety: DTOs provide type safety in TypeScript, which can help catch errors at compile time.

// import { IsString, IsInt } from "class-validator";

// export class CreateCatDto {
//   @IsString()
//   name: string;

//   @IsInt()
//   age: number;

//   @IsString()
//   breed: string;
// }
// In the above example, CreateCatDto is a DTO that represents the data needed to create a cat. It expects a name and breed of type string, and an age of type number. The @IsString() and @IsInt() decorators are used to apply validation rules.

// ⬆ Back to Top

// How can you handle asynchronous operations in NestJS, and what is the role of the Promise object?
// NestJS supports asynchronous operations through the use of the async and await keywords. When a function returns a Promise, it can be awaited, allowing non-blocking execution. The Promise object represents a value that may be available now, or in the future, or never.

// import { Injectable } from "@nestjs/common";

// @Injectable()
// export class AppService {
//   async getHello(): Promise<string> {
//     const result = await someAsyncOperation();
//     return `Hello ${result}`;
//   }
// }
// In this example, getHello() is an asynchronous method that returns a Promise. The await keyword is used to pause the execution of the function until someAsyncOperation() completes and the Promise is resolved.

// Promises are useful for handling single asynchronous operations. If you need to handle a stream of asynchronous values, you might want to use Observables instead, which are provided by the RxJS library and are also integrated into NestJS.

// ⬆ Back to Top

// Explain the purpose of the @InjectRepository() decorator in NestJS.
// The @InjectRepository() decorator in NestJS is used to inject a repository instance into a service or controller. It is commonly used with TypeORM for database interaction, allowing the injection of repositories for specific entities.

// A repository in TypeORM is a way to manage entities: it provides methods to insert, update, remove, and load entities. By injecting a repository, you can use these methods in your service or controller.

// Here is an example:

//   import { Injectable } from '@nestjs/common';
//   import { InjectRepository } from '@nestjs/typeorm';
//   import { Repository } from 'typeorm';
//   import { User } from './user.entity';

//   @Injectable()
//   export class UserService {
//     constructor(
//       @InjectRepository(User)
//       private usersRepository: Repository<User>,
//     ) {}

//     findAll(): Promise<User[]> {
//       return this.usersRepository.find();
//     }
//   }
// In the above example @InjectRepository(User) is used to inject a repository for the User entity. This repository is then used in the findAll method to load all users.

// ⬆ Back to Top

// Explain the purpose of the @nestjs/jwt package in NestJS?
// The @nestjs/jwt package is a NestJS module that provides functionality around JSON Web Tokens (JWTs). JWTs are a popular method for handling authentication and authorization in web applications.

// It includes decorators like @AuthGuard('jwt') to protect routes with JWT-based authentication and supports the generation and verification of JWTs.

// Here are some of the things you can do with the @nestjs/jwt package:

// Generate JWTs: You can create a new JWT with specific payloads and sign it with a secret key.

// Verify JWTs: You can verify a received JWT to ensure it's valid and hasn't been tampered with.

// Decode JWTs: You can decode a JWT to access the payload information.

// The @nestjs/jwt package is often used in combination with the @nestjs/passport package, which provides a way to handle authentication in a flexible, modular way. Together, these packages can be used to implement JWT authentication strategy.

// ⬆ Back to Top

// Discuss how tokens are used for authorization in an API. What is the difference between authentication and authorization, and how are these processes implemented with tokens?
// Tokens, such as JWTs (JSON Web Tokens), are used for authorization in APIs to ensure that a user has permission to access certain resources or perform certain actions.

// Authentication is the process of verifying the identity of a user. When a user logs in with their credentials, the server verifies these credentials and if they are valid, the server generates a token. This token often contains information about the user and is sent back to the client.

// Authorization on the other hand, is the process of verifying what a user has access to. Once a user is authenticated and their token is sent with each request, the server can verify the token and check if the user has the necessary permissions to perform the requested action.

// Here's a basic process:

// User sends their credentials (like username and password) to the server.

// Server verifies the credentials. If they're valid, the server generates a token and sends it back to the client.

// In subsequent requests, the client sends this token in the header of the request.

// The server verifies the token and checks the user's permissions. If the user has the necessary permissions, the server processes the request.

// In this way, tokens serve as proof of authentication and can carry information about user's permissions for authorization. They provide a stateless, scalable solution for securing APIs.

// ⬆ Back to Top

// Why is it important for tokens to have an expiration time? How can you implement token expiration in NestJS, and what role do refresh tokens play in maintaining user sessions?
// Tokens having an expiration time is important for security reasons. If a token is stolen or leaked, it can be used to gain unauthorized access to the system. By setting an expiration time, you limit the time window in which a stolen token can be used.

// In NestJS, you can set the expiration time of a JWT when you sign it using the JwtService. Here's an example:

// this.jwtService.sign(payload, { expiresIn: "60s" });
// In this example, the token will expire 60 seconds after it's issued.

// However, having tokens expire can be inconvenient for the user, as they would have to log in again every time their token expires. This is where refresh tokens come in.

// ⬆ Back to Top

// Describe the mechanism for a token refresh in NestJS. How can you implement an automatic token refresh strategy to maintain user sessions?
// In NestJS, a token refresh strategy involves issuing a refresh token when a user logs in.

// A refresh token is a special kind of token that can be used to obtain a new access token when the current one expires. When the user logs in, along with the access token, a refresh token is also generated and sent to the client.

// When the access token expires, the client sends the refresh token to the server, the server verifies the refresh token and issues a new access token.

// This allows the user to stay authenticated without having to log in again, while still limiting the potential damage of a stolen access token.

// Refresh tokens usually have a longer expiration time than access tokens, and they can be revoked by the server if needed, for example, in case of a logout.

// Here is how you can implement a token refresh strategy:

// Issue a Refresh Token: When a user logs in, along with the access token, issue a refresh token. This can be done similarly to how you issue an access token, but typically with a longer expiration time.

// Store the Refresh Token: Store the refresh token in your database associated with the user. This allows you to invalidate the refresh token when necessary, such as when the user logs out.

// Create a Refresh Endpoint: Create an endpoint in your application that accepts a refresh token and returns a new access token. In this endpoint, you should verify the refresh token, check that it hasn't been invalidated, and then issue a new access token.

// Use the Refresh Token: On the client side, when you receive a 401 Unauthorized response, it means the access token has expired. In this case, send a request to the refresh endpoint with the refresh token to get a new access token. Replace the old access token with the new one in your client's storage.

// ⬆ Back to Top

// How does NestJS support authentication and authorization?
// Nest supports authentication and authorization through various ways:

// Passport.js Integration: NestJS integrates smoothly with Passport.js, a popular authentication middleware for Node.js. Passport supports a variety of authentication strategies, such as OAuth, JWT, and local (username and password).

// JWT Module: NestJS provides a JWT module (@nestjs/jwt) for generating and validating JSON Web Tokens, which are commonly used for stateless, server-side authentication.

// Guards: In NestJS, guards are classes that control whether a given request is allowed to proceed to the route handler. They're often used to implement authorization checks.

// Decorators: Custom decorators can be used to provide metadata about routes, such as required roles for accessing a route.

// Interceptors: Interceptors can be used to bind user data to the request based on the provided token.

//   import { Controller, UseGuards, Post, Request } from '@nestjs/common';
//   import { AuthService } from './auth/auth.service';
//   import { LocalAuthGuard } from './auth/local-auth.guard';

//   @Controller('auth')
//   export class AuthController {
//     constructor(private authService: AuthService) {}

//     @UseGuards(LocalAuthGuard)
//     @Post('login')
//     async login(@Request() req) {
//       return this.authService.login(req.user);
//     }
//   }
// In this example, the LocalAuthGuard is a custom guard that uses Passport's local strategy to validate the user's username and password. The login() method then generates a JWT for the authenticated user using the AuthService.

// ⬆ Back to Top

// What is the difference between Provider and Services in Nestjs, can we have a provider without an injectable decorator, Give examples?
// A provider is a more general concept, while a service is a specific type of provider. Providers are a fundamental concept in NestJS system of dependency injection. They can be used to inject not only services, but also values, factories, and more.

// A service is a class annotated with @Injectable() decorator, typically used to handle complex business logic or to provide access to shared data. Here's an example:

// import { Injectable } from "@nestjs/common";

// @Injectable()
// export class CatsService {
//   // ...
// }
// However, a provider doesn't necessarily need to be a service. It can be any value that should be available for injection. For example, you can provide a simple string:

//     {
//       provide: 'HelloMessage',
//       useValue: 'Hello, World!',
//     }
// In this case, HelloMessage is a token that can be used to inject the string Hello, World!.

// While services are typically decorated with @Injectable(), other types of providers don't need this decorator. The @Injectable() decorator is needed when a class has its own dependencies that need to be injected. If the provider doesn't have any dependencies, like in the string example above, you don't need @Injectable().

// ⬆ Back to Top

// What are custom providers and how do they differ from standard Providers in Nest.js?
// Providers are essential in NestJS as they form the backbone of the dependency injection system. Their primary role is to create and manage instances of classes that can be injected into different components, promoting modularity and testability. By using providers, NestJS ensures a robust and organized approach to handling dependencies.

// A standard provider in NestJS is typically a class decorated with @Injectable(). This class can have dependencies, which are injected through the constructor. Here's an example:

//    import { Injectable } from '@nestjs/common';

//    @Injectable()
//    export class CatsService {
//      constructor(private readonly catsRepository: CatsRepository) {}
//    }
// In this case, CatsService is a standard provider that can be injected into other classes, and it has a dependency on CatsRepository. But not all providers are services.

// A custom provider is a more flexible way to provide values for injection,it can also be a simple value or a factory function. And these types of providers don't need the @Injectable() decorator. For example, you can have a provider that always provides the number 42:

//  {
//    provide: 'MagicNumber',
//    useValue: 42,
//  }
// In this case, MagicNumber is a token that you can use to get the number 42.

// Custom providers are a way to create providers that aren't just services. They can be values, factory functions, or async factory functions. They give you more flexibility in how you create the things that your app needs.

// ⬆ Back to Top

// How can you generate API documentation using Swagger in NestJS? Discuss the importance of documenting your API and how it benefits developers?
// Generating API documentation in NestJS can be done using the @nestjs/swagger package. This package provides decorators and a SwaggerModule to easily create Swagger documentation.

// Here is a basic setup:

// Start by installing the required dependency.
// npm install --save @nestjs/swagger
// import { NestFactory } from "@nestjs/core";
// import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
// import { AppModule } from "./app.module";

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   const config = new DocumentBuilder()
//     .setTitle("Cats example")
//     .setDescription("The cats API description")
//     .setVersion("1.0")
//     .addTag("cats")
//     .build();
//   const document = SwaggerModule.createDocument(app, config);
//   SwaggerModule.setup("api", app, document);

//   await app.listen(3000);
// }
// bootstrap();
// In the above example, SwaggerModule.createDocument(app, config) generates the Swagger JSON. SwaggerModule.setup('api', app, document) serves the Swagger UI at the specified path ('api' in this case).

// Documenting your API is important for several reasons:

// Ease of Use: It helps other developers understand how to use your API. They can see the available endpoints, the expected request format, and the response format.

// Testing: Tools like Swagger UI allow developers to test the API directly from the browser.

// Maintenance: It helps maintain the API. When changes are made, the documentation serves as a reference to ensure the API's behavior remains consistent.

// Onboarding: It speeds up the process of onboarding new developers. They can quickly understand the API's functionality without needing to dig into the codebase.

// ⬆ Back to Top

// Explain the purpose of the @nestjs/swagger ApiProperty(), ApiOperation() decorators?
// The @nestjs/swagger package provides several decorators to help with creating Swagger documentation for your API. Two of these decorators are @ApiProperty() and @ApiOperation().

// @ApiProperty(): This decorator is used within DTO (Data Transfer Object) classes to provide metadata for properties. This metadata is used to generate the Swagger documentation for the model that the API expects in the request body or returns in the response.

// import { ApiProperty } from "@nestjs/swagger";

// export class CreateUserDto {
//   @ApiProperty({
//     description: "The id of the user.",
//     minimum: 1,
//     example: 42,
//   })
//   id: number;

//   @ApiProperty({ description: "The name of the user.", example: "Thomas" })
//   username: string;
// }
// The @ApiProperty is used to indicate that id and name are properties of the CreateUserDto

// @ApiOperation(): This decorator is used within controller methods to provide metadata for operations (API endpoints). This metadata is used to generate the Swagger documentation for the operation. It allows developers to provide additional information such as operation summary, description, and custom tags, enhancing the generated Swagger documentation.

// Below is an example:

// import { ApiOperation } from "@nestjs/swagger";

// @Controller("users")
// export class UsersController {
//   @Post()
//   @ApiOperation({ summary: "Create user" })
//   create(@Body() createUserDto: CreateUserDto) {
//     // ...
//   }
// }
// @ApiOperation() is used to provide a summary for the create operation. This summary will be displayed in the Swagger UI.

// There are more decorators that are used to display error messages to the user such as @ApiNotFoundResponse,@ApiBadRequestResponse, @ApiInternalServerErrorResponse and many more. While decorators that display success messages include  @ApiOkResponse, @ApiCreatedResponse etc.

// ⬆ Back to Top

// Explain the purpose of the Dockerfile in a NestJS application, and how it facilitates containerization?
// A Dockerfile is a text document that contains all the commands a user could call on the command line to assemble an image. In the context of a NestJS application, a Dockerfile is used to create a Docker image of the application.

// A Docker image is a lightweight, standalone, executable package of software that includes everything needed to run an application. It includes code, runtime, system tools, system libraries, and settings.

// This image can be run consistently on any machine that has Docker installed, regardless of the underlying operating system.

// Here is an example of a Dockerfile for Nest application:

//    // Start from a base image
//    FROM node:14-alpine // or node:latest to use the latest version of node

//    // Set the working directory
//    WORKDIR /usr/src/app

//    //Install dependencies
//    COPY package*.json ./
//    RUN npm install

//    // Copy source code
//    COPY . .

//    // Expose the application on port 3000
//    EXPOSE 3000

//    // Start the application
//    CMD ["npm", "run", "start"]
// This Dockerfile does the following:

// Starts from a base image with Node.js installed (node:14-alpine).

// Sets the working directory in the container to /usr/src/app.

// Copies package.json and package-lock.json (if available) to the working directory.

// Installs the dependencies using npm install.

// Copies the rest of the source code to the working directory.

// Exposes port 3000, which the application uses.

// Defines the command to start the application (npm run start).

// Note: The benefit of this is that it encloses the application and its environment into a single runnable entity (a container). This ensures that the application runs the same way, regardless of where it's deployed, providing consistency and reliability across different deployment environments.

// ⬆ Back to Top

// How can you use Docker Compose with NestJS, and what is its role in a multi-container setup?
// Docker Compose Docker Compose is a tool for defining and running multi-container applications. Compose simplifies the control of your entire application stack, making it easy to manage services, networks, and volumes in a single, comprehensible YAML configuration file. Then, with a single command, you create and start all the services from your configuration file.

// Here's a basic example of a docker-compose.yml file for a NestJS application with a PostgreSQL database:

//  version: '3'
//   services:
//     app:
//       build: .
//       ports:
//         - 3000:3000
//       depends_on:
//         - db
//     db:
//       image: postgres:13-alpine
//       environment:
//         POSTGRES_USER: user
//         POSTGRES_PASSWORD: password
//         POSTGRES_DB: dbname
// In this example, there are two services: app and db. The app service is built using the Dockerfile in the current directory, and it exposes port 3000. The db service uses the postgres:13-alpine image and sets some environment variables to configure the database.

// The depends_on option is used to express dependency between services, which has two effects:

// db will be started before app. Docker Compose will wait until db is "ready" before starting app. To start the application with Docker Compose, you would use the command docker-compose up.

// The benefit of using Docker Compose is that it simplifies the management of multi-container applications. You can start, stop, and rebuild services with a single command, and it ensures that your application's services are started in the correct order.

// ⬆ Back to Top

// What is the purpose of the @nestjs/passport package, and how does it facilitate authentication in NestJS?
// @nestjs/passport is a popular node.js authentication library. The main purpose is to facilitate authentication in a NestJS application. It does this by providing a way to implement different authentication strategies (like local, JWT, OAuth, etc.) in a consistent and modular way. It provides a set of tools that make it easier to implement authentication in a NestJS application using Passport.js.

// Here is a basic example of how you might use @nestjs/passport

// import { Injectable } from "@nestjs/common";
// import { AuthGuard } from "@nestjs/passport";

// @Injectable()
// export class JwtAuthGuard extends AuthGuard("jwt") {}
// ⬆ Back to Top

// How can you handle file uploads in NestJS, and what is the role of the Multer library?
// NestJS offers convenient ways to handle file uploads, and one common approach is using the multer middleware. Additionally, the framework provides the @UploadedFile decorator, which simplifies the process of accessing and processing uploaded files in NestJS controllers. These tools collectively offer a flexible and efficient solution for managing file uploads in NestJS applications.

// By using the @UseInterceptors() decorator with FileInterceptor or FilesInterceptor, you can handle single or multiple file uploads in your application.

// ⬆ Back to Top

// How does NestJS handle database interactions, and what are the supported databases?
// NestJS doesn't directly handle database interactions. Instead, it provides integration with several libraries that do, allowing you to choose the one that best fits your needs. Here are some of the most commonly used ones:

// TypeORM: This is an Object-Relational Mapping (ORM) library that can be used with a wide variety of databases, including MySQL, PostgreSQL, MongoDB, SQLite, and more. It provides a high-level API for managing database records as JavaScript objects.

// Mongoose: If you're working with MongoDB, Mongoose is a great choice. It provides a straight-forward, schema-based solution to model your application data and includes built-in type casting, validation, query building, and business logic hooks.

// Sequelize: Sequelize is a promise-based Node.js ORM for Postgres, MySQL, MariaDB, SQLite, and Microsoft SQL Server. It supports the standard CRUD operations, transactions, migrations, and more.

// Prisma: Prisma is an open-source database toolkit. It replaces traditional ORMs and can be used to build GraphQL servers, REST APIs, microservices & more.

// On how each of these libraries is integrated in nestjs you can vist the Nest documentation

// ⬆ Back to Top

// What is Circular dependency (dependency cycle) in Nestjs, and how can they be fixed?
// A circular dependency occurs when two classes depend on each other. For example, class A needs class B, and class B also needs class A. Circular dependencies can arise in Nest between modules and between providers.

// Nest enables resolving circular dependencies between providers in two ways.

// 1.forward referencing: allows Nest to reference classes which aren't yet defined using the forwardRef() utility function. For example, if CatsService and CommonService depend on each other, both sides of the relationship can use @Inject() and the forwardRef() utility to resolve the circular dependency. Otherwise Nest won't instantiate them because all of the essential metadata won't be available. Here's an example:

//   import { forwardRef } from '@nestjs/common'

//  @Injectable()
//  export class CatsService {
//    constructor(
//      @Inject(forwardRef(() => CommonService))
//      private commonService: CommonService,
//    ) {}
//  }
// Now let's do the same with CommonService

// import { forwardRef } from '@nestjs/common'

// @Injectable()
//  export class CommonService {
//    constructor(
//      @Inject(forwardRef(() => CatsService))
//      private catsService: CatsService,
//    ) {}
//  }
// 2.ModuleRef class: An alternative to using forwardRef(). for an example you can refactor the above examples and use the ModuleRef class to retrieve a provider on one side of the (otherwise) circular relationship.

// ⬆ Back to Top

// How can you handle errors in NestJS?
// NestJS handles errors using exceptions such as throw new HttpException() syntax.

// When an exception is thrown, NestJS will automatically send an appropriate HTTP response with a status code and message.

// import { HttpException, HttpStatus } from "@nestjs/common";

// throw new HttpException("Resource not found", HttpStatus.NOT_FOUND);
// In the above example, an HttpException is thrown with a message of 'Resource not found' and a status code of 404 (Not Found).

// For more complex error handling, you can create custom exceptions by extending the HttpException class. Nestjs has many built-in standard HTTP exceptions that inherit from the base HttpException and one can use: These are exposed from the @nestjs/common package, and represent many of the most common HTTP exceptions which includes: BadRequestException,UnauthorizedException,NotFoundException,ForbiddenException, NotAcceptableException,ConflictException,NotImplementedException and so on.

// ⬆ Back to Top

// How does NestJS handle CORS (Cross-Origin Resource Sharing)?
// CORS (Cross-Origin Resource Sharing) is a mechanism that allows many resources (e.g., fonts, JavaScript, etc.) on a web page to be requested from another domain outside the domain from which the resource originated.

// In the context of web development, an API server runs on a different domain or port from the client-side web application. For security reasons, browsers prohibit web pages from making requests to a different domain than the one the web page came from, unless the server supports CORS.

// By enabling CORS on the server, you're allowing the server to respond to cross-origin requests. This means that your server's resources can be accessed from a different domain, protocol, or port than the one your server is hosted on.

// NestJS uses the capabilities of the underlying platform (Express or Fastify) to handle Cross-Origin Resource Sharing (CORS). For Express, you can enable CORS globally for all routes in your main.ts file like this:

// import { NestFactory } from "@nestjs/core";
// import { AppModule } from "./app.module";

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.enableCors({
//     origin: "http://localhost:3000",
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//     allowedHeaders: "Content-Type",
//   });
//   await app.listen(3000);
// }
// bootstrap();
// In this example, CORS is enabled only for requests from 'http://localhost:3000' and for the specified methods and headers.

// ⬆ Back to Top

// Explain the purpose of the ExecutionContext in NestJS Middleware?
// ExecutionContext can be used to access the Request and Response objects, or any other details about the current request-response cycle. This can be useful for tasks like logging, validation, transformation, and other operations that need to be performed before the request reaches the route handler.

// ⬆ Back to Top

// How can you implement soft deletes in NestJS using TypeORM, and why might soft deletes be preferred over hard deletes?
// Soft deletes in TypeORM are implemented using the @DeleteDateColumn decorator.When you delete an entity that has a @DeleteDateColumn, TypeORM doesn't actually remove it from the database. Instead, it sets the @DeleteDateColumn to the current timestamp. This is known as a "soft delete".

// Here's an example of how you might use @DeleteDateColumn in an entity:

//  import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from 'typeorm';

//    @Entity()
//    export class User {
//      @PrimaryGeneratedColumn()
//      id: number;

//      @Column()
//      name: string;

//      @DeleteDateColumn()
//      deletedAt?: Date;
//    }
// In this example, when you call userRepository.softDelete(user.id), TypeORM will set deletedAt to the current timestamp, but the User will remain in the database.

// Soft deletes can be preferred over hard deletes for a few reasons:

// 1.Data recovery: If a record is accidentally deleted, it can be easily restored.

// Audit trail: Soft deletes allow you to keep a history of all records, even ones that are deleted.
// Relationship integrity: If other tables reference the deleted record, those relationships won't be broken by a soft delete.
// For information you can read Nestjs-Query

// ⬆ Back to Top

// Explain the concept of environment variables in NestJS, and how can they be utilized for configuration management?
// Environment variables are a way to store configuration settings that can change between different environments (like development, staging, production, etc.). They are often used to store sensitive information like database credentials, API keys, or any other configuration that might change depending on the environment.

// NestJS provides a ConfigModule that uses the dotenv package to load environment variables from a .env file into process.env.

// Here's an example of how you might use ConfigModule to load environment variables:

// import { Module } from "@nestjs/common";
// import { ConfigModule } from "@nestjs/config";

// @Module({
//   imports: [ConfigModule.forRoot()],
// })
// export class AppModule {}
// In the above example, ConfigModule.forRoot() loads the .env file and the variables can be accessed anywhere in your application using process.env.

// ⬆ Back to Top

// What is the role of migration scripts in TypeORM, and how can you create and run migrations in a NestJS application?
// Migration scripts in TypeORM are a way to manage changes to your database schema over time. They allow you to version control your database schema and apply updates in a controlled manner. This is especially useful when working in a team or when you need to ensure that your database schema is consistent across different environments (development, staging, production, etc.).

// First, you need to set up TypeORM in your NestJS application. This typically involves importing the TypeOrmModule into your application module and configuring it with your database connection details.

// After you need to add a migrations path and a cli configuration to your ormconfig.json or ormconfig.js file:

//  {
//      "type": "postgres",
//      "host": "localhost",
//      "port": 5432,
//      "username": "test",
//      "password": "test",
//      "database": "test",
//      "entities": ["src/**/*.entity.ts"],
//      "migrations": ["src/migrations/*.ts"],
//      "cli": {
//        "migrationsDir": "src/migrations"
//      }
//    }
// To generate a new migration, you can use the TypeORM CLI command typeorm migration:generate -n MigrationName. This will create a new migration file in the src/migrations directory with a name like TIMESTAMP-MigrationName.ts.

// The generated migration file will have up and down methods. In the up method, you write the SQL to apply the migration, and in the down method, you write the SQL to undo the migration.

// To run the migrations, you can use the TypeORM CLI command typeorm migration:run. This will apply all pending migrations in the order they were created.

// To undo the last migration, you can use the TypeORM CLI command typeorm migration:revert. This will run the down method of the last applied migration.

// ⬆ Back to Top

// What is the purpose of ExecutionContext in NestJS?
// ExecutionContext represents the context of the currently processed HTTP request. It contains information about the request, response, route handler, and other details. ExecutionContext is often used in custom decorators, guards, and interceptors to access and manipulate request-related information.

// ⬆ Back to Top

// What is the purpose of the @Res() decorator in NestJS controllers?
// Nest provides @Res() and @Response() decorators. @Res() is simply an alias for @Response(). @Res() or @Response()allows you to directly interact with the response object and use its methods.

// When using them, you should also import the typings for the underlying library (e.g., @types/express) to take full advantage.

// Here is an example of using `@Res()` decorator:
// import { Controller, Get, Res } from "@nestjs/common";
// import { Response } from "express";

// @Controller("cats")
// export class CatsController {
//   @Get()
//   findAll(@Res() res: Response) {
//     res.status(200).send("This action returns all cats");
//   }
// }
// Note When you inject either @Res() or @Response() in a method handler, you put Nest into Library-specific mode for that handler, and you become responsible for managing the response. When doing so, you must issue some kind of response by making a call on the response object (e.g., res.json(...) or res.send(...)), or the HTTP server will hang.

// ⬆ Back to Top

// Explain the various Modules in NestJS?
// A module is a class annotated with a @Module() decorator. The@Module() decorator provides metadata that Nest makes use of to organize the application structure.

// modules are a fundamental aspect of the framework's architecture. They help organize the application into logical and manageable sections. There are three main types of modules in NestJS:

// Feature Modules: These are the most common type of modules and are used to group related features together. They keep the code organized and establish clear boundaries. This helps us manage complexity and develop with SOLID principles, especially as the size of the application and/or team grow.
// For example: The CatsController and CatsService belong to the same application domain. As they are closely related, it makes sense to move them into a feature module.

// import { Module } from "@nestjs/common";
// import { CatsController } from "./cats.controller";
// import { CatsService } from "./cats.service";

// @Module({
//   controllers: [CatsController],
//   providers: [CatsService],
// })
// export class CatsModule {}
// Shared Modules: modules are singletons by default, and thus you can share the same instance of any provider between multiple modules effortlessly. When a module is imported into another module, all of its providers are made available to the importing module. Therefore, any module that provides shared functionality should be imported wherever that functionality is needed.
// shared module

// Let's imagine that we want to share an instance of the CatsService between several other modules. In order to do that, we first need to export the CatsService provider by adding it to the module's exports array, as shown below:

// import { Module } from "@nestjs/common";
// import { CatsController } from "./cats.controller";
// import { CatsService } from "./cats.service";

// @Module({
//   controllers: [CatsController],
//   providers: [CatsService],
//   exports: [CatsService],
// })
// export class CatsModule {}
// Now any module that imports the CatsModule has access to the CatsService and will share the same instance with all other modules that import it as well.

// Global modules: When you want to provide a set of providers which should be available everywhere out-of-the-box (e.g., helpers, database connections, etc.), make the module global with the @Global() decorator.
// import { Module, Global } from "@nestjs/common";
// import { CatsController } from "./cats.controller";
// import { CatsService } from "./cats.service";

// @Global()
// @Module({
//   controllers: [CatsController],
//   providers: [CatsService],
//   exports: [CatsService],
// })
// export class CatsModule {}
// The @Global() decorator makes the module global-scoped. Global modules should be registered only once, generally by the root or core module. In the above example, the CatsService provider will be present, and modules that wish to inject the service will not need to import the CatsModule in their imports array.

// Dynamic Modules: enables you to easily create customizable modules that can register and configure providers dynamically. They are created using the register() method, which takes an options object and returns a dynamic module.
// ⬆ Back to Top

// How can you secure your NestJS application?
// Securing a NestJS application involves several aspects, including authentication, authorization, data validation, and error handling. Here are some ways to secure your NestJS application:

// Authentication: You can use Passport.js, a popular authentication library, which is integrated into NestJS via the @nestjs/passport module. Passport supports a wide range of authentication strategies, including OAuth, JWT, and local username/password.

// Authorization: NestJS provides the @Roles() decorator and AuthGuard to handle role-based access control. You can define roles on your route handlers and then use AuthGuard to check if the authenticated user has the required roles.

// Data Validation: Use class-validator and class-transformer along with the ValidationPipe provided by NestJS to validate incoming request data. This can help prevent common web vulnerabilities like SQL injection and cross-site scripting (XSS).

// Error Handling: Use filters to handle exceptions. NestJS provides the @Catch() decorator to create exception filters that can catch exceptions and return a user-friendly error response.

// Rate Limiting: Use the @nestjs/throttler package to limit the number of requests a client can make to your API in a given amount of time.

// HTTPS: Use HTTPS to encrypt data in transit between the client and your server. This can be done by providing SSL certificates to the NestFactory.create() method.

// Helmet: Use Helmet, a collection of middleware functions that set HTTP headers to help protect your application from some well-known web vulnerabilities. NestJS provides the @nestjs/platform-express package which includes support for Helmet.

// CORS: Configure Cross-Origin Resource Sharing (CORS) properly to restrict which domains can access your API. This can be done using the enableCors() method on the application instance.

// Remember, security is a broad and complex topic, and these are just some of the ways to secure your NestJS application.

// ⬆ Back to Top

// What is the entry file of NestJs application?
// The entry file of a NestJS application is typically main.ts. This is where the application's root module is bootstrapped, which kickstarts the application.

// Here's an example of what the main.ts file might look like:

// import { NestFactory } from "@nestjs/core";
// import { AppModule } from "./app.module";

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(3000);
// }
// bootstrap();
// NestFactory.create(AppModule) initializes the application with the root module (``AppModule), and app.listen(3000)` starts the application, listening for incoming requests on port 3000.

// ⬆ Back to Top

// What is the difference between dependency injection and inversion of control (IoC)?
// Dependency Injection (DI) and Inversion of Control (IoC) are both design patterns used to reduce the coupling between classes, making the code more modular, easier to test and maintain. However, they are not the same thing, but rather, DI is a form of IoC.

// Inversion of Control (IoC) is a general principle where the control flow of a program is inverted: instead of the programmer controlling the flow of a program, the external framework or runtime controls it.

// Dependency Injection (DI) is a form of IoC where the creation and binding of dependent objects is controlled by a container or a framework. Instead of a class creating or finding its dependencies, they are passed in (injected) at runtime by another piece of code, typically a container or a framework. This makes the code more flexible, testable and modular because it decouples the usage of an object from its creation. This is the form of IoC that is used in many modern frameworks such as Angular, Spring, and NestJS.

// In summary IoC is a design principle which can be implemented in several ways, one of which is DI

// ⬆ Back to Top

// How can you implement Caching in NestJS?
// Caching is a great and simple technique that helps improve your app's performance. It acts as a temporary data store providing high performance data access.

// NestJS supports caching through various mechanisms, including the use of caching libraries like cache-manager and built-in decorators such as @CacheKey and @CacheTTL. By incorporating caching strategies in your application, you can enhance performance and reduce response times for frequently requested data.

// In order to enable caching, import the CacheModule and call its register() method

// import { Module } from "@nestjs/common";
// import { CacheModule } from "@nestjs/cache-manager";
// import { AppController } from "./app.controller";

// @Module({
//   imports: [CacheModule.register()],
//   controllers: [AppController],
// })
// export class AppModule {}
// To interact with the cache manager instance, inject it to your class using the CACHE_MANAGER token, as follows:

// constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
// The get method is used to retrieve items from the cache. If the item does not exist in the cache, null will be returned.

// const value = await this.cacheManager.get("key");
// To add an item to the cache, use the set method:

// await this.cacheManager.set("key", "value");
// The default expiration time of the cache is 5 seconds, however you can change this.

// await this.cacheManager.set("key", "value", 1000);
// To disable expiration of the cache, set the ttl configuration property to 0:

// await this.cacheManager.set("key", "value", 0);
// To remove an item from the cache, use the del method:

// await this.cacheManager.del("key");
// To clear the entire cache, use the reset method:

// await this.cacheManager.reset();
// ⬆ Back to Top

// Explain the purpose of the Dependency Inversion Principle (DIP) in NestJS?
// The Dependency Inversion Principle (DIP) is one of the five principles of SOLID, an acronym. The principle states that:

//     1. High-level modules should not depend on low-level modules. Both should depend on abstractions.
//     2. Abstractions should not depend on details. Details should depend on abstractions.
// In the context of NestJS, or any other framework that supports dependency injection, the purpose of DIP is to reduce the coupling between modules, making the system more flexible, easier to test, and easier to maintain.

// By depending on abstractions, not on concrete implementations, you can easily swap out modules without changing the high-level code. For example, you might have a service that depends on a repository. If you code to an interface, you can easily change the repository (e.g., from an in-memory repository to a database repository) without changing the service code.

// For more information about DIP you can check here

// NestJS supports DIP through its modular system and the use of decorators like @Injectable(), @Inject(), and custom providers. These features allow you to define providers and inject them where needed, making it easy to manage dependencies and adhere to the Dependency Inversion Principle.

// ⬆ Back to Top

// How can you schedule tasks in NestJS?
// Task scheduling allows you to schedule arbitrary code (methods/functions) to execute at a fixed date/time, at recurring intervals, or once after a specified interval.

// Nest provides the @nestjs/schedule package, which integrates with the popular Node.js cron package.

// To implement scheduling, you can install the required dependencies.
//  npm install --save @nestjs/schedule
// Then, import the ScheduleModule into your module:
// import { Module } from "@nestjs/common";
// import { ScheduleModule } from "@nestjs/schedule";
// import { TasksService } from "./tasks.service";

// @Module({
//   imports: [ScheduleModule.forRoot()],
//   providers: [TasksService],
// })
// export class TasksModule {}
// Now, you can use the decorators in your service to schedule tasks. Here's an example:
// import { Injectable } from "@nestjs/common";
// import { Cron, CronExpression } from "@nestjs/schedule";

// @Injectable()
// export class TasksService {
//   @Cron(CronExpression.EVERY_5_SECONDS)
//   handleCron() {
//     console.log("Called every 5 seconds");
//   }
// }
// In the above example, handleCron() will be called every 5 seconds. The @Cron() decorator takes a CronExpression which determines the schedule.

// Remember, the ScheduleModule uses the node-schedule package under the hood, so you can use any cron expression that node-schedule supports.

// ⬆ Back to Top

// How can you handle database transactions in NestJS, and why are transactions important in certain scenarios?
// Database transactions in NestJS can be handled using the TypeORM package. Transactions are important when you want to ensure data integrity. If a series of database operations need to succeed or fail together, transactions can ensure that if any operation fails, all changes are rolled back and the database remains in a consistent state.

// This is particularly important in scenarios such as financial operations, where it's crucial that either all parts of a transaction are completed or none of them are.

// ⬆ Back to Top

// How can you implement versioning in NestJS APIs?
// Versioning allows you to have different versions of your controllers or individual routes running within the same application.

// There are 4 types of versioning that are supported:

// URI Versioning: The version will be passed within the URI of the request (default).
// Header Versioning: A custom request header will specify the version.
// Media Type Versioning: The Accept header of the request will specify the version.
// Custom Versioning: Any aspect of the request may be used to specify the version(s). A custom function is provided to extract said version(s).
// To enable Header Versioning for your application, do the following:

// const app = await NestFactory.create(AppModule);
// app.enableVersioning({
//   type: VersioningType.HEADER,
//   header: "Custom-Header",
// });
// await app.listen(3000);
// Check this to see how the above types of versioning are implemented.

// ⬆ Back to Top

// Explain the purpose of the @nestjs/graphql Resolver and @nestjs/graphql Scalar decorators, and how they relate to GraphQL in NestJS?
// GraphQL is a powerful query language for APIs and a runtime for fulfilling those queries with your existing data. It's an elegant approach that solves many problems typically found with REST APIs.

// The @nestjs/graphql package provides decorators that allow you to define GraphQL schemas directly from your TypeScript classes.

// @Resolver(): This decorator is used to mark a class as a GraphQL resolver. Resolvers are the building blocks of GraphQL servers. They are responsible for fetching the data for individual fields in a schema. When you send a query to a GraphQL server, the server uses resolver functions to produce a response. On how its used check here

// @Scalar(): This decorator is used to define a custom scalar. Scalars are primitive values: Int, Float, String, Boolean, or ID. When you need to use a custom primitive type (like a Date or a type from your database), you can define a custom scalar. On how its used check here

// Read this to understand the difference between GraphQLand REST

// ⬆ Back to Top

// Explain the concept of Serialization and Deserialization in NestJS?
// Serialization and deserialization are fundamental concepts in computer science, not just in NestJS. They are used when data needs to be converted into a format that can be stored or transmitted and then reconstructed later.

// Serialization: This is the process of converting a data structure or object state into a format that can be stored (for example, in a file or memory buffer) or transmitted (for example, across a network connection link) and reconstructed later (possibly in a different computer environment). For more about serialization you can check here.

// Deserialization: This is the reverse process of serialization, where the serialized format is converted back into an actual object in memory.

// In the context of NestJS, these concepts are often used when dealing with HTTP requests and responses. For example, when you send data from a client to a NestJS server, the data is serialized into a JSON format, transmitted over the network, and then deserialized back into a JavaScript object on the server.

// NestJS provides a Pipes mechanism that can be used for data transformation (serialization/deserialization) and validation. For example, the ValidationPipe provided by NestJS can be used to automatically validate and transform incoming request payloads into instances of DTO classes.

// ⬆ Back to Top

// Explain the role of NestJS middleware in the context of Microservices and provide a scenario where middleware is beneficial in a Microservices setup?
// Middleware is a function that is executed before the route handler. Middleware functions have access to the request and response objects, and the next() middleware function in the application’s request-response cycle. They can execute any code, make changes to the request and the response objects, end the request-response cycle, and call the next middleware function in the stack.

// In the context of microservices, middleware can play several important roles:

// Request Logging: Middleware can be used to log details of incoming requests. This can be useful for debugging, as well as for tracking usage patterns and user behavior.

// Authentication and Authorization: Middleware can verify a user's identity and permissions before a request reaches a service. This can prevent unauthorized access and ensure that each service doesn't have to implement its own authentication checks.

// Error Handling: Middleware can catch and handle errors. This can help to ensure that the microservice responds with a well-defined error structure even when something goes wrong.

// Rate Limiting: Middleware can track the number of requests from a client and limit usage to prevent abuse.

// ⬆ Back to Top

// Discuss the different types of coupling, such as tight coupling and loose coupling, and provide examples of how NestJS modules contribute to achieving loose coupling in a modularized application.
// Coupling is the degree of interdependence between software modules, a measure of how closely connected two routines or modules are, the strength of the relationships between modules.

// Tight Coupling: In this case, a module (or class) is highly dependent on another module. Changes in one module may require changes in the dependent module. This makes the system harder to maintain and evolve over time.

// Loose Coupling: Here, a module is not highly dependent on other modules. Changes in one module have minimal or no effect on other modules. This makes the system more maintainable and adaptable to change.

// NestJS promotes loose coupling through its modular development structure. Each module contains a portion of the application's functionality and can operate independently of other modules. This means that changes in one module do not affect others, leading to a loosely coupled system.

// Here is a more easier example:

// // users.service.ts
//   import { Injectable } from '@nestjs/common';
//   import { User } from './user.entity';

//   @Injectable()
//   export class UsersService {
//     private users: User[] = [];

//     create(user: User) {
//       this.users.push(user);
//     }

//     findAll(): User[] {
//       return this.users;
//     }
//   }

//   // meal.service.ts
//   import { Injectable } from '@nestjs/common';
//   import { UsersService } from '../users/users.service';

//   @Injectable()
//   export class MealService {
//     constructor(private usersService: UsersService) {}

//     createMeal(userId: string, MealData: CreateMealDTO) {
//       const user = this.usersService.findById(userId);
//       // Create meal for the user
//     }
//   }
// In above example, MealService depends on UsersService, but it doesn't manipulate user data directly. This is an example of loose coupling.

// ⬆ Back to Top

// How does NestJS support Server-Sent Events (SSE), and what are the primary advantages of using SSE for real-time communication in web applications?
// Server-Sent Events (SSE) is a server push technology enabling a client to receive automatic updates from a server via HTTP connection. SSE is a one-way communication channel from server to client. If you need bi-directional communication, you might want to use WebSockets instead.

// SSE they have been used in Facebook/Twitter updates, stock price updates, news feeds etc.

// To enable Server-Sent events on a route (route registered within a controller class), annotate the method handler with the @Sse() decorator.

//   @Sse('sse')
//     sse(): Observable<MessageEvent> {
//       return interval(1000).pipe(map((_) => ({ data: { hello: 'world' } })));
//   }
// In the example above, we defined a route named sse that will allow us to propagate real-time updates. These events can be listened to using the EventSource API.

// Server-Sent Events (SSE) have several advantages for real-time communication in web applications:

// 1.Built on HTTP: SSE is built on HTTP, which makes it compatible with most firewalls and networks without requiring any special configuration.

// 2.Automatic Reconnection: If a connection is lost, the browser will automatically try to reconnect to the server.

// 3.Event IDs: The server can send an ID with each event, so if a client gets disconnected, it can reconnect and get all the events it missed.

// 4.Efficient Updates: SSE is ideal for applications that require real-time updates from the server (like live news updates, real-time analytics, etc.). The server can push updates to the client as soon as new data is available.