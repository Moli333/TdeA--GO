import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import { supabase, supabaseAdmin } from "./config/supabase.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dbClient = supabaseAdmin || supabase;

// ------------------------------------------------------------------
// CONFIGURACIÓN PARA RECIBIR FOTOS
// ------------------------------------------------------------------

const almacenamientoFoto = multer.memoryStorage();

const cargarFoto = multer({
  storage: almacenamientoFoto,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, archivo, callback) => {
    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (tiposPermitidos.includes(archivo.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new Error(
          "Solo se permiten imágenes JPG, PNG o WEBP."
        )
      );
    }
  },
});

// ------------------------------------------------------------------
// FUNCIÓN AUXILIAR: obtener perfil por ID
// ------------------------------------------------------------------

async function obtenerPerfilPorId(id) {
  const { data, error } = await dbClient
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo perfil:", error);
    return null;
  }

  return data;
}

// ------------------------------------------------------------------
// FUNCIÓN AUXILIAR: eliminar foto anterior de Storage
// ------------------------------------------------------------------

async function eliminarFotoAnterior(urlFoto) {
  if (!urlFoto) {
    return;
  }

  try {
    const textoUrl = String(urlFoto);

    const indicador =
      "/storage/v1/object/public/fotos-perfil/";

    const posicion = textoUrl.indexOf(indicador);

    if (posicion === -1) {
      return;
    }

    const rutaArchivo = textoUrl.substring(
      posicion + indicador.length
    );

    if (!rutaArchivo) {
      return;
    }

    const { error } =
      await supabaseAdmin.storage
        .from("fotos-perfil")
        .remove([rutaArchivo]);

    if (error) {
      console.error(
        "No se pudo eliminar la foto anterior:",
        error
      );
    }
  } catch (error) {
    console.error(
      "Error procesando la foto anterior:",
      error
    );
  }
}

// ------------------------------------------------------------------
// 1. SERVIDOR BASE
// ------------------------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    mensaje: "Servidor TdeA GO funcionando correctamente.",
  });
});

// ------------------------------------------------------------------
// 2. REGISTRO DE USUARIO
// POST /api/usuarios
// ------------------------------------------------------------------

app.post("/api/usuarios", async (req, res) => {
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
    !contrasena
  ) {
    return res.status(400).json({
      mensaje:
        "Completa todos los campos obligatorios para crear tu cuenta.",
    });
  }

  const correoNormalizado = correo.trim().toLowerCase();

  if (
    !correoNormalizado.endsWith("@correo.tdea.edu.co") &&
    !correoNormalizado.endsWith("@tdea.edu.co")
  ) {
    return res.status(400).json({
      mensaje:
        "Debes utilizar tu correo institucional del TdeA (@correo.tdea.edu.co o @tdea.edu.co).",
    });
  }

  try {
    const nombreCompleto =
      `${nombre.trim()} ${apellido.trim()}`;

    // El perfil comienza como pasajero hasta que se registre
    // un vehículo. Se conserva la elección original.
    const rolSolicitado =
      rol === "conductor" ? "conductor" : "pasajero";

    const rolUsuario = "pasajero";

    // Registrar usuario en Supabase Auth.
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: correoNormalizado,
        password: contrasena,
        options: {
          data: {
            nombre_completo: nombreCompleto,
            telefono: telefono.trim(),
            rol: rolUsuario,
            rol_solicitado: rolSolicitado,
          },
        },
      });

    if (authError) {
      return res.status(400).json({
        mensaje:
          authError.message ||
          "Error al crear la cuenta en Supabase.",
      });
    }

    const userId = authData.user?.id;

    if (userId) {
      const { error: perfilError } =
        await dbClient.from("profiles").upsert(
          [
            {
              id: userId,
              nombre_completo: nombreCompleto,
              correo: correoNormalizado,
              telefono: telefono.trim(),
              rol: rolUsuario,
              verificado: false,
              foto_url: null,
              creado_en: new Date().toISOString(),
            },
          ],
          { onConflict: "id" }
        );

      if (perfilError) {
        console.error(
          "Error guardando perfil:",
          perfilError
        );
      }
    }

    return res.status(201).json({
      mensaje:
        "Cuenta creada correctamente. Te hemos enviado un correo de confirmación a tu bandeja institucional para que actives tu cuenta.",
      usuario: {
        id: userId,
        nombre_completo: nombreCompleto,
        correo: correoNormalizado,
        rol: rolUsuario,
        rol_solicitado: rolSolicitado,
        requiere_vehiculo:
          rolSolicitado === "conductor",
      },
    });
  } catch (error) {
    console.error("Error en /api/usuarios:", error);

    return res.status(500).json({
      mensaje:
        "Error interno del servidor al procesar el registro.",
    });
  }
});

