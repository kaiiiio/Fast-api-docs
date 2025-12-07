
Ye notes cover karenge **pure documentation level tak** sab kuch (project setup se leke dependency injection, guards, interceptors, testing, CLI, etc).
Har code example commented hoga (`#` or `//` style), aur har concept ke niche explanation hogi.

---

### 📘 NESTJS FULL NOTES (BEGINNER → ADVANCED)

---

#### 🧩 1. What is NestJS?

* **NestJS** ek **progressive Node.js framework** hai, jo **TypeScript** pe likha gaya hai.
* Ye **Express.js** (default) ya **Fastify** ko use karta hai under the hood.
* Architecture: **Modular + Dependency Injection + MVC + OOP + FP + Reactive** concepts ka mix.

👉 Use hota hai large-scale **server-side applications**, **APIs**, **Microservices**, **GraphQL servers**, etc banane ke liye.

---

#### 🧱 2. Project Structure Example

```
my-app/
├── src/
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── app.module.ts
│   └── main.ts
├── package.json
└── tsconfig.json
```

---

#### 🛠 3. Installation & Setup

```bash
# Install Nest CLI globally
npm i -g @nestjs/cli

# Create new project
nest new project-name

# Run server
npm run start
```

📍 Default port: `http://localhost:3000`

---

#### ⚙️ 4. Main File (Bootstrap)

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

➡️ `NestFactory` creates the application instance.
➡️ `AppModule` = root module.

---

#### 🧩 5. Modules

* Every Nest app has at least **one root module**.
* Modules help organize code into reusable units.

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

#### 🧠 6. Controllers

* **Controllers** handle **incoming requests** and **return responses**.

```ts
// app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

👉 `@Controller('app')` = route prefix
👉 `@Get()` = GET endpoint
👉 `appService` injected using **Dependency Injection**

---

#### ⚙️ 7. Services (Providers)

* **Services** are used to handle **business logic**.
* They can be **injected** into controllers or other services.

```ts
// app.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello from NestJS!';
  }
}
```

👉 `@Injectable()` tells Nest that this class can be injected as a dependency.

---

#### 🧩 8. Dependency Injection (DI)

* Nest has its own **IoC (Inversion of Control)** container.
* You just need to use `@Injectable()` and pass it in providers.

```ts
@Controller()
export class UserController {
  constructor(private userService: UserService) {} // auto injected
}
```

---

#### 🧾 9. Routing (HTTP Methods)

```ts
@Get('/users')
findAll() { ... }

@Post('/users')
create(@Body() userData) { ... }

@Put('/users/:id')
update(@Param('id') id, @Body() data) { ... }

@Delete('/users/:id')
remove(@Param('id') id) { ... }
```

---

#### 📦 10. DTO (Data Transfer Objects)

* DTOs define the **shape of data** sent over network.

```ts
// create-user.dto.ts
export class CreateUserDto {
  name: string;
  email: string;
}
```

Use it in controller:

```ts
@Post()
create(@Body() createUserDto: CreateUserDto) {
  return this.userService.create(createUserDto);
}
```

---

#### 🧱 11. Pipes (Validation / Transformation)

```ts
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class UpperCasePipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    return value.toUpperCase();
  }
}
```

Apply it:

```ts
@Get(':name')
getName(@Param('name', new UpperCasePipe()) name: string) {
  return name;
}
```

---

#### 🛡 12. Guards (Authorization)

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    return req.headers['authorization'] === 'secret';
  }
}
```

Use it:

```ts
@UseGuards(AuthGuard)
@Get('protected')
getSecret() { return 'This is secret'; }
```

---

#### 🕵️ 13. Interceptors

* Intercept request/response to **modify** or **log**.

```ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');
    return next.handle().pipe(tap(() => console.log('After...')));
  }
}
```

---

#### ⚡ 14. Middleware

```ts
// logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${req.method}] ${req.originalUrl}`);
    next();
  }
}
```

Apply it in module:

```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
```

---

#### ⚙️ 15. Exception Filters

```ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    response.status(status).json({ message: exception.message });
  }
}
```

Use:

```ts
@UseFilters(AllExceptionsFilter)
```

---

#### 📡 16. Async Providers & Database Connection (Prisma/TypeORM Example)

```ts
@Module({
  imports: [TypeOrmModule.forRoot({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'user',
    password: 'pass',
    database: 'test',
    autoLoadEntities: true,
    synchronize: true,
  })],
})
```

---

#### 🧠 17. Lifecycle Hooks

* `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy` etc.

```ts
@Injectable()
export class MyService implements OnModuleInit {
  onModuleInit() {
    console.log('Module initialized!');
  }
}
```

---

#### 🧩 18. Configuration Management

```ts
npm i @nestjs/config

// app.module.ts
imports: [
  ConfigModule.forRoot({
    isGlobal: true,
  }),
]
```

Usage:

```ts
constructor(private configService: ConfigService) {}
getValue() {
  return this.configService.get('DATABASE_URL');
}
```

---

#### 🔐 19. Authentication (JWT Example)

```ts
npm install @nestjs/jwt passport-jwt

// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'secret-key',
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}
```

---

#### 🔄 20. Microservices

Nest supports multiple transport layers:

* TCP
* Redis
* NATS
* Kafka
* MQTT

Example:

```ts
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.TCP,
  options: { host: '127.0.0.1', port: 8877 },
});
await app.listen();
```

---

#### 🧰 21. Testing

```ts
npm run test
```

Example test:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should return "Hello"', () => {
    expect(service.getHello()).toBe('Hello from NestJS!');
  });
});
```

---

#### 💡 22. Decorators Recap

| Decorator                             | Purpose                    |
| ------------------------------------- | -------------------------- |
| `@Controller()`                       | Marks class as controller  |
| `@Get()`, `@Post()`                   | HTTP methods               |
| `@Injectable()`                       | Marks class as provider    |
| `@Module()`                           | Defines module             |
| `@Param()` / `@Body()` / `@Query()`   | Extracts request data      |
| `@UseGuards()` / `@UseInterceptors()` | Attach guards/interceptors |

---

#### ⚡ 23. Nest CLI Shortcuts

| Command                   | Description         |
| ------------------------- | ------------------- |
| `nest g module users`     | Generate module     |
| `nest g controller users` | Generate controller |
| `nest g service users`    | Generate service    |

---

#### 🧾 24. Decorator Flow (Request Lifecycle)

1. Request hits Controller
2. Middleware executes
3. Guards check access
4. Interceptors preprocess
5. Pipes validate input
6. Controller method runs
7. Interceptors post-process response
8. Filter catches any error

---

#### 🧩 25. NestJS Core Principles Summary

✅ Modular structure
✅ Dependency Injection
✅ Async programming
✅ Platform-independent (Express/Fastify)
✅ TypeScript-based
✅ Extensible (custom decorators, guards, etc.)

---

Would you like me to continue with **Part 2 (Advanced Topics)** — including
👉 GraphQL, WebSockets, Queues (Bull), EventEmitter, Swagger docs, Custom Decorators, File upload, Cron Jobs, etc.?

If yes, I’ll write that in the same `.txt`-friendly commented format next.





Perfect 🔥 — here comes **NestJS Notes Part 2 (Advanced Topics)** — written fully in **English**, formatted for `.txt` files (commented code, clean definitions, and structured explanations).
These notes continue directly from Part 1 and cover **GraphQL, WebSockets, Queues, File Uploads, Cron Jobs, Events, Custom Decorators, Swagger, and Best Practices**.

---

## ⚡ NESTJS ADVANCED NOTES (PART 2)

---

### 🧩 26. GraphQL Integration

NestJS has built-in GraphQL support via the `@nestjs/graphql` package.

```bash
npm install @nestjs/graphql @nestjs/apollo graphql apollo-server-express
```

**Setup:**

```ts
// app.module.ts
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true, // Automatically generate schema.gql
    }),
  ],
})
export class AppModule {}
```

**Resolver Example:**

```ts
// users.resolver.ts
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './user.model';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query(() => [User])
  getUsers() {
    return this.usersService.findAll();
  }

  @Mutation(() => User)
  createUser(@Args('name') name: string, @Args('email') email: string) {
    return this.usersService.create({ name, email });
  }
}
```

**Model Example:**

```ts
// user.model.ts
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field()
  email: string;
}
```

---

### 🌐 27. WebSockets (Real-time Communication)

Nest provides built-in WebSocket support via `@nestjs/websockets`.

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io
```

**Gateway Example:**

```ts
// chat.gateway.ts
import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: string): void {
    console.log('Message received:', payload);
    this.server.emit('message', payload); // broadcast to all clients
  }
}
```

👉 WebSockets are ideal for chats, live notifications, typing indicators, etc.

---

### 🧵 28. Task Queues (Bull / Redis)

```bash
npm install @nestjs/bull bull ioredis
```

**Setup:**

```ts
// app.module.ts
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: { host: 'localhost', port: 6379 },
    }),
    BullModule.registerQueue({ name: 'emailQueue' }),
  ],
})
export class AppModule {}
```

**Producer:**

```ts
// email.service.ts
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class EmailService {
  constructor(@InjectQueue('emailQueue') private emailQueue: Queue) {}

  async sendEmail(data: any) {
    await this.emailQueue.add('sendMail', data);
  }
}
```

**Consumer (Worker):**

```ts
// email.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('emailQueue')
export class EmailProcessor {
  @Process('sendMail')
  async handle(job: Job) {
    console.log('Sending email:', job.data);
  }
}
```

---

### 🧠 29. Event Emitters

Use the `@nestjs/event-emitter` package for decoupled communication.

```bash
npm install @nestjs/event-emitter
```

**Setup:**

```ts
@Module({
  imports: [EventEmitterModule.forRoot()],
})
export class AppModule {}
```

**Emit event:**

```ts
// user.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UserService {
  constructor(private eventEmitter: EventEmitter2) {}

  createUser(data) {
    this.eventEmitter.emit('user.created', data);
  }
}
```

**Listen to event:**

```ts
// user.listener.ts
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class UserListener {
  @OnEvent('user.created')
  handleUserCreated(payload) {
    console.log('New user created:', payload);
  }
}
```

---

### 🕐 30. Cron Jobs (Scheduled Tasks)

Nest uses `@nestjs/schedule` for CRON support.

```bash
npm install @nestjs/schedule
```

**Setup:**

```ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
})
export class AppModule {}
```

**Use Cron:**

```ts
// cron.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class CronService {
  @Cron('*/5 * * * * *') // every 5 seconds
  handleCron() {
    console.log('Running every 5 seconds...');
  }

  @Interval(10000)
  handleInterval() {
    console.log('Runs every 10 seconds');
  }

  @Timeout(3000)
  handleTimeout() {
    console.log('Runs once after 3 seconds');
  }
}
```

---

### 🧾 31. File Upload (Multipart)

Nest uses `@nestjs/platform-express` + `multer`.

```bash
npm install @nestjs/platform-express multer
```

**Example:**

```ts
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
    return { fileName: file.originalname };
  }
}
```

---

### 🧩 32. Custom Decorators

You can create your own decorators using `createParamDecorator`.

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['user-agent'];
  },
);
```

