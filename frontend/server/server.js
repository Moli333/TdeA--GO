import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { supabase, supabaseAdmin } from "./config/supabase.js";

dotenv.config();

const app = express();
const PORT = 5000;

// ---------------------------------------------------------
// CONFIGURACIÓN GENERAL
// ---------------------------------------------------------

app.use(cors());
app.use(express.json());

const db = supabaseAdmin || supabase;

// ---------------------------------------------------------
// FUNCIÓN PARA OBTENER PERFIL
// ---------------------------------------------------------

async function obtenerPerfilPorId(id) {
  const { data, error } = await db
    .from("profiles")
    .select(`
      id,
      nombre_completo,
      correo,
      telefono,
      rol,
      verificado,
      creado_en
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// ---------------------------------------------------------
// RUTA PRINCIPAL
// ---------------------------------------------------------

app.get("/", async (req, res) => {
  try {
    const { error } = await db
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) {
      throw error;
    }

    res.json({
      mensaje: "Servidor TdeA GO funcionando correctamente.",
      base_datos: "Supabase / PostgreSQL conectada",
    });
  } catch (error) {
    console.error("Error al comprobar Supabase:", error);

    res.status(500).json({
      mensaje: "El servidor funciona, pero no fue posible consultar Supabase.",
    });
  }
});

// ---------------------------------------------------------
// REGISTRO DE USUARIOS
// ---------------------------------------------------------

app.post("/api/usuarios", async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      correo,
      telefono,
      contrasena,
      rol,
    } = req.body;

    if (
      !nombre ||
      !apellido ||
      !correo ||
      !telefono ||
      !contrasena ||
      !rol
    ) {
      return res.status(400).json({
        mensaje: "Todos los campos son obligatorios.",
      });
    }

    if (rol !== "conductor" && rol !== "pasajero") {
      return res.status(400).json({
        mensaje: "El rol seleccionado no es válido.",
      });
    }

    if (contrasena.length < 6) {
      return res.status(400).json({
        mensaje: "La contraseña debe tener mínimo 6 caracteres.",
      });
    }

    const correoLimpio = correo.trim().toLowerCase();

    // Verificar si ya existe un perfil con ese correo
    const { data: perfilExistente, error: errorPerfil } = await db
      .from("profiles")
      .select("id")
      .eq("correo", correoLimpio)
      .maybeSingle();

    if (errorPerfil) {
      throw errorPerfil;
    }

    if (perfilExistente) {
      return res.status(409).json({
        mensaje: "Ya existe una cuenta registrada con este correo.",
      });
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: correoLimpio,
        password: contrasena,
      });

    if (authError) {
      console.error("Error de Supabase Auth:", authError);

      return res.status(400).json({
        mensaje:
          authError.message ||
          "No fue posible crear la cuenta.",
      });
    }

    if (!authData.user) {
      return res.status(500).json({
        mensaje: "Supabase no devolvió el usuario creado.",
      });
    }

    // Crear perfil asociado al usuario de Auth
    const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`;

    const { data: perfil, error: errorCrearPerfil } = await db
      .from("profiles")
      .insert({
        id: authData.user.id,
        nombre_completo: nombreCompleto,
        correo: correoLimpio,
        telefono: telefono.trim(),
        rol,
        verificado: false,
      })
      .select()
      .single();

    if (errorCrearPerfil) {
      console.error("Error al crear perfil:", errorCrearPerfil);

      return res.status(500).json({
        mensaje:
          "La cuenta fue creada, pero no fue posible crear el perfil.",
      });
    }

    res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      usuario: perfil,
    });
  } catch (error) {
    console.error("Error al registrar usuario:", error);

    res.status(500).json({
      mensaje: "No fue posible registrar el usuario.",
    });
  }
});

// ---------------------------------------------------------
// INICIO DE SESIÓN
// ---------------------------------------------------------

