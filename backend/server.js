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
// SEGURIDAD DE ADMINISTRACIÓN
// ------------------------------------------------------------------

const ADMINISTRADORA_PRINCIPAL_ID =
  "2f1ea263-8be4-48be-99f7-b75e4408265f";

// Verificar que la solicitud venga de una cuenta autenticada.
async function verificarAutenticacion(req, res, next) {
  try {
    const encabezado = req.headers.authorization || "";
    const token = encabezado.startsWith("Bearer ")
      ? encabezado.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        mensaje: "Debes iniciar sesión para realizar esta operación.",
      });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        mensaje: "La sesión no es válida o ha expirado.",
      });
    }

    req.usuarioAutenticado = data.user;
    next();
  } catch (error) {
    console.error("Error verificando autenticación:", error);

    return res.status(401).json({
      mensaje: "No fue posible verificar tu sesión.",
    });
  }
}

// Comprobar que el usuario autenticado tenga rol administrador.
async function verificarAdministrador(req, res, next) {
  try {
    const { data: perfil, error } = await dbClient
      .from("profiles")
      .select("id, nombre_completo, correo, rol")
      .eq("id", req.usuarioAutenticado.id)
      .maybeSingle();

    if (error || !perfil || perfil.rol !== "administrador") {
      return res.status(403).json({
        mensaje: "No tienes permisos de administrador.",
      });
    }

    req.perfilAutenticado = perfil;
    next();
  } catch (error) {
    console.error("Error verificando administrador:", error);

    return res.status(500).json({
      mensaje: "No fue posible verificar tus permisos.",
    });
  }
}

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

app.get(
  "/api/usuarios",
  verificarAutenticacion,
  verificarAdministrador,
  async (req, res) => {
    try {
      const { data, error } = await dbClient
        .from("profiles")
        .select("*")
        .order("creado_en", {
          ascending: false,
        });

      if (error) throw error;

      return res.json(data || []);
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);

      return res.status(500).json({
        mensaje: "No fue posible consultar los usuarios.",
      });
    }
  }
);

// ------------------------------------------------------------------
// CONSULTAS GENERALES DEL PANEL DE ADMINISTRACIÓN
// ------------------------------------------------------------------

// Consultar todas las rutas
app.get(
  "/api/admin/rutas",
  verificarAutenticacion,
  verificarAdministrador,
  async (req, res) => {
    try {
      const { data, error } = await dbClient
        .from("rutas")
        .select("*")
        .order("fecha_hora_salida", { ascending: false });

      if (error) throw error;

      return res.json(data || []);
    } catch (error) {
      console.error("Error consultando rutas administrativas:", error);

      return res.status(500).json({
        mensaje: "No fue posible consultar las rutas.",
        detalle: error.message,
      });
    }
  }
);

// Consultar solicitudes de cupos y solicitudes de viajes nuevos
app.get(
  "/api/admin/solicitudes",
  verificarAutenticacion,
  verificarAdministrador,
  async (req, res) => {
    try {
      const { data: solicitudesCupos, error: errorCupos } =
        await dbClient
          .from("solicitudes_viaje")
          .select("*")
          .order("fecha_solicitud", { ascending: false });

      if (errorCupos) throw errorCupos;

      const { data: solicitudesNuevas, error: errorNuevas } =
        await dbClient
          .from("solicitudes_viajes_nuevos")
          .select("*")
          .order("creado_en", { ascending: false });

      if (errorNuevas) throw errorNuevas;

      return res.json({
        solicitudesCupos: solicitudesCupos || [],
        solicitudesNuevas: solicitudesNuevas || [],
      });
    } catch (error) {
      console.error("Error consultando solicitudes administrativas:", error);

      return res.status(500).json({
        mensaje: "No fue posible consultar las solicitudes.",
        detalle: error.message,
      });
    }
  }
);

// ------------------------------------------------------------------
// 5. CAMBIAR ROL
// PUT /api/usuarios/:id/rol
// ------------------------------------------------------------------


