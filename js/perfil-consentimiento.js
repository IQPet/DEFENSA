import { detectarUbicacion, detectarDispositivo } from './detector.js';
import { elegirUbicacionMasPrecisa } from './ubicacion-mejorada.js';

async function recolectarDatos(consiente) {
  console.log(`[✔] Consentimiento: ${consiente ? 'ACEPTADO' : 'RECHAZADO'}`);

  const fechaHora = new Date().toLocaleString();
  const dispositivo = await safeDetect(detectarDispositivo, "No disponible");
  const ip = await safeObtenerIP();

  let ubicacion = "No disponible";
  let lat = null;
  let lon = null;

  if (consiente) {
    // Obtener GPS y API Google en paralelo
    const [gps, googleAPI] = await Promise.all([
      safeDetect(detectarUbicacion, null),              // GPS (alta precisión)
      safeDetect(obtenerUbicacionDesdeBackend, null),  // Google Geolocation API (backend)
    ]);

    // Elegir mejor ubicación (puede ser null)
    const mejor = elegirUbicacionMasPrecisa(gps, googleAPI);
    if (mejor) {
      ubicacion = `${mejor.lat}, ${mejor.lon} (±${mejor.accuracy}m) - Fuente: ${mejor.fuente}`;
      lat = mejor.lat;
      lon = mejor.lon;
    }
  }

  const datos = {
    mascotaId: 1, // ⚠️ Cambia según tu caso
    fechaHora,
    ip,
    dispositivo,
    ubicacion,
    lat,
    lon,
  };

  console.log("📤 Enviando datos:", datos);

  limpiarResumen();
  mostrarResumen(datos);
  enviarNotificacion(datos);
}

async function safeDetect(funcionDetectar, fallback) {
  try {
    return await Promise.race([
      new Promise((resolve) => funcionDetectar(resolve)),
      new Promise((resolve) => setTimeout(() => resolve(fallback), 10000)),
    ]);
  } catch {
    return fallback;
  }
}

async function safeObtenerIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || "No disponible";
  } catch {
    return "No disponible";
  }
}

// Obtiene ubicación desde backend Google Geolocation API
async function obtenerUbicacionDesdeBackend(resolve) {
  try {
    const res = await fetch("https://defensa-1.onrender.com/api/geolocalizar-por-ip", {
      method: "POST",
    });
    const data = await res.json();
    resolve({
      lat: data.lat,
      lon: data.lon,
      accuracy: data.accuracy,
      fuente: data.fuente || "Google Geolocation API",
    });
  } catch (e) {
    console.warn("❌ No se pudo obtener ubicación del backend");
    resolve(null);
  }
}

function limpiarResumen() {
  const zona = document.getElementById("zona-info");
  if (zona) zona.innerHTML = "";
}

function mostrarResumen({ fechaHora, ip, dispositivo, ubicacion }) {
  const zona = document.getElementById("zona-info") || document.body;
  const div = document.createElement("div");
  div.style = "margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 10px;";
  div.innerHTML = `
    <p>📋 Información recolectada:</p>
    <p>🕒 Fecha y hora: ${fechaHora}</p>
    <p>📍 Ubicación estimada: ${ubicacion}</p>
    <p>🌐 IP pública: ${ip}</p>
    <p>💻 Dispositivo: ${dispositivo}</p>
  `;
  zona.appendChild(div);
}

async function enviarNotificacion(datos) {
  try {
    const res = await fetch("https://defensa-1.onrender.com/api/notificar-dueno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    if (res.ok) {
      console.log("[✔] Notificación enviada al dueño.");
    } else {
      console.error("[❌] Error en respuesta backend:", res.status);
    }
  } catch (e) {
    console.error("[❌] Falló el envío de notificación:", e);
  }
}

// Mostrar/ocultar modal consentimiento
function aceptarConsentimiento() {
  const modal = document.getElementById("consentimiento-modal");
  if (modal) modal.style.display = "none";
  recolectarDatos(true);
}

function rechazarConsentimiento() {
  const modal = document.getElementById("consentimiento-modal");
  if (modal) modal.style.display = "none";
  recolectarDatos(false);
}

// Enlazar eventos al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  const btnAceptar = document.getElementById("btn-aceptar");
  const btnRechazar = document.getElementById("btn-rechazar");

  if (btnAceptar) btnAceptar.addEventListener("click", aceptarConsentimiento);
  if (btnRechazar) btnRechazar.addEventListener("click", rechazarConsentimiento);
});

export { recolectarDatos };