// ------------------------------------------------------------------
// 3. INICIO DE SESIÓN
// POST /api/login
// ------------------------------------------------------------------

app.post("/api/login", async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({
      mensaje:
        "Completa el correo electrónico y la contraseña.",
    });
  }

  try {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: correo.trim(),
        password: contrasena,
      });
    if (authError) {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos.",
      });
    }

    const user = authData.user;

    if (!user) {
      return res.status(401).json({
        mensaje: "No se pudo validar el usuario.",
      });
    }

    let { data: profile, error: errorPerfil } = await dbClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (errorPerfil) {
      console.error("Error consultando perfil:", errorPerfil);
      return res.status(500).json({
        mensaje: "No fue posible consultar la información del perfil.",
      });
    }

    // Si no coincide el ID, buscar el perfil existente por correo.
    if (!profile && user.email) {
      const { data: perfilPorCorreo, error: errorCorreo } = await dbClient
        .from("profiles")
        .select("*")
        .ilike("correo", user.email)
        .maybeSingle();

      if (errorCorreo) {
        console.error("Error buscando perfil por correo:", errorCorreo);
        return res.status(500).json({
          mensaje: "No fue posible consultar la información del perfil.",
        });
      }

      profile = perfilPorCorreo;
    }

    if (!profile) {
      const meta = user.user_metadata || {};

      const nuevoPerfil = {
        id: user.id,
        nombre_completo: meta.nombre_completo || "Usuario TdeA",
        correo: user.email,
        telefono: meta.telefono || "",
        rol: "pasajero",
        verificado: false,
        foto_url: null,
        creado_en: new Date().toISOString(),
      };

      const {
        data: perfilCreado,
        error: insertError,
      } = await dbClient
        .from("profiles")
        .insert([nuevoPerfil])
        .select()
        .single();

      if (insertError) {
        console.error(
          "Error auto-creando perfil:",
          insertError
        );

        return res.status(500).json({
          mensaje:
            "Error al sincronizar la información del perfil.",
        });
      }

      profile = perfilCreado;
    }

    const meta = user.user_metadata || {};

    const rolSolicitado =
      meta.rol_solicitado === "conductor"
        ? "conductor"
        : profile.rol;

    const {
      data: vehiculo,
      error: errorVehiculo,
    } = await dbClient
      .from("vehiculos")
      .select(
        "id, usuario_id, tipo, marca_modelo, placa, color, capacidad_maxima"
      )
      .eq("usuario_id", profile.id)
      .maybeSingle();

    if (errorVehiculo) {
      console.error(
        "Error comprobando vehículo al iniciar sesión:",
        errorVehiculo
      );

      return res.status(500).json({
        mensaje:
          "No fue posible comprobar si tienes un vehículo registrado.",
      });
    }

    if (
      rolSolicitado === "conductor" &&
      vehiculo &&
      profile.rol !== "conductor"
    ) {
      const {
        data: perfilActualizado,
        error: errorActualizacion,
      } = await dbClient
        .from("profiles")
        .update({ rol: "conductor" })
        .eq("id", profile.id)
        .select()
        .single();

      if (errorActualizacion) {
        console.error(
          "Error activando conductor con vehículo existente:",
          errorActualizacion
        );

        return res.status(500).json({
          mensaje:
            "El vehículo existe, pero no fue posible activar el rol de conductor.",
        });
      }

      profile = perfilActualizado;
    }

    const requiereVehiculo =
      (
        rolSolicitado === "conductor" ||
        profile.rol === "conductor"
      ) && !vehiculo;



    return res.status(200).json({
      mensaje: "Inicio de sesión exitoso.",
      token: authData.session?.access_token,
      usuario: {
        ...profile,
        rol_solicitado: rolSolicitado,
        requiere_vehiculo: requiereVehiculo,
        vehiculo: vehiculo ?? null,
      },
    });

  } catch (error) {
    console.error("Error en /api/login:", error);

    return res.status(500).json({
      mensaje:
        "Error interno del servidor al iniciar sesión.",
    });
  }
});

