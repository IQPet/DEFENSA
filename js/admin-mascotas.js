// js/admin-mascotas.js

const ADMIN_CORREO = 'admin@iqpet.com'; // reemplaza con tu correo si es diferente

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

    let perfilURL = 'https://defensa-1.onrender.com/perfil.html';
    if (m.id !== 1) {
      perfilURL += `?id=${m.id}`;
    }

    div.innerHTML = `
      <strong>🐾 ${m.nombre}</strong><br>
      Especie: ${m.especie || 'No especificado'}<br>
      Raza: ${m.raza || 'No especificado'}<br>
      Edad: ${m.edad || 'No especificado'}<br>
      Estado: ${m.estado || 'Desconocido'}<br>
      Dueño: ${m.dueno_nombre || 'Sin nombre'} (${m.dueno_correo})<br>
      Teléfono del dueño: ${m.dueno_telefono || 'N/A'}<br>
      ID mascota: ${m.id} <br>
      <a href="${perfilURL}" target="_blank">🔗 Ver perfil público</a>
    `;
    contenedor.appendChild(div);
  });
}

// Ejecutar al cargar la página
cargarMascotas();


// 🚀 Manejar envío del formulario para crear nueva mascota
document.getElementById('form-nueva-mascota').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const especie = document.getElementById('especie').value.trim();
  const correo = document.getElementById('correo').value.trim();

  if (!nombre || !especie || !correo) {
    alert('Completa todos los campos.');
    return;
  }

  try {
    const res = await fetch('/api/admin/mascotas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-correo': ADMIN_CORREO
      },
      body: JSON.stringify({ nombre, especie, correo })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error al crear la mascota');
      return;
    }

    alert(`✅ Mascota creada. URL: ${data.url}`);
    document.getElementById('form-nueva-mascota').reset();
    cargarMascotas(); // actualizar lista
  } catch (err) {
    console.error('Error al crear mascota:', err);
    alert('Error al crear mascota');
  }
});
