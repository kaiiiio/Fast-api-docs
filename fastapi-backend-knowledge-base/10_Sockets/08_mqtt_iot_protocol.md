# MQTT: The IoT Protocol

## 1. Why not HTTP?

HTTP is heavy. Headers, Cookies, Request/Response overhead.
**MQTT (Message Queuing Telemetry Transport)** is ultra-lightweight.
- **Binary Protocol**: Min overhead (2 bytes header).
- **Pub/Sub**: Decoupled.
- **QoS (Quality of Service)**: Guarantees delivery.

**Use Case**: 10,000 sensors sending temperature data every second.

---

## 2. Architecture

- **Broker**: The central server (Mosquitto, EMQX, HiveMQ).
- **Client**: The sensor (Publisher) or the FastAPI App (Subscriber).
- **Topic**: `/home/living-room/temp`.

---

## 3. Python Client (`paho-mqtt`)

```bash
pip install paho-mqtt
```

### The Service
```python
import paho.mqtt.client as mqtt
import json

BROKER = "localhost"
PORT = 1883
TOPIC = "sensors/#"

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    client.subscribe(TOPIC)

def on_message(client, userdata, msg):
    payload = json.loads(msg.payload.decode())
    print(f"Received {payload} on {msg.topic}")
    # Save to DB? Trigger Alert?

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

def start_mqtt():
    client.connect(BROKER, PORT, 60)
    client.loop_start() # Runs in background thread
```

### Integration with FastAPI
```python
from fastapi import FastAPI

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    start_mqtt()
```

---

## 4. QoS Levels

1.  **QoS 0 (At most once)**: Fire and forget. Fast. Packet loss possible. (Temp sensors).
2.  **QoS 1 (At least once)**: Guaranteed delivery. Duplicates possible. (Alerts).
3.  **QoS 2 (Exactly once)**: Guaranteed, no duplicates. Slow. (Payments).

---

## 5. Security

- **TLS/SSL**: Encrypt port 8883.
- **Auth**: Username/Password.
- **ACL**: "User A can only write to `/home/A/#`".
