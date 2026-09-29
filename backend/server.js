import express from 'express';
import cors from 'cors';
import { supabase, supabaseAdmin } from './config/supabase.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Selección segura del cliente para la base de datos (prioriza el cliente Admin)
const dbClient = supabaseAdmin || supabase;

// ------------------------------------------------------------------
// 1. REGISTRO DE USUARIO: POST /api/usuarios
// ------------------------------------------------------------------
app.post('/api/usuarios', async (req, res) => {
  const { nombre, apellido, correo, telefono, contrasena, rol } = req.body;

  if (!nombre || !apellido || !correo || !telefono || !contrasena) {
    return res.status(400).json({
      mensaje: 'Completa todos los campos obligatorios para crear tu cuenta.',
    });
  }

  if (!correo.toLowerCase().endsWith('@tda.edu.co')) {
    return res.status(400).json({
      mensaje: 'Debes utilizar tu correo institucional del TdeA (@tda.edu.co).',
    });
  }

  try {
    const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`;

    // Registrar en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: correo.trim(),
      password: contrasena,
      options: {
        data: {
          nombre_completo: nombreCompleto,
          telefono: telefono.trim(),
          rol: rol || 'pasajero',
        },
      },
    });

    if (authError) {
      return res.status(400).json({
        mensaje: authError.message || 'Error al crear la cuenta en Supabase.',
      });
    }

    const userId = authData.user?.id;

    // Inserción de respaldo usando el cliente Admin para evitar bloqueos por RLS
    if (userId) {
      await dbClient.from('profiles').upsert([
        {
          id: userId,
          nombre_completo: nombreCompleto,
          correo: correo.trim(),
          telefono: telefono.trim(),
          rol: rol || 'pasajero',
          verificado: false,
          creado_en: new Date().toISOString(),
        },
      ], { onConflict: 'id' });
    }

    return res.status(201).json({
      mensaje: 'Cuenta creada correctamente.',
      usuario: {
        id: userId,
        nombre_completo: nombreCompleto,
        correo: correo.trim(),
        rol: rol || 'pasajero',
      },
    });
  } catch (error) {
    console.error('Error en /api/usuarios:', error);
    return res.status(500).json({
      mensaje: 'Error interno del servidor al procesar el registro.',
    });
  }
});

// ------------------------------------------------------------------
// 2. INICIO DE SESIÓN: POST /api/login (con Auto-creación de Perfil)
// ------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({
      mensaje: 'Completa el correo electrónico y la contraseña.',
    });
  }

  try {
    // A. Autenticar credenciales con Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: correo.trim(),
        password: contrasena,
      });

    if (authError) {
      return res.status(401).json({
        mensaje: 'Correo o contraseña incorrectos.',
      });
    }

    const user = authData.user;
    if (!user) {
      return res.status(401).json({ mensaje: 'No se pudo validar el usuario.' });
    }

    // B. Buscar perfil usando supabaseAdmin para evitar restricciones de RLS
    let { data: profile, error: profileError } = await dbClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // C. Si el perfil no existe, se crea automáticamente con la info de Auth (Auto-Healing)
    if (!profile) {
      const meta = user.user_metadata || {};
      const nuevoPerfil = {
        id: user.id,
        nombre_completo: meta.nombre_completo || 'Usuario TdeA',
        correo: user.email,
        telefono: meta.telefono || '',
        rol: meta.rol || 'pasajero',
        verificado: false,
        creado_en: new Date().toISOString(),
      };

      const { data: perfilCreado, error: insertError } = await dbClient
        .from('profiles')
        .insert([nuevoPerfil])
        .select()
        .single();

      if (insertError) {
        console.error('Error auto-creando perfil:', insertError);
        return res.status(500).json({
          mensaje: 'Error al sincronizar la información del perfil.',
        });
      }

      profile = perfilCreado;
    }

    // D. Responder con el usuario listo y redirigir
    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso.',
      token: authData.session?.access_token,
      usuario: profile,
    });
  } catch (error) {
    console.error('Error en /api/login:', error);
    return res.status(500).json({
      mensaje: 'Error interno del servidor al iniciar sesión.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor TdeA GO corriendo en http://localhost:${PORT}`);
});