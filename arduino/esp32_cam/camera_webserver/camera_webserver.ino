/**
 * Water Cleaning Robot – ESP32-CAM Web Server
 * ============================================
 * Provides a live MJPEG video stream at:
 *   http://<ESP32_CAM_IP>:81/stream
 *
 * Board   : AI-Thinker ESP32-CAM (select in Arduino IDE)
 * Flasher : Use an FTDI/USB-Serial adapter; GPIO0 → GND to enter flash mode.
 *
 * No additional libraries required – uses built-in esp32 camera + HTTP server.
 *
 * After flashing:
 *   1. Remove GPIO0–GND jumper and reset.
 *   2. Open Serial Monitor (115200 baud) to read the assigned IP.
 *   3. Navigate to http://<IP>:81/stream in a browser to verify.
 *   4. Paste that URL into the React dashboard's camera panel.
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"
#include "esp_timer.h"

// ═══════════════════════════════════════════════════════════════════════════
// ── PLACEHOLDERS ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const char* WIFI_SSID     = "YOUR_WIFI_SSID";      // ← replace
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // ← replace

// ═══════════════════════════════════════════════════════════════════════════
// ── AI-THINKER ESP32-CAM PIN MAP ────────────────────────────────────────────
// ── Do NOT change unless using a different CAM module ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5

#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ═══════════════════════════════════════════════════════════════════════════
// ── MJPEG STREAM HANDLER ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

#define PART_BOUNDARY "123456789000000000000987654321"
static const char* STREAM_CONTENT_TYPE =
    "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* STREAM_PART =
    "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t streamHttpd = NULL;

static esp_err_t streamHandler(httpd_req_t* req) {
  camera_fb_t* fb  = NULL;
  esp_err_t    res = ESP_OK;
  char         partBuf[64];

  res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  // Disable response buffering so frames are sent immediately
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[CAM] Frame capture failed");
      res = ESP_FAIL;
      break;
    }

    // Send boundary
    res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (res != ESP_OK) break;

    // Send part header
    size_t hlen = snprintf(partBuf, sizeof(partBuf), STREAM_PART, fb->len);
    res = httpd_resp_send_chunk(req, partBuf, hlen);
    if (res != ESP_OK) break;

    // Send JPEG payload
    res = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    fb = NULL;

    if (res != ESP_OK) break;
  }

  if (fb) esp_camera_fb_return(fb);
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── HTTP SERVER SETUP ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

void startStreamServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 81;
  config.ctrl_port   = 32768;

  httpd_uri_t streamUri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = streamHandler,
    .user_ctx  = NULL
  };

  if (httpd_start(&streamHttpd, &config) == ESP_OK) {
    httpd_register_uri_handler(streamHttpd, &streamUri);
    Serial.println("[HTTP] Stream server started on port 81");
  } else {
    Serial.println("[HTTP] Failed to start stream server");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── CAMERA INIT ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

bool initCamera() {
  camera_config_t config;

  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Use PSRAM if available for higher quality
  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA;    // 640×480
    config.jpeg_quality = 12;               // 0–63, lower = better quality
    config.fb_count     = 2;
  } else {
    config.frame_size   = FRAMESIZE_QVGA;   // 320×240
    config.jpeg_quality = 20;
    config.fb_count     = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Init failed: 0x%x\n", err);
    return false;
  }

  // Tweak sensor settings for water/outdoor environment
  sensor_t* s = esp_camera_sensor_get();
  s->set_brightness(s, 1);    // slight brightness boost
  s->set_saturation(s, -1);   // reduce saturation (cleaner look)
  s->set_awb_gain(s, 1);      // auto white-balance on
  s->set_whitebal(s, 1);

  Serial.println("[CAM] Camera initialised");
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SETUP ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Water Cleaning Robot – CAM Module ===");

  if (!initCamera()) {
    Serial.println("[FATAL] Camera init failed. Halting.");
    while (true) delay(1000);
  }

  // Connect to WiFi
  Serial.printf("[WiFi] Connecting to %s …\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] Connected. IP: %s\n",
                WiFi.localIP().toString().c_str());

  startStreamServer();

  Serial.printf("\n[READY] Stream URL: http://%s:81/stream\n",
                WiFi.localIP().toString().c_str());
  Serial.println("[READY] Paste this URL into the React dashboard camera panel.");
}

// ═══════════════════════════════════════════════════════════════════════════
// ── LOOP ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

void loop() {
  // The HTTP server runs in a FreeRTOS task; nothing needed here.
  delay(10000);
}
