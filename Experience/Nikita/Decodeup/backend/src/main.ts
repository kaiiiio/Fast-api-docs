import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * The 'bootstrap' function is the entry point of the application.
 * Historically, 'bootstrapping' means starting a computer program or system.
 * In NestJS, it initializes the application context and starts the HTTP server.
 */
async function bootstrap() {
    // Create a NestJS application instance using the root AppModule
    const app = await NestFactory.create(AppModule);

    // Enable CORS so the frontend (running on a different port) can communicate with the backend
    app.enableCors();

    // Use Global ValidationPipe to automatically validate incoming request bodies (DTOs)
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true, // Only allow properties defined in the DTO
        transform: true, // Automatically transform payloads to match the DTO types
        forbidNonWhitelisted: true, // Throw an error if non-allowed properties are present
    }));

    // Setup Swagger API Documentation (accessible at /api/docs)
    const config = new DocumentBuilder()
        .setTitle('DecodeUp Lead Demo API')
        .setDescription('The API documentation for the full-stack demo')
        .setVersion('1.0')
        .addBearerAuth() // Allows adding a JWT token in Swagger UI for testing protected routes
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Start the application on the configured port or default to 3000
    await app.listen(process.env.PORT || 3000);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
