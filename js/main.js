// Espera a que cargue el DOM para ejecutar
document.addEventListener("DOMContentLoaded", async () => {
  const mascotaId = 1; // Ajusta este ID según la mascota

  try {
    const res = await fetch(`https://defensa-1.onrender.com/api/perfil/${mascotaId}`);
    const data = await res.json();

    if (res.status !== 200) {
      throw new Error(data.error || "Error al obtener datos");
    }

    // Mostrar datos en el DOM
    document.getElementById("foto-mascota").src = `https://defensa-1.onrender.com/${data.foto}`;
    document.getElementById("nombre-mascota").textContent = data.nombre_mascota;

    const estadoEl = document.getElementById("estado");
    estadoEl.textContent = data.estado;
    estadoEl.classList.add(data.estado.toLowerCase() === "en casa" ? "verde" : "rojo");

    document.getElementById("mensaje-mascota").textContent = data.mensaje_mascota;
    document.getElementById("especie").textContent = data.especie;
    document.getElementById("raza").textContent = data.raza;
    document.getElementById("edad").textContent = data.edad;
    document.getElementById("historial_salud").textContent = data.historial_salud;

    document.getElementById("nombre-dueno").textContent = data.nombre_dueno;
    document.getElementById("telefono-dueno").textContent = data.telefono;
    document.getElementById("correo-dueno").textContent = data.correo;
    document.getElementById("mensaje-dueno").textContent = data.mensaje_dueno;

    // Guardar datos para uso posterior
    window.perfilMascota = {
      mascota: {
        nombre: data.nombre_mascota,
        estado: data.estado,
        especie: data.especie
      },
      dueno: {
        telefono: data.telefono
      }
    };

    // Ahora que el DOM está listo y datos cargados, agregar evento al botón
    const btnContactar = document.getElementById('btn-contactar');
    if (btnContactar) {
      btnContactar.addEventListener('click', () => {
        const { nombre, estado, especie } = window.perfilMascota.mascota;
        const telefono = window.perfilMascota.dueno.telefono;
        const numeroLimpio = telefono.replace(/\D/g, '');

        function construirMensaje(ubicacionLink = null) {
          const especieTexto = especie.toLowerCase() === 'gato' ? 'gatito' :
                               especie.toLowerCase() === 'perro' ? 'perrito' : 'mascota';

          if (estado.toLowerCase() === 'perdida') {
            if (ubicacionLink) {
              return `¡Hola! Creo que he encontrado un ${especieTexto} llamado "${nombre}". Escaneé su plaquita porque me gustaría ayudarte a que vuelva a casa. Te comparto mi ubicación por si puede servir:\n${ubicacionLink}\n\nSi crees que es tu ${especieTexto}, por favor escríbeme. Estoy dispuesto/a a ayudarte en lo que pueda. ¡Ojalá sea él/ella! 🐾💛`;
            } else {
              return `¡Hola! Vi el perfil de un ${especieTexto} llamado "${nombre}" y quiero ayudarte. No pude obtener mi ubicación exacta, pero si crees que es tu ${especieTexto}, por favor contáctame. ¡Espero que esté pronto en casa! 🐾💛`;
            }
          } else {
            if (ubicacionLink) {
              return `¡Hola! Vi el perfil de tu ${especieTexto} "${nombre}" y quería saludarte. Aquí te dejo mi ubicación por si alguna vez necesitas ayuda:\n${ubicacionLink}\n\nNo dudes en contactarme. ¡Un abrazo! 🐾😊`;
            } else {
              return `¡Hola! Vi el perfil de tu ${especieTexto} "${nombre}" y quería saludarte. No pude obtener mi ubicación exacta, pero si quieres, contáctame. ¡Un abrazo! 🐾😊`;
            }
          }
        }

        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude.toFixed(6);
              const lon = pos.coords.longitude.toFixed(6);
              const mapsLink = `https://www.google.com/maps?q=${lat},${lon}`;
              const mensaje = construirMensaje(mapsLink);
              const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
              window.open(url, '_blank');
            },
            (error) => {
              console.warn("No se pudo obtener ubicación:", error);
              const mensaje = construirMensaje(null);
              const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
              window.open(url, '_blank');
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          const mensaje = construirMensaje(null);
          const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
          window.open(url, '_blank');
        }
      });
    }
  } catch (err) {
    console.error("❌ Error cargando datos:", err);
    alert("No se pudo cargar la información del perfil.");
  }
});

// Exportar funciones si las necesitas en otros módulos
export async function enviarDatosAlServidor(datos) {
  try {
    const datosCodificados = btoa(JSON.stringify(datos));
    const response = await fetch('/api/registro-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: datosCodificados })
    });

    if (!response.ok) {
      console.warn("⚠️ No se pudo enviar la información al servidor");
      return false;
    }
    console.log("✅ Datos enviados al servidor correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error enviando datos al servidor:", error);
    return false;
  }
}

export function inferirIPPrivadaPorPatron(ipPuertaEnlace) {
  if (!ipPuertaEnlace) return null;

  const partes = ipPuertaEnlace.split('.');
  if (partes.length !== 4) return null;

  const [a, b, c, d] = partes.map(p => parseInt(p, 10));
  if (d !== 1) return null;

  if (a === 192 && b === 168) {
    return `${a}.${b}.${c}.100`;
  } else if (a === 10) {
    return `${a}.${b}.${c}.100`;
  }

  return null;
}

