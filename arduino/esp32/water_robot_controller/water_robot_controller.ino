/**
 * Water Cleaning Robot – ESP32 Main Controller
 * =============================================
 * Role   : WebSocket CLIENT (slave)
 * Server : FastAPI backend (WebSocket SERVER / master)
 *
 * Hardware wired:
 *   L298N Motor Driver  → two DC drive motors (Left + Right)
 *   Relay module        → conveyor belt motor
 *   Questar GPS module  → UART2 (RX2 = GPIO16, TX2 = GPIO17)
 *
 * Required Arduino libraries (install via Library Manager):
 *   - ArduinoWebsockets  by Gil Maimon   (search "ArduinoWebsockets")
 *   - TinyGPS++          by Mikal Hart   (search "TinyGPSPlus")
 *   - ArduinoJson        by Benoit Blanchon (search "ArduinoJson")
 */

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

using namespace websockets;

// ═══════════════════════════════════════════════════════════════════════════
// ── PLACEHOLDERS – edit before flashing ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const char* WIFI_SSID     = "YOUR_WIFI_SSID";      // ← replace
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // ← replace

// LAN IP of the machine running the FastAPI backend.
// Run `ipconfig` (Windows) or `ip addr` (Linux) to find it.
const char* SERVER_HOST = "192.168.1.100";         // ← replace
const uint16_t SERVER_PORT = 8000;
const char* SERVER_PATH = "/ws/esp32";

// Set to 1 to generate fake GPS data (useful when no GPS module is wired)
#define GPS_SIMULATE 0

// ═══════════════════════════════════════════════════════════════════════════
// ── GPIO PIN MAP ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Left motor  (L298N channel A)
#define MOTOR_L_ENA  12   // PWM speed
#define MOTOR_L_IN1  14   // direction
#define MOTOR_L_IN2  27   // direction

// Right motor (L298N channel B)
#define MOTOR_R_ENB  26   // PWM speed
#define MOTOR_R_IN3  25   // direction
#define MOTOR_R_IN4  33   // direction

// Conveyor belt relay (active HIGH)
#define CONVEYOR_PIN 32

// GPS UART2
#define GPS_RX_PIN   16
#define GPS_TX_PIN   17
#define GPS_BAUD     9600

// Motor PWM (0–255)
#define MOTOR_SPEED  200

// ═══════════════════════════════════════════════════════════════════════════
// ── GLOBALS ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

WebsocketsClient wsClient;
TinyGPSPlus      gps;
HardwareSerial   gpsSerial(2);   // UART2

bool wsConnected = false;

// GPS send interval
unsigned long lastGpsSend    = 0;
const unsigned long GPS_INTERVAL_MS = 2000;

// Reconnect timing
unsigned long lastReconnectAttempt = 0;
const unsigned long RECONNECT_INTERVAL_MS = 5000;

// ═══════════════════════════════════════════════════════════════════════════
// ── MOTOR HELPERS ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

void motorsStop() {
  digitalWrite(MOTOR_L_IN1, LOW);  digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, LOW);  digitalWrite(MOTOR_R_IN4, LOW);
  analogWrite(MOTOR_L_ENA, 0);
  analogWrite(MOTOR_R_ENB, 0);
}

void motorsForward() {
  digitalWrite(MOTOR_L_IN1, HIGH); digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, HIGH); digitalWrite(MOTOR_R_IN4, LOW);
  analogWrite(MOTOR_L_ENA, MOTOR_SPEED);
  analogWrite(MOTOR_R_ENB, MOTOR_SPEED);
}

void motorsBackward() {
  digitalWrite(MOTOR_L_IN1, LOW);  digitalWrite(MOTOR_L_IN2, HIGH);
  digitalWrite(MOTOR_R_IN3, LOW);  digitalWrite(MOTOR_R_IN4, HIGH);
  analogWrite(MOTOR_L_ENA, MOTOR_SPEED);
  analogWrite(MOTOR_R_ENB, MOTOR_SPEED);
}

void motorsLeft() {
  // Pivot left: right wheel forward, left wheel backward
  digitalWrite(MOTOR_L_IN1, LOW);  digitalWrite(MOTOR_L_IN2, HIGH);
  digitalWrite(MOTOR_R_IN3, HIGH); digitalWrite(MOTOR_R_IN4, LOW);
  analogWrite(MOTOR_L_ENA, MOTOR_SPEED);
  analogWrite(MOTOR_R_ENB, MOTOR_SPEED);
}

void motorsRight() {
  // Pivot right: left wheel forward, right wheel backward
  digitalWrite(MOTOR_L_IN1, HIGH); digitalWrite(MOTOR_L_IN2, LOW);
  digitalWrite(MOTOR_R_IN3, LOW);  digitalWrite(MOTOR_R_IN4, HIGH);
  analogWrite(MOTOR_L_ENA, MOTOR_SPEED);
  analogWrite(MOTOR_R_ENB, MOTOR_SPEED);
}

void conveyorOn()  { digitalWrite(CONVEYOR_PIN, HIGH); }
void conveyorOff() { digitalWrite(CONVEYOR_PIN, LOW);  }

// ═══════════════════════════════════════════════════════════════════════════
// ── COMMAND HANDLER ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

