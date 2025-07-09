const ADMIN_CORREO = 'admin@iqpet.com';

// Subida y creación de mascota
document.getElementById('form-mascota').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = document.getElementById('form-mascota');
  const formData = new FormData(form);

  try {
    const res = await fetch('/api/admin/crear-mascota', {
      method: 'POST',
      headers: {
        'x-admin-correo': ADMIN_CORREO
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || '❌ Error al crear la mascota');
      return;
    }

    alert(`✅ Mascota creada con éxito. Perfil: ${data.url}`);
    window.open(data.url, '_blank');
    form.reset();
    document.getElementById('preview-foto').style.display = 'none';

  } catch (err) {
    console.error('Error:', err);
    alert('❌ Error al conectar con el servidor.');
  }
});

// Autocompletar dueño si ya existe
document.getElementById('correo').addEventListener('blur', async () => {
  const correo = document.getElementById('correo').value.trim();
  if (!correo) return;

  try {
    const res = await fetch(`/api/admin/dueno-por-correo?correo=${encodeURIComponent(correo)}`, {
      headers: {
        'x-admin-correo': ADMIN_CORREO
      }
    });

    if (!res.ok) return; // dueño no encontrado

    const dueno = await res.json();

    document.getElementById('dueno_nombre').value = dueno.nombre || '';
    document.getElementById('telefono').value = dueno.telefono || '';
    document.getElementById('mensaje_dueno').value = dueno.mensaje || '';
  } catch (e) {
    console.warn('No se pudo cargar los datos del dueño');
  }
});

// Vista previa de imagen
document.getElementById('foto').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('preview-foto');

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    preview.src = '';
    preview.style.display = 'none';
  }
});
