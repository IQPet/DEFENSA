// js/admin-mascotas.js

const ADMIN_CORREO = 'admin@iqpet.com'; // Cambiar si es necesario
const BACKEND_URL = 'https://defensa-production.up.railway.app'; // URL de tu backend en Railway

// Carga todas las mascotas desde el backend
async function cargarMascotas() {
  try {
    const respuesta = await fetch(`${BACKEND_URL}/api/admin/mascotas`, {
      headers: { 'x-admin-correo': ADMIN_CORREO }
    });

    if (!respuesta.ok) {
      throw new Error('Acceso no autorizado o error del servidor');
    }

    const datos = await respuesta.json();
    mostrarMascotas(datos.mascotas || []);
  } catch (error) {
    console.error('❌ Error al cargar mascotas:', error);
    document.getElementById('mascotas-container').innerHTML = '<p>❌ Error al cargar mascotas.</p>';
  }
}

// Muestra todas las mascotas en el contenedor
function mostrarMascotas(mascotas) {
  const contenedor = document.getElementById('mascotas-container');
  contenedor.innerHTML = '';

  if (mascotas.length === 0) {
    contenedor.innerHTML = '<p>📭 No hay mascotas registradas.</p>';
    return;
  }

  mascotas.forEach((m) => {
    const div = document.createElement('div');
    div.className = 'mascota';

    // Construir URL del perfil usando el backend de Railway
    const perfilURL = `${BACKEND_URL}/perfil.html?id=${m.id}`;

    // Render HTML de mascota
    div.innerHTML = `
      <strong>🐾 ${m.nombre || 'Sin nombre'}</strong><br>
      <small>ID: ${m.id}</small><br>
      Especie: ${m.especie || 'No especificado'}<br>
      Raza: ${m.raza || 'No especificado'}<br>
      Edad: ${m.edad || 'No especificada'}<br>
      Estado: ${m.estado || 'Desconocido'}<br>
      Dueño: ${m.dueno_nombre || 'Sin nombre'} (${m.dueno_correo || 'No disponible'})<br>
      Teléfono: ${m.dueno_telefono || 'No disponible'}<br>
      <a href="${perfilURL}" target="_blank">🔗 Ver perfil público</a>
    `;

    contenedor.appendChild(div);
  });
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', cargarMascotas);