Use in controller:

```ts
@Get()
getUserAgent(@UserAgent() userAgent: string) {
  return userAgent;
}
```

---

### 📘 33. Swagger (API Documentation)

```bash
npm install @nestjs/swagger swagger-ui-express
```

**Setup in main.ts:**

```ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('NestJS Swagger Example')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

Visit → `http://localhost:3000/api-docs`

---

### ⚙️ 34. Config + Env Variables

Nest has a built-in `@nestjs/config` module.

```bash
npm install @nestjs/config
```

**Example:**

```ts
// app.module.ts
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

Use:

```ts
constructor(private config: ConfigService) {}
getDbUrl() {
  return this.config.get('DATABASE_URL');
}
```

---

### 🧩 35. Global Middlewares, Guards, and Filters

You can make any middleware or guard **global**.

```ts
// main.ts
app.useGlobalGuards(new AuthGuard());
app.useGlobalFilters(new AllExceptionsFilter());
app.useGlobalInterceptors(new LoggingInterceptor());
```

---

### 🔐 36. Role-based Authorization Example

```ts
// roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    const req = context.switchToHttp().getRequest();
    return roles.includes(req.user.role);
  }
}
```

Apply with custom decorator:

```ts
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

Use it:

```ts
@Roles('admin')
@UseGuards(RolesGuard)
@Get('admin')
getAdminData() { return 'Admin section'; }
```

---

### 🧠 37. Exception Handling Best Practice

* Throw `HttpException` with proper status codes.
* Example:

```ts
throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
```

Or use shortcuts:

```ts
throw new ForbiddenException('You are not allowed!');
```

---

### 🧰 38. Interceptor Use Cases

* Logging
* Transforming response
* Caching
* Timeout control

Example: Modify response

```ts
@UseInterceptors({
  intercept(context, next) {
    return next.handle().pipe(map(data => ({ success: true, data })));
  },
})
```

---

### ⚡ 39. Performance Tips

* Use `FastifyAdapter` for faster performance.
* Use `CompressionMiddleware` for responses.
* Always use async DB operations.
* Split into **feature modules** for scalability.

---

### 🧪 40. Testing (E2E)

```bash
npm run test:e2e
```

Example E2E:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/GET hello', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello from NestJS!');
  });
});
```

---

### 🧩 41. Project Structure Best Practice

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   ├── decorators/
│   └── pipes/
├── modules/
│   ├── user/
│   ├── auth/
│   ├── product/
│   └── order/
└── shared/
    ├── utils/
    └── constants/
```

---

### 🧾 42. Summary — Core NestJS Concepts

| Concept            | Description                          |
| ------------------ | ------------------------------------ |
| Module             | Groups related providers/controllers |
| Controller         | Handles routes                       |
| Service (Provider) | Contains business logic              |
| Guard              | Controls access                      |
| Pipe               | Validates & transforms data          |
| Interceptor        | Transforms request/response          |
| Filter             | Handles exceptions                   |
| Middleware         | Pre-processes requests               |
| DTO                | Defines data shape                   |
| Decorator          | Adds metadata or behavior            |
| CLI                | Generates files quickly              |

---



====================================
       NESTJS NOTES (PART 2)
====================================

Topic: Advanced Concepts (GraphQL, WebSockets, Queues, Cron Jobs, etc.)
------------------------------------------------------------

26. GRAPHQL INTEGRATION
-----------------------

# Install required packages
# npm install @nestjs/graphql @nestjs/apollo graphql apollo-server-express

# Example setup in app.module.ts

# import { GraphQLModule } from '@nestjs/graphql';
# import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
#
# @Module({
#   imports: [
#     GraphQLModule.forRoot<ApolloDriverConfig>({
#       driver: ApolloDriver,
#       autoSchemaFile: true,  # automatically generates schema.gql
#     }),
#   ],
# })
# export class AppModule {}

# Example resolver (users.resolver.ts)
#
# import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
# import { UsersService } from './users.service';
# import { User } from './user.model';
#
# @Resolver(() => User)
# export class UsersResolver {
#   constructor(private usersService: UsersService) {}
#
#   @Query(() => [User])
#   getUsers() {
#     return this.usersService.findAll();
#   }
#
#   @Mutation(() => User)
#   createUser(@Args('name') name: string, @Args('email') email: string) {
#     return this.usersService.create({ name, email });
#   }
# }

