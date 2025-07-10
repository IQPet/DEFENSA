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
import adminMascotasRoutes from './routes/adminMascotas.js';
import supabase from './routes/supabaseClient.js';

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

// ✅ CORS configurado bien para permitir el frontend
const corsOptions = {
  origin: 'https://defensa-1.onrender.com', // tu dominio frontend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// 🔧 Aplicar CORS correctamente a TODAS las rutas
app.use(cors(corsOptions));
app.set('trust proxy', 1); // necesario en Render para manejar cookies y headers correctamente

// 🔧 Asegura respuesta correcta a preflight (OPTIONS)
app.options('*', cors(corsOptions), (req, res) => {
  res.sendStatus(204);
});


app.use(express.json());

// Servir archivos estáticos del frontend (perfil.html y otros en la raíz)
app.use(express.static(rootPath));

// Opcional: cuando visiten la raíz, enviar perfil.html
app.get('/', (req, res) => {
  res.sendFile(path.join(rootPath, 'perfil.html'));
});

// Servir imágenes estáticas backend
app.use('/imagenes', express.static(path.join(__dirname, 'imagenes')));

app.use('/api', geoRouter);
app.use('/api/admin', adminMascotasRoutes);


// Configurar multer para subir imágenes
const storage = multer.memoryStorage();
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


app.post('/api/notificar-dueno', async (req, res) => {
  console.log("📥 [Paso 1] Solicitud recibida en /api/notificar-dueno");

  const { mascotaId, ubicacion, ip, dispositivo, fechaHora, lat, lon } = req.body;

  if (!mascotaId) {
    return res.status(400).json({ error: 'Debe proporcionar el ID de la mascota' });
  }

  try {
    const query = `
      SELECT 
        m.nombre AS nombre_mascota,
        m.mensaje AS mensaje_mascota,
        d.correo,
        d.telefono
      FROM mascotas m
      JOIN duenos d ON m.dueno_id = d.id
      WHERE m.id = $1
    `;

    const result = await pool.query(query, [mascotaId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    const datos = result.rows[0];

    let linkMapa = '';
    if (lat && lon) {
      linkMapa = `https://www.google.com/maps?q=${lat},${lon}`;
    }

    const textoMensaje = `
Hola, alguien visualizó el perfil de tu mascota "${datos.nombre_mascota}".

📍 Ubicación estimada: ${ubicacion}
${linkMapa ? `🌎 Ver en mapa: ${linkMapa}` : ''}
🌐 IP: ${ip}
💻 Dispositivo: ${dispositivo}

📝 Mensaje adicional: ${datos.mensaje_mascota || 'Ninguno'}

🕒 Fecha y hora: ${fechaHora || new Date().toLocaleString()}
    `;

  // Enviar correo
    if (datos.correo) {
      try {
        const info = await transporter.sendMail({
          from: `"IQPet Notificaciones" <${process.env.EMAIL_USER}>`,
          to: datos.correo,
          subject: `🐾 Alguien vio el perfil de ${datos.nombre_mascota}`,
          text: textoMensaje,
        });
        console.log("✅ Correo enviado. ID:", info.messageId);
      } catch (error) {
        console.error("❌ Error al enviar correo:", error);
      }
    } else {
      console.warn("⚠️ No se encontró correo del dueño.");
    }

    // Enviar WhatsApp
    if (datos.telefono && process.env.WHATSAPP_INSTANCE_ID && process.env.WHATSAPP_TOKEN) {
      try {
        const whatsappPayload = {
          token: process.env.WHATSAPP_TOKEN,
          to: datos.telefono,
          body: textoMensaje,
        };

        const whatsappUrl = `https://api.ultramsg.com/${process.env.WHATSAPP_INSTANCE_ID}/messages/chat`;

        const response = await fetch(whatsappUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(whatsappPayload),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("✅ WhatsApp enviado:", data);
        } else {
          console.error("❌ Error al enviar WhatsApp:", data);
        }
      } catch (error) {
        console.error("❌ Error al procesar solicitud de WhatsApp:", error);
      }
    } else {
      console.warn("⚠️ WhatsApp no se envió: faltan datos o configuración.");
    }

    return res.json({ mensaje: 'Notificación enviada correctamente' });

  } catch (error) {
    console.error('❌ [ERROR] Fallo en el envío:', error);
    return res.status(500).json({
      error: 'Error enviando la notificación',
      detalle: error.message,
    });
  }
});

// 🔍 Obtener datos del perfil (respuesta fija)
console.log('Definiendo ruta GET /api/perfil/:id');
app.get('/api/perfil/:id', (req, res) => {
  // Ignoramos el id recibido y respondemos con el objeto fijo
  const dataFija = {
    id: 1,
    dueno_id: 1,
    nombre: "Snoopy",
    especie: "Perro",
    raza: "Pequines",
    edad: "3 meses",
    historial_salud: "Vacunado y desparasitado",
    estado: "En casa",
    mensaje: "Hola me he perdido ayúdame a estar en casa",
    foto: "https://hfmfwrgnaxknywfbocrl.supabase.co/storage/v1/object/public/mascotas/premium_photo-1694819488591-a43907d1c5cc.jpg",
    dueno: {
      id: 1,
      nombre: "Mishely",
      telefono: "73958015",
      correo: "melgarcoimbradora@gmail.com",
      mensaje: "Hola estoy bien",
      clave: "luna123"
    }
  };

  return res.json(dataFija);
});

// ✏️ Actualizar perfil
console.log('Definiendo ruta POST /api/editar-perfil/:id');
app.post('/api/editar-perfil/:id', upload.single('foto'), async (req, res) => {

  console.log('📂 req.file:', req.file);  // Multer recibe la imagen
  console.log('📋 req.body:', req.body);  // Datos del formulario

  const mascotaId = req.params.id;
  const {
    nombre_mascota,
    estado,
    mensaje_mascota,
    especie,
    raza,
    edad,
    historial_salud,
    nombre_dueno,
    telefono,
    correo,
    mensaje_dueno,
    foto // aquí esperamos que venga la URL completa si no suben archivo
  } = req.body;

  try {
    // Obtener el ID del dueño para actualizar también sus datos
    const duenoQuery = await pool.query(
      `SELECT dueno_id FROM mascotas WHERE id = $1`,
      [mascotaId]
    );

    if (duenoQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    const duenoId = duenoQuery.rows[0].dueno_id;

    let fileName = null;

    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      fileName = `mascota_${mascotaId}.${fileExt}`;  // Nombre fijo sin timestamp

      try {
        // Subir la imagen a Supabase Storage (con upsert para reemplazar)
        const { data, error } = await supabase.storage
          .from('mascotas')
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });

        if (error) throw error;

        console.log('✅ Imagen subida a Supabase con nombre:', fileName);

      } catch (supabaseError) {
        console.error('❌ Error subiendo imagen a Supabase:', supabaseError);
        return res.status(500).json({
          error: 'Error subiendo imagen a Supabase',
          detalle: supabaseError.message
        });
      }
    }

    // Construir consulta y parámetros para actualizar la mascota
    let queryMascota, paramsMascota;

    if (fileName) {
      // Caso: imagen nueva subida, guardamos solo el nombre
      queryMascota = `
        UPDATE mascotas
        SET nombre = $1, estado = $2, mensaje = $3, especie = $4, raza = $5,
            edad = $6, historial_salud = $7, foto = $8
        WHERE id = $9
      `;
      paramsMascota = [
        nombre_mascota,
        estado,
        mensaje_mascota,
        especie,
        raza,
        edad,
        historial_salud,
        fileName,
        mascotaId
      ];
    } else if (foto && foto.trim() !== '') {
      // Caso: no se subió imagen, pero viene foto con URL completa desde el frontend
      queryMascota = `
        UPDATE mascotas
        SET nombre = $1, estado = $2, mensaje = $3, especie = $4, raza = $5,
            edad = $6, historial_salud = $7, foto = $8
        WHERE id = $9
      `;
      paramsMascota = [
        nombre_mascota,
        estado,
        mensaje_mascota,
        especie,
        raza,
        edad,
        historial_salud,
        foto.trim(),
        mascotaId
      ];
    } else {
      // Caso: no se actualiza la foto
      queryMascota = `
        UPDATE mascotas
        SET nombre = $1, estado = $2, mensaje = $3, especie = $4, raza = $5,
            edad = $6, historial_salud = $7
        WHERE id = $8
      `;
      paramsMascota = [
        nombre_mascota,
        estado,
        mensaje_mascota,
        especie,
        raza,
        edad,
        historial_salud,
        mascotaId
      ];
    }

    console.log('📤 Ejecutando query actualización mascota:', queryMascota);
    console.log('📋 Con parámetros:', paramsMascota);

    const result = await pool.query(queryMascota, paramsMascota);

    console.log('✅ Resultado actualización mascota:', result);

    // Actualizar datos del dueño
    const queryDueno = `
      UPDATE duenos
      SET nombre = $1, telefono = $2, correo = $3, mensaje = $4
      WHERE id = $5
    `;

    await pool.query(queryDueno, [
      nombre_dueno,
      telefono,
      correo,
      mensaje_dueno,
      duenoId
    ]);

    res.json({ mensaje: 'Perfil actualizado correctamente' });

  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    res.status(500).json({
      error: 'Error al actualizar el perfil',
      detalle: error.message
    });
  }
});


console.log("🛠️ Versión corregida sin path-to-regexp directa");

// 🧪 Ruta temporal para testear conectividad con Supabase
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mascotas')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Error al conectar con Supabase:', error);
      return res.status(500).json({ error: 'Error conectando con Supabase', detalle: error.message });
    }

    res.json({ mensaje: '✅ Conexión a Supabase exitosa', data });
  } catch (err) {
    console.error('❌ Error inesperado en test Supabase:', err);
    res.status(500).json({ error: 'Fallo inesperado', detalle: err.message });
  }
});


// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en puerto ${PORT}`);
});

