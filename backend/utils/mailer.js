// utils/mailer.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'TU_CORREO@gmail.com',
    pass: 'TU_CONTRASEÑA_DE_APP'
  }
});

export async function enviarCredenciales(correo, nombre, clave, idMascota) {
  const url = `https://defensa-1.onrender.com/perfil.html?id=${idMascota}`;
  const mensaje = `
Hola ${nombre || 'Dueño'},

Tu mascota ha sido registrada exitosamente.

📄 Perfil: ${url}
🔐 Clave de acceso: ${clave}

Guarda esta información. Podrás editar el perfil usando esta clave más adelante.

Gracias por usar IQPET 🐾
`;

  await transporter.sendMail({
    from: '"IQPET" <TU_CORREO@gmail.com>',
    to: correo,
    subject: '🐶 Perfil de tu mascota creado en IQPET',
    text: mensaje
  });
}