# Example GraphQL model (user.model.ts)
#
# import { ObjectType, Field, Int } from '@nestjs/graphql';
#
# @ObjectType()
# export class User {
#   @Field(() => Int)
#   id: number;
#
#   @Field()
#   name: string;
#
#   @Field()
#   email: string;
# }

------------------------------------------------------------

27. WEBSOCKETS (REAL-TIME)
---------------------------

# Install dependencies
# npm install @nestjs/websockets @nestjs/platform-socket.io

# Example WebSocket gateway
#
# import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
# import { Server, Socket } from 'socket.io';
#
# @WebSocketGateway()
# export class ChatGateway {
#   @WebSocketServer()
#   server: Server;
#
#   @SubscribeMessage('message')
#   handleMessage(client: Socket, payload: string): void {
#     console.log('Message received:', payload);
#     this.server.emit('message', payload); # broadcast to all clients
#   }
# }

# Useful for: real-time chats, notifications, live data feeds, typing indicators.

------------------------------------------------------------

28. TASK QUEUES (BULL / REDIS)
-------------------------------

# Install
# npm install @nestjs/bull bull ioredis

# Example setup in app.module.ts
#
# import { BullModule } from '@nestjs/bull';
#
# @Module({
#   imports: [
#     BullModule.forRoot({
#       redis: { host: 'localhost', port: 6379 },
#     }),
#     BullModule.registerQueue({ name: 'emailQueue' }),
#   ],
# })
# export class AppModule {}

# Producer example (email.service.ts)
#
# import { InjectQueue } from '@nestjs/bull';
# import { Queue } from 'bull';
#
# @Injectable()
# export class EmailService {
#   constructor(@InjectQueue('emailQueue') private emailQueue: Queue) {}
#
#   async sendEmail(data: any) {
#     await this.emailQueue.add('sendMail', data);
#   }
# }

# Consumer / Processor (email.processor.ts)
#
# import { Processor, Process } from '@nestjs/bull';
# import { Job } from 'bull';
#
# @Processor('emailQueue')
# export class EmailProcessor {
#   @Process('sendMail')
#   async handle(job: Job) {
#     console.log('Sending email:', job.data);
#   }
# }

------------------------------------------------------------

29. EVENT EMITTERS
------------------

# Install
# npm install @nestjs/event-emitter

# Setup
#
# import { EventEmitterModule } from '@nestjs/event-emitter';
#
# @Module({
#   imports: [EventEmitterModule.forRoot()],
# })
# export class AppModule {}

# Emit event
#
# import { EventEmitter2 } from '@nestjs/event-emitter';
#
# @Injectable()
# export class UserService {
#   constructor(private eventEmitter: EventEmitter2) {}
#
#   createUser(data) {
#     this.eventEmitter.emit('user.created', data);
#   }
# }

# Listen to event
#
# import { OnEvent } from '@nestjs/event-emitter';
#
# @Injectable()
# export class UserListener {
#   @OnEvent('user.created')
#   handleUserCreated(payload) {
#     console.log('New user created:', payload);
#   }
# }

------------------------------------------------------------

30. CRON JOBS (SCHEDULER)
-------------------------

# Install
# npm install @nestjs/schedule

# Setup
#
# import { ScheduleModule } from '@nestjs/schedule';
#
# @Module({
#   imports: [ScheduleModule.forRoot()],
# })
# export class AppModule {}

# Example Cron service
#
# import { Injectable } from '@nestjs/common';
# import { Cron, Interval, Timeout } from '@nestjs/schedule';
#
# @Injectable()
# export class CronService {
#   @Cron('*/5 * * * * *') # runs every 5 seconds
#   handleCron() {
#     console.log('Running every 5 seconds...');
#   }
#
#   @Interval(10000)
#   handleInterval() {
#     console.log('Runs every 10 seconds');
#   }
#
#   @Timeout(3000)
#   handleTimeout() {
#     console.log('Runs once after 3 seconds');
#   }
# }

------------------------------------------------------------

31. FILE UPLOAD (MULTER)
------------------------

# Install
# npm install @nestjs/platform-express multer

# Example
#
# import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
# import { FileInterceptor } from '@nestjs/platform-express';
#
# @Controller('upload')
# export class UploadController {
#   @Post()
#   @UseInterceptors(FileInterceptor('file'))
#   uploadFile(@UploadedFile() file: Express.Multer.File) {
#     console.log(file);
#     return { fileName: file.originalname };
#   }
# }

------------------------------------------------------------

32. CUSTOM DECORATORS
---------------------

# Create a custom decorator to read User-Agent
#
# import { createParamDecorator, ExecutionContext } from '@nestjs/common';
#
# export const UserAgent = createParamDecorator(
#   (data: unknown, ctx: ExecutionContext) => {
#     const request = ctx.switchToHttp().getRequest();
#     return request.headers['user-agent'];
#   },
# );
#
# Usage in controller:
#
# @Get()
# getUserAgent(@UserAgent() userAgent: string) {
#   return userAgent;
# }

------------------------------------------------------------

33. SWAGGER (API DOCS)
----------------------

# Install
# npm install @nestjs/swagger swagger-ui-express

