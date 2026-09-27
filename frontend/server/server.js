import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// ---------------------------------------------------------
// CONFIGURACIÓN GENERAL
// ---------------------------------------------------------

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ---------------------------------------------------------
// FUNCIÓN PARA OBTENER UN USUARIO
// ---------------------------------------------------------

async function obtenerUsuarioPorId(id_usuario) {
  const [usuarios] = await pool.query(
    `
      SELECT
        id_usuario,
        nombre,
        apellido,
        correo,
        telefono,
        rol
      FROM usuarios
      WHERE id_usuario = ?
    `,
    [id_usuario]
  );

  return usuarios[0] || null;
}

// ---------------------------------------------------------
// RUTA PRINCIPAL
// ---------------------------------------------------------

app.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      mensaje: "Servidor TdeA GO funcionando correctamente.",
      base_datos: "Conectada",
    });
  } catch (error) {
    console.error("Error al conectar con MySQL:", error);

    res.status(500).json({
      mensaje: "El servidor funciona, pero no fue posible conectar con MySQL.",
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

    // Validar campos obligatorios
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

    // Validar rol
    if (rol !== "conductor" && rol !== "pasajero") {
      return res.status(400).json({
        mensaje: "El rol seleccionado no es válido.",
      });
    }

    // Validar longitud de contraseña
    if (contrasena.length < 6) {
      return res.status(400).json({
        mensaje: "La contraseña debe tener mínimo 6 caracteres.",
      });
    }

    // Verificar si el correo ya existe
    const [usuariosExistentes] = await pool.query(
      `
        SELECT id_usuario
        FROM usuarios
        WHERE correo = ?
      `,
      [correo.trim()]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        mensaje: "Ya existe una cuenta registrada con este correo.",
      });
    }

    // Encriptar contraseña
    const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

    // Crear usuario
    const [resultado] = await pool.query(
      `
        INSERT INTO usuarios
        (
          nombre,
          apellido,
          correo,
          telefono,
          contrasena,
          rol
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        nombre.trim(),
        apellido.trim(),
        correo.trim(),
        telefono.trim(),
        contrasenaEncriptada,
        rol,
      ]
    );

    res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      id_usuario: resultado.insertId,
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

    // Buscar usuario por correo
    const [usuarios] = await pool.query(
      `
        SELECT
          id_usuario,
          nombre,
          apellido,
          correo,
          telefono,
          contrasena,
          rol
        FROM usuarios
        WHERE correo = ?
      `,
      [correo.trim()]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: "El correo o la contraseña son incorrectos.",
      });
    }

    const usuario = usuarios[0];

    // Comparar contraseña
    const contrasenaCorrecta = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!contrasenaCorrecta) {
      return res.status(401).json({
        mensaje: "El correo o la contraseña son incorrectos.",
      });
    }

    // Nunca enviamos la contraseña al frontend
    const usuarioRespuesta = {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      telefono: usuario.telefono,
      rol: usuario.rol,
    };

    res.json({
      mensaje: "Inicio de sesión exitoso.",
      usuario: usuarioRespuesta,
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
    const id_usuario = Number(req.params.id);
    const { rol } = req.body;

    if (!Number.isInteger(id_usuario)) {
      return res.status(400).json({
        mensaje: "El identificador del usuario no es válido.",
      });
    }

    if (rol !== "conductor" && rol !== "pasajero") {
      return res.status(400).json({
        mensaje: "El rol seleccionado no es válido.",
      });
    }

    // Verificar que el usuario exista
    const usuario = await obtenerUsuarioPorId(id_usuario);

    if (!usuario) {
      return res.status(404).json({
        mensaje: "El usuario no existe.",
      });
    }

    // Actualizar rol
    await pool.query(
      `
        UPDATE usuarios
        SET rol = ?
        WHERE id_usuario = ?
      `,
      [rol, id_usuario]
    );

    // Obtener usuario actualizado
    const usuarioActualizado = await obtenerUsuarioPorId(id_usuario);

    res.json({
      mensaje: "Rol actualizado correctamente.",
      usuario: usuarioActualizado,
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
    const [usuarios] = await pool.query(
      `
        SELECT
          id_usuario,
          nombre,
          apellido,
          correo,
          telefono,
          rol
        FROM usuarios
        ORDER BY id_usuario DESC
      `
    );

    res.json(usuarios);
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
      hora,
    } = req.query;

    let consulta = `
      SELECT
        r.id_ruta,
        r.origen,
        r.destino,
        r.fecha,
        r.hora,
        r.cupos_totales,
        r.cupos_disponibles,
        r.id_conductor,
        u.nombre AS nombre_conductor,
        u.apellido AS apellido_conductor,
        u.telefono AS telefono_conductor
      FROM rutas r
      INNER JOIN usuarios u
        ON r.id_conductor = u.id_usuario
      WHERE r.cupos_disponibles > 0
    `;

    const parametros = [];

    if (origen) {
      consulta += " AND r.origen LIKE ?";
      parametros.push(`%${origen}%`);
    }

    if (destino) {
      consulta += " AND r.destino LIKE ?";
      parametros.push(`%${destino}%`);
    }

    if (fecha) {
      consulta += " AND r.fecha = ?";
      parametros.push(fecha);
    }

    if (hora) {
      consulta += " AND r.hora = ?";
      parametros.push(hora);
    }

    consulta += `
      ORDER BY
        r.fecha ASC,
        r.hora ASC
    `;

    const [rutas] = await pool.query(consulta, parametros);

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
      id_conductor,
      origen,
      destino,
      fecha,
      hora,
      cupos_totales,
    } = req.body;

    if (
      !id_conductor ||
      !origen ||
      !destino ||
      !fecha ||
      !hora ||
      !cupos_totales
    ) {
      return res.status(400).json({
        mensaje: "Todos los campos de la ruta son obligatorios.",
      });
    }

    // Verificar que el usuario sea conductor
    const [usuarios] = await pool.query(
      `
        SELECT id_usuario
        FROM usuarios
        WHERE id_usuario = ?
          AND rol = 'conductor'
      `,
      [id_conductor]
    );

    if (usuarios.length === 0) {
      return res.status(403).json({
        mensaje: "Solo un usuario con rol de conductor puede publicar rutas.",
      });
    }

    const cantidadCupos = Number(cupos_totales);

    if (!Number.isInteger(cantidadCupos) || cantidadCupos <= 0) {
      return res.status(400).json({
        mensaje: "La cantidad de cupos debe ser un número mayor que cero.",
      });
    }

    const [resultado] = await pool.query(
      `
        INSERT INTO rutas
        (
          id_conductor,
          origen,
          destino,
          fecha,
          hora,
          cupos_totales,
          cupos_disponibles
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id_conductor,
        origen.trim(),
        destino.trim(),
        fecha,
        hora,
        cantidadCupos,
        cantidadCupos,
      ]
    );

    res.status(201).json({
      mensaje: "Ruta publicada correctamente.",
      id_ruta: resultado.insertId,
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
  const conexion = await pool.getConnection();

  try {
    const {
      id_ruta,
      id_pasajero,
    } = req.body;

    if (!id_ruta || !id_pasajero) {
      conexion.release();

      return res.status(400).json({
        mensaje: "La ruta y el pasajero son obligatorios.",
      });
    }

    await conexion.beginTransaction();

    // Verificar que el usuario sea pasajero
    const [pasajeros] = await conexion.query(
      `
        SELECT id_usuario
        FROM usuarios
        WHERE id_usuario = ?
          AND rol = 'pasajero'
      `,
      [id_pasajero]
    );

    if (pasajeros.length === 0) {
      await conexion.rollback();
      conexion.release();

      return res.status(403).json({
        mensaje: "Solo un usuario con rol de pasajero puede solicitar un cupo.",
      });
    }

    // Consultar ruta y bloquear el registro durante la operación
    const [rutas] = await conexion.query(
      `
        SELECT
          id_ruta,
          cupos_disponibles
        FROM rutas
        WHERE id_ruta = ?
        FOR UPDATE
      `,
      [id_ruta]
    );

    if (rutas.length === 0) {
      await conexion.rollback();
      conexion.release();

      return res.status(404).json({
        mensaje: "La ruta no existe.",
      });
    }

    const ruta = rutas[0];

    if (ruta.cupos_disponibles <= 0) {
      await conexion.rollback();
      conexion.release();

      return res.status(400).json({
        mensaje: "La ruta ya no tiene cupos disponibles.",
      });
    }

    // Verificar si el pasajero ya solicitó esa ruta
    const [solicitudesExistentes] = await conexion.query(
      `
        SELECT id_solicitud
        FROM solicitudes
        WHERE id_ruta = ?
          AND id_pasajero = ?
      `,
      [id_ruta, id_pasajero]
    );

    if (solicitudesExistentes.length > 0) {
      await conexion.rollback();
      conexion.release();

      return res.status(409).json({
        mensaje: "Ya tienes una solicitud para esta ruta.",
      });
    }

    // Crear solicitud
    const [resultado] = await conexion.query(
      `
        INSERT INTO solicitudes
        (
          id_ruta,
          id_pasajero,
          estado
        )
        VALUES (?, ?, 'pendiente')
      `,
      [id_ruta, id_pasajero]
    );

    // Reservar el cupo
    const nuevosCupos = ruta.cupos_disponibles - 1;

    await conexion.query(
      `
        UPDATE rutas
        SET cupos_disponibles = ?
        WHERE id_ruta = ?
      `,
      [nuevosCupos, id_ruta]
    );

    await conexion.commit();
    conexion.release();

    res.status(201).json({
      mensaje: "Solicitud de cupo enviada correctamente.",
      id_solicitud: resultado.insertId,
    });
  } catch (error) {
    await conexion.rollback();
    conexion.release();

    console.error("Error al solicitar cupo:", error);

    res.status(500).json({
      mensaje: "No fue posible solicitar el cupo.",
    });
  }
});

// ---------------------------------------------------------
// CONSULTAR SOLICITUDES
// ---------------------------------------------------------

app.get("/api/solicitudes", async (req, res) => {
  try {
    const [solicitudes] = await pool.query(
      `
        SELECT
          s.id_solicitud,
          s.id_ruta,
          s.id_pasajero,
          s.estado,
          r.origen,
          r.destino,
          r.fecha,
          r.hora,
          u.nombre AS nombre_pasajero,
          u.apellido AS apellido_pasajero,
          u.correo AS correo_pasajero,
          u.telefono AS telefono_pasajero
        FROM solicitudes s
        INNER JOIN rutas r
          ON s.id_ruta = r.id_ruta
        INNER JOIN usuarios u
          ON s.id_pasajero = u.id_usuario
        ORDER BY s.id_solicitud DESC
      `
    );

    res.json(solicitudes);
  } catch (error) {
    console.error("Error al consultar solicitudes:", error);

    res.status(500).json({
      mensaje: "No fue posible consultar las solicitudes.",
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