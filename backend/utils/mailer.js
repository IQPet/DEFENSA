import nodemailer from "nodemailer";

// Configura el transporter usando Brevo
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com", // host de Brevo
  port: 587,                     // puerto recomendado por Brevo
  auth: {
    user: "tu_correo@dominio.com",        // correo registrado en Brevo
    pass: process.env.BREVO_API_KEY       // tu API Key en variable de entorno
  }
});

export async function enviarCredenciales(correo, nombre, clave, idMascota) {
  console.log('🚀 enviarCredenciales llamada con:', { correo, nombre, clave, idMascota });

  // URL de perfil
  const url = `https://defensa-1.onrender.com/perfil.html?id=${idMascota}`;

  const mensaje = `
Hola ${nombre || 'Dueño'},

Tu mascota ha sido registrada exitosamente.

📄 Perfil: ${url}
🔐 Clave de acceso: ${clave}

Guarda esta información. Podrás editar el perfil usando esta clave más adelante.

Gracias por usar IQPET 🐾
`;

  try {
    const info = await transporter.sendMail({
      from: `"IQPET" <no-reply@iqpet.com>`, // nombre visible en el correo
      to: correo,
      subject: '🐶 Perfil de tu mascota creado en IQPET',
      text: mensaje,
      html: `<p>${mensaje.replace(/\n/g, "<br>")}</p>` // para que tenga salto de línea en HTML
    });

    console.log('✅ Correo enviado:', info.messageId);
  } catch (error) {
    console.error('❌ Error enviando correo:', error.message);
    throw error; // Propaga el error para que Railway pueda mostrarlo si falla
  }
}
