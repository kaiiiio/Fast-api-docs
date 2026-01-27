# GraphQL Complete Guide for Backend Development

A comprehensive guide to GraphQL covering fundamentals, integration with SQL and MongoDB, best practices, and interview preparation.

## Table of Contents
1. [What is GraphQL?](#what-is-graphql)
2. [GraphQL vs REST](#graphql-vs-rest)
3. [GraphQL Schema & Type System](#graphql-schema--type-system)
4. [GraphQL with SQL Databases](#graphql-with-sql-databases)
5. [GraphQL with MongoDB](#graphql-with-mongodb)
6. [Advanced Patterns](#advanced-patterns)
7. [Best Practices](#best-practices)
8. [Interview Questions](#interview-questions)

---

## What is GraphQL? --- IMP

**Definition:** GraphQL is a query language for APIs and a runtime for executing those queries. It was developed by Facebook in 2012 and open-sourced in 2015.

**Key Concepts:**
- **Query Language:** Not a database query language, but an API query language
- **Type System:** Strongly typed schema defines your API structure
- **Single Endpoint:** Unlike REST with multiple endpoints, GraphQL uses one endpoint (`/graphql`)
- **Client-Specified Queries:** Clients request exactly the data they need
- **No Over-fetching/Under-fetching:** Get precisely what you ask for

**Why GraphQL?**
- **Flexible Data Fetching:** Frontend decides what data it needs
- **Reduced Network Requests:** Get multiple resources in a single request
- **Strong Typing:** Schema provides clear API contract
- **Real-time Updates:** Built-in subscription support
- **Better Developer Experience:** Auto-generated documentation, introspection

---

## GraphQL vs REST  --- IMP

### Comparison Table

| Feature | GraphQL | REST |
|---------|---------|------|
| **Endpoints** | Single endpoint (`/graphql`) | Multiple endpoints (`/users`, `/posts`) |
| **Data Fetching** | Get exactly what you need | Often over/under-fetch |
| **Versioning** | No versioning needed | API versioning required (`/v1/users`) |
| **Learning Curve** | Steeper | Gentler |
| **Caching** | More complex | Simple (HTTP caching) |
| **Real-time** | Built-in (subscriptions) | Requires WebSockets |
| **Type Safety** | Built-in schema | Requires additional tools |
| **Documentation** | Auto-generated | Manual |

### Example Comparison

**REST Approach:**
```javascript
// Need to make 3 separate requests
GET /api/users/1
GET /api/users/1/posts
GET /api/users/1/followers

// Response includes ALL fields (over-fetching)
{
  "id": 1,
  "email": "john@example.com",
  "name": "John",
  "password": "hashed...",  // Don't need this
  "createdAt": "...",       // Don't need this
  "updatedAt": "..."        // Don't need this
}
```

**GraphQL Approach:**
```graphql
# Single request, exact data needed
query {
  user(id: 1) {
    name
    email
    posts {
      title
    }
    followers {
      name
    }
  }
}

# Response with ONLY requested fields
{
  "data": {
    "user": {
      "name": "John",
      "email": "john@example.com",
      "posts": [{ "title": "My Post" }],
      "followers": [{ "name": "Jane" }]
    }
  }
}
```

---

## GraphQL Schema & Type System

### Basic Types

```graphql
# Scalar Types (built-in)
Int       # Signed 32-bit integer
Float     # Signed double-precision floating-point
String    # UTF-8 character sequence
Boolean   # true or false
ID        # Unique identifier (serialized as String)

# Custom Scalar Types
scalar DateTime
scalar JSON
scalar Upload
```

### Object Types

```graphql
type User {
  id: ID!              # ! means non-nullable (required)
  email: String!
  name: String         # nullable (optional)
  age: Int
  isActive: Boolean!
  posts: [Post!]!      # non-nullable array of non-nullable Posts
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String
  published: Boolean!
  author: User!        # Relationship to User
  comments: [Comment!]!
  createdAt: DateTime!
}

type Comment {
  id: ID!
  text: String!
  author: User!
  post: Post!
  createdAt: DateTime!
}
```

### Query Type (Read Operations)

```graphql
type Query {
  # Get all users
  users: [User!]!
  
  # Get single user by ID
  user(id: ID!): User
  
  # Get user by email
  userByEmail(email: String!): User
  
  # Get posts with filters
  posts(published: Boolean, authorId: ID): [Post!]!
  
  # Get single post
  post(id: ID!): Post
  
  # Search posts
  searchPosts(query: String!): [Post!]!
}
```

### Mutation Type (Write Operations)

```graphql
type Mutation {
  # User mutations
  createUser(email: String!, name: String, password: String!): User!
  updateUser(id: ID!, name: String, email: String): User!
  deleteUser(id: ID!): Boolean!
  
  # Post mutations
  createPost(title: String!, content: String, authorId: ID!): Post!
  updatePost(id: ID!, title: String, content: String): Post!
  publishPost(id: ID!): Post!
  deletePost(id: ID!): Boolean!
  
  # Comment mutations
  createComment(postId: ID!, text: String!): Comment!
  deleteComment(id: ID!): Boolean!
}
```

### Subscription Type (Real-time)

```graphql
type Subscription {
  # Subscribe to new posts
  postCreated: Post!
  
  # Subscribe to post updates
  postUpdated(id: ID!): Post!
  
  # Subscribe to new comments on a post
  commentAdded(postId: ID!): Comment!
  
  # Subscribe to user status changes
  userStatusChanged(userId: ID!): User!
}
```

### Input Types

```graphql
# Input types for complex arguments
input CreateUserInput {
  email: String!
  name: String
  password: String!
  age: Int
}

input UpdatePostInput {
  title: String
  content: String
  published: Boolean
}

# Use in mutations
type Mutation {
  createUser(input: CreateUserInput!): User!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
}
```

### Enums

```graphql
enum UserRole {
  ADMIN
  MODERATOR
  USER
  GUEST
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

type User {
  id: ID!
  email: String!
  role: UserRole!
}

type Post {
  id: ID!
  title: String!
  status: PostStatus!
}
```

### Interfaces

```graphql
interface Node {
  id: ID!
  createdAt: DateTime!
}

type User implements Node {
  id: ID!
  createdAt: DateTime!
  email: String!
  name: String
}

type Post implements Node {
  id: ID!
  createdAt: DateTime!
  title: String!
  content: String
}
```

### Unions

```graphql
union SearchResult = User | Post | Comment

type Query {
  search(query: String!): [SearchResult!]!
}

# Query usage
query {
  search(query: "john") {
    ... on User {
      email
      name
    }
    ... on Post {
      title
      content
    }
    ... on Comment {
      text
    }
  }
}
```

---

## GraphQL with SQL Databases   --- IMP

### Setup with Prisma

**Installation:**
```bash
npm install @apollo/server graphql
npm install @prisma/client
npm install -D prisma
```

**Prisma Schema:**
```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  comments  Comment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  comments  Comment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Comment {
  id        Int      @id @default(autoincrement())
  text      String
  postId    Int
  post      Post     @relation(fields: [postId], references: [id])
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
```

**GraphQL Schema:**
```graphql
# schema.graphql
type User {
  id: ID!
  email: String!
  name: String
  posts: [Post!]!
  comments: [Comment!]!
  createdAt: String!
}

type Post {
  id: ID!
  title: String!
  content: String
  published: Boolean!
  author: User!
  comments: [Comment!]!
  createdAt: String!
}

type Comment {
  id: ID!
  text: String!
  post: Post!
  author: User!
  createdAt: String!
}

type Query {
  users: [User!]!
  user(id: ID!): User
  posts(published: Boolean): [Post!]!
  post(id: ID!): Post
}

type Mutation {
  createUser(email: String!, name: String): User!
  createPost(title: String!, content: String, authorId: ID!): Post!
  publishPost(id: ID!): Post!
  createComment(postId: ID!, text: String!, authorId: ID!): Comment!
}
```

**Resolvers with Prisma:**   --- IMP
```typescript
// resolvers.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const resolvers = {
  Query: {
    users: async () => {
      return await prisma.user.findMany({
        include: {
          posts: true,
          comments: true
        }
      });
    },
    
    user: async (_parent: any, args: { id: string }) => {
      return await prisma.user.findUnique({
        where: { id: parseInt(args.id) },
        include: {
          posts: true,
          comments: true
        }
      });
    },
    
    posts: async (_parent: any, args: { published?: boolean }) => {
      return await prisma.post.findMany({
        where: args.published !== undefined ? { published: args.published } : {},
        include: {
          author: true,
          comments: true
        }
      });
    },
    
    post: async (_parent: any, args: { id: string }) => {
      return await prisma.post.findUnique({
        where: { id: parseInt(args.id) },
        include: {
          author: true,
          comments: true
        }
      });
    }
  },
  
  Mutation: {
    createUser: async (_parent: any, args: { email: string; name?: string }) => {
      return await prisma.user.create({
        data: {
          email: args.email,
          name: args.name
        }
      });
    },
    
    createPost: async (_parent: any, args: { title: string; content?: string; authorId: string }) => {
      return await prisma.post.create({
        data: {
          title: args.title,
          content: args.content,
          authorId: parseInt(args.authorId)
        },
        include: {
          author: true,
          comments: true
        }
      });
    },
    
    publishPost: async (_parent: any, args: { id: string }) => {
      return await prisma.post.update({
        where: { id: parseInt(args.id) },
        data: { published: true },
        include: {
          author: true,
          comments: true
        }
      });
    },
    
    createComment: async (_parent: any, args: { postId: string; text: string; authorId: string }) => {
      return await prisma.comment.create({
        data: {
          text: args.text,
          postId: parseInt(args.postId),
          authorId: parseInt(args.authorId)
        },
        include: {
          post: true,
          author: true
        }
      });
    }
  },
  
  // Field resolvers (optional - Prisma handles this automatically with include)
  User: {
    posts: async (parent: any) => {
      return await prisma.post.findMany({
        where: { authorId: parent.id }
      });
    },
    comments: async (parent: any) => {
      return await prisma.comment.findMany({
        where: { authorId: parent.id }
      });
    }
  },
  
  Post: {
    author: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.authorId }
      });
    },
    comments: async (parent: any) => {
      return await prisma.comment.findMany({
        where: { postId: parent.id }
      });
    }
  },
  
  Comment: {
    post: async (parent: any) => {
      return await prisma.post.findUnique({
        where: { id: parent.postId }
      });
    },
    author: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.authorId }
      });
    }
  }
};
```

**Apollo Server Setup:**
```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { resolvers } from './resolvers';

const typeDefs = readFileSync('./schema.graphql', { encoding: 'utf-8' });

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀 GraphQL Server ready at: ${url}`);
```

**Example Queries:**
```graphql
# Get all users with their posts
query GetAllUsers {
  users {
    id
    email
    name
    posts {
      id
      title
      published
    }
  }
}

# Get specific user
query GetUser {
  user(id: "1") {
    id
    email
    name
    posts {
      title
      content
      comments {
        text
        author {
          name
        }
      }
    }
  }
}

# Get published posts only
query GetPublishedPosts {
  posts(published: true) {
    id
    title
    author {
      name
      email
    }
  }
}

# Create user
mutation CreateUser {
  createUser(email: "john@example.com", name: "John Doe") {
    id
    email
    name
  }
}

# Create post
mutation CreatePost {
  createPost(
    title: "My First Post"
    content: "This is my first post!"
    authorId: "1"
  ) {
    id
    title
    author {
      name
    }
  }
}

# Publish post
mutation PublishPost {
  publishPost(id: "1") {
    id
    title
    published
  }
}

# Add comment
mutation AddComment {
  createComment(
    postId: "1"
    text: "Great post!"
    authorId: "2"
  ) {
    id
    text
    author {
      name
    }
    post {
      title
    }
  }
}
```

---

## GraphQL with MongoDB   --- IMP

### Setup with Prisma (MongoDB)

**Prisma Schema:**
```prisma
// schema.prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  email     String    @unique
  name      String?
  posts     Post[]
  comments  Comment[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Post {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  title     String
  content   String?
  published Boolean   @default(false)
  authorId  String    @db.ObjectId
  author    User      @relation(fields: [authorId], references: [id])
  comments  Comment[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Comment {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  text      String
  postId    String   @db.ObjectId
  post      Post     @relation(fields: [postId], references: [id])
  authorId  String   @db.ObjectId
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
```

**Resolvers (Same as SQL!):**
```typescript
// The resolvers code is IDENTICAL to SQL version!
// Prisma abstracts the database differences

export const resolvers = {
  Query: {
    users: async () => {
      return await prisma.user.findMany({
        include: {
          posts: true,
          comments: true
        }
      });
    },
    // ... rest is exactly the same
  }
};
```

**Key Advantage:** With Prisma, your GraphQL resolvers are database-agnostic. The same code works for PostgreSQL, MySQL, MongoDB, etc.!

---

### Setup with TypeORM (MongoDB)

**Entity Definitions:**
```typescript
// entities/User.ts
import { Entity, ObjectIdColumn, ObjectId, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @ObjectIdColumn()
    id: ObjectId;
    
    @Column()
    email: string;
    
    @Column()
    name: string;
    
    @CreateDateColumn()
    createdAt: Date;
    
    @UpdateDateColumn()
    updatedAt: Date;
    
    // Virtual fields (not stored in DB)
    posts?: Post[];
    comments?: Comment[];
}

// entities/Post.ts
@Entity('posts')
export class Post {
    @ObjectIdColumn()
    id: ObjectId;
    
    @Column()
    title: string;
    
    @Column()
    content: string;
    
    @Column()
    published: boolean;
    
    @Column()
    authorId: ObjectId;
    
    @CreateDateColumn()
    createdAt: Date;
    
    @UpdateDateColumn()
    updatedAt: Date;
    
    // Virtual fields
    author?: User;
    comments?: Comment[];
}

// entities/Comment.ts
@Entity('comments')
export class Comment {
    @ObjectIdColumn()
    id: ObjectId;
    
    @Column()
    text: string;
    
    @Column()
    postId: ObjectId;
    
    @Column()
    authorId: ObjectId;
    
    @CreateDateColumn()
    createdAt: Date;
    
    // Virtual fields
    post?: Post;
    author?: User;
}
```

**Resolvers with TypeORM:**
```typescript
// resolvers.ts
import { AppDataSource } from './data-source';
import { User } from './entities/User';
import { Post } from './entities/Post';
import { Comment } from './entities/Comment';
import { ObjectId } from 'mongodb';

const userRepository = AppDataSource.getMongoRepository(User);
const postRepository = AppDataSource.getMongoRepository(Post);
const commentRepository = AppDataSource.getMongoRepository(Comment);

export const resolvers = {
  Query: {
    users: async () => {
      const users = await userRepository.find();
      
      // Manually populate relationships
      for (const user of users) {
        user.posts = await postRepository.find({
          where: { authorId: user.id }
        });
        user.comments = await commentRepository.find({
          where: { authorId: user.id }
        });
      }
      
      return users;
    },
    
    user: async (_parent: any, args: { id: string }) => {
      const user = await userRepository.findOne({
        where: { _id: new ObjectId(args.id) }
      });
      
      if (user) {
        user.posts = await postRepository.find({
          where: { authorId: user.id }
        });
        user.comments = await commentRepository.find({
          where: { authorId: user.id }
        });
      }
      
      return user;
    },
    
    posts: async (_parent: any, args: { published?: boolean }) => {
      const where = args.published !== undefined ? { published: args.published } : {};
      const posts = await postRepository.find({ where });
      
      // Populate relationships
      for (const post of posts) {
        post.author = await userRepository.findOne({
          where: { _id: post.authorId }
        });
        post.comments = await commentRepository.find({
          where: { postId: post.id }
        });
      }
      
      return posts;
    }
  },
  
  Mutation: {
    createUser: async (_parent: any, args: { email: string; name?: string }) => {
      const user = userRepository.create({
        email: args.email,
        name: args.name
      });
      return await userRepository.save(user);
    },
    
    createPost: async (_parent: any, args: { title: string; content?: string; authorId: string }) => {
      const post = postRepository.create({
        title: args.title,
        content: args.content,
        authorId: new ObjectId(args.authorId),
        published: false
      });
      
      const savedPost = await postRepository.save(post);
      
      // Populate author
      savedPost.author = await userRepository.findOne({
        where: { _id: savedPost.authorId }
      });
      
      return savedPost;
    }
  },
  
  // MongoDB Aggregation Example
  Query: {
    userStats: async () => {
      return await userRepository.aggregate([
        {
          $lookup: {
            from: 'posts',
            localField: '_id',
            foreignField: 'authorId',
            as: 'posts'
          }
        },
        {
          $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'authorId',
            as: 'comments'
          }
        },
        {
          $project: {
            email: 1,
            name: 1,
            postCount: { $size: '$posts' },
            commentCount: { $size: '$comments' }
          }
        }
      ]).toArray();
    }
  }
};
```

---

## Advanced Patterns    --- IMP

### 1. DataLoader (Solving N+1 Problem)

The **N+1 problem** occurs when a single query for a list of items (1) triggers additional queries for related data for each item (N). DataLoader solves this through **batching and caching**: it collects multiple requests for related data in a single tick of the event loop and executes one bulk query instead of many individual ones.

**Problem:**
```typescript
// Without DataLoader - N+1 queries
// 1 query for users
const users = await prisma.user.findMany();

// N queries for posts (one per user)
for (const user of users) {
  user.posts = await prisma.post.findMany({
    where: { authorId: user.id }
  });
}
// Total: 1 + N queries
```

**Solution:**
```bash
npm install dataloader
```

```typescript
// loaders.ts
import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Batch load posts by author IDs
export const createPostLoader = () => {
  return new DataLoader(async (authorIds: number[]) => {
    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: authorIds }
      }
    });
    
    // Group posts by authorId
    const postsByAuthor = authorIds.map(id =>
      posts.filter(post => post.authorId === id)
    );
    
    return postsByAuthor;
  });
};

// Batch load users by IDs
export const createUserLoader = () => {
  return new DataLoader(async (userIds: number[]) => {
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      }
    });
    
    // Return users in same order as requested IDs
    return userIds.map(id => users.find(user => user.id === id));
  });
};
```

**Use in Resolvers:**
```typescript
// server.ts
import { createPostLoader, createUserLoader } from './loaders';

await startStandaloneServer(server, {
  context: async () => ({
    prisma,
    loaders: {
      postLoader: createPostLoader(),
      userLoader: createUserLoader()
    }
  })
});

// resolvers.ts
export const resolvers = {
  User: {
    posts: async (parent: any, _args: any, context: any) => {
      // Uses DataLoader - batches multiple requests
      return context.loaders.postLoader.load(parent.id);
    }
  },
  
  Post: {
    author: async (parent: any, _args: any, context: any) => {
      // Uses DataLoader - batches multiple requests
      return context.loaders.userLoader.load(parent.authorId);
    }
  }
};
```

**Result:** Multiple post fetches are batched into a single query!

---

### 2. Subscriptions (Real-time Updates)

#### Subscriptions enable **real-time, event-driven communication** from the server to the client. Unlike Queries and Mutations which are request-response based, Subscriptions maintain a long-lived connection (typically via WebSockets) and push data to clients whenever a specific event occurs on the server.

**Setup:**
```bash
npm install graphql-subscriptions
npm install graphql-ws ws @graphql-tools/schema
```

**Schema:**
```graphql
type Subscription {
  postCreated: Post!
  postUpdated(id: ID!): Post!
  commentAdded(postId: ID!): Comment!
}
```

**Resolver with PubSub:**
```typescript
// pubsub.ts
import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();

// Event names
export const POST_CREATED = 'POST_CREATED';
export const POST_UPDATED = 'POST_UPDATED';
export const COMMENT_ADDED = 'COMMENT_ADDED';
```

```typescript
// resolvers.ts
import { pubsub, POST_CREATED, POST_UPDATED, COMMENT_ADDED } from './pubsub';

export const resolvers = {
  Mutation: {
    createPost: async (_parent: any, args: any, context: any) => {
      const post = await context.prisma.post.create({
        data: args,
        include: { author: true }
      });
      
      // Publish event
      pubsub.publish(POST_CREATED, { postCreated: post });
      
      return post;
    },
    
    createComment: async (_parent: any, args: any, context: any) => {
      const comment = await context.prisma.comment.create({
        data: args,
        include: { author: true, post: true }
      });
      
      // Publish event
      pubsub.publish(COMMENT_ADDED, { 
        commentAdded: comment,
        postId: args.postId 
      });
      
      return comment;
    }
  },
  
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator([POST_CREATED])
    },
    
    postUpdated: {
      subscribe: (_parent: any, args: { id: string }) => {
        return pubsub.asyncIterator([`${POST_UPDATED}_${args.id}`]);
      }
    },
    
    commentAdded: {
      subscribe: (_parent: any, args: { postId: string }) => {
        return pubsub.asyncIterator([`${COMMENT_ADDED}_${args.postId}`]);
      }
    }
  }
};
```

**Server Setup with WebSocket:**
```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import express from 'express';
import { readFileSync } from 'fs';
import { resolvers } from './resolvers';

const typeDefs = readFileSync('./schema.graphql', { encoding: 'utf-8' });
const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
const httpServer = createServer(app);

// WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await server.start();

app.use(
  '/graphql',
  express.json(),
  expressMiddleware(server, {
    context: async () => ({ prisma })
  })
);

httpServer.listen(4000, () => {
  console.log(`🚀 Server ready at http://localhost:4000/graphql`);
  console.log(`🔌 Subscriptions ready at ws://localhost:4000/graphql`);
});
```

**Client Subscription:**
```graphql
# Subscribe to new posts
subscription OnPostCreated {
  postCreated {
    id
    title
    author {
      name
    }
  }
}

# Subscribe to comments on specific post
subscription OnCommentAdded {
  commentAdded(postId: "1") {
    id
    text
    author {
      name
    }
  }
}
```

---

### 3. Pagination

#### Pagination is essential for **managing large result sets** and ensuring high performance and a smooth user experience. In GraphQL, two common patterns are used: Offset-based (simple but potentially slow for large offsets) and Cursor-based (Relay-style, more complex but highly performant and stable).

**Offset-based Pagination:**
```graphql
type Query {
  posts(skip: Int, take: Int): [Post!]!
}
```

```typescript
posts: async (_parent: any, args: { skip?: number; take?: number }) => {
  return await prisma.post.findMany({
    skip: args.skip || 0,
    take: args.take || 10,
    include: { author: true }
  });
}
```

**Cursor-based Pagination (Relay-style):**
```graphql
type Query {
  posts(first: Int, after: String, last: Int, before: String): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

```typescript
posts: async (_parent: any, args: { first?: number; after?: string }) => {
  const take = args.first || 10;
  const cursor = args.after ? { id: parseInt(Buffer.from(args.after, 'base64').toString()) } : undefined;
  
  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      take: take + 1, // Fetch one extra to check if there's a next page
      cursor,
      skip: cursor ? 1 : 0,
      include: { author: true }
    }),
    prisma.post.count()
  ]);
  
  const hasNextPage = posts.length > take;
  const edges = (hasNextPage ? posts.slice(0, -1) : posts).map(post => ({
    node: post,
    cursor: Buffer.from(post.id.toString()).toString('base64')
  }));
  
  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: !!cursor,
      startCursor: edges[0]?.cursor,
      endCursor: edges[edges.length - 1]?.cursor
    },
    totalCount
  };
}
```

---

### 4. Error Handling

#### Professional error handling in GraphQL involves **returning structured error data** instead of generic messages. Using `GraphQLError` with a custom `extensions` field allows you to provide specific error codes and HTTP-like status hints, enabling the client to react appropriately to different failure scenarios.

```typescript
import { GraphQLError } from 'graphql';

export const resolvers = {
  Query: {
    user: async (_parent: any, args: { id: string }, context: any) => {
      const user = await context.prisma.user.findUnique({
        where: { id: parseInt(args.id) }
      });
      
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            http: { status: 404 }
          }
        });
      }
      
      return user;
    }
  },
  
  Mutation: {
    createPost: async (_parent: any, args: any, context: any) => {
      try {
        return await context.prisma.post.create({
          data: args,
          include: { author: true }
        });
      } catch (error) {
        if (error.code === 'P2003') {
          throw new GraphQLError('Author not found', {
            extensions: {
              code: 'FOREIGN_KEY_CONSTRAINT',
              http: { status: 400 }
            }
          });
        }
        throw error;
      }
    }
  }
};
```

---

### 5. Authentication & Authorization

#### Securing a GraphQL API requires a **layered approach to access control**. Authentication identifies who the user is (typically via JWTs in the context), while Authorization determines what they are allowed to see or do, which can be handled directly in resolvers or more declaratively through schema directives.

**Context with Authentication:**
```typescript
// auth.ts
import jwt from 'jsonwebtoken';

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
};

// server.ts
await startStandaloneServer(server, {
  context: async ({ req }) => {
    // Extract token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    // Verify token and get user
    const user = token ? verifyToken(token) : null;
    
    return { 
      prisma,
      user,
      loaders: {
        postLoader: createPostLoader(),
        userLoader: createUserLoader()
      }
    };
  }
});
```

**Protected Resolvers:**
```typescript
export const resolvers = {
  Query: {
    me: async (_parent: any, _args: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      
      return await context.prisma.user.findUnique({
        where: { id: context.user.id }
      });
    }
  },
  
  Mutation: {
    createPost: async (_parent: any, args: any, context: any) => {
      // Check authentication
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      
      // Check authorization
      if (context.user.role !== 'ADMIN' && context.user.role !== 'USER') {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' }
        });
      }
      
      return await context.prisma.post.create({
        data: {
          ...args,
          authorId: context.user.id // Use authenticated user's ID
        },
        include: { author: true }
      });
    },
    
    deletePost: async (_parent: any, args: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      
      const post = await context.prisma.post.findUnique({
        where: { id: parseInt(args.id) }
      });
      
      // Check if user owns the post or is admin
      if (post.authorId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new GraphQLError('Not authorized to delete this post', {
          extensions: { code: 'FORBIDDEN' }
        });
      }
      
      await context.prisma.post.delete({
        where: { id: parseInt(args.id) }
      });
      
      return true;
    }
  }
};
```

**Directive-based Authorization:**
```graphql
directive @auth(requires: Role = USER) on FIELD_DEFINITION

enum Role {
  ADMIN
  USER
  GUEST
}

type Mutation {
  createPost(title: String!): Post! @auth(requires: USER)
  deleteUser(id: ID!): Boolean! @auth(requires: ADMIN)
}
```

---

## Best Practices

### 1. Schema Design

#### A well-designed schema is the **foundation of a great developer experience**. It should prioritize clarity, use strong typing with enums for fixed sets of values, and leverage input types to keep mutation arguments organized and scalable.

**✅ Good:**
```graphql
# Clear, descriptive names
type User {
  id: ID!
  email: String!
  fullName: String
  profilePicture: String
}

# Use enums for fixed values
enum UserRole {
  ADMIN
  USER
  GUEST
}

# Use input types for complex arguments
input CreateUserInput {
  email: String!
  fullName: String
  password: String!
}
```

**❌ Bad:**
```graphql
# Unclear names
type U {
  i: ID!
  e: String!
  n: String
}

# Using strings for fixed values
type User {
  role: String  # Should be enum
}

# Too many arguments
type Mutation {
  createUser(email: String!, name: String!, password: String!, age: Int, bio: String): User!
}
```

---

### 2. Resolver Performance

#### High-performance resolvers depend on **minimizing database round-trips and data over-fetching**. This is achieved by using DataLoaders to batch relationship queries and using ORM projection features to fetch only the specific fields requested in the GraphQL query.

**✅ Good:**
```typescript
// Use DataLoader to batch requests
User: {
  posts: async (parent: any, _args: any, context: any) => {
    return context.loaders.postLoader.load(parent.id);
  }
}

// Use select to fetch only needed fields
user: async (_parent: any, args: { id: string }) => {
  return await prisma.user.findUnique({
    where: { id: parseInt(args.id) },
    select: {
      id: true,
      email: true,
      name: true
      // Don't fetch password or other sensitive fields
    }
  });
}
```

**❌ Bad:**
```typescript
// N+1 problem - fetches posts one by one
User: {
  posts: async (parent: any) => {
    return await prisma.post.findMany({
      where: { authorId: parent.id }
    });
  }
}

// Fetches all fields including sensitive ones
user: async (_parent: any, args: { id: string }) => {
  return await prisma.user.findUnique({
    where: { id: parseInt(args.id) }
  });
}
```

---

### 3. Error Handling

**✅ Good:**
```typescript
// Specific error codes
throw new GraphQLError('User not found', {
  extensions: {
    code: 'USER_NOT_FOUND',
    http: { status: 404 }
  }
});

// Validation errors
throw new GraphQLError('Invalid email format', {
  extensions: {
    code: 'VALIDATION_ERROR',
    field: 'email'
  }
});
```

**❌ Bad:**
```typescript
// Generic errors
throw new Error('Something went wrong');

// Exposing internal errors
throw error; // Might expose database details
```

---

### 4. Security

#### Beyond authentication, GraphQL security requires **defending against malicious queries**. This includes implementing rate limiting to prevent brute-force attacks and setting depth or complexity limits to block deeply nested queries that could crash your server (Regular Expression Denial of Service/ReDoS).

**✅ Good:**
```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/graphql', limiter);

// Query depth limiting
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(5)]
});

// Query complexity limiting
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [createComplexityLimitRule(1000)]
});
```

**❌ Bad:**
```typescript
// No rate limiting
// No query depth limiting
// Allowing infinitely nested queries
```

---

## Interview Questions   --- IMP
  
### Q1: What is GraphQL and how does it differ from REST?

**Answer:**

The fundamental difference lies in the **shifting of power from the server to the client**. In REST, the server defines the structure of the data for each endpoint, whereas GraphQL allows the client to specify exactly which fields it needs, effectively solving the problems of over-fetching and under-fetching.

GraphQL is a query language for APIs that allows clients to request exactly the data they need. Key differences from REST:

1. **Single Endpoint:** GraphQL uses one endpoint (`/graphql`) vs REST's multiple endpoints
2. **Flexible Data Fetching:** Clients specify exactly what data they need, eliminating over-fetching and under-fetching
3. **Strong Typing:** GraphQL has a type system that defines the API contract
4. **No Versioning:** GraphQL doesn't need API versioning since clients can request specific fields
5. **Real-time:** Built-in subscription support for real-time updates

**Example:**
```graphql
# GraphQL - Single request, exact data
query {
  user(id: 1) {
    name
    posts { title }
  }
}

# REST - Multiple requests
GET /users/1
GET /users/1/posts
```

---

### Q2: What is the N+1 problem in GraphQL and how do you solve it?

**Answer:**

The **N+1 problem** is a common performance bottleneck where a single request for a list of items triggers a separate database query for the related data of every item in that list. It is traditionally solved using **DataLoader**, which batches these multiple individual requests into a single, efficient bulk query.

The N+1 problem occurs when fetching a list of items (1 query) and then fetching related data for each item (N queries).

**Example:**
```typescript
// N+1 Problem
const users = await prisma.user.findMany(); // 1 query
for (const user of users) {
  user.posts = await prisma.post.findMany({ // N queries
    where: { authorId: user.id }
  });
}
// Total: 1 + N queries (if 100 users = 101 queries!)
```

**Solution: DataLoader**
```typescript
import DataLoader from 'dataloader';

const postLoader = new DataLoader(async (authorIds) => {
  const posts = await prisma.post.findMany({
    where: { authorId: { in: authorIds } }
  });
  
  return authorIds.map(id => 
    posts.filter(post => post.authorId === id)
  );
});

// Now batches all requests into 2 queries total
User: {
  posts: (parent, _, context) => context.postLoader.load(parent.id)
}
```

---

### Q3: How do you implement authentication and authorization in GraphQL?

**Answer:**

Securing a GraphQL API is typically a **two-stage process** involving the `context` object and resolver-level checks. Authentication is performed once at the beginning of the request to populate the context with user data, while authorization is enforced within individual resolvers or via schema directives to restrict access to specific fields or operations.

Authentication and authorization are typically handled in the context function and resolvers:

**Authentication (Context):
```typescript
await startStandaloneServer(server, {
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? verifyToken(token) : null;
    return { user, prisma };
  }
});
```

**Authorization (Resolvers):
```typescript
Mutation: {
  createPost: async (_parent, args, context) => {
    // Check authentication
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }
    
    // Check authorization
    if (context.user.role !== 'ADMIN') {
      throw new GraphQLError('Not authorized', {
        extensions: { code: 'FORBIDDEN' }
      });
    }
    
    return await context.prisma.post.create({ data: args });
  }
}
```

---

### Q4: What are GraphQL subscriptions and when would you use them?

**Answer:**

Subscriptions provide a mechanism for the **server to push real-time data to clients** over a persistent connection, usually WebSockets. They are most effective in scenarios where the state of the system changes frequently and users need to see updates without manually refreshing their view.

Subscriptions enable real-time, event-based updates from server to client using WebSockets.

**Use Cases:**
- Chat applications (new messages)
- Live notifications
- Real-time dashboards
- Collaborative editing
- Live sports scores

**Implementation:**
```graphql
type Subscription {
  messageAdded(chatId: ID!): Message!
}
```

```typescript
import { PubSub } from 'graphql-subscriptions';
const pubsub = new PubSub();

Mutation: {
  sendMessage: async (_, args) => {
    const message = await prisma.message.create({ data: args });
    pubsub.publish('MESSAGE_ADDED', { messageAdded: message });
    return message;
  }
},

Subscription: {
  messageAdded: {
    subscribe: (_, args) => 
      pubsub.asyncIterator([`MESSAGE_ADDED_${args.chatId}`])
  }
}
```

---

### Q5: How does GraphQL work with SQL vs MongoDB?

**Answer:**

GraphQL remains **database-agnostic at the resolver layer**, meaning the logical implementation of your API often looks identical regardless of the underlying storage engine. However, the implementation details differ behind the scenes: SQL databases benefit from standard relational joins and optimized ORM inclusions, while MongoDB may require manual relationship population or the use of aggregation pipelines for complex data assembly.

**With Prisma:**
- GraphQL resolvers are database-agnostic
- Same resolver code works for PostgreSQL, MySQL, MongoDB, etc.
- Prisma handles the database-specific queries

```typescript
// Same code for both SQL and MongoDB!
users: async () => {
  return await prisma.user.findMany({
    include: { posts: true }
  });
}
```

**With TypeORM:**
- SQL uses standard repositories: `getRepository(User)`
- MongoDB uses: `getMongoRepository(User)`
- MongoDB requires manual relationship population
- MongoDB supports aggregation pipelines directly

```typescript
// SQL
const users = await userRepository.find({ relations: ['posts'] });

// MongoDB
const users = await userRepository.find();
for (const user of users) {
  user.posts = await postRepository.find({ where: { authorId: user.id } });
}
```

---

### Q6: What are the main challenges with GraphQL?

**Answer:**

While GraphQL offers significant advantages, it introduces **new complexities in infrastructure and security**. The most prominent challenges involve managing the lack of native HTTP caching, preventing clients from executing overly complex or malicious queries, and the overhead of implementing batching to avoid performance pitfalls.

1. **Caching:** More complex than REST (can't use HTTP caching easily)
2. **Query Complexity:** Clients can create expensive queries
3. **Learning Curve:** Steeper than REST
4. **Over-fetching at DB level:** Might fetch more from DB than needed
5. **File Uploads:** More complex than REST
6. **N+1 Problem:** Requires DataLoader to solve

**Solutions:**
- Use persisted queries for caching
- Implement query depth and complexity limits
- Use DataLoader for batching
- Use specialized libraries for file uploads (graphql-upload)

---

### Q7: Explain GraphQL schema types: Query, Mutation, and Subscription

**Answer:**

The GraphQL type system is built on **three primary operation types** that define the entry points for any request. Queries represent safe, read-only data fetching; Mutations handle all state-changing operations like create, update, and delete; and Subscriptions manage long-lived connections for real-time event delivery.

**Query (Read operations):**
```graphql
type Query {
  users: [User!]!
  user(id: ID!): User
}
```
- Used for fetching data
- Similar to GET in REST
- Can be executed in parallel
- Cacheable

**Mutation (Write operations):**
```graphql
type Mutation {
  createUser(email: String!): User!
  updateUser(id: ID!, name: String): User!
  deleteUser(id: ID!): Boolean!
}
```
- Used for creating, updating, deleting data
- Similar to POST, PUT, DELETE in REST
- Executed sequentially (one at a time)
- Not cacheable

**Subscription (Real-time):**
```graphql
type Subscription {
  userCreated: User!
  postUpdated(id: ID!): Post!
}
```
- Used for real-time updates
- Uses WebSockets instead of HTTP
- Server pushes data to client
- Event-driven

---

This guide covers everything you need to know about GraphQL for backend development and interview preparation! 🚀
