# Docker Mastery for Spring Boot

## 1. The "Naive" Dockerfile (Don't do this)

```dockerfile
FROM openjdk:17
COPY target/myapp.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```
**Why it's bad**:
- **Size**: Includes the full JDK (300MB+). You only need the JRE.
- **Caching**: If you change 1 line of code, Docker rebuilds the *entire* 50MB JAR layer.
- **Security**: Runs as `root`.

---

## 2. Multi-Stage Build + Distroless (The Gold Standard)

Use a build stage to compile, and a runtime stage (Distroless) to run.

```dockerfile
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime (Distroless - No Shell, No Package Manager)
FROM gcr.io/distroless/java17-debian11
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
USER nonroot:nonroot
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Pros**:
- **Tiny**: ~150MB total.
- **Secure**: No `bash` inside. Hackers can't run scripts.
- **Non-Root**: Runs as `nonroot` user.

---

## 3. Spring Boot Layered JAR (Optimized Caching)

Spring Boot 2.3+ supports "Layered JARs". It splits dependencies (rarely change) from your code (changes often).

**Dockerfile**:
```dockerfile
FROM eclipse-temurin:17-jre as builder
WORKDIR /application
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} application.jar
RUN java -Djarmode=layertools -jar application.jar extract

FROM eclipse-temurin:17-jre
WORKDIR /application
COPY --from=builder /application/dependencies/ ./
COPY --from=builder /application/spring-boot-loader/ ./
COPY --from=builder /application/snapshot-dependencies/ ./
COPY --from=builder /application/application/ ./
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

**Result**:
- `dependencies` layer (40MB) is cached.
- `application` layer (50KB) is rebuilt.
- **Builds are instant**.

---

## 4. Google Jib (No Dockerfile)

If you hate writing Dockerfiles, use Jib. It builds the image directly from Maven.

```xml
<plugin>
    <groupId>com.google.cloud.tools</groupId>
    <artifactId>jib-maven-plugin</artifactId>
    <version>3.4.0</version>
    <configuration>
        <to>
            <image>my-docker-hub/myapp</image>
        </to>
    </configuration>
</plugin>
```

Run: `mvn jib:build`
It automatically handles layering and pushes to the registry.
