import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';

const { Pool } = pkg;

// Cargar .env
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

console.log('📍 Ruta del .env cargado:', path.resolve(process.cwd(), 'backend', '.env'));
console.log('🛠️ Conectando a DB con URL:', process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: La variable DATABASE_URL NO está definida en .env');
  process.exit(1);
}

// Detectar si es local
const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

// 🔐 Conectar usando configuración SSL condicional
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : {
    rejectUnauthorized: false, // 👈 Aceptar certificados autofirmados (Supabase Pooler)
  },
});

// Probar conexión
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a la base de datos establecida correctamente.');
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    process.exit(1);
  }
})();

export default pool;
