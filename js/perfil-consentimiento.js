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
    const [gps, googleAPI] = await Promise.all([
      safeDetect(detectarUbicacion, null),
      safeDetect(obtenerUbicacionDesdeBackend, null),
    ]);

    const mejor = elegirUbicacionMasPrecisa(gps, googleAPI);

    if (mejor) {
      ubicacion = `${mejor.lat}, ${mejor.lon} (±${mejor.accuracy}m) - Fuente: ${mejor.fuente}`;
      lat = mejor.lat;
      lon = mejor.lon;

      // 🧩 ETAPA 2: Alerta si precisión baja
      if (mejor.accuracy && mejor.accuracy > 50000) {
        alert("⚠️ No se pudo obtener una ubicación precisa. Por favor activa el GPS o conecta a una red WiFi.");
      }

      // 🧩 ETAPA 3: Mostrar aviso en pantalla
      const aviso = document.getElementById("ubicacion-aviso");
      if (aviso && mejor.accuracy > 50000) {
        aviso.textContent = "⚠️ Ubicación baja precisión. Activa GPS o WiFi para mejorar.";
      }
    }
  }

  const datos = {
    mascotaId: obtenerIdMascotaDesdeURL(),
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

function obtenerIdMascotaDesdeURL() {
  const url = new URL(window.location.href);
  const id = url.searchParams.get("id");
  return parseInt(id) || 1;
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

// 🧩 ETAPA 4 – Obtener ubicación desde backend con redes WiFi si es posible
async function obtenerUbicacionDesdeBackend(resolve) {
  try {
    const wifiAccessPoints = await obtenerRedesWifi();

    const payload = {
      considerIp: wifiAccessPoints.length === 0, // Solo usar IP si no hay WiFi
      wifiAccessPoints: wifiAccessPoints.length > 0 ? wifiAccessPoints : undefined,
    };

    const res = await fetch("/api/geolocalizar-por-ip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

// ⚠️ Nota: esta función no obtiene directamente los BSSID, pero al activar GPS en móviles Android,
// Chrome los envía internamente a Google para mejorar la precisión.
async function obtenerRedesWifi() {
  try {
    if (!navigator.geolocation) return [];

    const permiso = await navigator.permissions.query({ name: "geolocation" });
    if (permiso.state === "denied") return [];

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          console.log("📡 GPS activado, Google podrá usar redes WiFi automáticamente.");
          resolve([]); // No accedemos a BSSIDs directamente desde JS
        },
        (error) => {
          console.warn("❌ Error al obtener posición para mejorar con WiFi:", error);
          resolve([]);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  } catch (e) {
    return [];
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
    const res = await fetch("/api/notificar-dueno", {
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

document.addEventListener("DOMContentLoaded", () => {
  const btnAceptar = document.getElementById("btn-aceptar");
  const btnRechazar = document.getElementById("btn-rechazar");

  if (btnAceptar) btnAceptar.addEventListener("click", aceptarConsentimiento);
  if (btnRechazar) btnRechazar.addEventListener("click", rechazarConsentimiento);
});

export { recolectarDatos };