// ------------------------------------------------------------------
// 4. LISTAR USUARIOS
// GET /api/usuarios
// ------------------------------------------------------------------

app.get("/api/usuarios", async (req, res) => {
  try {
    const { data, error } = await dbClient
      .from("profiles")
      .select("*")
      .order("creado_en", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    res.status(500).json({
      mensaje: "No fue posible consultar los usuarios.",
    });
  }
});

// ------------------------------------------------------------------
// 5. CAMBIAR ROL
// PUT /api/usuarios/:id/rol
// ------------------------------------------------------------------

app.put("/api/usuarios/:id/rol", async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    if (!["conductor", "pasajero"].includes(rol)) {
      return res.status(400).json({
        mensaje: "El rol indicado no es válido.",
      });
    }

    if (rol === "conductor") {
      const {
        data: vehiculo,
        error: errorVehiculo,
      } = await dbClient
        .from("vehiculos")
        .select("id")
        .eq("usuario_id", id)
        .limit(1)
        .maybeSingle();

      if (errorVehiculo) {
        console.error(
          "Error verificando el vehículo del usuario:",
          errorVehiculo
        );

        return res.status(500).json({
          mensaje:
            "No fue posible verificar el vehículo registrado. Inténtalo nuevamente.",
        });
      }

      if (!vehiculo) {
        return res.status(400).json({
          mensaje:
            "Para ser conductor, primero debes registrar tu vehículo.",
          requiereVehiculo: true,
        });
      }
    }

    const { data, error } = await dbClient
      .from("profiles")
      .update({ rol })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      mensaje: "Rol actualizado correctamente.",
      usuario: data,
    });
  } catch (error) {
    console.error("Error actualizando rol:", error);

    res.status(500).json({
      mensaje: "No fue posible actualizar el rol.",
    });
  }
});
// ------------------------------------------------------------------
// 6. SUBIR / CAMBIAR FOTO DE PERFIL
// PUT /api/usuarios/:id/foto
// ------------------------------------------------------------------

app.put(
  "/api/usuarios/:id/foto",
  cargarFoto.single("foto"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({
          mensaje: "No se recibió ninguna imagen.",
        });
      }

      const usuario = await obtenerPerfilPorId(id);

      if (!usuario) {
        return res.status(404).json({
          mensaje: "El usuario no existe.",
        });
      }

      const extensionPorTipo = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };

      const extension =
        extensionPorTipo[req.file.mimetype];

      if (!extension) {
        return res.status(400).json({
          mensaje: "El formato de imagen no es válido.",
        });
      }

      const nombreArchivo =
        `${id}-${Date.now()}.${extension}`;

      const rutaArchivo =
        `${id}/${nombreArchivo}`;

      const { error: subidaError } =
        await supabaseAdmin.storage
          .from("fotos-perfil")
          .upload(rutaArchivo, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false,
          });

      if (subidaError) {
        console.error("Error subiendo foto:", subidaError);

        return res.status(500).json({
          mensaje:
            "No fue posible guardar la foto en Supabase Storage.",
        });
      }

      const { data: urlData } =
        supabaseAdmin.storage
          .from("fotos-perfil")
          .getPublicUrl(rutaArchivo);

      const fotoUrl = urlData.publicUrl;

      const {
        data,
        error: actualizacionError,
      } = await dbClient
        .from("profiles")
        .update({ foto_url: fotoUrl })
        .eq("id", id)
        .select()
        .single();

      if (actualizacionError) {
        console.error(
          "Error guardando URL de foto:",
          actualizacionError
        );

        await supabaseAdmin.storage
          .from("fotos-perfil")
          .remove([rutaArchivo]);

        return res.status(500).json({
          mensaje:
            "La foto se guardó, pero no fue posible actualizar el perfil.",
        });
      }

      if (usuario.foto_url) {
        await eliminarFotoAnterior(usuario.foto_url);
      }

      return res.status(200).json({
        mensaje: "Foto de perfil actualizada correctamente.",
        usuario: {
          ...data,
          foto_url: fotoUrl,
        },
      });
    } catch (error) {
      console.error(
        "Error en /api/usuarios/:id/foto:",
        error
      );

      return res.status(500).json({
        mensaje:
          "No fue posible actualizar la foto de perfil.",
      });
    }
  }
);