app.put(
  "/api/usuarios/:id/rol",
  verificarAutenticacion,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { rol } = req.body;
      const idAutenticado = req.usuarioAutenticado.id;

      // Este endpoint solamente permite los roles normales.
      if (!["conductor", "pasajero"].includes(rol)) {
        return res.status(403).json({
          mensaje:
            "No puedes modificar ni asignar privilegios administrativos desde esta opción.",
        });
      }

      // Consultar el perfil por el ID de Supabase Auth.
      let { data: perfil, error: errorPerfil } = await dbClient
        .from("profiles")
        .select("id, rol")
        .eq("id", idAutenticado)
        .maybeSingle();

      if (errorPerfil) {
        console.error("Error consultando perfil:", errorPerfil);

        return res.status(500).json({
          mensaje: "No fue posible verificar tu perfil.",
        });
      }

      // Si no coincide el ID, buscar el perfil por el correo
      // de la cuenta autenticada.
      if (!perfil && req.usuarioAutenticado.email) {
        const { data: perfilCorreo, error: errorCorreo } =
          await dbClient
            .from("profiles")
            .select("id, rol")
            .ilike("correo", req.usuarioAutenticado.email)
            .maybeSingle();

        if (errorCorreo) {
          console.error("Error buscando perfil por correo:", errorCorreo);

          return res.status(500).json({
            mensaje: "No fue posible verificar tu perfil.",
          });
        }

        perfil = perfilCorreo;
      }

      if (!perfil) {
        return res.status(404).json({
          mensaje: "No se encontró tu perfil de usuario.",
        });
      }

      // Ningún administrador puede quitarse o cambiar
      // sus privilegios desde el menú normal.
      if (perfil.rol === "administrador") {
        return res.status(403).json({
          mensaje:
            "Los administradores no pueden modificar sus privilegios desde esta opción.",
        });
      }

      // La administradora principal tiene protección adicional.
      if (idAutenticado === ADMINISTRADORA_PRINCIPAL_ID) {
        return res.status(403).json({
          mensaje: "El rol de la administradora principal está protegido.",
        });
      }

      // Para ser conductor debe existir un vehículo registrado.
      if (rol === "conductor") {
        const { data: vehiculo, error: errorVehiculo } =
          await dbClient
            .from("vehiculos")
            .select("id")
            .eq("usuario_id", idAutenticado)
            .maybeSingle();

        if (errorVehiculo) {
          console.error("Error verificando vehículo:", errorVehiculo);

          return res.status(500).json({
            mensaje: "No fue posible verificar tu vehículo.",
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

      // Actualizar el rol únicamente después de las validaciones.
      const { data, error } = await dbClient
        .from("profiles")
        .update({ rol })
        .eq("id", perfil.id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        mensaje: "Rol actualizado correctamente.",
        usuario: data,
      });
    } catch (error) {
      console.error("Error actualizando rol:", error);

      return res.status(500).json({
        mensaje: "No fue posible actualizar el rol.",
      });
    }
  }
);


/* =========================================================
   ADMINISTRACIÓN DE PRIVILEGIOS
   Exclusivo de la administradora principal
   ========================================================= */

app.put(
  "/api/admin/usuarios/:id/rol",
  verificarAutenticacion,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { accion } = req.body;

      const idAutenticado = req.usuarioAutenticado.id;

      // Solo la cuenta principal puede administrar privilegios.
      if (idAutenticado !== ADMINISTRADORA_PRINCIPAL_ID) {
        return res.status(403).json({
          mensaje:
            "No tienes autorización para administrar privilegios.",
        });
      }

      // Verificar que la cuenta principal conserve su rol.
      const { data: administradora, error: errorAdministradora } =
        await dbClient
          .from("profiles")
          .select("id, rol")
          .eq("id", idAutenticado)
          .maybeSingle();

      if (errorAdministradora) throw errorAdministradora;

      if (!administradora || administradora.rol !== "administrador") {
        return res.status(403).json({
          mensaje:
            "La cuenta principal no tiene los privilegios administrativos requeridos.",
        });
      }

      // No se permite modificar la cuenta principal.
      if (id === ADMINISTRADORA_PRINCIPAL_ID) {
        return res.status(403).json({
          mensaje:
            "No puedes modificar los privilegios de la administradora principal.",
        });
      }

      // Validar la acción solicitada.
      if (!["conceder", "retirar"].includes(accion)) {
        return res.status(400).json({
          mensaje:
            "Acción no válida. Utiliza conceder o retirar.",
        });
      }

      // Consultar la cuenta que se desea modificar.
      const { data: perfil, error: errorPerfil } = await dbClient
        .from("profiles")
        .select("id, nombre_completo, correo, rol")
        .eq("id", id)
        .maybeSingle();

      if (errorPerfil) throw errorPerfil;

      if (!perfil) {
        return res.status(404).json({
          mensaje: "No se encontró el usuario seleccionado.",
        });
      }

      let nuevoRol;

      if (accion === "conceder") {
        nuevoRol = "administrador";
      } else {
        // Al retirar el privilegio, comprobar si tiene vehículo.
        const { data: vehiculo, error: errorVehiculo } =
          await dbClient
            .from("vehiculos")
            .select("id")
            .eq("usuario_id", id)
            .maybeSingle();

        if (errorVehiculo) throw errorVehiculo;

        nuevoRol = vehiculo ? "conductor" : "pasajero";
      }

      // Actualizar el privilegio.
      const { data: usuarioActualizado, error: errorActualizacion } =
        await dbClient
          .from("profiles")
          .update({ rol: nuevoRol })
          .eq("id", id)
          .select("id, nombre_completo, correo, rol")
          .single();

      if (errorActualizacion) throw errorActualizacion;

      return res.json({
        mensaje:
          accion === "conceder"
            ? "Privilegios de administrador concedidos correctamente."
            : "Privilegios administrativos retirados correctamente.",
        usuario: usuarioActualizado,
      });

    } catch (error) {
      console.error(
        "Error administrando privilegios:",
        error
      );

      return res.status(500).json({
        mensaje:
          "No fue posible completar la operación administrativa.",
      });
    }
  }
);

