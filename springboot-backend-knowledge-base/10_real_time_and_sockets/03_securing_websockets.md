# Securing WebSockets

## 1. The Handshake Problem

WebSockets start as an HTTP Request (`Upgrade: websocket`).
You can use standard HTTP Auth (Cookies/Headers) for the **Handshake**.

But once the connection is open, the browser **cannot send headers** with every message.
You cannot send `Authorization: Bearer ...` with a WebSocket frame.

---

## 2. Strategy 1: Cookie-Based (Session)

If your app uses Cookies (Session or JWT in Cookie), the browser sends them automatically during the Handshake.
Spring Security handles this automatically.

```java
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/ws/**").authenticated() // Protect Handshake URL
        );
        return http.build();
    }
}
```

---

## 3. Strategy 2: Token-Based (STOMP Headers)

If you use `Authorization` header (e.g., Mobile App), you must send the token in the **STOMP CONNECT frame**.

**Client (JS)**:
```javascript
client.connect({ 'Authorization': 'Bearer ' + token }, ...);
```

**Server (ChannelInterceptor)**:
You must intercept the message *before* it reaches the broker.

```java
@Configuration
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = accessor.getFirstNativeHeader("Authorization");
                    // Validate Token & Set User
                    Authentication user = tokenService.validate(token);
                    accessor.setUser(user);
                }
                return message;
            }
        });
    }
}
```

---

## 4. CSRF

WebSockets are vulnerable to **CSWSH** (Cross-Site WebSocket Hijacking).
Like CSRF, but for sockets.
**Defense**: Check the `Origin` header during Handshake. Spring does this by default (`setAllowedOrigins(...)`).
