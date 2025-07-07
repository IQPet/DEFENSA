import UAParser from "https://cdn.jsdelivr.net/npm/ua-parser-js@1.0.2/src/ua-parser.min.js";

// ✅ Obtener IP pública
async function obtenerIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch (error) {
    console.error("❌ Error al obtener IP:", error);
    return "No disponible";
  }
}

// ✅ Obtener ubicación geográfica con timeout
function obtenerUbicacion() {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lon = pos.coords.longitude.toFixed(6);
          resolve(`Lat: ${lat}, Lon: ${lon}`);
        },
        () => resolve("Ubicación no disponible"),
        { timeout: 7000 }
      );
    } else {
      resolve("Geolocalización no soportada");
    }
  });
}

// ✅ Obtener ID desde la URL (?id=)
function obtenerIdMascota() {
  const url = new URL(window.location.href);
  const id = url.searchParams.get("id");
  return parseInt(id) || null;
}

// ✅ Aceptar consentimiento
export async function aceptarConsentimiento() {
  document.getElementById("consentimiento-modal").style.display = "none";

  const fechaHora = new Date().toLocaleString();
  const ubicacion = await obtenerUbicacion();
  const ip = await obtenerIP();
  const parser = new UAParser();
  const dispositivo = `${parser.getOS().name} ${parser.getOS().version} · ${parser.getBrowser().name} ${parser.getBrowser().version}`;
  const mascotaId = obtenerIdMascota();

  // Mostrar en pantalla
  document.getElementById("ubicacion-status").textContent = `📍 Ubicación registrada: ${ubicacion}`;
  document.getElementById("ip-status").textContent = `🌐 IP detectada: ${ip}`;
  document.getElementById("dispositivo-status").textContent = `💻 Dispositivo reconocido: ${dispositivo}`;

  // Enviar al backend
  try {
    const res = await fetch("https://defensa-1.onrender.com/api/notificar-dueno", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mascotaId,
        ubicacion,
        ip,
        dispositivo,
        fechaHora,
        mensajePersonalizado: "¡Alguien visualizó el perfil de tu mascota!",
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log("✅ Notificación enviada:", data);
    } else {
      console.warn("⚠️ Error al enviar notificación:", data);
    }
  } catch (err) {
    console.error("❌ Error en la solicitud:", err);
  }
}

// ✅ Rechazar consentimiento
export function rechazarConsentimiento() {
  document.getElementById("consentimiento-modal").style.display = "none";
  document.getElementById("aviso-legal").textContent =
    "No se recolectaron datos porque no se aceptó el consentimiento.";
}
