import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';

const { Pool } = pkg;

// Cargar .env desde la carpeta backend
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

console.log('📍 Ruta del .env cargado:', path.resolve(process.cwd(), 'backend', '.env'));
console.log('🛠️ Conectando a DB con URL:', process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: La variable DATABASE_URL NO está definida en .env');
  process.exit(1);
}

// Detectar si es conexión local
const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

// Crear pool con configuración IPv4 segura para Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  host: isLocal ? undefined : 'db.hfmfwrgnaxknywfbocrl.supabase.co', // ⬅️ Forzar IPv4 explícitamente en Render
  port: 5432,
  statement_timeout: 5000, // ⏱️ Previene bloqueos por lentitud
});

// Probar conexión al iniciar
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
