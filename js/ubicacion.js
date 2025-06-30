import { detectarUbicacion, detectarDispositivo } from './detector.js';

function logPaso(mensaje) {
  console.log("🔍 [TRAZA]:", mensaje);
}

function aceptarConsentimiento() {
  const modal = document.getElementById('consent-modal');
  if (modal) modal.style.display = 'none';

  logPaso("Consentimiento aceptado. Iniciando detección...");
  iniciarDeteccion();
}

async function iniciarDeteccion() {
  try {
    logPaso("⏳ Iniciando detección de ubicación y dispositivo...");

    const [ubicacion, dispositivo] = await Promise.all([
      new Promise(resolve => detectarUbicacion(resolve)),
      new Promise(resolve => detectarDispositivo(resolve))
    ]);

    const datos = {
      ubicacion: ubicacion || "No disponible",
      dispositivo: dispositivo || "No disponible"
    };

    window.datosVisitante = datos;
    logPaso("✅ Datos recopilados correctamente: " + JSON.stringify(datos));

    logPaso("📤 Enviando notificación al backend...");
    await enviarNotificacion(datos);
    logPaso("✅ Notificación enviada correctamente.");

  } catch (error) {
    console.error("❌ Error durante la detección o envío:", error);
  }
}

window.aceptarConsentimiento = aceptarConsentimiento;

window.rechazarConsentimiento = () => {
  const modal = document.getElementById('consent-modal');
  if (modal) modal.style.display = 'none';
  logPaso("Consentimiento rechazado. No se recopilan datos.");
};

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
    telefonoWhatsApp: "+591 73958015",
    correoDueno: "melgarcoimbradora@gmail.com",
    mensajePersonalizado: "¡Alguien visualizó el perfil de tu mascota!",
  };

  try {
    const response = await fetch('http://localhost:3001/api/notificar-dueno', {
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

