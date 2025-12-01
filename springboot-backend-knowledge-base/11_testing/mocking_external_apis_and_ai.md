# Mocking External APIs (WireMock)

## 1. The Problem

Your service calls `https://api.stripe.com`.
You cannot call the real Stripe API in your tests:
1.  It's slow.
2.  It costs money.
3.  It requires internet.

**WireMock** spins up a fake HTTP server that replies with canned responses.

---

## 2. Setup

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-contract-stub-runner</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 3. Usage

```java
@SpringBootTest
@AutoConfigureWireMock(port = 0) // Random port
class PaymentServiceTest {

    @Autowired
    private PaymentService paymentService;

    @Test
    void shouldProcessPayment() {
        // 1. Stub the external API
        stubFor(post(urlEqualTo("/v1/charges"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"status\": \"succeeded\"}")));

        // 2. Call your service
        boolean success = paymentService.charge("tok_123", 100);

        // 3. Verify
        assertThat(success).isTrue();
    }
}
```

**Pro Tip**: Use `WireMock` for integration tests. Use `Mockito` to mock the `RestTemplate`/`WebClient` bean for unit tests.