// ------------------------------------------------------------------
// 7. ELIMINAR FOTO DE PERFIL
// DELETE /api/usuarios/:id/foto
// ------------------------------------------------------------------

app.delete(
  "/api/usuarios/:id/foto",
  async (req, res) => {
    try {
      const { id } = req.params;

      const usuario =
        await obtenerPerfilPorId(id);

      if (!usuario) {
        return res.status(404).json({
          mensaje: "El usuario no existe.",
        });
      }

      if (usuario.foto_url) {
        await eliminarFotoAnterior(usuario.foto_url);
      }

      const { data, error } = await dbClient
        .from("profiles")
        .update({ foto_url: null })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        mensaje: "Foto de perfil eliminada correctamente.",
        usuario: data,
      });
    } catch (error) {
      console.error("Error eliminando foto:", error);

      return res.status(500).json({
        mensaje:
          "No fue posible eliminar la foto de perfil.",
      });
    }
  }
);
// ------------------------------------------------------------------
// 8. CONSULTAR RUTAS DISPONIBLES
// GET /api/rutas
// ------------------------------------------------------------------

app.get("/api/rutas", async (req, res) => {
  try {
    const { data, error } = await dbClient
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
        conductor:profiles!rutas_conductor_id_fkey (
        tarifa_contribucion,
        estado,
        conductor_id,
        vehiculo_id,
        creado_en,
        
          id,
          nombre_completo,
          correo,
          telefono,
          rol,
          verificado,
          foto_url
        ),
        vehiculo:vehiculos!rutas_vehiculo_id_fkey (
          id,
          tipo,
          marca_modelo,
          placa,
          color,
          capacidad_maxima
        )
      `)
      .order("fecha_hora_salida", {
        ascending: true,
      });

    if (error) {
      console.error("Error obteniendo rutas:", error);

      return res.status(500).json({
        mensaje: "No fue posible consultar las rutas.",
        detalle: error.message,
      });
    }

    const rutas = (data || []).map((ruta) => ({
      ...ruta,
      fecha: ruta.fecha_hora_salida
        ? String(ruta.fecha_hora_salida).slice(0, 10)
        : "",
      hora: ruta.fecha_hora_salida
        ? String(ruta.fecha_hora_salida).slice(11, 16)
        : "",
      conductor: ruta.conductor || null,
      vehiculo: ruta.vehiculo || null,
    }));

    return res.json(rutas);
  } catch (error) {
    console.error("Error obteniendo rutas:", error);

    return res.status(500).json({
      mensaje: "No fue posible consultar las rutas.",
    });
  }
});

// ------------------------------------------------------------------
// 9. PUBLICAR RUTA
// POST /api/rutas
// ------------------------------------------------------------------

app.post("/api/rutas", async (req, res) => {
  try {
    console.log("BODY RECIBIDO EN /api/rutas:", req.body);

    const {
      conductor_id,
      id_conductor,
      user_id,
      origen,
      destino,
      lat_origen,
      lng_origen,
      lat_destino,
      lng_destino,
      fecha_hora_salida,
      fecha,
      hora,
      cupos_totales,
      cupos,
      tarifa_contribucion,
      tarifa,
    } = req.body;

    const idConductor =
      conductor_id || id_conductor || user_id;

    const totalCupos =
      cupos_totales || cupos || 4;

    const contribucion =
      tarifa_contribucion || tarifa || 0;

    if (!idConductor || !origen || !destino) {
      return res.status(400).json({
        mensaje:
          "Faltan campos obligatorios (conductor, origen o destino).",
      });
    }

    const {
      data: perfilConductor,
      error: errorPerfilConductor,
    } = await dbClient
      .from("profiles")
      .select("id, rol")
      .eq("id", idConductor)
      .maybeSingle();

    if (errorPerfilConductor) {
      throw errorPerfilConductor;
    }

    if (
      !perfilConductor ||
      perfilConductor.rol !== "conductor"
    ) {
      return res.status(403).json({
        mensaje:
          "Debes completar el registro del vehículo y activar el rol de conductor antes de publicar rutas.",
        requiereVehiculo: true,
      });
    }

    const {
      data: vehiculoConductor,
      error: errorVehiculoConductor,
    } = await dbClient
      .from("vehiculos")
      .select("id")
      .eq("usuario_id", idConductor)
      .limit(1)
      .maybeSingle();

    if (errorVehiculoConductor) {
      throw errorVehiculoConductor;
    }

    if (!vehiculoConductor) {
      return res.status(403).json({
        mensaje:
          "Registra tu vehículo antes de publicar una ruta.",
        requiereVehiculo: true,
      });
    }

    let fechaHoraSalida = fecha_hora_salida;

    if (!fechaHoraSalida && fecha && hora) {
      fechaHoraSalida = `${fecha}T${hora}:00`;
    } else if (!fechaHoraSalida) {
      fechaHoraSalida = new Date(
        Date.now() + 86400000
      ).toISOString();
    }

    const { data, error } = await dbClient
      .from("rutas")
      .insert({
        id: crypto.randomUUID(),
        conductor_id: idConductor,
        origen: String(origen).trim(),
        destino: String(destino).trim(),
        lat_origen:
          lat_origen !== undefined
            ? Number(lat_origen)
            : null,
        lng_origen:
          lng_origen !== undefined
            ? Number(lng_origen)
            : null,
        lat_destino:
          lat_destino !== undefined
            ? Number(lat_destino)
            : null,
        lng_destino:
          lng_destino !== undefined
            ? Number(lng_destino)
            : null,
        fecha_hora_salida: fechaHoraSalida,
        cupos_totales: Number(totalCupos),
        cupos_disponibles: Number(totalCupos),
        tarifa_contribucion: Number(contribucion),
        estado: "programado",
      })
      .select()
      .single();

    if (error) {
      console.error("Error publicando ruta:", error);

      return res.status(500).json({
        mensaje: "No fue posible publicar la ruta.",
        detalle: error.message,
      });
    }

    return res.status(201).json({
      mensaje: "Ruta publicada correctamente.",
      ruta: data,
    });
  } catch (error) {
    console.error(
      "Error detallado al publicar ruta:",
      error
    );

    return res.status(500).json({
      mensaje: "No fue posible publicar la ruta.",
      detalles: error.message,
    });
  }
});
// ------------------------------------------------------------------
// 10. RUTAS DE UN CONDUCTOR
// GET /api/rutas/conductor/:id
// ------------------------------------------------------------------

app.get("/api/rutas/conductor/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        mensaje: "El ID del conductor es obligatorio.",
      });
    }

    const { data, error } = await dbClient
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
        creado_en
      `)
      .eq("conductor_id", id)
      .order("fecha_hora_salida", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error consultando rutas del conductor:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al consultar las rutas en la base de datos.",
      });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    console.error(
      "Error en /api/rutas/conductor/:id:",
      error
    );

    return res.status(500).json({
      mensaje: "No fue posible consultar tus rutas.",
    });
  }
});

