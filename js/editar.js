document.addEventListener("DOMContentLoaded", async () => {
  const mascotaId = new URLSearchParams(window.location.search).get("id");

  if (!mascotaId) {
    alert("⚠️ No se proporcionó el ID de la mascota.");
    return;
  }

  try {
    const res = await fetch(`https://defensa-1.onrender.com/api/perfil/${mascotaId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "No se pudo obtener el perfil");

    // 🖼️ Verificar si la foto ya es URL pública
    if (data.foto && data.foto.startsWith("http")) {
      document.getElementById("foto-preview").src = data.foto;
    } else if (data.foto) {
      document.getElementById("foto-preview").src = `https://defensa-1.onrender.com/${data.foto}`;
    }

    document.getElementById("nombre-mascota").value = data.nombre_mascota || '';
    document.getElementById("estado").value = data.estado || 'Perdida';
    document.getElementById("mensaje-mascota").value = data.mensaje_mascota || '';

    document.getElementById("especie").value = data.especie || '';
    document.getElementById("raza").value = data.raza || '';
    document.getElementById("edad").value = data.edad || '';
    document.getElementById("historial_salud").value = data.historial_salud || '';

    document.getElementById("nombre-dueno").value = data.nombre_dueno || '';
    document.getElementById("telefono-dueno").value = data.telefono || '';
    document.getElementById("correo-dueno").value = data.correo || '';
    document.getElementById("mensaje-dueno").value = data.mensaje_dueno || '';
  } catch (error) {
    console.error("❌ Error al cargar el perfil:", error);
    alert("No se pudo cargar el perfil para editar.");
  }

  // 📸 Vista previa de la nueva foto
  const fotoInput = document.getElementById("foto-input");
  const fotoPreview = document.getElementById("foto-preview");

  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        fotoPreview.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // 💾 Guardar cambios
  document.getElementById("btn-guardar").addEventListener("click", async () => {
    const formData = new FormData();

    formData.append("nombre_mascota", document.getElementById("nombre-mascota").value);
    formData.append("estado", document.getElementById("estado").value);
    formData.append("mensaje_mascota", document.getElementById("mensaje-mascota").value);

    formData.append("especie", document.getElementById("especie").value);
    formData.append("raza", document.getElementById("raza").value);
    formData.append("edad", document.getElementById("edad").value);
    formData.append("historial_salud", document.getElementById("historial_salud").value);

    formData.append("nombre_dueno", document.getElementById("nombre-dueno").value);
    formData.append("telefono", document.getElementById("telefono-dueno").value);
    formData.append("correo", document.getElementById("correo-dueno").value);
    formData.append("mensaje_dueno", document.getElementById("mensaje-dueno").value);

    const fotoFile = document.getElementById("foto-input").files[0];
    if (fotoFile) {
      formData.append("foto", fotoFile);
    }

    try {
      const res = await fetch(`https://defensa-1.onrender.com/api/editar-perfil/${mascotaId}`, {
        method: "PUT",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Error actualizando perfil");

      alert("✅ Perfil actualizado correctamente");
      window.location.href = `perfil.html?id=${mascotaId}`;
    } catch (error) {
      console.error("❌ Error guardando cambios:", error);
      alert("No se pudo guardar los cambios.");
    }
  });
});

