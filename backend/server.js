import express from "express";
import cors from "cors";
import multer from "multer";
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
// 1. SERVIDOR
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

    const rolUsuario =
      rol === "conductor" ? "conductor" : "pasajero";

    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: correoNormalizado,
        password: contrasena,
        options: {
          data: {
            nombre_completo: nombreCompleto,
            telefono: telefono.trim(),
            rol: rolUsuario,
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
      mensaje: "Cuenta creada correctamente.",
      usuario: {
        id: userId,
        nombre_completo: nombreCompleto,
        correo: correoNormalizado,
        rol: rolUsuario,
        foto_url: null,
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

    let { data: profile } = await dbClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      const meta = user.user_metadata || {};

      const nuevoPerfil = {
        id: user.id,
        nombre_completo:
          meta.nombre_completo || "Usuario TdeA",
        correo: user.email,
        telefono: meta.telefono || "",
        rol: meta.rol || "pasajero",
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

    return res.status(200).json({
      mensaje: "Inicio de sesión exitoso.",
      token: authData.session?.access_token,
      usuario: profile,
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

    const { data, error } = await dbClient
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
          mensaje:
            "El formato de imagen no es válido.",
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
        console.error(
          "Error subiendo foto:",
          subidaError
        );

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

      const { data, error: actualizacionError } =
        await dbClient
          .from("profiles")
          .update({
            foto_url: fotoUrl,
          })
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

      // Eliminamos la foto anterior después de guardar correctamente
      if (usuario.foto_url) {
        await eliminarFotoAnterior(
          usuario.foto_url
        );
      }
      console.log("URL pública de la foto:", fotoUrl);
      console.log("Usuario actualizado:", data);
      return res.status(200).json({
        mensaje:
           "Foto de perfil actualizada correctamente.",
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
        await eliminarFotoAnterior(
          usuario.foto_url
        );
      }

      const { data, error } =
        await dbClient
          .from("profiles")
          .update({
            foto_url: null,
          })
          .eq("id", id)
          .select()
          .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        mensaje:
          "Foto de perfil eliminada correctamente.",
        usuario: data,
      });
    } catch (error) {
      console.error(
        "Error eliminando foto:",
        error
      );

      return res.status(500).json({
        mensaje:
          "No fue posible eliminar la foto de perfil.",
      });
    }
  }
);

// ------------------------------------------------------------------
// 8. CONSULTAR RUTAS
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
        tarifa_contribucion,
        estado,
        conductor_id,
        creado_en,
        profiles:conductor_id (
          id,
          nombre_completo,
          telefono,
          verificado,
          foto_url
        )
      `)
      .order("fecha_hora_salida", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    const rutas = (data || []).map((ruta) => ({
      id: ruta.id,
      origen: ruta.origen,
      destino: ruta.destino,

      lat_origen: ruta.lat_origen,
      lng_origen: ruta.lng_origen,
      lat_destino: ruta.lat_destino,
      lng_destino: ruta.lng_destino,

      fecha_hora_salida:
        ruta.fecha_hora_salida,

      fecha: ruta.fecha_hora_salida
        ? String(
            ruta.fecha_hora_salida
          ).slice(0, 10)
        : "",

      hora: ruta.fecha_hora_salida
        ? String(
            ruta.fecha_hora_salida
          ).slice(11, 16)
        : "",

      cupos_totales: ruta.cupos_totales,
      cupos_disponibles:
        ruta.cupos_disponibles,

      tarifa_contribucion:
        ruta.tarifa_contribucion,

      estado: ruta.estado,

      conductor_id: ruta.conductor_id,

      conductor: ruta.profiles || null,

      creado_en: ruta.creado_en,
    }));

    res.json(rutas);
  } catch (error) {
    console.error("Error obteniendo rutas:", error);

    res.status(500).json({
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
    const {
      conductor_id,
      id_conductor,
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
      tarifa_contribucion,
    } = req.body;

    const idConductor =
      conductor_id || id_conductor;

    if (
      !idConductor ||
      !origen ||
      !destino ||
      !cupos_totales
    ) {
      return res.status(400).json({
        mensaje:
          "Faltan campos obligatorios para publicar la ruta.",
      });
    }

    const cantidadCupos =
      Number(cupos_totales);

    if (
      !Number.isInteger(cantidadCupos) ||
      cantidadCupos <= 0
    ) {
      return res.status(400).json({
        mensaje:
          "La cantidad de cupos debe ser un número mayor que cero.",
      });
    }

    const conductor =
      await obtenerPerfilPorId(idConductor);

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

    let fechaHoraSalida =
      fecha_hora_salida;

    if (!fechaHoraSalida && fecha && hora) {
      fechaHoraSalida =
        `${fecha}T${hora}:00`;
    }

    if (!fechaHoraSalida) {
      return res.status(400).json({
        mensaje:
          "La fecha y hora de salida son obligatorias.",
      });
    }

    const { data, error } =
      await dbClient
        .from("rutas")
        .insert({
          conductor_id: idConductor,

          origen: origen.trim(),
          destino: destino.trim(),

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

          fecha_hora_salida:
            fechaHoraSalida,

          cupos_totales:
            cantidadCupos,

          cupos_disponibles:
            cantidadCupos,

          tarifa_contribucion:
            tarifa_contribucion !==
            undefined
              ? Number(
                  tarifa_contribucion
                )
              : 0,

          estado: "programado",
        })
        .select()
        .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      mensaje:
        "Ruta publicada correctamente.",
      ruta: data,
    });
  } catch (error) {
    console.error(
      "Error al publicar ruta:",
      error
    );

    res.status(500).json({
      mensaje:
        "No fue posible publicar la ruta.",
    });
  }
});

// ------------------------------------------------------------------
// 10. RUTAS DE UN CONDUCTOR
// GET /api/rutas/conductor/:id
// ------------------------------------------------------------------

app.get(
  "/api/rutas/conductor/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } =
        await dbClient
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
        throw error;
      }

      res.json(data || []);
    } catch (error) {
      console.error(
        "Error obteniendo rutas del conductor:",
        error
      );

      res.status(500).json({
        mensaje:
          "No fue posible consultar tus rutas.",
      });
    }
  }
);

// ------------------------------------------------------------------
// 11. SOLICITAR CUPO
// POST /api/solicitudes
// ------------------------------------------------------------------

app.post(
  "/api/solicitudes",
  async (req, res) => {
    try {
      const {
        viaje_id,
        ruta_id,
        pasajero_id,
        punto_encuentro,
      } = req.body;

      const idViaje =
        viaje_id || ruta_id;

      if (!idViaje || !pasajero_id) {
        return res.status(400).json({
          mensaje:
            "Faltan datos para solicitar el cupo.",
        });
      }

      const ruta = await dbClient
        .from("rutas")
        .select(`
          id,
          cupos_disponibles,
          estado
        `)
        .eq("id", idViaje)
        .maybeSingle();

      if (ruta.error) {
        throw ruta.error;
      }

      if (!ruta.data) {
        return res.status(404).json({
          mensaje:
            "La ruta no existe.",
        });
      }

      if (
        ruta.data.estado !==
        "programado"
      ) {
        return res.status(400).json({
          mensaje:
            "Esta ruta ya no está disponible.",
        });
      }

      if (
        Number(
          ruta.data.cupos_disponibles
        ) <= 0
      ) {
        return res.status(400).json({
          mensaje:
            "No hay cupos disponibles en esta ruta.",
        });
      }

      const existente =
        await dbClient
          .from("solicitudes_viaje")
          .select("id, estado")
          .eq("viaje_id", idViaje)
          .eq(
            "pasajero_id",
            pasajero_id
          )
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

      const { data, error } =
        await dbClient
          .from("solicitudes_viaje")
          .insert({
            viaje_id: idViaje,
            pasajero_id,
            punto_encuentro:
              punto_encuentro ||
              null,
            estado: "pendiente",
            fecha_solicitud:
              new Date().toISOString(),
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      res.status(201).json({
        mensaje:
          "Solicitud de cupo enviada correctamente.",
        solicitud: data,
      });
    } catch (error) {
      console.error(
        "Error solicitando cupo:",
        error
      );

      res.status(500).json({
        mensaje:
          "No fue posible enviar la solicitud.",
      });
    }
  }
);

// ------------------------------------------------------------------
// 12. SOLICITUDES DE UN PASAJERO
// GET /api/solicitudes/pasajero/:id
// ------------------------------------------------------------------

app.get(
  "/api/solicitudes/pasajero/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } =
        await dbClient
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
              cupos_totales,
              cupos_disponibles,
              conductor_id,
              profiles:conductor_id (
                id,
                nombre_completo,
                telefono,
                verificado,
                foto_url
              )
            )
          `)
          .eq(
            "pasajero_id",
            id
          )
          .order(
            "fecha_solicitud",
            {
              ascending: false,
            }
          );

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
        mensaje:
          "No fue posible consultar tus solicitudes.",
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
        mensaje:
          "La imagen no puede superar los 5 MB.",
      });
    }

    return res.status(400).json({
      mensaje:
        "No fue posible procesar la imagen.",
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
// 13. INICIO DEL SERVIDOR
// ------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `Servidor TdeA GO corriendo en http://localhost:${PORT}`
  );
});