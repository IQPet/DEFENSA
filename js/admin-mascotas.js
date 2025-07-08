// js/admin-mascotas.js

const ADMIN_CORREO = 'admin@iqpet.com'; // reemplaza con el tuyo si es distinto

async function cargarMascotas() {
  try {
    const respuesta = await fetch('https://iqpet-backend.onrender.com/api/admin/mascotas', {
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
      <strong>🐶 ${m.nombre}</strong><br>
      Tipo: ${m.tipo} <br>
      Dueño: ${m.dueno_correo} <br>
      ID: ${m.id}
    `;
    contenedor.appendChild(div);
  });
}

// Ejecutar al cargar la página
cargarMascotas();
