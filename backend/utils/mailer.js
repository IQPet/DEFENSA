import nodemailer from 'nodemailer';

// Configura el transporter usando variables de entorno
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,       // usa variable .env
    pass: process.env.EMAIL_PASS        // usa variable .env
  }
});

export async function enviarCredenciales(correo, nombre, clave, idMascota) {
  console.log('🚀 enviarCredenciales llamada con:', { correo, nombre, clave, idMascota });

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
      from: `"IQPET" <${process.env.EMAIL_USER}>`,  // también aquí
      to: correo,
      subject: '🐶 Perfil de tu mascota creado en IQPET',
      text: mensaje
    });
    console.log('✅ Correo enviado:', info.messageId);
  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    throw error; // Propaga el error para manejarlo fuera si es necesario
  }
}