app.post("/api/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        mensaje: "Ingresa tu correo y contraseña.",
      });
    }

    const correoLimpio = correo.trim().toLowerCase();

    // Autenticar mediante Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: correoLimpio,
        password: contrasena,
      });

    if (authError || !authData.user) {
      return res.status(401).json({
        mensaje: "El correo o la contraseña son incorrectos.",
      });
    }

    // Obtener perfil
    const perfil = await obtenerPerfilPorId(authData.user.id);

    if (!perfil) {
      return res.status(404).json({
        mensaje: "La cuenta existe, pero no tiene un perfil registrado.",
      });
    }

    res.json({
      mensaje: "Inicio de sesión exitoso.",
      usuario: perfil,
      token: authData.session?.access_token || null,
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);

    res.status(500).json({
      mensaje: "No fue posible iniciar sesión.",
    });
  }
});

// ---------------------------------------------------------
// CAMBIAR ROL DEL USUARIO
// ---------------------------------------------------------

app.put("/api/usuarios/:id/rol", async (req, res) => {
  try {
    const id = req.params.id;
    const { rol } = req.body;

    if (rol !== "conductor" && rol !== "pasajero") {
      return res.status(400).json({
        mensaje: "El rol seleccionado no es válido.",
      });
    }

    const usuario = await obtenerPerfilPorId(id);

    if (!usuario) {
      return res.status(404).json({
        mensaje: "El usuario no existe.",
      });
    }

    const { data, error } = await db
      .from("profiles")
      .update({ rol })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      mensaje: "Rol actualizado correctamente.",
      usuario: data,
    });
  } catch (error) {
    console.error("Error al cambiar el rol:", error);

    res.status(500).json({
      mensaje: "No fue posible cambiar el rol.",
    });
  }
});

// ---------------------------------------------------------
// CONSULTAR USUARIOS
// ---------------------------------------------------------

