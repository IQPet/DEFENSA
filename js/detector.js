export function detectarUbicacion(callback) {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const ubicacion = `Lat: ${latitude}, Lon: ${longitude}`;
        console.log("✅ Ubicación exacta:", ubicacion);
        document.getElementById("ubicacion-status").textContent = "📍 Ubicación registrada: ✓";
        callback(ubicacion);
      },
      () => {
        fetch("https://ipapi.co/json/")
          .then((res) => res.json())
          .then((data) => {
            const ubicacion = `${data.city}, ${data.region}, ${data.country_name}`;
            console.log("🌐 Ubicación aproximada por IP:", ubicacion);
            document.getElementById("ubicacion-status").textContent = "📍 Ubicación registrada: ✓";
            callback(ubicacion);
          })
          .catch(() => {
            callback("No detectada");
          });
      }
    );
  } else {
    callback("No disponible");
  }
}

export function detectarDispositivo(callback) {
  const dispositivo = navigator.userAgent;
  console.log("🖥️ Info del navegador/dispositivo:", dispositivo);
  document.getElementById("dispositivo-status").textContent = "💻 Dispositivo reconocido: ✓";
  callback(dispositivo);
}
