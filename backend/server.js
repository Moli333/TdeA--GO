import 'dotenv/config';
import { supabase } from './config/supabase.js';

async function probar() {
  const { data, error } = await supabase.from('usuarios').select('*').limit(1);
  if (error) {
    console.log('Conectado a Supabase, pero la tabla no existe aún:', error.message);
  } else {
    console.log('CONECTADO OK:', data);
  }
}
probar();