app.get("/api/usuarios", async (req, res) => {
  try {
    const { data, error } = await db
      .from("profiles")
      .select(`
        id,
        nombre_completo,
        correo,
        telefono,
        rol,
        verificado,
        creado_en
      `)
      .order("creado_en", { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    console.error("Error al consultar usuarios:", error);

    res.status(500).json({
      mensaje: "No fue posible consultar los usuarios.",
    });
  }
});

// ---------------------------------------------------------
// CONSULTAR RUTAS
// ---------------------------------------------------------

app.get("/api/rutas", async (req, res) => {
  try {
    const {
      origen,
      destino,
      fecha,
    } = req.query;

    let consulta = db
      .from("rutas")
      .select(`
        id,
        origen,
        destino,
        lat_origen,
        lng_origen,
        lat_destino,
        lng_destino,
        fecha_hora_salida,
        cupos_totales,
        cupos_disponibles,
        tarifa_contribucion,
        estado,
        conductor_id,
        profiles:conductor_id (
          id,
          nombre_completo,
          telefono,
          verificado
        )
      `)
      .eq("estado", "programado")
      .gt("cupos_disponibles", 0)
      .order("fecha_hora_salida", { ascending: true });

    if (origen) {
      consulta = consulta.ilike("origen", `%${origen}%`);
    }

    if (destino) {
      consulta = consulta.ilike("destino", `%${destino}%`);
    }

    if (fecha) {
      const inicio = `${fecha}T00:00:00`;
      const fin = `${fecha}T23:59:59`;

      consulta = consulta
        .gte("fecha_hora_salida", inicio)
        .lte("fecha_hora_salida", fin);
    }

    const { data, error } = await consulta;

    if (error) {
      throw error;
    }

    const rutas = (data || []).map((ruta) => {
      const conductor = Array.isArray(ruta.profiles)
        ? ruta.profiles[0]
        : ruta.profiles;

      const fechaHora = ruta.fecha_hora_salida
        ? new Date(ruta.fecha_hora_salida)
        : null;

return {
  id: ruta.id,
  origen: ruta.origen,
  destino: ruta.destino,

  lat_origen: ruta.lat_origen,
  lng_origen: ruta.lng_origen,
  lat_destino: ruta.lat_destino,
  lng_destino: ruta.lng_destino,

  fecha: fechaHora
    ? fechaHora.toISOString().slice(0, 10)
    : "",

        hora: fechaHora
          ? fechaHora.toTimeString().slice(0, 5)
          : "",

        fecha_hora_salida: ruta.fecha_hora_salida,

        cupos_totales: ruta.cupos_totales,
        cupos_disponibles: ruta.cupos_disponibles,

        tarifa_contribucion: ruta.tarifa_contribucion,

        estado: ruta.estado,

        conductor_id: ruta.conductor_id,

        conductor_nombre:
          conductor?.nombre_completo || "Conductor",

        conductor_telefono:
          conductor?.telefono || "",

        conductor_verificado:
          conductor?.verificado || false,
      };
    });

    res.json(rutas);
  } catch (error) {
    console.error("Error al consultar rutas:", error);

    res.status(500).json({
      mensaje: "No fue posible consultar las rutas.",
    });
  }
});

// ---------------------------------------------------------
// PUBLICAR UNA RUTA
// ---------------------------------------------------------

app.post("/api/rutas", async (req, res) => {
  try {
    const {
      conductor_id,
      id_conductor,
      origen,
      destino,
      fecha_hora_salida,
      fecha,
      hora,
      cupos_totales,
      tarifa_contribucion,
    } = req.body;

    const idConductor = conductor_id || id_conductor;

    if (
      !idConductor ||
      !origen ||
      !destino ||
      !cupos_totales
    ) {
      return res.status(400).json({
        mensaje: "Faltan campos obligatorios para publicar la ruta.",
      });
    }

    const cantidadCupos = Number(cupos_totales);

    if (!Number.isInteger(cantidadCupos) || cantidadCupos <= 0) {
      return res.status(400).json({
        mensaje: "La cantidad de cupos debe ser un número mayor que cero.",
      });
    }

    // Verificar que el usuario exista y sea conductor
    const conductor = await obtenerPerfilPorId(idConductor);

    if (!conductor) {
      return res.status(404).json({
        mensaje: "El conductor no existe.",
      });
    }

    if (conductor.rol !== "conductor") {
      return res.status(403).json({
        mensaje:
          "Solo un usuario con rol de conductor puede publicar rutas.",
      });
    }

    // Admitir tanto fecha_hora_salida como fecha + hora
    let fechaHoraSalida = fecha_hora_salida;

    if (!fechaHoraSalida && fecha && hora) {
      fechaHoraSalida = `${fecha}T${hora}:00`;
    }

    if (!fechaHoraSalida) {
      return res.status(400).json({
        mensaje: "La fecha y hora de salida son obligatorias.",
      });
    }

    const { data, error } = await db
      .from("rutas")
      .insert({
        conductor_id: idConductor,
        origen: origen.trim(),
        destino: destino.trim(),
        fecha_hora_salida: fechaHoraSalida,
        cupos_totales: cantidadCupos,
        cupos_disponibles: cantidadCupos,
        tarifa_contribucion:
          tarifa_contribucion !== undefined
            ? Number(tarifa_contribucion)
            : 0,
        estado: "programado",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      mensaje: "Ruta publicada correctamente.",
      ruta: data,
    });
  } catch (error) {
    console.error("Error al publicar ruta:", error);

    res.status(500).json({
      mensaje: "No fue posible publicar la ruta.",
    });
  }
});

// ---------------------------------------------------------
// SOLICITAR CUPO
// ---------------------------------------------------------

app.post("/api/solicitudes", async (req, res) => {
  try {
    const {
      viaje_id,
      id_ruta,
      pasajero_id,
      id_pasajero,
      punto_encuentro,
    } = req.body;

    const rutaId = viaje_id || id_ruta;
    const pasajeroId = pasajero_id || id_pasajero;

    if (!rutaId || !pasajeroId) {
      return res.status(400).json({
        mensaje: "La ruta y el pasajero son obligatorios.",
      });
    }

    // Verificar pasajero
    const pasajero = await obtenerPerfilPorId(pasajeroId);

    if (!pasajero) {
      return res.status(404).json({
        mensaje: "El pasajero no existe.",
      });
    }

    if (pasajero.rol !== "pasajero") {
      return res.status(403).json({
        mensaje:
          "Solo un usuario con rol de pasajero puede solicitar un cupo.",
      });
    }

    // Consultar ruta
    const { data: ruta, error: errorRuta } = await db
      .from("rutas")
      .select(`
        id,
        cupos_disponibles,
        estado
      `)
      .eq("id", rutaId)
      .maybeSingle();

    if (errorRuta) {
      throw errorRuta;
    }

    if (!ruta) {
      return res.status(404).json({
        mensaje: "La ruta no existe.",
      });
    }

    if (ruta.estado !== "programado") {
      return res.status(400).json({
        mensaje: "La ruta no está disponible para solicitudes.",
      });
    }

    if (Number(ruta.cupos_disponibles) <= 0) {
      return res.status(400).json({
        mensaje: "La ruta ya no tiene cupos disponibles.",
      });
    }

    // Verificar solicitud existente
    const { data: solicitudExistente, error: errorExistente } =
      await db
        .from("solicitudes_viaje")
        .select("id, estado")
        .eq("viaje_id", rutaId)
        .eq("pasajero_id", pasajeroId)
        .maybeSingle();

    if (errorExistente) {
      throw errorExistente;
    }

    if (solicitudExistente) {
      return res.status(409).json({
        mensaje: "Ya tienes una solicitud para esta ruta.",
      });
    }

    // Crear solicitud
    const { data: solicitud, error: errorSolicitud } =
      await db
        .from("solicitudes_viaje")
        .insert({
          viaje_id: rutaId,
          pasajero_id: pasajeroId,
          punto_encuentro: punto_encuentro || null,
          estado: "pendiente",
        })
        .select()
        .single();

    if (errorSolicitud) {
      throw errorSolicitud;
    }

    // Actualizar cupos disponibles
    const nuevosCupos = Number(ruta.cupos_disponibles) - 1;

    const { error: errorCupos } = await db
      .from("rutas")
      .update({
        cupos_disponibles: nuevosCupos,
      })
      .eq("id", rutaId);

    if (errorCupos) {
      // Intentar eliminar la solicitud si la actualización del cupo falla
      await db
        .from("solicitudes_viaje")
        .delete()
        .eq("id", solicitud.id);

      throw errorCupos;
    }

    res.status(201).json({
      mensaje: "Solicitud de cupo enviada correctamente.",
      solicitud,
    });
  } catch (error) {
    console.error("Error al solicitar cupo:", error);

    res.status(500).json({
      mensaje: "No fue posible solicitar el cupo.",
    });
  }
});

// ---------------------------------------------------------
// CONSULTAR SOLICITUDES DE UN PASAJERO
// ---------------------------------------------------------

app.get("/api/solicitudes/pasajero/:id", async (req, res) => {
  try {
    const pasajeroId = req.params.id;

    const { data, error } = await db
      .from("solicitudes_viaje")
      .select(`
        id,
        viaje_id,
        pasajero_id,
        punto_encuentro,
        estado,
        fecha_solicitud,
        rutas:viaje_id (
          id,
          origen,
          destino,
          fecha_hora_salida,
          cupos_disponibles,
          tarifa_contribucion,
          conductor_id,
          profiles:conductor_id (
            nombre_completo,
            telefono
          )
        )
      `)
      .eq("pasajero_id", pasajeroId)
      .order("fecha_solicitud", { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    console.error("Error al consultar solicitudes:", error);

    res.status(500).json({
      mensaje: "No fue posible consultar las solicitudes.",
    });
  }
});

// ---------------------------------------------------------
// CONSULTAR RUTAS DE UN CONDUCTOR
// ---------------------------------------------------------

app.get("/api/rutas/conductor/:id", async (req, res) => {
  try {
    const conductorId = req.params.id;

    const { data, error } = await db
      .from("rutas")
      .select(`
        id,
        origen,
        destino,
        fecha_hora_salida,
        cupos_totales,
        cupos_disponibles,
        tarifa_contribucion,
        estado,
        creado_en
      `)
      .eq("conductor_id", conductorId)
      .order("fecha_hora_salida", { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    console.error("Error al consultar rutas del conductor:", error);

    res.status(500).json({
      mensaje: "No fue posible consultar las rutas del conductor.",
    });
  }
});

// ---------------------------------------------------------
// INICIAR SERVIDOR
// ---------------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `Servidor TdeA GO ejecutándose en http://localhost:${PORT}`
  );
});