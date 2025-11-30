# Contract Testing for APIs (Spring Cloud Contract)

## 1. The Problem

Frontend team says: "Your API broke!"
Backend team says: "It works on my machine!"

**Contract Testing** ensures the API matches the agreed "Contract" (JSON Schema).

---

## 2. Consumer-Driven Contracts (CDC)

The Consumer (Frontend or another Microservice) defines what they expect.
"I expect `GET /users/1` to return `{ 'id': 1, 'name': 'Alice' }`".

Spring Cloud Contract verifies this automatically.

---

## 3. Setup

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-contract-verifier</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 4. Defining the Contract (Groovy)

`src/test/resources/contracts/shouldReturnUser.groovy`

```groovy
import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should return user by id"
    request {
        method GET()
        url "/users/1"
    }
    response {
        status 200
        body([
            id: 1,
            name: "Alice"
        ])
        headers {
            contentType applicationJson()
        }
    }
}
```

## 5. Auto-Generated Tests

When you run `mvn clean install`, Spring Cloud Contract:
1.  Reads the Groovy file.
2.  Generates a JUnit test class that calls your Controller.
3.  Asserts the response matches the contract.
4.  Generates a **Stub JAR** (`myapp-stubs.jar`).

Other services can download this Stub JAR and run it in WireMock to test against *your* API without you running.
