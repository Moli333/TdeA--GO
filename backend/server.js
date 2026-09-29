import express from 'express';
import cors from 'cors';
import { supabase } from './config/supabase.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------
// 1. REGISTRO DE USUARIO: POST /api/usuarios
// ------------------------------------------------------------------
app.post('/api/usuarios', async (req, res) => {
  const { nombre, apellido, correo, telefono, contrasena, rol } = req.body;

  // Validaciones de campos obligatorios
  if (!nombre || !apellido || !correo || !telefono || !contrasena) {
    return res.status(400).json({
      mensaje: 'Completa todos los campos obligatorios para crear tu cuenta.',
    });
  }

  // Validación de correo institucional TdeA
  if (!correo.toLowerCase().endsWith('@tda.edu.co')) {
    return res.status(400).json({
      mensaje: 'Debes utilizar tu correo institucional del TdeA (@tda.edu.co).',
    });
  }

  try {
    const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`;

    // Registrar en Supabase Auth enviando metadatos para el Trigger de Postgres
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

    return res.status(201).json({
      mensaje: 'Cuenta creada correctamente.',
      usuario: {
        id: authData.user?.id,
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
// 2. INICIO DE SESIÓN: POST /api/login
// ------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({
      mensaje: 'Completa el correo electrónico y la contraseña.',
    });
  }

  try {
    // A. Autenticar con Supabase Auth
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

    const userId = authData.user?.id;

    // B. Obtener los datos del perfil desde la tabla "profiles"
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        mensaje: 'No se encontraron los datos del perfil asociado.',
      });
    }

    // C. Respuesta exitosa con datos de usuario y token
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor TdeA GO corriendo en http://localhost:${PORT}`);
});