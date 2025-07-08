import pool from './config/db.js'; 
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import geoRouter from './routes/geolocalizacion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta raíz del proyecto (un nivel arriba de backend/)
const rootPath = path.resolve(__dirname, '..');

// Cargar variables de entorno desde backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('📍 Ruta del .env cargado:', path.resolve(__dirname, '.env'));
console.log('🧪 DEBUG - DATABASE_URL:', process.env.DATABASE_URL);
console.log('🧪 DEBUG - EMAIL_USER:', process.env.EMAIL_USER);
console.log('🧪 DEBUG - EMAIL_PASS:', process.env.EMAIL_PASS ? '****' : 'undefined');
console.log('🧪 DEBUG - WHATSAPP_INSTANCE_ID:', process.env.WHATSAPP_INSTANCE_ID);
console.log('🧪 DEBUG - WHATSAPP_TOKEN:', process.env.WHATSAPP_TOKEN ? '****' : 'undefined');

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ CORS configurado correctamente
const corsOptions = {
  origin: 'https://defensa-1.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Servir archivos estáticos del frontend (perfil.html y otros en la raíz)
app.use(express.static(rootPath));

// Opcional: cuando visiten la raíz, enviar perfil.html
app.get('/', (req, res) => {
  res.sendFile(path.join(rootPath, 'perfil.html'));
});

// Servir imágenes estáticas backend
app.use('/imagenes', express.static(path.join(__dirname, 'imagenes')));

// Rutas adicionales
app.use('/api', geoRouter);

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'imagenes', 'mascotas'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `mascota_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Validar .env
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ ERROR: EMAIL_USER y EMAIL_PASS deben estar definidos en .env');
  process.exit(1);
}

// Configurar nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ ERROR SMTP:', error);
  } else {
    console.log('✅ Servidor SMTP verificado y listo.');
  }
});

// 📨 Notificar dueño
app.post('/api/notificar-dueno', async (req, res) => {
  const { mascotaId, ubicacion, ip, dispositivo, fechaHora, lat, lon } = req.body;

  if (!mascotaId) return res.status(400).json({ error: 'Debe proporcionar el ID de la mascota' });

  try {
    const result = await pool.query(`
      SELECT m.nombre AS nombre_mascota, m.mensaje AS mensaje_mascota, d.correo, d.telefono
      FROM mascotas m
      JOIN duenos d ON m.dueno_id = d.id
      WHERE m.id = $1
    `, [mascotaId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Mascota no encontrada' });

    const datos = result.rows[0];
    const linkMapa = lat && lon ? `https://www.google.com/maps?q=${lat},${lon}` : '';

    const textoMensaje = `
Hola, alguien visualizó el perfil de tu mascota "${datos.nombre_mascota}".

📍 Ubicación estimada: ${ubicacion}
${linkMapa ? `🌎 Ver en mapa: ${linkMapa}` : ''}
🌐 IP: ${ip}
💻 Dispositivo: ${dispositivo}

📝 Mensaje adicional: ${datos.mensaje_mascota || 'Ninguno'}

🕒 Fecha y hora: ${fechaHora || new Date().toLocaleString()}
`;

    if (datos.correo) {
      try {
        const info = await transporter.sendMail({
          from: `"IQPet Notificaciones" <${process.env.EMAIL_USER}>`,
          to: datos.correo,
          subject: `🐾 Alguien vio el perfil de ${datos.nombre_mascota}`,
          text: textoMensaje,
        });
        console.log("✅ Correo enviado:", info.messageId);
      } catch (error) {
        console.error("❌ Error al enviar correo:", error);
      }
    }

    if (datos.telefono && process.env.WHATSAPP_INSTANCE_ID && process.env.WHATSAPP_TOKEN) {
      try {
        const response = await fetch(`https://api.ultramsg.com/${process.env.WHATSAPP_INSTANCE_ID}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: process.env.WHATSAPP_TOKEN,
            to: datos.telefono,
            body: textoMensaje,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data);

        console.log("✅ WhatsApp enviado:", data);
      } catch (error) {
        console.error("❌ Error enviando WhatsApp:", error);
      }
    }

    return res.json({ mensaje: 'Notificación enviada correctamente' });

  } catch (error) {
    console.error('❌ Error general:', error);
    return res.status(500).json({ error: 'Error enviando la notificación', detalle: error.message });
  }
});

// 🔐 Validar dueño
app.post('/api/validar-dueno', async (req, res) => {
  const { correo, clave } = req.body;

  if (!correo || !clave) return res.status(400).json({ error: 'Faltan datos: correo o clave' });

  try {
    const result = await pool.query(
      'SELECT id, nombre FROM duenos WHERE correo = $1 AND clave = $2',
      [correo, clave]
    );

    if (result.rows.length === 0) return res.status(401).json({ error: 'Correo o clave incorrectos' });

    return res.json({
      mensaje: 'Autenticación exitosa',
      duenoId: result.rows[0].id,
      nombre: result.rows[0].nombre
    });

  } catch (error) {
    console.error('❌ Error validando dueño:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✏️ Editar perfil
app.put('/api/editar-perfil/:id', upload.single('foto'), async (req, res) => {
  const mascotaId = req.params.id;
  const {
    nombre_mascota, estado, mensaje_mascota, especie, raza, edad, historial_salud,
    nombre_dueno, telefono, correo, mensaje_dueno
  } = req.body;

  try {
    const duenoResult = await pool.query(
      `SELECT dueno_id FROM mascotas WHERE id = $1`, [mascotaId]
    );
    if (duenoResult.rows.length === 0) return res.status(404).json({ error: 'Mascota no encontrada' });

    const duenoId = duenoResult.rows[0].dueno_id;
    let nuevaRutaFoto = req.file ? `imagenes/mascotas/${req.file.filename}` : null;

    await pool.query(`
      UPDATE mascotas
      SET nombre = $1, estado = $2, mensaje = $3, especie = $4, raza = $5, edad = $6,
          historial_salud = $7${nuevaRutaFoto ? `, foto = '${nuevaRutaFoto}'` : ''}
      WHERE id = $8
    `, [
      nombre_mascota, estado, mensaje_mascota, especie, raza, edad, historial_salud, mascotaId
    ]);

    await pool.query(`
      UPDATE duenos
      SET nombre = $1, telefono = $2, correo = $3, mensaje = $4
      WHERE id = $5
    `, [
      nombre_dueno, telefono, correo, mensaje_dueno, duenoId
    ]);

    return res.json({ mensaje: 'Perfil actualizado correctamente' });

  } catch (error) {
    console.error('❌ Error al actualizar perfil:', error);
    return res.status(500).json({ error: 'Error al actualizar el perfil', detalle: error.message });
  }
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en puerto ${PORT}`);
});


