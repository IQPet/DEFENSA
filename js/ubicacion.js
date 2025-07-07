import { detectarUbicacion, detectarDispositivo } from './detector.js';

function logPaso(mensaje) {
  console.log("🔍 [TRAZA]:", mensaje);
}

function mostrarResumen(datos) {
  const resumenDiv = document.getElementById('resumen-datos');
  if (!resumenDiv) return;

  resumenDiv.innerHTML = `
    <p>🕒 Fecha y hora: ${datos.fechaHora}</p>
    <p>📍 Ubicación estimada: ${datos.ubicacion}</p>
    <p>🌐 IP pública: ${datos.ipPublica}</p>
    <p>💻 Dispositivo: ${datos.dispositivo}</p>
    <p><em>Se ha enviado esta información al responsable de la mascota.</em></p>
  `;
  resumenDiv.style.display = 'block';
}

async function obtenerIpPublica() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) throw new Error('No se pudo obtener IP pública');
    const data = await res.json();
    return data.ip || 'IP no disponible';
  } catch (error) {
    console.warn('⚠️ Error obteniendo IP pública:', error);
    return 'IP no disponible';
  }
}

async function iniciarDeteccion() {
  try {
    logPaso("⏳ Iniciando detección de ubicación, dispositivo e IP pública...");

    // Ejecutar en paralelo la detección
    const [ubicacion, dispositivo, ipPublica] = await Promise.all([
      new Promise(resolve => detectarUbicacion(resolve)),
      new Promise(resolve => detectarDispositivo(resolve)),
      obtenerIpPublica()
    ]);

    const fechaHora = new Date().toLocaleString();

    const datos = {
      ubicacion: ubicacion || "No disponible",
      dispositivo: dispositivo || "No disponible",
      ipPublica,
      fechaHora
    };

    window.datosVisitante = datos;
    logPaso("✅ Datos recopilados: " + JSON.stringify(datos));

    mostrarResumen(datos);

    logPaso("📤 Enviando notificación al backend...");
    await enviarNotificacion(datos);
    logPaso("✅ Notificación enviada correctamente.");

  } catch (error) {
    console.error("❌ Error durante la detección o envío:", error);
  }
}

function aceptarConsentimiento() {
  const modal = document.getElementById('consent-modal');
  if (modal) modal.style.display = 'none';

  logPaso("Consentimiento aceptado. Iniciando detección...");
  iniciarDeteccion();
}

function rechazarConsentimiento() {
  const modal = document.getElementById('consent-modal');
  if (modal) modal.style.display = 'none';

  logPaso("Consentimiento rechazado. Solo se recopila IP, dispositivo y fecha/hora.");

  // Si se rechaza la ubicación, igual obtenemos IP, dispositivo y fecha/hora
  detectarDispositivo(async (dispositivo) => {
    const ipPublica = await obtenerIpPublica();
    const fechaHora = new Date().toLocaleString();

    const datos = {
      ubicacion: "No compartida",
      dispositivo: dispositivo || "No disponible",
      ipPublica,
      fechaHora
    };

    window.datosVisitante = datos;
    mostrarResumen(datos);

    // Enviar mensaje reducido al backend
    await enviarNotificacion(datos);
  });
}

window.aceptarConsentimiento = aceptarConsentimiento;
window.rechazarConsentimiento = rechazarConsentimiento;

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('consent-modal');
  if (modal) modal.style.display = 'flex';
  logPaso("🟢 Modal de consentimiento mostrado al usuario.");
});

async function enviarNotificacion(datos) {
  const payload = {
    nombreMascota: document.getElementById('nombre-mascota')?.textContent || 'Mascota desconocida',
    ubicacion: datos.ubicacion,
    dispositivo: datos.dispositivo,
    ipPublica: datos.ipPublica,
    fechaHora: datos.fechaHora,
    telefonoWhatsApp: "+591 73958015",
    correoDueno: "melgarcoimbradora@gmail.com",
    mensajePersonalizado: "¡Alguien visualizó el perfil de tu mascota!",
  };

  try {
    const response = await fetch('https://defensa-1.onrender.com/api/notificar-dueno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logPaso("⚠️ La respuesta del servidor no fue 200 OK. Código: " + response.status);
      const error = await response.text();
      console.error("❌ Error del backend:", error);
      return;
    }

    const result = await response.json();
    logPaso("📨 Respuesta del servidor: " + result.mensaje);
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
  }
}
