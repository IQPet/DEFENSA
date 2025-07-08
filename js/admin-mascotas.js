// js/admin-mascotas.js

const ADMIN_CORREO = 'admin@iqpet.com'; // reemplaza con el tuyo si es distinto

async function cargarMascotas() {
  try {
    const respuesta = await fetch('/api/admin/mascotas', {
      headers: {
        'x-admin-correo': ADMIN_CORREO
      }
    });

    if (!respuesta.ok) {
      throw new Error('Acceso no autorizado o error del servidor');
    }

    const datos = await respuesta.json();
    mostrarMascotas(datos.mascotas);
  } catch (error) {
    console.error('Error al cargar mascotas:', error);
    document.getElementById('mascotas-container').innerText = '❌ Error al cargar mascotas.';
  }
}

function mostrarMascotas(mascotas) {
  const contenedor = document.getElementById('mascotas-container');
  contenedor.innerHTML = '';

  if (mascotas.length === 0) {
    contenedor.innerHTML = '<p>No hay mascotas registradas.</p>';
    return;
  }

  mascotas.forEach(m => {
    const div = document.createElement('div');
    div.className = 'mascota';
    div.innerHTML = `
      <strong>🐾 ${m.nombre}</strong><br>
      Especie: ${m.especie || 'No especificado'}<br>
      Raza: ${m.raza || 'No especificado'}<br>
      Edad: ${m.edad || 'No especificado'}<br>
      Estado: ${m.estado || 'Desconocido'}<br>
      Dueño: ${m.dueno_nombre} (${m.dueno_correo})<br>
      Teléfono del dueño: ${m.dueno_telefono || 'N/A'}<br>
      ID mascota: ${m.id}
    `;
    contenedor.appendChild(div);
  });
}

// Ejecutar al cargar la página
cargarMascotas();