# Example setup in main.ts
#
# import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
#
# async function bootstrap() {
#   const app = await NestFactory.create(AppModule);
#
#   const config = new DocumentBuilder()
#     .setTitle('My API')
#     .setDescription('NestJS Swagger Example')
#     .setVersion('1.0')
#     .addBearerAuth()
#     .build();
#
#   const document = SwaggerModule.createDocument(app, config);
#   SwaggerModule.setup('api-docs', app, document);
#
#   await app.listen(3000);
# }
# bootstrap();
#
# Visit: http://localhost:3000/api-docs

------------------------------------------------------------

34. CONFIGURATION + ENV VARIABLES
---------------------------------

# Install
# npm install @nestjs/config

# Setup
#
# import { ConfigModule } from '@nestjs/config';
#
# @Module({
#   imports: [ConfigModule.forRoot({ isGlobal: true })],
# })
# export class AppModule {}
#
# Usage in service:
#
# constructor(private config: ConfigService) {}
#
# getDbUrl() {
#   return this.config.get('DATABASE_URL');
# }

------------------------------------------------------------

35. GLOBAL GUARDS / FILTERS / INTERCEPTORS
------------------------------------------

# Example (main.ts)
#
# app.useGlobalGuards(new AuthGuard());
# app.useGlobalFilters(new AllExceptionsFilter());
# app.useGlobalInterceptors(new LoggingInterceptor());

------------------------------------------------------------

36. ROLE-BASED AUTHORIZATION EXAMPLE
------------------------------------

# roles.guard.ts
#
# import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
# import { Reflector } from '@nestjs/core';
#
# @Injectable()
# export class RolesGuard implements CanActivate {
#   constructor(private reflector: Reflector) {}
#
#   canActivate(context: ExecutionContext): boolean {
#     const roles = this.reflector.get<string[]>('roles', context.getHandler());
#     const req = context.switchToHttp().getRequest();
#     return roles.includes(req.user.role);
#   }
# }

# roles.decorator.ts
#
# import { SetMetadata } from '@nestjs/common';
# export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

# Controller usage:
#
# @Roles('admin')
# @UseGuards(RolesGuard)
# @Get('admin')
# getAdminData() { return 'Admin section'; }

------------------------------------------------------------

37. EXCEPTION HANDLING BEST PRACTICES
-------------------------------------

# Use HttpException class or specific exceptions
#
# throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
#
# Or shortcut classes:
#
# throw new ForbiddenException('Access denied');

------------------------------------------------------------

38. INTERCEPTOR USE CASES
-------------------------

# Common uses:
# - Logging
# - Caching
# - Transforming responses
# - Timeout control
#
# Example to modify response:
#
# @UseInterceptors({
#   intercept(context, next) {
#     return next.handle().pipe(map(data => ({ success: true, data })));
#   },
# })

------------------------------------------------------------

39. PERFORMANCE TIPS
--------------------

# - Use Fastify adapter for higher performance
# - Use compression middleware
# - Make DB calls asynchronous
# - Split app into feature-based modules
# - Avoid heavy synchronous loops in controllers

------------------------------------------------------------

40. TESTING (E2E)
-----------------

# Run
# npm run test:e2e
#
# Example:
#
# import { Test, TestingModule } from '@nestjs/testing';
# import { INestApplication } from '@nestjs/common';
# import * as request from 'supertest';
#
# describe('AppController (e2e)', () => {
#   let app: INestApplication;
#
#   beforeAll(async () => {
#     const moduleFixture: TestingModule = await Test.createTestingModule({
#       imports: [AppModule],
#     }).compile();
#
#     app = moduleFixture.createNestApplication();
#     await app.init();
#   });
#
#   it('/GET hello', () => {
#     return request(app.getHttpServer())
#       .get('/')
#       .expect(200)
#       .expect('Hello from NestJS!');
#   });
# });

------------------------------------------------------------

41. PROJECT STRUCTURE BEST PRACTICE
-----------------------------------

src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   ├── decorators/
│   └── pipes/
├── modules/
│   ├── user/
│   ├── auth/
│   ├── product/
│   └── order/
└── shared/
    ├── utils/
    └── constants/

------------------------------------------------------------

42. NESTJS CORE SUMMARY
-----------------------

Modules       → Organize code into logical blocks  
Controllers   → Handle incoming requests  
Providers     → Contain business logic (services)  
Guards        → Protect routes (auth/roles)  
Pipes         → Validate or transform input  
Interceptors  → Transform request/response or add logic  
Filters       → Catch and handle exceptions  
Middleware    → Run before route handlers  
DTOs          → Define data shape  
Decorators    → Add metadata or logic  
CLI           → Helps generate and scaffold code quickly  

------------------------------------------------------------

END OF PART 2
------------------------------------------------------------


Perfect 👌 — Let’s continue from where we left off.
We already covered **Basics → Project Structure → Modules → Controllers → Providers → Services → Dependency Injection → Custom Providers → Lifecycle Events.**

Now we’ll go step-by-step into the **next major topics of NestJS**, all written cleanly as **text notes** (so you can keep it as a `.txt` file).
→ All **code** will be properly **commented**, nothing will be skipped.

---

## 9️⃣ Exception Handling

NestJS provides a **powerful exception layer** built on top of Express (or Fastify).
It automatically catches unhandled exceptions and sends proper responses.

### 🔹 Default Exception Filter

