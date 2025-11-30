# Dockerizing Spring Boot

## 1. The `Dockerfile`

Spring Boot includes an embedded Tomcat server, so you just need Java.

```dockerfile
# Use Eclipse Temurin (Standard OpenJDK)
FROM eclipse-temurin:17-jdk-alpine

# Create a non-root user (Security Best Practice)
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy the JAR file
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar

# Run it
ENTRYPOINT ["java","-jar","/app.jar"]
```

---

## 2. Layered JARs (Optimization)

A 100MB JAR file contains:
- 99MB of Dependencies (Spring, Hibernate, Jackson) -> Change rarely.
- 1MB of Your Code -> Changes often.

Docker caches layers. If you change 1 line of code, you don't want to re-push the 99MB dependencies layer.

### The Optimized Dockerfile
Spring Boot supports "Layered JARs" out of the box.

```dockerfile
FROM eclipse-temurin:17-jdk-alpine as builder
WORKDIR application
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} application.jar
RUN java -Djarmode=layertools -jar application.jar extract

FROM eclipse-temurin:17-jdk-alpine
WORKDIR application
COPY --from=builder application/dependencies/ ./
COPY --from=builder application/spring-boot-loader/ ./
COPY --from=builder application/snapshot-dependencies/ ./
COPY --from=builder application/application/ ./
ENTRYPOINT ["java", "org.springframework.boot.loader.JarLauncher"]
```

**Result**: Faster builds, smaller pushes.

---

## 3. Buildpacks (No Dockerfile)

You don't even need a Dockerfile. Spring Boot can build the image for you using Cloud Native Buildpacks.

```bash
./mvnw spring-boot:build-image -Dspring-boot.build-image.imageName=myapp:latest
```

This automatically:
- Installs the correct JDK.
- Optimizes layers.
- Patches security vulnerabilities in the base image.
