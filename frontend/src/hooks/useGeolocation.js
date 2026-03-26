/**
 * useGeolocation – uses the browser's Geolocation API (laptop/phone GPS)
 * for development and testing without the ESP32 hardware.
 *
 * Returns:
 *   position  { lat, lng, accuracy } | null
 *   error     string | null
 *   supported boolean
 */

import { useState, useEffect } from "react";

export default function useGeolocation() {
  const supported = "geolocation" in navigator;
  const [position, setPosition] = useState(null);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!supported) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    const options = {
      enableHighAccuracy: true,   // use GPS chip if available, otherwise WiFi/IP
      maximumAge:         5000,   // accept a cached fix up to 5 s old
      timeout:            10000,  // give up after 10 s
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null);
        setPosition({
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: pos.coords.accuracy,  // metres
        });
      },
      (err) => {
        // Common codes: 1 = PERMISSION_DENIED, 2 = UNAVAILABLE, 3 = TIMEOUT
        setError(err.message);
      },
      options
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [supported]);

  return { position, error, supported };
}