* Nest automatically uses a built-in `ExceptionFilter`.
* It catches exceptions and converts them to **HTTP responses**.

```ts
// Example: Throwing built-in exception
throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
```

```ts
// Example using a shortcut class
throw new ForbiddenException();
```

---

### 🔹 Creating a Custom Exception Filter

```ts
// custom-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

```ts
// controller.ts
@UseFilters(new CustomExceptionFilter())
@Get()
findAll() {
  throw new ForbiddenException('Access Denied!');
}
```

---

## 🔟 Pipes

Pipes are used for:

* **Validation**
* **Transformation** (convert incoming data to desired type)

### Built-in pipes:

* `ValidationPipe`
* `ParseIntPipe`
* `ParseBoolPipe`
* `DefaultValuePipe`
* `ParseUUIDPipe`

---

### 🔹 Example: Using Validation Pipe

You must install `class-validator` and `class-transformer`.

```bash
npm install class-validator class-transformer
```

```ts
// create-user.dto.ts
import { IsString, IsEmail, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(3, 30)
  name: string;

  @IsEmail()
  email: string;
}
```

```ts
// controller.ts
@Post()
create(@Body(new ValidationPipe()) createUserDto: CreateUserDto) {
  return this.userService.create(createUserDto);
}
```

```ts
// OR globally in main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

---

## 1️⃣1️⃣ Guards

Guards are for **authentication and authorization** logic.
They determine **whether a request is allowed to proceed**.

### 🔹 Example

```ts
// auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return validateRequest(request); // return true or false
  }
}
```

```ts
// controller.ts
@UseGuards(AuthGuard)
@Get('profile')
getProfile() {
  return { msg: 'Access granted!' };
}
```

---

## 1️⃣2️⃣ Interceptors

Interceptors allow you to:

* Transform the **result** before sending it to the client.
* Bind **extra logic** before/after function execution.
* Handle **logging**, **caching**, etc.

### 🔹 Example

```ts
// logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');
    const now = Date.now();

    return next
      .handle()
      .pipe(tap(() => console.log(`After... ${Date.now() - now}ms`)));
  }
}
```

```ts
// controller.ts
@UseInterceptors(LoggingInterceptor)
@Get()
findAll() {
  return ['item1', 'item2'];
}
```

---

## 1️⃣3️⃣ Middleware

Middleware runs **before** the route handler.
Used for logging, auth, body parsing, etc.

### 🔹 Example

```ts
// logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`Request... ${req.method} ${req.url}`);
    next();
  }
}
```

```ts
// app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerMiddleware } from './logger.middleware';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
```

---

## 1️⃣4️⃣ Modules (Advanced)

### 🔹 Dynamic Modules

Used for reusable feature modules.

```ts
@Module({})
export class DatabaseModule {
  static register(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        { provide: 'DB_CONNECTION', useValue: createConnection(options) },
      ],
      exports: ['DB_CONNECTION'],
    };
  }
}
```

```ts
// usage
@Module({
  imports: [DatabaseModule.register({ host: 'localhost', port: 3306 })],
})
export class AppModule {}
```

---

✅ **Next Sections (Coming up next message):**
15️⃣ Database & ORM (TypeORM, Prisma)
16️⃣ Configuration Management (.env, ConfigModule)
17️⃣ Caching
18️⃣ Queues (BullMQ)
19️⃣ File Uploads
20️⃣ WebSockets & Events

---

Would you like me to continue with **Database & ORM (TypeORM + Prisma)** next (also fully commented for `.txt` use)?


Perfect bro 🔥 — now we’ll continue with the **next part of your NestJS full notes**,
with **Express.js comparisons**, and everything written in **`.txt`-friendly format** (no tables, all code commented).
Nothing will be skipped, every point + concept + example + difference covered.

---

# 🧩 15️⃣ DATABASE & ORM IN NESTJS

NestJS supports **multiple ORMs** and **databases**, like:

* TypeORM
* Prisma
* Sequelize
* Mongoose (for MongoDB)

We’ll mainly focus on **TypeORM** and **Prisma** since you’re an **Express.js developer**, so I’ll explain both and show how they differ from raw SQL or Sequelize-style ORM in Node.js.

---

## 🔹 TYPEORM IN NESTJS

TypeORM integrates deeply with NestJS using decorators and dependency injection.

### Installation:

```bash
npm install --save @nestjs/typeorm typeorm mysql2
```

### Setup (SQL-based DB):

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserModule } from './user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'test_db',
      entities: [User],
      synchronize: true, // ⚠️ Auto-create tables (use only for dev)
    }),
    UserModule,
  ],
})
export class AppModule {}
```

---

### Example Entity (Model):

```ts
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;
}
```

---

### Service + Repository

```ts
// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  findAll() {
    return this.userRepository.find();
  }

  create(user: Partial<User>) {
    return this.userRepository.save(user);
  }
}
```

---

### Controller Example

```ts
// user.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  create(@Body() data) {
    return this.userService.create(data);
  }
}
```

---

## 🔸 EXPRESS.JS vs NESTJS (for TypeORM setup)

| Concept             | Express                                                  | NestJS                                             |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| Database connection | You manually use Sequelize or TypeORM createConnection() | Nest automatically injects DB connections using DI |
| Controllers         | Pure route handlers                                      | Decorator-based organized controllers              |
| Models              | Defined with plain JS classes or Sequelize models        | Defined as Entity classes with decorators          |
| Lifecycle           | Manual connection close/reconnect                        | Managed automatically by Nest lifecycle hooks      |
| Config              | Usually in `.env` or config.js                           | Uses `@nestjs/config` for typed config injection   |

---

## 🔹 PRISMA IN NESTJS

Prisma is modern and simpler compared to TypeORM.
It doesn’t rely on decorators — instead, it uses a **schema file** (`schema.prisma`).

### Installation

```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

