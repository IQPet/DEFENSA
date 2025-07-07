import { detectarUbicacion, detectarDispositivo } from './detector.js';

async function recolectarDatos(consiente) {
  console.log(`[✔] Consentimiento: ${consiente ? 'ACEPTADO' : 'RECHAZADO'}`);

  const fechaHora = new Date().toLocaleString();

  // Ejecutar detección con timeout o fallback
  const dispositivo = await safeDetect(detectarDispositivo, "No disponible");
  const ip = await safeObtenerIP();

  let ubicacion = "No disponible";
  if (consiente) {
    ubicacion = await safeDetect(detectarUbicacion, "No disponible");
  }

  const datos = {
    mascotaId: 1, // ⚠️ Cambiar si usas varios perfiles
    fechaHora,
    ip,
    dispositivo,
    ubicacion: typeof ubicacion === 'string' ? ubicacion : ubicacion.texto,
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
  } catch (e) {
    return "No disponible";
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

// ✅ Mostrar/ocultar el modal correctamente
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

// ✅ Enlazar eventos al cargar
document.addEventListener("DOMContentLoaded", () => {
  const btnAceptar = document.getElementById("btn-aceptar");
  const btnRechazar = document.getElementById("btn-rechazar");

  if (btnAceptar) btnAceptar.addEventListener("click", aceptarConsentimiento);
  if (btnRechazar) btnRechazar.addEventListener("click", rechazarConsentimiento);
});

export { recolectarDatos };

