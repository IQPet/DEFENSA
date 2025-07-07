// 📦 detector.js mejorado - IQPet
// Usa GPS de alta precisión + fallback por IP + detección detallada de dispositivo con UAParser.js
// IMPORTANTE: UAParser debe ser incluido como script global en index.html:
// <script src="https://cdn.jsdelivr.net/npm/ua-parser-js@1.0.35/dist/ua-parser.min.js"></script>

export function detectarUbicacion(callback) {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const ubicacion = {
          tipo: "GPS",
          texto: `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`,
          lat: latitude,
          lon: longitude
        };
        console.log("✅ Ubicación exacta (GPS):", ubicacion);
        const status = document.getElementById("ubicacion-status");
        if (status) status.textContent = "📍 Ubicación registrada: ✓";
        callback(ubicacion);
      },
      async () => {
        console.warn("⚠️ GPS falló, usando IP geolocation...");
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          const ubicacion = {
            tipo: "IP",
            texto: `${data.city}, ${data.region}, ${data.country_name}`,
            lat: data.latitude,
            lon: data.longitude
          };
          console.log("🌐 Ubicación aproximada por IP:", ubicacion);
          const status = document.getElementById("ubicacion-status");
          if (status) status.textContent = "📍 Ubicación registrada: ✓";
          callback(ubicacion);
        } catch (error) {
          console.error("❌ Error obteniendo ubicación por IP:", error);
          callback({ tipo: "Error", texto: "No detectada" });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 0
      }
    );
  } else {
    console.warn("❌ Geolocation API no soportada");
    callback({ tipo: "Error", texto: "No disponible" });
  }
}

export function detectarDispositivo(callback) {
  // UAParser debe estar cargado globalmente
  if (typeof UAParser === "undefined") {
    console.error("❌ UAParser no está disponible. Asegúrate de incluir el script en el HTML.");
    callback("No disponible");
    return;
  }

  const parser = new UAParser();
  const result = parser.getResult();

  const dispositivo = `${result.os.name} ${result.os.version} · ${result.device.vendor || "Desconocido"} ${result.device.model || "N/A"} · ${result.browser.name} ${result.browser.version}`;

  console.log("📱 Dispositivo detectado:", dispositivo);
  const status = document.getElementById("dispositivo-status");
  if (status) status.textContent = "💻 Dispositivo reconocido: ✓";

  callback(dispositivo);
}