---

### prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  name  String
  email String  @unique
}
```

---

### Generate Prisma Client

```bash
npx prisma generate
npx prisma migrate dev --name init
```

---

### PrismaService

```ts
// prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

### Using Prisma in Service

```ts
// user.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany();
  }

  create(data) {
    return this.prisma.user.create({ data });
  }
}
```

---

### Controller Example

```ts
// user.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  create(@Body() data) {
    return this.userService.create(data);
  }
}
```

---

## 🔸 TYPEORM vs PRISMA (for Express devs)

**TypeORM**

* Decorator-based entities
* Similar to Sequelize
* Tightly coupled with NestJS modules
* Lazy/eager loading support
* Can feel heavier and slower for large projects

**Prisma**

* Schema-first (easy to visualize models)
* Generates strong TypeScript types automatically
* Query syntax is simpler (`prisma.user.findMany()`)
* Faster dev iteration
* No decorators

If you’re coming from **Express + Sequelize**, Prisma will feel easier and cleaner.

---

# ⚙️ 16️⃣ CONFIGURATION MANAGEMENT

NestJS has a built-in **ConfigModule** for managing environment variables.

### Installation:

```bash
npm install @nestjs/config
```

---

### Usage:

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // make config available everywhere
      envFilePath: '.env',
    }),
  ],
})
export class AppModule {}
```

```env
# .env file
PORT=4000
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
```

---

### Access Config in Service

```ts
// any.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnyService {
  constructor(private configService: ConfigService) {}

  getDbUrl() {
    return this.configService.get<string>('DATABASE_URL');
  }
}
```

---

### Comparison with Express.js

| Concept    | Express             | NestJS                                     |
| ---------- | ------------------- | ------------------------------------------ |
| Config     | Use dotenv manually | Uses `@nestjs/config` globally             |
| Access     | process.env.MY_KEY  | configService.get('MY_KEY')                |
| Validation | Manual              | Can integrate Joi schema validation easily |

---

# 🔁 17️⃣ CACHING

NestJS supports caching using `CacheModule` (works with in-memory or Redis).

### Installation

```bash
npm install cache-manager
npm install cache-manager-redis-store
```

---

### Example (in-memory cache)

```ts
// app.module.ts
import { CacheModule, Module } from '@nestjs/common';

@Module({
  imports: [CacheModule.register({ ttl: 5 })], // 5 seconds
})
export class AppModule {}
```

```ts
// service.ts
import { Injectable, CacheInterceptor, UseInterceptors } from '@nestjs/common';

@Injectable()
export class ProductService {
  findAll() {
    return ['item1', 'item2'];
  }
}

// controller.ts
@UseInterceptors(CacheInterceptor)
@Get()
findAll() {
  return this.productService.findAll();
}
```

---

### Redis Cache Example

```ts
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
    }),
  ],
})
export class AppModule {}
```

---

# 🔔 18️⃣ QUEUES (BullMQ Integration)

Used for background jobs like emails, notifications, video processing, etc.

### Installation

```bash
npm install @nestjs/bull bull ioredis
```

---

### Setup

```ts
// app.module.ts
import { BullModule } from '@nestjs/bull';
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
})
export class AppModule {}
```

---

### Producer

```ts
// email.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class EmailService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendEmail(data) {
    await this.emailQueue.add('sendEmailJob', data);
  }
}
```

---

### Consumer (Worker)

```ts
// email.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('email')
export class EmailProcessor {
  @Process('sendEmailJob')
  async handleEmail(job: Job) {
    console.log('Sending email to:', job.data.to);
  }
}
```

---

Would you like me to continue with next topics —
**19️⃣ File Uploads**, **20️⃣ WebSockets & Gateways**, **21️⃣ Testing**, and **22️⃣ Microservices (RabbitMQ, Kafka, gRPC)** — all in the same `.txt`-ready style (commented code, full definitions, Express comparisons)?



Perfect 🔥 — continuing your **NestJS Full Notes (Text File Ready)** version.
We’ll now cover **19️⃣ File Uploads**, **20️⃣ WebSockets**, **21️⃣ Testing**, and **22️⃣ Microservices**,
and as always → all examples are fully commented so you can copy this directly into a `.txt` file.
No tables, no markdown — only pure readable developer notes.

---

# 🗂️ 19️⃣ FILE UPLOADS IN NESTJS

NestJS provides built-in support for handling file uploads using **Multer**, just like Express.js does internally.
Multer is automatically used under the hood by Nest.

### Installation

```bash
npm install --save @nestjs/platform-express multer
```

---

### Single File Upload Example

```ts
// upload.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  uploadSingle(@UploadedFile() file: Express.Multer.File) {
    // file contains buffer, originalname, mimetype, etc.
    console.log(file);
    return { filename: file.originalname };
  }
}
```

---

### Multiple File Upload Example

```ts
import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 5))
  uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    return { total: files.length };
  }
}
```

---

### Storing Files to Disk

```ts
import { diskStorage } from 'multer';
import { extname } from 'path';

