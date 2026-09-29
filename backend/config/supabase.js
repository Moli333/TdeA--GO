import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

// Verificación preventiva en consola
if (!supabaseUrl || !secretKey) {
  console.error('⚠️ ALERTA: Faltan variables de entorno para Supabase en el backend.');
}

// Cliente público (para operaciones de usuario final)
export const supabase = createClient(supabaseUrl, publishableKey);

// Cliente Administrador (omite RLS, ideal para crear perfiles desde el server)
export const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});