// ------------------------------------------------------------------
// 11. SOLICITAR CUPO
// POST /api/solicitudes
// ------------------------------------------------------------------

app.post("/api/solicitudes", async (req, res) => {
  try {
    const {
      viaje_id,
      ruta_id,
      pasajero_id,
      punto_encuentro,
    } = req.body;

    const idViaje = viaje_id || ruta_id;

    if (!idViaje || !pasajero_id) {
      return res.status(400).json({
        mensaje: "Faltan datos para solicitar el cupo.",
      });
    }

    const ruta = await dbClient
      .from("rutas")
      .select("id, cupos_disponibles, estado")
      .eq("id", idViaje)
      .maybeSingle();

    if (ruta.error) {
      throw ruta.error;
    }

    if (!ruta.data) {
      return res.status(404).json({
        mensaje: "La ruta no existe.",
      });
    }

    if (ruta.data.estado !== "programado") {
      return res.status(400).json({
        mensaje: "Esta ruta ya no está disponible.",
      });
    }

    if (Number(ruta.data.cupos_disponibles) <= 0) {
      return res.status(400).json({
        mensaje: "No hay cupos disponibles en esta ruta.",
      });
    }

    const existente = await dbClient
      .from("solicitudes_viaje")
      .select("id, estado")
      .eq("viaje_id", idViaje)
      .eq("pasajero_id", pasajero_id)
      .maybeSingle();

    if (existente.error) {
      throw existente.error;
    }

    if (existente.data) {
      return res.status(409).json({
        mensaje:
          "Ya tienes una solicitud para esta ruta.",
      });
    }

    const { data, error } = await dbClient
      .from("solicitudes_viaje")
      .insert({
        id: crypto.randomUUID(),
        viaje_id: idViaje,
        pasajero_id,
        punto_encuentro: punto_encuentro || null,
        estado: "pendiente",
        fecha_solicitud: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      mensaje: "Solicitud de cupo enviada correctamente.",
      solicitud: data,
    });
  } catch (error) {
    console.error("Error solicitando cupo:", error);

    res.status(500).json({
      mensaje: "No fue posible enviar la solicitud.",
    });
  }
});

