/*
 * Water Cleaning Robot - ESP32 Firmware
 * Control: WebSocket only (no physical buttons)
 * Components:
 *   - L298N Motor Driver (digital only, no PWM)
 *   - Questar GPS Module (UART2, RX=16, TX=17)
 *   - Active-LOW Relay (conveyor belt, GPIO 19)
 *
 * Libraries (install via Arduino Library Manager):
 *   - WebSockets  by Markus Sattler
 *   - TinyGPSPlus by Mikal Hart
 *   - ArduinoJson by Benoit Blanchon
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <ArduinoJson.h>

// ─────────────────────────────────────────────────────────────────────────────
//  EDIT THESE 3 LINES
// ─────────────────────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "Projects";
const char* WIFI_PASSWORD = "12345678@";
const char* SERVER_IP     = "192.168.1.26";   // Your laptop IP
const int   SERVER_PORT   = 8000;
// ─────────────────────────────────────────────────────────────────────────────

// ─── L298N Motor Pins ─────────────────────────────────────────────────────────
// Tie ENA and ENB to 5V (use the onboard jumpers on L298N board)
#define IN1  13   // Left  motors forward
#define IN2  12   // Left  motors backward
#define IN3  14   // Right motors forward
#define IN4  27   // Right motors backward

// ─── Relay (Active LOW) ───────────────────────────────────────────────────────
#define RELAY_PIN 15   // LOW = belt ON,  HIGH = belt OFF

// ─── GPS on UART2 ─────────────────────────────────────────────────────────────
#define GPS_RX   16
#define GPS_TX   17
#define GPS_BAUD 9600

HardwareSerial GPSSerial(2);
TinyGPSPlus    gps;

// ─── WebSocket ────────────────────────────────────────────────────────────────
WebSocketsClient ws;
bool wsConnected = false;

// ─── State ────────────────────────────────────────────────────────────────────
bool   beltOn         = false;
String currentCommand = "STOP";

// ─── GPS timer (10 seconds) ───────────────────────────────────────────────────
unsigned long lastGPSSend    = 0;
const unsigned long GPS_INTERVAL = 10000;

// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Water Cleaning Robot ===");

  // Motor pins
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  stopMotors();

  // Relay — start with belt OFF (active LOW, so HIGH = OFF)
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);

  // GPS
  GPSSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("GPS serial started on UART2");

  // WiFi
  connectWiFi();

  // WebSocket — connects to ws://SERVER_IP:8000/ws/esp32
  ws.begin(SERVER_IP, SERVER_PORT, "/ws/esp32");
  ws.onEvent(onWebSocketEvent);
  ws.setReconnectInterval(3000);
  Serial.println("WebSocket connecting...");
}

// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  ws.loop();   // handles connect, reconnect, ping/pong

  // Feed GPS parser
  while (GPSSerial.available() > 0) {
    gps.encode(GPSSerial.read());
  }

  // Send GPS every 10 seconds
  if (millis() - lastGPSSend >= GPS_INTERVAL) {
    sendGPS();
    lastGPSSend = millis();
  }
}

// ─── WiFi ─────────────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

// ─── Motor Control ────────────────────────────────────────────────────────────
void moveForward() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  currentCommand = "FORWARD";
  Serial.println("Motor >> FORWARD");
}

void moveBackward() {
  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH);
  currentCommand = "BACKWARD";
  Serial.println("Motor >> BACKWARD");
}

void turnLeft() {
  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  currentCommand = "LEFT";
  Serial.println("Motor >> LEFT");
}

void turnRight() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH);
  currentCommand = "RIGHT";
  Serial.println("Motor >> RIGHT");
}

void stopMotors() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
  currentCommand = "STOP";
  Serial.println("Motor >> STOP");
}

// ─── Belt ─────────────────────────────────────────────────────────────────────
void setBelt(bool on) {
  beltOn = on;
  digitalWrite(RELAY_PIN, on ? LOW : HIGH);  // Active LOW
  Serial.print("Belt >> ");
  Serial.println(on ? "ON (relay LOW)" : "OFF (relay HIGH)");

  // Immediately echo belt state back to server
  if (wsConnected) {
    StaticJsonDocument<96> doc;
    doc["type"]    = "belt_status";
    doc["belt_on"] = beltOn;
    String msg;
    serializeJson(doc, msg);
    ws.sendTXT(msg);
  }
}

// ─── Send GPS over WebSocket ──────────────────────────────────────────────────
void sendGPS() {
  if (!wsConnected) {
    Serial.println("GPS skipped — not connected");
    return;
  }

  double lat = gps.location.isValid() ? gps.location.lat() : 0.0;
  double lng = gps.location.isValid() ? gps.location.lng() : 0.0;
  int    sat = gps.satellites.isValid() ? (int)gps.satellites.value() : 0;
  bool   fix = gps.location.isValid();

  StaticJsonDocument<160> doc;
  doc["type"]       = "gps";
  doc["lat"]        = serialized(String(lat, 6));
  doc["lng"]        = serialized(String(lng, 6));
  doc["satellites"] = sat;
  doc["fix"]        = fix;

  String msg;
  serializeJson(doc, msg);
  ws.sendTXT(msg);

  Serial.printf("GPS >> lat=%.6f  lng=%.6f  sats=%d  fix=%s\n",
                lat, lng, sat, fix ? "YES" : "NO");
}

// ─── Send status echo to server ───────────────────────────────────────────────
void sendStatus() {
  if (!wsConnected) return;
  StaticJsonDocument<128> doc;
  doc["type"]    = "status";
  doc["command"] = currentCommand;
  doc["belt_on"] = beltOn;
  String msg;
  serializeJson(doc, msg);
  ws.sendTXT(msg);
}

// ─── WebSocket Event Handler ──────────────────────────────────────────────────
void onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {

    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("WebSocket CONNECTED");
      sendStatus();   // send current state to server on connect
      sendGPS();      // send GPS immediately on connect
      break;

    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("WebSocket DISCONNECTED — retrying...");
      stopMotors();   // safety: stop if connection lost
      break;

    case WStype_TEXT: {
      Serial.print("WS received: ");
      Serial.println((char*)payload);

      StaticJsonDocument<200> doc;
      DeserializationError err = deserializeJson(doc, payload, length);
      if (err) {
        Serial.print("JSON error: ");
        Serial.println(err.c_str());
        break;
      }

      String msgType = doc["type"] | "";

      // ── Movement / belt command from dashboard ──
      // Frontend sends: { "type": "control", "command": "forward|backward|left|right|stop|conveyor_on|conveyor_off" }
      if (msgType == "control") {
        String cmd = doc["command"] | "STOP";
        cmd.toUpperCase();

        if      (cmd == "FORWARD")      moveForward();
        else if (cmd == "BACKWARD")     moveBackward();
        else if (cmd == "LEFT")         turnLeft();
        else if (cmd == "RIGHT")        turnRight();
        else if (cmd == "CONVEYOR_ON")  setBelt(true);
        else if (cmd == "CONVEYOR_OFF") setBelt(false);
        else                            stopMotors();

        sendStatus();  // echo back so dashboard confirms
      }

      break;
    }

    case WStype_PING:
    case WStype_PONG:
      break;  // handled automatically by the library

    case WStype_ERROR:
      Serial.println("WS error");
      break;

    default:
      break;
  }
}