void handleCommand(const String& command) {
  Serial.print("[CMD] ");
  Serial.println(command);

  if      (command == "forward")      motorsForward();
  else if (command == "backward")     motorsBackward();
  else if (command == "left")         motorsLeft();
  else if (command == "right")        motorsRight();
  else if (command == "stop")         motorsStop();
  else if (command == "conveyor_on")  conveyorOn();
  else if (command == "conveyor_off") conveyorOff();
  else {
    Serial.print("[WARN] Unknown command: ");
    Serial.println(command);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── WEBSOCKET CALLBACKS ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

void onWsMessage(WebsocketsMessage msg) {
  Serial.print("[WS RX] ");
  Serial.println(msg.data());

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, msg.data());
  if (err) {
    Serial.print("[ERR] JSON parse failed: ");
    Serial.println(err.c_str());
    return;
  }

  const char* type = doc["type"];
  if (strcmp(type, "control") == 0) {
    handleCommand(String((const char*)doc["command"]));
  }
}

void onWsEvent(WebsocketsEvent event, String data) {
  switch (event) {
    case WebsocketsEvent::ConnectionOpened:
      Serial.println("[WS] Connected to server");
      wsConnected = true;
      // Announce ourselves
      wsClient.send("{\"type\":\"status\",\"message\":\"ESP32 robot online\"}");
      break;

    case WebsocketsEvent::ConnectionClosed:
      Serial.println("[WS] Disconnected from server");
      wsConnected = false;
      motorsStop();     // safety: halt motors on disconnect
      conveyorOff();
      break;

    case WebsocketsEvent::GotPing:
      wsClient.sendPong();
      break;

    default:
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── WEBSOCKET CONNECT ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

bool connectWebSocket() {
  Serial.printf("[WS] Connecting to ws://%s:%d%s …\n",
                SERVER_HOST, SERVER_PORT, SERVER_PATH);

  String url = String("ws://") + SERVER_HOST + ":" +
               String(SERVER_PORT) + SERVER_PATH;

  wsClient.onMessage(onWsMessage);
  wsClient.onEvent(onWsEvent);

  bool ok = wsClient.connect(SERVER_HOST, SERVER_PORT, SERVER_PATH);
  if (!ok) {
    Serial.println("[WS] Connection failed");
  }
  return ok;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── GPS HELPERS ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

#if GPS_SIMULATE
// Simulate a slow GPS drift for testing purposes
float simLat = 13.08270f;
float simLng = 80.27070f;

void sendSimulatedGPS() {
  simLat += 0.00001f * random(-3, 4);
  simLng += 0.00001f * random(-3, 4);

  StaticJsonDocument<128> doc;
  doc["type"] = "gps";
  doc["lat"]  = simLat;
  doc["lng"]  = simLng;

  String payload;
  serializeJson(doc, payload);
  wsClient.send(payload);
  Serial.print("[GPS SIM] "); Serial.println(payload);
}
#endif

void sendRealGPS() {
  if (!gps.location.isValid()) return;

  StaticJsonDocument<128> doc;
  doc["type"] = "gps";
  doc["lat"]  = gps.location.lat();
  doc["lng"]  = gps.location.lng();

  String payload;
  serializeJson(doc, payload);
  wsClient.send(payload);
  Serial.print("[GPS] "); Serial.println(payload);
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SETUP ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Water Cleaning Robot Controller ===");

  // Motor pins
  pinMode(MOTOR_L_ENA, OUTPUT); pinMode(MOTOR_L_IN1, OUTPUT);
  pinMode(MOTOR_L_IN2, OUTPUT); pinMode(MOTOR_R_ENB, OUTPUT);
  pinMode(MOTOR_R_IN3, OUTPUT); pinMode(MOTOR_R_IN4, OUTPUT);
  motorsStop();

  // Conveyor
  pinMode(CONVEYOR_PIN, OUTPUT);
  conveyorOff();

  // GPS UART
#if !GPS_SIMULATE
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] Serial started");
#else
  Serial.println("[GPS] Simulation mode ON");
  randomSeed(analogRead(0));
#endif

  // WiFi
  Serial.printf("[WiFi] Connecting to %s …\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] Connected. IP: %s\n", WiFi.localIP().toString().c_str());

  // WebSocket
  connectWebSocket();
}

// ═══════════════════════════════════════════════════════════════════════════
// ── LOOP ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

void loop() {
  // ── Feed GPS data to TinyGPS++ ──────────────────────────────────────────
#if !GPS_SIMULATE
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }
#endif

  // ── Maintain WebSocket connection ───────────────────────────────────────
  if (wsConnected) {
    wsClient.poll();   // process incoming messages / keep-alive
  } else {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > RECONNECT_INTERVAL_MS) {
      lastReconnectAttempt = now;
      Serial.println("[WS] Attempting reconnect …");
      connectWebSocket();
    }
  }

  // ── Send GPS position periodically ─────────────────────────────────────
  if (wsConnected) {
    unsigned long now = millis();
    if (now - lastGpsSend >= GPS_INTERVAL_MS) {
      lastGpsSend = now;
#if GPS_SIMULATE
      sendSimulatedGPS();
#else
      sendRealGPS();
#endif
    }
  }
}