@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }),
)
@Post('disk')
uploadToDisk(@UploadedFile() file: Express.Multer.File) {
  return { path: file.path };
}
```

---

### Express vs NestJS (File Upload)

* In Express, you configure multer manually → `app.post('/upload', upload.single('file'))`
* In NestJS, you use `@UseInterceptors(FileInterceptor(...))` → cleaner, decorator-based
* The same multer configuration logic still applies underneath.

---

# 📡 20️⃣ WEBSOCKETS & GATEWAYS

NestJS provides a **WebSocketGateway** system that’s abstraction-agnostic — it works with Socket.io or pure WebSockets.

### Installation (for Socket.io)

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io
```

---

### Simple Gateway Example

```ts
// chat.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: true,
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: { user: string; msg: string }) {
    console.log('Message Received:', data);
    this.server.emit('message', data);
  }
}
```

---

### Express vs NestJS (WebSockets)

* In Express, you manually use Socket.io or ws library and bind events → `io.on('connection')`.
* In NestJS, you use decorators → `@WebSocketGateway()`, `@SubscribeMessage()`, etc.
* It integrates perfectly with DI and modules (you can inject services inside gateways).

---

# 🧪 21️⃣ TESTING IN NESTJS

NestJS testing system is powered by **Jest**.
It uses the built-in testing utilities provided by `@nestjs/testing`.

---

### Installation

```bash
npm install --save-dev jest @types/jest ts-jest
```

Initialize Jest config:

```bash
npx ts-jest config:init
```

---

### Unit Test Example

```ts
// cats.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CatsService } from './cats.service';

describe('CatsService', () => {
  let service: CatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatsService],
    }).compile();

    service = module.get<CatsService>(CatsService);
  });

  it('should return all cats', () => {
    expect(service.findAll()).toEqual(['cat1', 'cat2']);
  });
});
```

---

### E2E (Integration) Test Example

```ts
// app.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/GET hello', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });
});
```

---

### Express vs NestJS (Testing)

* Express: you manually use Supertest or Mocha and manually create app/server.
* NestJS: TestingModule simulates dependency injection, context, and module environment — cleaner unit isolation.
* Jest is preconfigured out of the box in Nest CLI projects.

---

# ⚙️ 22️⃣ MICROSERVICES IN NESTJS

NestJS has **first-class support for microservices** and distributed communication systems.
It supports TCP, Redis, RabbitMQ, Kafka, gRPC, NATS, and custom transport layers.

---

### Basic TCP Microservice Example

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 8877 },
    },
  );
  await app.listen();
}
bootstrap();
```

---

### Controller as Microservice Listener

```ts
// app.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern({ cmd: 'sum' })
  accumulate(data: number[]) {
    return (data || []).reduce((a, b) => a + b);
  }
}
```

---

### Client Sending Message

```ts
// client.service.ts
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientService {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 8877 },
    });
  }

  sendSum(numbers: number[]) {
    return this.client.send({ cmd: 'sum' }, numbers);
  }
}
```

---

### RabbitMQ Example (popular for queues)

```bash
npm install amqplib
```

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBIT_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'task_queue',
          queueOptions: { durable: false },
        },
      },
    ]),
  ],
})
export class AppModule {}
```

---

### Express vs NestJS (Microservices)

* Express needs external libraries (like `amqplib` or `grpc`) and manual wiring.
* NestJS abstracts all protocols under one consistent decorator-based API.
* You can switch transport (TCP → Kafka → Redis) without touching your business logic.

---

# ⚡ BONUS TOPICS (for .txt completeness)

✅ 23️⃣ **Lifecycle Hooks**

* `OnModuleInit`, `OnModuleDestroy`, `OnApplicationShutdown`
* Used for initializing or closing connections, logging, etc.

✅ 24️⃣ **Global Prefix**

```ts
app.setGlobalPrefix('api/v1');
```

✅ 25️⃣ **Swagger Integration (API Docs)**

```bash
npm install @nestjs/swagger swagger-ui-express
```

```ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('My API')
  .setDescription('API Docs')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```

✅ 26️⃣ **Middleware vs Guards vs Interceptors**

* **Middleware** → run before route (e.g., logging, CORS)
* **Guards** → decide if route executes (e.g., auth)
* **Interceptors** → modify input/output (e.g., response transform, caching)

✅ 27️⃣ **Dependency Injection Recap**

* Works automatically via class constructors.
* You just annotate providers, Nest does the wiring.
* Similar to manually calling `require()` or injecting modules in Express, but automated.

✅ 28️⃣ **CLI Commands**

```bash
nest new project-name     # create project
nest g module users        # generate module
nest g controller users    # generate controller
nest g service users       # generate service
```

---

Would you like me to continue with **advanced NestJS features** next (like GraphQL integration, Interceptors chaining, Guards + Decorators combination, EventEmitter, and Performance optimizations)?
I’ll keep the same `.txt` format and explain with Express comparisons as before.