// ------------------------------------------------------------------
// 12. SOLICITUDES DE UN PASAJERO
// GET /api/solicitudes/pasajero/:id
// ------------------------------------------------------------------

app.get(
  "/api/solicitudes/pasajero/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await dbClient
        .from("solicitudes_viaje")
        .select(`
          id,
          viaje_id,
          pasajero_id,
          punto_encuentro,
          estado,
          fecha_solicitud
        `)
        .eq("pasajero_id", id)
        .order("fecha_solicitud", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      res.json(data || []);
    } catch (error) {
      console.error(
        "Error obteniendo solicitudes:",
        error
      );

      res.status(500).json({
        mensaje: "No fue posible consultar tus solicitudes.",
      });
    }
  }
);

// ------------------------------------------------------------------
// MANEJO DE ERRORES DE MULTER
// ------------------------------------------------------------------

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        mensaje: "La imagen no puede superar los 5 MB.",
      });
    }

    return res.status(400).json({
      mensaje: "No fue posible procesar la imagen.",
    });
  }

  if (
    error &&
    error.message ===
    "Solo se permiten imágenes JPG, PNG o WEBP."
  ) {
    return res.status(400).json({
      mensaje: error.message,
    });
  }

  next(error);
});


// ------------------------------------------------------------------
// 13. REGISTRAR O ACTUALIZAR VEHÍCULO
// POST /api/vehiculos
// ------------------------------------------------------------------

app.post("/api/vehiculos", async (req, res) => {
  try {
    const {
      conductor_id,
      tipo,
      marca_modelo,
      placa,
      color,
      capacidad_maxima,
    } = req.body;

    if (
      !conductor_id ||
      !marca_modelo?.trim() ||
      !placa?.trim() ||
      !Number.isInteger(Number(capacidad_maxima)) ||
      Number(capacidad_maxima) < 1
    ) {
      return res.status(400).json({
        mensaje:
          "Completa el conductor, la marca/modelo, la placa y una capacidad máxima válida.",
      });
    }

    const { data, error } = await dbClient
      .from("vehiculos")
      .upsert(
        [
          {
            usuario_id: conductor_id,
            tipo: tipo ? tipo.trim() : "Automóvil",
            marca_modelo: marca_modelo.trim(),
            placa: placa.trim().toUpperCase(),
            color: color ? String(color).trim() : null,
            capacidad_maxima: Number(capacidad_maxima),
          },
        ],
        { onConflict: "usuario_id" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      mensaje: "Vehículo registrado correctamente.",
      vehiculo: data,
    });
  } catch (error) {
    console.error("Error guardando vehículo:", error);

    return res.status(500).json({
      mensaje: "No fue posible registrar el vehículo.",
      detalles: error.message,
    });
  }
});

// ------------------------------------------------------------------
// CONSULTAR VEHÍCULO DE UN USUARIO
// GET /api/vehiculos/:usuarioId
// ------------------------------------------------------------------

app.get("/api/vehiculos/:usuarioId", async (req, res) => {
  try {
    const { usuarioId } = req.params;

    if (!usuarioId) {
      return res.status(400).json({
        mensaje: "El ID del usuario es obligatorio.",
      });
    }

    const { data, error } = await dbClient
      .from("vehiculos")
      .select(
        "id, usuario_id, tipo, marca_modelo, placa, color, capacidad_maxima"
      )
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (error) {
      console.error("Error consultando vehículo:", error);

      return res.status(500).json({
        mensaje: "No fue posible consultar el vehículo registrado.",
      });
    }

    return res.status(200).json({
      vehiculo: data ?? null,
    });
  } catch (error) {
    console.error("Error inesperado consultando vehículo:", error);

    return res.status(500).json({
      mensaje: "Ocurrió un error al consultar el vehículo.",
    });
  }
});

// ------------------------------------------------------------------
// 14. INICIO DEL SERVIDOR
// ------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `Servidor TdeA GO corriendo en http://localhost:${PORT}`
  );
});