import { detectarUbicacion, detectarDispositivo } from './detector.js';

async function recolectarDatos(consiente) {
  console.log(`[✔] Consentimiento: ${consiente ? 'ACEPTADO' : 'RECHAZADO'}`);

  const fechaHora = new Date().toLocaleString();

  // Ejecutar detección con timeout o fallback para evitar bloqueos
  const dispositivo = await safeDetect(detectarDispositivo, "No disponible");
  const ipPublica = await safeObtenerIP();

  let ubicacion = "No disponible";
  if (consiente) {
    ubicacion = await safeDetect(detectarUbicacion, "No disponible");
  }

  const datos = {
    fechaHora,
    ipPublica,
    dispositivo,
    ubicacion,
    mascota: document.getElementById("nombre-mascota")?.textContent || "Desconocida",
    consentimiento: consiente,
  };

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

function mostrarResumen({ fechaHora, ipPublica, dispositivo, ubicacion }) {
  const zona = document.getElementById("zona-info") || document.body;
  const div = document.createElement("div");
  div.style = "margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 10px;";
  div.innerHTML = `
    <p>📋 Información recolectada:</p>
    <p>🕒 Fecha y hora: ${fechaHora}</p>
    <p>📍 Ubicación estimada: ${ubicacion}</p>
    <p>🌐 IP pública: ${ipPublica}</p>
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

function aceptarConsentimiento() {
  document.getElementById("consentimiento-modal").style.display = "none";
  recolectarDatos(true);
}

function rechazarConsentimiento() {
  document.getElementById("consentimiento-modal").style.display = "none";
  recolectarDatos(false);
}

// **Agregar listeners a los botones cuando se cargue el módulo**
document.addEventListener("DOMContentLoaded", () => {
  const btnAceptar = document.getElementById("btn-aceptar");
  const btnRechazar = document.getElementById("btn-rechazar");

  if (btnAceptar) btnAceptar.addEventListener("click", aceptarConsentimiento);
  if (btnRechazar) btnRechazar.addEventListener("click", rechazarConsentimiento);
});

export { recolectarDatos };