// ------------------------------------------------------------------
// ACTUALIZAR TELÉFONO DEL PERFIL
// PUT /api/usuarios/:id/telefono
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// ADMINISTRACIÓN DE PRIVILEGIOS
// Solo la administradora principal puede conceder o retirar
// el rol de administrador.
// ------------------------------------------------------------------

app.put(
  "/api/admin/usuarios/:id/rol",
  verificarAutenticacion,
  verificarAdministrador,
  async (req, res) => {
    try {
      const idObjetivo = req.params.id;
      const { accion } = req.body;

      // Solo Mónica puede utilizar esta operación.
      if (
        req.usuarioAutenticado.id !== ADMINISTRADORA_PRINCIPAL_ID
      ) {
        return res.status(403).json({
          mensaje:
            "Solo la administradora principal puede gestionar los privilegios administrativos.",
        });
      }

      // Nadie puede modificar el privilegio de Mónica.
      if (idObjetivo === ADMINISTRADORA_PRINCIPAL_ID) {
        return res.status(403).json({
          mensaje:
            "El privilegio de la administradora principal no puede modificarse.",
        });
      }

      if (!["conceder", "retirar"].includes(accion)) {
        return res.status(400).json({
          mensaje: "La acción indicada no es válida.",
        });
      }

      const { data: usuarioObjetivo, error: errorUsuario } =
        await dbClient
          .from("profiles")
          .select("id, nombre_completo, correo, rol")
          .eq("id", idObjetivo)
          .maybeSingle();

      if (errorUsuario) throw errorUsuario;

      if (!usuarioObjetivo) {
        return res.status(404).json({
          mensaje: "No se encontró el usuario seleccionado.",
        });
      }

      let nuevoRol;

      if (accion === "conceder") {
        nuevoRol = "administrador";
      } else {
        if (usuarioObjetivo.rol !== "administrador") {
          return res.status(400).json({
            mensaje: "El usuario seleccionado no es administrador.",
          });
        }

        // Al retirar el privilegio, conservar el rol de conductor
        // si tiene vehículo registrado.
        const { data: vehiculo, error: errorVehiculo } =
          await dbClient
            .from("vehiculos")
            .select("id")
            .eq("usuario_id", idObjetivo)
            .maybeSingle();

        if (errorVehiculo) throw errorVehiculo;

        nuevoRol = vehiculo ? "conductor" : "pasajero";
      }

      const { data, error } = await dbClient
        .from("profiles")
        .update({ rol: nuevoRol })
        .eq("id", idObjetivo)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        mensaje:
          accion === "conceder"
            ? "Privilegio de administrador concedido correctamente."
            : "Privilegio de administrador retirado correctamente.",
        usuario: data,
      });
    } catch (error) {
      console.error("Error administrando privilegios:", error);

      return res.status(500).json({
        mensaje: "No fue posible modificar los privilegios.",
      });
    }
  }
);

app.put("/api/usuarios/:id/telefono", async (req, res) => {
  try {
    const { id } = req.params;
    const telefono = String(req.body.telefono ?? "").trim();

    if (!telefono) {
      return res.status(400).json({
        mensaje: "Debes ingresar un número de teléfono.",
      });
    }

    if (!/^[0-9+\s()-]{7,20}$/.test(telefono)) {
      return res.status(400).json({
        mensaje: "Ingresa un número de teléfono válido.",
      });
    }

    const { data, error } = await dbClient
      .from("profiles")
      .update({ telefono })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error actualizando teléfono:", error);

      return res.status(500).json({
        mensaje: "No fue posible actualizar el teléfono.",
      });
    }

    if (!data) {
      return res.status(404).json({
        mensaje: "No se encontró el perfil del usuario.",
      });
    }

    return res.json({
      mensaje: "Teléfono actualizado correctamente.",
      usuario: data,
    });
  } catch (error) {
    console.error("Error en actualización de teléfono:", error);

    return res.status(500).json({
      mensaje: "Ocurrió un error al actualizar el teléfono.",
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
      .order("fecha_hora_salida", { ascending: true });

    if (error) {
      console.error("Error de Supabase en /api/rutas:", error);
      return res.status(500).json({
        mensaje: "No fue posible consultar las rutas.",
        detalle: error.message
      });
    }

    const rutas = (data || []).map((ruta) => ({
      id: ruta.id,
      origen: ruta.origen,
      destino: ruta.destino,
      lat_origen: ruta.lat_origen,
      lng_origen: ruta.lng_origen,
      lat_destino: ruta.lat_destino,
      lng_destino: ruta.lng_destino,
      fecha_hora_salida: ruta.fecha_hora_salida,
      fecha: ruta.fecha_hora_salida ? String(ruta.fecha_hora_salida).slice(0, 10) : "",
      hora: ruta.fecha_hora_salida ? String(ruta.fecha_hora_salida).slice(11, 16) : "",
      cupos_totales: ruta.cupos_totales,
      cupos_disponibles: ruta.cupos_disponibles,
      tarifa_contribucion: ruta.tarifa_contribucion,
      estado: ruta.estado,
      conductor_id: ruta.conductor_id,
      conductor: ruta.profiles || null,
      vehiculo: null, // Evita errores de columnas inexistentes
      creado_en: ruta.creado_en,
    }));

    res.json(rutas);
  } catch (error) {
    console.error("Error obteniendo rutas:", error);
    res.status(500).json({
      mensaje: "No fue posible consultar las rutas.",
      detalle: error.message
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

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({
        mensaje: "El ID del conductor no es válido.",
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
        "Error consultando rutas del conductor en Supabase:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al consultar las rutas en la base de datos.",
      });
    }

    // Mapeamos las rutas asegurando que los campos fecha y hora vayan listos para el frontend
    const rutasFormateadas = (data || []).map((ruta) => ({
      ...ruta,
      fecha: ruta.fecha_hora_salida ? String(ruta.fecha_hora_salida).slice(0, 10) : "",
      hora: ruta.fecha_hora_salida ? String(ruta.fecha_hora_salida).slice(11, 16) : "",
    }));

    return res.status(200).json(rutasFormateadas);
  } catch (error) {
    console.error(
      "Error crítico en /api/rutas/conductor/:id:",
      error
    );

    return res.status(500).json({
      mensaje: "No fue posible consultar tus rutas.",
    });
  }
});
// ------------------------------------------------------------------
// 11. SOLICITUDES DE CUPOS Y VIAJES NUEVOS
// ------------------------------------------------------------------

// PASAJERO: solicitar cupo en ruta publicada (Descuenta plaza y avisa al conductor)
app.post("/api/solicitudes", async (req, res) => {
  try {
    const {
      viaje_id,
      ruta_id,
      pasajero_id,
      punto_encuentro,
    } = req.body;

    const idViaje = viaje_id || ruta_id;

    console.log("➡️ Recibida solicitud para viaje/ruta:", idViaje, "de pasajero:", pasajero_id);

    if (!idViaje || !pasajero_id) {
      return res.status(400).json({
        mensaje: "Faltan datos para solicitar el cupo.",
      });
    }

    // 1. Consultar la ruta
    const { data: ruta, error: errorRuta } = await dbClient
      .from("rutas")
      .select("id, conductor_id, origen, destino, cupos_disponibles, estado")
      .eq("id", idViaje)
      .maybeSingle();

    if (errorRuta) throw errorRuta;

    console.log("📍 Ruta encontrada en la BD:", ruta); // <--- ESTE LOG NOS DIRÁ QUÉ TRAJO

    if (!ruta) {
      return res.status(404).json({
        mensaje: "La ruta no existe.",
      });
    }

    if (ruta.estado !== "programado") {
      return res.status(400).json({
        mensaje: "Esta ruta ya no está disponible.",
      });
    }

    const cuposActuales = Number(ruta.cupos_disponibles);
    if (cuposActuales <= 0) {
      return res.status(400).json({
        mensaje: "No hay cupos disponibles en esta ruta.",
      });
    }

    // 2. Verificar si ya existe una solicitud previa
    const { data: existente, error: errorExistente } = await dbClient
      .from("solicitudes_viaje")
      .select("id, estado")
      .eq("viaje_id", idViaje)
      .eq("pasajero_id", pasajero_id)
      .maybeSingle();

    if (errorExistente) throw errorExistente;

    if (existente) {
      return res.status(409).json({
        mensaje: "Ya tienes una solicitud para esta ruta.",
      });
    }

    // 3. Obtener el nombre del pasajero para la notificación
    const { data: pasajeroInfo } = await dbClient
      .from("profiles")
      .select("nombre_completo")
      .eq("id", pasajero_id)
      .maybeSingle();

    const nombrePasajero = pasajeroInfo?.nombre_completo || "Un pasajero";

    // 4. Crear la solicitud de viaje
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

    if (error) throw error;

    // 5. Descontar 1 cupo disponible de la ruta publicada
    const { error: errorUpdate } = await dbClient
      .from("rutas")
      .update({ cupos_disponibles: cuposActuales - 1 })
      .eq("id", idViaje);

    if (errorUpdate) {
      console.error("Error al descontar cupo de la ruta:", errorUpdate);
    }

    // 6. CREAR NOTIFICACIÓN AUTOMÁTICA PARA EL CONDUCTOR
    if (ruta.conductor_id) {
      const { error: errorNotif } = await dbClient
        .from("notificaciones")
        .insert({
          id: crypto.randomUUID(),
          usuario_id: ruta.conductor_id,
          titulo: "¡Nueva solicitud de cupo!",
          mensaje: `${nombrePasajero} ha solicitado un cupo en tu ruta de ${ruta.origen} a ${ruta.destino}.`,
          leida: false,
          fecha_creacion: new Date().toISOString(),
        });

      if (errorNotif) {
        console.error("Error al crear notificación para el conductor:", errorNotif);
      }
    }

    res.status(201).json({
      mensaje: "¡Solicitud de cupo enviada y plaza reservada correctamente!",
      solicitud: data,
    });
  } catch (error) {
    console.error("Error solicitando cupo:", error);
    res.status(500).json({
      mensaje: "No fue posible enviar la solicitud.",
      detalle: error.message,
    });
  }
});


// PASAJERO: registrar solicitud de viaje nuevo personalizado
app.post("/api/solicitudes-viajes-nuevos", async (req, res) => {
  try {
    const {
      pasajero_id,
      origen,
      destino,
      lat_origen,
      lng_origen,
      lat_destino,
      lng_destino,
      fecha_hora_salida,
    } = req.body;

    if (
      !pasajero_id ||
      !origen ||
      !destino ||
      lat_origen == null ||
      lng_origen == null ||
      lat_destino == null ||
      lng_destino == null ||
      !fecha_hora_salida
    ) {
      return res.status(400).json({
        mensaje: "Completa todos los datos del viaje.",
      });
    }

    const { data: pasajero, error: errorPasajero } =
      await supabaseAdmin
        .from("profiles")
        .select("id, rol")
        .eq("id", pasajero_id)
        .maybeSingle();

    if (errorPasajero) throw errorPasajero;

    if (!pasajero || pasajero.rol !== "pasajero") {
      return res.status(403).json({
        mensaje: "Solo los pasajeros pueden registrar solicitudes.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("solicitudes_viajes_nuevos")
      .insert({
        id: crypto.randomUUID(),
        pasajero_id,
        origen: String(origen).trim(),
        destino: String(destino).trim(),
        lat_origen: Number(lat_origen),
        lng_origen: Number(lng_origen),
        lat_destino: Number(lat_destino),
        lng_destino: Number(lng_destino),
        fecha_hora_salida,
        estado: "pendiente",
        conductor_id: null,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      mensaje: "Solicitud registrada correctamente.",
      solicitud: data,
    });
  } catch (error) {
    console.error("Error registrando viaje nuevo:", error);
    return res.status(500).json({
      mensaje: "No fue posible registrar la solicitud.",
      detalle: error.message,
    });
  }
});


// CONDUCTOR: aceptar solicitud de viaje nuevo
app.patch(
  "/api/solicitudes-viajes-nuevos/:id/aceptar",
  async (req, res) => {
    try {
      const { id } = req.params;
      const { conductor_id } = req.body;

      if (!conductor_id) {
        return res.status(400).json({
          mensaje: "No se identificó al conductor.",
        });
      }

      const { data: perfil, error: errorPerfil } = await dbClient
        .from("profiles")
        .select("id, rol")
        .eq("id", conductor_id)
        .maybeSingle();

      if (errorPerfil) throw errorPerfil;

      if (!perfil || perfil.rol !== "conductor") {
        return res.status(403).json({
          mensaje: "Solo un conductor puede aceptar el viaje.",
        });
      }

      const { data, error } = await dbClient
        .from("solicitudes_viajes_nuevos")
        .update({
          estado: "aceptada",
          conductor_id,
          aceptado_en: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("estado", "pendiente")
        .is("conductor_id", null)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(409).json({
          mensaje: "Otro conductor ya aceptó esta solicitud.",
        });
      }

      return res.json({
        mensaje: "Solicitud aceptada correctamente.",
        solicitud: data,
      });
    } catch (error) {
      console.error("Error aceptando solicitud:", error);
      return res.status(500).json({
        mensaje: "No fue posible aceptar la solicitud.",
      });
    }
  }
);


// CONDUCTOR: rechazar viaje nuevo solo para sí mismo
app.patch(
  "/api/solicitudes-viajes-nuevos/:id/rechazar",
  async (req, res) => {
    try {
      const { id } = req.params;
      const { conductor_id } = req.body;

      if (!conductor_id) {
        return res.status(400).json({
          mensaje: "No se identificó al conductor.",
        });
      }

      const { data: perfil, error: errorPerfil } = await dbClient
        .from("profiles")
        .select("id, rol")
        .eq("id", conductor_id)
        .maybeSingle();

      if (errorPerfil) throw errorPerfil;

      if (!perfil || perfil.rol !== "conductor") {
        return res.status(403).json({
          mensaje: "Solo un conductor puede rechazar la solicitud.",
        });
      }

      const { data: solicitud, error: errorSolicitud } = await dbClient
        .from("solicitudes_viajes_nuevos")
        .select("id, estado, conductor_id")
        .eq("id", id)
        .maybeSingle();

      if (errorSolicitud) throw errorSolicitud;

      if (
        !solicitud ||
        solicitud.estado !== "pendiente" ||
        solicitud.conductor_id
      ) {
        return res.status(409).json({
          mensaje: "Esta solicitud ya no está disponible.",
        });
      }

      const { error } = await dbClient
        .from("solicitudes_viajes_rechazos")
        .upsert(
          {
            solicitud_id: id,
            conductor_id,
          },
          {
            onConflict: "solicitud_id,conductor_id",
            ignoreDuplicates: true,
          }
        );

      if (error) throw error;

      return res.json({
        mensaje: "Solicitud descartada de tu lista.",
      });
    } catch (error) {
      console.error("Error rechazando solicitud:", error);
      return res.status(500).json({
        mensaje: "No fue posible rechazar la solicitud.",
      });
    }
  }
);


// CONDUCTOR: Consultar solicitudes de cupos para rutas publicadas
app.get("/api/solicitudes/conductor/:conductor_id", async (req, res) => {
  try {
    const { conductor_id } = req.params;

    const { data: misRutas, error: errorRutas } = await dbClient
      .from("rutas")
      .select("id")
      .eq("conductor_id", conductor_id);

    if (errorRutas) throw errorRutas;

    const rutaIds = (misRutas || []).map((r) => r.id);

    if (rutaIds.length === 0) {
      return res.json([]);
    }

    const { data: solicitudes, error: errorSolicitudes } = await dbClient
      .from("solicitudes_viaje")
      .select(`
        *,
        pasajero:profiles!solicitudes_viaje_pasajero_id_fkey (
          id,
          nombre_completo,
          telefono,
          foto_url
        ),
        ruta:rutas!solicitudes_viaje_viaje_id_fkey (
          origen,
          destino,
          fecha,
          hora
        )
      `)
      .in("viaje_id", rutaIds)
      .order("fecha_solicitud", { ascending: false });

    if (errorSolicitudes) throw errorSolicitudes;

    return res.json(solicitudes || []);
  } catch (error) {
    console.error("Error al obtener solicitudes del conductor:", error);
    return res.status(500).json({ mensaje: "Error al obtener solicitudes." });
  }
});

// ------------------------------------------------------------------
// NOTIFICACIONES
// ------------------------------------------------------------------

// Consultar notificaciones de un usuario
app.get("/api/notificaciones/:usuario_id", async (req, res) => {
  try {
    const { usuario_id } = req.params;

    if (!usuario_id) {
      return res.status(400).json({ mensaje: "Falta el ID de usuario." });
    }

    const { data, error } = await dbClient
      .from("notificaciones")
      .select("*")
      .eq("usuario_id", usuario_id)
      .order("fecha_creacion", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    res.status(500).json({ mensaje: "No fue posible consultar las notificaciones." });
  }
});

// Marcar notificación como leída
app.patch("/api/notificaciones/:id/leida", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await dbClient
      .from("notificaciones")
      .update({ leida: true })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ mensaje: "Notificación marcada como leída.", notificacion: data });
  } catch (error) {
    console.error("Error actualizando notificación:", error);
    res.status(500).json({ mensaje: "No fue posible actualizar la notificación." });
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
// 13. CREAR SOLICITUD DE VIAJE NUEVO
// POST /api/solicitudes-viajes-nuevos
// ------------------------------------------------------------------

app.post("/api/solicitudes-viajes-nuevos", async (req, res) => {
  try {
    const {
      pasajero_id,
      origen,
      destino,
      lat_origen,
      lng_origen,
      lat_destino,
      lng_destino,
      fecha_hora_salida,
    } = req.body;

    const coordenadas = [
      lat_origen,
      lng_origen,
      lat_destino,
      lng_destino,
    ];

    if (
      !pasajero_id ||
      !String(origen || "").trim() ||
      !String(destino || "").trim() ||
      !fecha_hora_salida ||
      coordenadas.some(
        (valor) =>
          valor === null ||
          valor === undefined ||
          valor === "" ||
          !Number.isFinite(Number(valor))
      )
    ) {
      return res.status(400).json({
        mensaje:
          "Completa el origen, destino, ubicación de ambos puntos, fecha y hora de salida.",
      });
    }

    const fechaSalida = new Date(fecha_hora_salida);

    if (Number.isNaN(fechaSalida.getTime())) {
      return res.status(400).json({
        mensaje: "La fecha y hora de salida no son válidas.",
      });
    }

    const { data: pasajero, error: errorPasajero } =
      await supabaseAdmin
        .from("profiles")
        .select("id, rol")
        .eq("id", pasajero_id)
        .maybeSingle();

    if (errorPasajero) {
      throw errorPasajero;
    }

    if (!pasajero) {
      return res.status(404).json({
        mensaje: "No se encontró el perfil del pasajero.",
      });
    }

    if (pasajero.rol !== "pasajero") {
      return res.status(403).json({
        mensaje:
          "Solo los usuarios con rol de pasajero pueden registrar solicitudes de viaje nuevo.",
      });
    }

    const { data, error } = await dbClient
      .from("solicitudes_viajes_nuevos")
      .insert({
        id: crypto.randomUUID(),
        pasajero_id,
        origen: String(origen).trim(),
        destino: String(destino).trim(),
        lat_origen: Number(lat_origen),
        lng_origen: Number(lng_origen),
        lat_destino: Number(lat_destino),
        lng_destino: Number(lng_destino),
        fecha_hora_salida,
        estado: "pendiente",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      mensaje: "Solicitud de viaje nuevo registrada correctamente.",
      solicitud: data,
    });
  } catch (error) {
    console.error(
      "Error registrando solicitud de viaje nuevo:",
      error
    );

    return res.status(500).json({
      mensaje: "No fue posible registrar la solicitud de viaje.",
      detalle: error.message,
    });
  }
});

// ------------------------------------------------------------------
// 14. CONSULTAR SOLICITUDES PENDIENTES (CONDUCTORES)
// GET /api/solicitudes-viajes-nuevos
// ------------------------------------------------------------------
// CONDUCTOR: consultar solicitudes pendientes no rechazadas por él
app.get("/api/solicitudes-viajes-nuevos", async (req, res) => {
  try {
    const { conductor_id: conductorId } = req.query;

    if (!conductorId) {
      return res.status(400).json({
        mensaje: "Debes indicar el ID del conductor.",
      });
    }

    // Verificar que el usuario tenga rol de conductor
    const { data: conductor, error: errorConductor } =
      await supabaseAdmin
        .from("profiles")
        .select("id, rol")
        .eq("id", conductorId)
        .maybeSingle();

    if (errorConductor) throw errorConductor;

    if (!conductor || conductor.rol !== "conductor") {
      return res.status(403).json({
        mensaje: "Solo los conductores pueden consultar estas solicitudes.",
      });
    }

    // Consultar solicitudes que todavía no han sido aceptadas
    const { data: solicitudes, error } = await supabaseAdmin
      .from("solicitudes_viajes_nuevos")
      .select(`
        id,
        pasajero_id,
        origen,
        destino,
        lat_origen,
        lng_origen,
        lat_destino,
        lng_destino,
        fecha_hora_salida,
        estado,
        creado_en,
        pasajero:profiles!solicitudes_viajes_nuevos_pasajero_id_fkey (
          id,
          nombre_completo,
          telefono,
          foto_url
        )
      `)
      .eq("estado", "pendiente")
      .is("conductor_id", null)
      .order("creado_en", { ascending: false });

    if (error) throw error;

    // Consultar los rechazos realizados por este conductor
    const { data: rechazos, error: errorRechazos } = await supabaseAdmin
      .from("solicitudes_viajes_rechazos")
      .select("solicitud_id")
      .eq("conductor_id", conductorId);

    if (errorRechazos) throw errorRechazos;

    const solicitudesRechazadas = new Set(
      (rechazos || []).map((rechazo) => rechazo.solicitud_id)
    );

    // Excluir únicamente las solicitudes rechazadas por este conductor
    const solicitudesDisponibles = (solicitudes || []).filter(
      (solicitud) => !solicitudesRechazadas.has(solicitud.id)
    );

    return res.status(200).json(solicitudesDisponibles);
  } catch (error) {
    console.error("Error consultando solicitudes de viaje nuevo:", error);

    return res.status(500).json({
      mensaje: "No fue posible consultar las solicitudes pendientes.",
      detalle: error.message,
    });
  }
});


// ------------------------------------------------------------------
// 15. CONSULTAR SOLICITUDES DE VIAJE NUEVO DE UN PASAJERO
// GET /api/solicitudes-viajes-nuevos/pasajero/:id
// ------------------------------------------------------------------

app.get(
  "/api/solicitudes-viajes-nuevos/pasajero/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || id === "undefined" || id === "null") {
        return res.status(400).json({
          mensaje: "El ID del pasajero no es válido.",
        });
      }

      const { data, error } = await dbClient
        .from("solicitudes_viajes_nuevos")
        .select(`
    *,
    conductor:profiles!solicitudes_viajes_nuevos_conductor_id_fkey (
      id,
      nombre_completo,
      telefono,
      foto_url
    )
  `)
        .eq("pasajero_id", id)
        .order("creado_en", { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json(data || []);
    } catch (error) {
      console.error(
        "Error consultando solicitudes nuevas del pasajero:",
        error
      );

      return res.status(500).json({
        mensaje: "No fue posible consultar tus solicitudes de viaje.",
        detalle: error.message,
      });
    }
  }
);

// ------------------------------------------------------------------
// 16. RESPONDER SOLICITUD DE VIAJE NUEVO
// PATCH /api/solicitudes-viajes-nuevos/:id/responder
// ------------------------------------------------------------------

app.patch(
  "/api/solicitudes-viajes-nuevos/:id/responder",
  async (req, res) => {
    try {
      const { id } = req.params;
      const { conductor_id, accion } = req.body;

      if (!id || !conductor_id || !["aceptar", "rechazar"].includes(accion)) {
        return res.status(400).json({
          mensaje: "Los datos para responder la solicitud no son válidos.",
        });
      }

      const { data: conductor, error: errorConductor } = await dbClient
        .from("profiles")
        .select("id, rol")
        .eq("id", conductor_id)
        .maybeSingle();

      if (errorConductor) throw errorConductor;

      if (!conductor || conductor.rol !== "conductor") {
        return res.status(403).json({
          mensaje: "Solo un conductor puede responder esta solicitud.",
        });
      }

      const actualizacion = {
        estado: accion === "aceptar" ? "aceptada" : "rechazada",
        conductor_id: accion === "aceptar" ? conductor_id : null,
        aceptado_en: accion === "aceptar" ? new Date().toISOString() : null,
      };

      const { data, error } = await dbClient
        .from("solicitudes_viajes_nuevos")
        .update(actualizacion)
        .eq("id", id)
        .eq("estado", "pendiente")
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(409).json({
          mensaje: "Esta solicitud ya fue atendida por otro conductor.",
        });
      }

      return res.status(200).json({
        mensaje:
          accion === "aceptar"
            ? "Has aceptado la solicitud de viaje."
            : "Has rechazado la solicitud de viaje.",
        solicitud: data,
      });
    } catch (error) {
      console.error("Error respondiendo solicitud de viaje:", error);

      return res.status(500).json({
        mensaje: "No fue posible responder la solicitud.",
        detalle: error.message,
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
// 17. REGISTRAR O ACTUALIZAR VEHÍCULO
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
// 18. INICIO DEL SERVIDOR
// ------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `Servidor TdeA GO corriendo en http://localhost:${PORT}`
  );
});