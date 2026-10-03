import "./MiCuenta.css";
import { useEffect, useRef, useState } from "react";

const API_URL = "http://localhost:5000";

function MiCuenta({
  usuario,
  cerrarSesion,
  actualizarUsuario,
}) {
  const [fotoSeleccionada, setFotoSeleccionada] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);

  const [mostrarOpcionesFoto, setMostrarOpcionesFoto] =
    useState(false);

  const [mostrarCamara, setMostrarCamara] =
    useState(false);

  const [guardandoFoto, setGuardandoFoto] =
    useState(false);

  const [eliminandoFoto, setEliminandoFoto] =
    useState(false);

  const [mensajeFoto, setMensajeFoto] =
    useState("");

  const [errorFoto, setErrorFoto] =
    useState("");

  const inputArchivoRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const flujoCamaraRef = useRef(null);

  useEffect(() => {
    return () => {
      detenerCamara();

      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }
    };
  }, [vistaPrevia]);

  if (!usuario) {
    return (
      <section className="mi-cuenta-pagina">
        <div className="mi-cuenta-contenedor">
          <div className="mi-cuenta-vacio">
            <h2>Mi cuenta</h2>

            <p>
              Debes iniciar sesión para consultar tu cuenta.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const nombreCompleto =
    usuario.nombre_completo ||
    usuario.nombre ||
    "Usuario";

  const correo =
    usuario.correo ||
    usuario.email ||
    "No registrado";

  const telefono =
    usuario.telefono ||
    "No registrado";

  const rol =
    usuario.rol?.toLowerCase() || "pasajero";

  const esConductor = rol === "conductor";

  const idUsuario =
    usuario.id ||
    usuario.id_usuario;

  const iniciales = nombreCompleto
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((nombre) =>
      nombre.charAt(0).toUpperCase()
    )
    .join("");

  /*
   * La vista previa tiene prioridad mientras
   * todavía no se ha guardado la nueva fotografía.
   */
  const fotoActual =
    vistaPrevia ||
    usuario.foto_url ||
    null;
    console.log("FOTO ACTUAL EN MI CUENTA:", fotoActual);

  /* ========================================================
     DETENER CÁMARA
     ======================================================== */

  function detenerCamara() {
    if (flujoCamaraRef.current) {
      flujoCamaraRef.current
        .getTracks()
        .forEach((pista) => pista.stop());

      flujoCamaraRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  /* ========================================================
     ABRIR MENÚ DE FOTO
     ======================================================== */

  const alternarOpcionesFoto = () => {
    setErrorFoto("");
    setMensajeFoto("");

    setMostrarOpcionesFoto(
      (estadoActual) => !estadoActual
    );
  };

  /* ========================================================
     ABRIR CÁMARA
     ======================================================== */

  const abrirCamara = async () => {
    setMostrarOpcionesFoto(false);
    setErrorFoto("");
    setMensajeFoto("");

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setErrorFoto(
        "Tu navegador no permite acceder a la cámara desde esta aplicación."
      );

      return;
    }

    try {
      const flujo =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        });

      flujoCamaraRef.current = flujo;

      setMostrarCamara(true);

      /*
       * Esperamos a que el elemento de video
       * exista antes de asignarle la cámara.
       */
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = flujo;

          videoRef.current
            .play()
            .catch((error) => {
              console.error(
                "No fue posible iniciar la vista de cámara:",
                error
              );
            });
        }
      }, 100);
    } catch (error) {
      console.error(
        "Error al acceder a la cámara:",
        error
      );

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setErrorFoto(
          "No se permitió el acceso a la cámara. Debes autorizarla desde el navegador para tomar una foto."
        );
      } else if (
        error.name === "NotFoundError"
      ) {
        setErrorFoto(
          "No se encontró una cámara disponible en este dispositivo."
        );
      } else if (
        error.name === "NotReadableError"
      ) {
        setErrorFoto(
          "La cámara está siendo utilizada por otra aplicación."
        );
      } else {
        setErrorFoto(
          "No fue posible abrir la cámara."
        );
      }
    }
  };

  /* ========================================================
     CERRAR CÁMARA
     ======================================================== */

  const cerrarCamara = () => {
    detenerCamara();
    setMostrarCamara(false);
  };

  /* ========================================================
     TOMAR FOTO CON LA CÁMARA
     ======================================================== */

  const tomarFoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setErrorFoto(
        "No fue posible acceder a la cámara."
      );

      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setErrorFoto(
        "La cámara todavía no está lista. Espera un momento e inténtalo nuevamente."
      );

      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexto =
      canvas.getContext("2d");

    if (!contexto) {
      setErrorFoto(
        "No fue posible procesar la imagen."
      );

      return;
    }

    contexto.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (imagen) => {
        if (!imagen) {
          setErrorFoto(
            "No fue posible crear la fotografía."
          );

          return;
        }

        const archivo =
          new File(
            [imagen],
            `foto-perfil-${Date.now()}.jpg`,
            {
              type: "image/jpeg",
            }
          );

        procesarFoto(archivo);

        cerrarCamara();
      },
      "image/jpeg",
      0.9
    );
  };

  /* ========================================================
     ELEGIR FOTO DESDE EL DISPOSITIVO
     ======================================================== */

  const abrirArchivos = () => {
    setMostrarOpcionesFoto(false);
    setErrorFoto("");
    setMensajeFoto("");

    inputArchivoRef.current?.click();
  };

  /* ========================================================
     PROCESAR FOTO SELECCIONADA
     ======================================================== */

  const procesarFoto = (archivo) => {
    if (!archivo) {
      return;
    }

    setMensajeFoto("");
    setErrorFoto("");

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !tiposPermitidos.includes(archivo.type)
    ) {
      setErrorFoto(
        "Solo se permiten imágenes JPG, PNG o WEBP."
      );

      return;
    }

    const tamanioMaximo =
      5 * 1024 * 1024;

    if (archivo.size > tamanioMaximo) {
      setErrorFoto(
        "La imagen no puede superar los 5 MB."
      );

      return;
    }

    if (vistaPrevia) {
      URL.revokeObjectURL(vistaPrevia);
    }

    const nuevaVistaPrevia =
      URL.createObjectURL(archivo);

    setFotoSeleccionada(archivo);
    setVistaPrevia(nuevaVistaPrevia);
  };

  /* ========================================================
     CAMBIO DESDE EXPLORADOR
     ======================================================== */

  const seleccionarFoto = (evento) => {
    const archivo =
      evento.target.files?.[0];

    if (!archivo) {
      return;
    }

    procesarFoto(archivo);

    evento.target.value = "";
  };

  /* ========================================================
     CANCELAR CAMBIO DE FOTO
     ======================================================== */

  const cancelarCambioFoto = () => {
    detenerCamara();

    setMostrarCamara(false);
    setMostrarOpcionesFoto(false);

    if (vistaPrevia) {
      URL.revokeObjectURL(vistaPrevia);
    }

    setFotoSeleccionada(null);
    setVistaPrevia(null);

    setMensajeFoto("");
    setErrorFoto("");
  };

  /* ========================================================
     GUARDAR FOTO
     ======================================================== */

  const guardarFoto = async () => {
    if (!fotoSeleccionada) {
      return;
    }

    if (!idUsuario) {
      setErrorFoto(
        "No fue posible identificar el usuario."
      );

      return;
    }

    setGuardandoFoto(true);
    setMensajeFoto("");
    setErrorFoto("");

    try {
      const datosFoto = new FormData();

      datosFoto.append(
        "foto",
        fotoSeleccionada
      );

      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${idUsuario}/foto`,
        {
          method: "PUT",
          body: datosFoto,
        }
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "No fue posible guardar la foto."
        );
      }

      /*
       * Verificamos que el backend haya devuelto
       * correctamente la información del usuario.
       */
      if (!datos.usuario) {
        throw new Error(
          "La foto fue guardada, pero el servidor no devolvió la información actualizada del usuario."
        );
      }

      /*
       * Actualizamos el usuario conservando
       * todos los datos actuales y reemplazando
       * específicamente la foto.
       */
      if (actualizarUsuario) {
        actualizarUsuario({
          ...usuario,
          ...datos.usuario,
          foto_url: datos.usuario.foto_url || null,
        });
      }

      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }

      setFotoSeleccionada(null);
      setVistaPrevia(null);

      setMensajeFoto(
        "Foto de perfil actualizada correctamente."
      );

      setMostrarOpcionesFoto(false);
    } catch (error) {
      console.error(
        "Error al guardar la foto:",
        error
      );

      setErrorFoto(
        error.message ||
        "No fue posible guardar la foto."
      );
    } finally {
      setGuardandoFoto(false);
    }
  };

  /* ========================================================
     ERROR AL CARGAR FOTO
     ======================================================== */

  const manejarErrorFoto = () => {
    console.error(
      "No fue posible cargar la foto desde:",
      fotoActual
    );

    setErrorFoto(
      "La foto fue guardada, pero no fue posible cargarla en pantalla."
    );
  };

  /* ========================================================
     ELIMINAR FOTO
     ======================================================== */

  const eliminarFoto = async () => {
    if (!idUsuario) {
      setErrorFoto(
        "No fue posible identificar el usuario."
      );

      return;
    }

    setEliminandoFoto(true);
    setMensajeFoto("");
    setErrorFoto("");

    try {
      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${idUsuario}/foto`,
        {
          method: "DELETE",
        }
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "No fue posible eliminar la foto."
        );
      }

      if (datos.usuario) {
        if (actualizarUsuario) {
          actualizarUsuario({
            ...usuario,
            ...datos.usuario,
            foto_url: null,
          });
        }
      }

      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }

      setFotoSeleccionada(null);
      setVistaPrevia(null);
      setMostrarCamara(false);
      setMostrarOpcionesFoto(false);

      setMensajeFoto(
        "Foto de perfil eliminada correctamente."
      );
    } catch (error) {
      console.error(
        "Error al eliminar la foto:",
        error
      );

      setErrorFoto(
        error.message ||
        "No fue posible eliminar la foto."
      );
    } finally {
      setEliminandoFoto(false);
    }
  };

  return (
    <section className="mi-cuenta-pagina">

      <div className="mi-cuenta-contenedor">

        {/* ==================================================
            ENCABEZADO
            ================================================== */}

        <div className="mi-cuenta-introduccion">

          <div>

            <span className="mi-cuenta-etiqueta">
              MI CUENTA
            </span>

            <h1>
              Hola, {nombreCompleto.split(" ")[0]}
            </h1>

            <p>
              Administra tu información y consulta tu
              experiencia en TdeA GO.
            </p>

          </div>

        </div>

        {/* ==================================================
            PERFIL
            ================================================== */}

        <div className="mi-cuenta-grid">

          <article className="tarjeta-perfil">

            <div className="perfil-superior">

              {/* ==================================================
                  FOTO
                  ================================================== */}

              <div className="zona-foto-perfil">

                <div className="avatar-grande">

                  {fotoActual ? (
                    <img
                      src={fotoActual}
                      alt={`Foto de ${nombreCompleto}`}
                      onError={manejarErrorFoto}
                    />
                  ) : (
                    iniciales || "U"
                  )}

                </div>

                <button
                  type="button"
                  className="boton-cambiar-foto"
                  onClick={alternarOpcionesFoto}
                >
                  {fotoActual
                    ? "Cambiar foto"
                    : "Agregar foto"}
                </button>

                {/* ==================================================
                    MENÚ DESPLEGABLE
                    ================================================== */}

                {mostrarOpcionesFoto && (
                  <div className="opciones-foto">

                    <button
                      type="button"
                      onClick={abrirCamara}
                    >
                      Tomar una foto
                    </button>

                    <button
                      type="button"
                      onClick={abrirArchivos}
                    >
                      Elegir una foto
                    </button>

                  </div>
                )}

                {/* ==================================================
                    INPUT PARA ARCHIVOS
                    ================================================== */}

                <input
                  ref={inputArchivoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="input-foto-oculto"
                  onChange={seleccionarFoto}
                />

              </div>

              {/* ==================================================
                  IDENTIDAD
                  ================================================== */}

              <div className="perfil-identidad">

                <h2>
                  {nombreCompleto}
                </h2>

                <span className="perfil-rol">
                  {esConductor
                    ? "Conductor"
                    : "Pasajero"}
                </span>

              </div>

            </div>

            {/* ==================================================
                CÁMARA
                ================================================== */}

            {mostrarCamara && (
              <div className="panel-camara">

                <div className="encabezado-camara">

                  <div>

                    <span className="etiqueta-camara">
                      CÁMARA
                    </span>

                    <h3>
                      Toma una foto
                    </h3>

                  </div>

                  <button
                    type="button"
                    className="boton-cerrar-camara"
                    onClick={cerrarCamara}
                    aria-label="Cerrar cámara"
                  >
                    ×
                  </button>

                </div>

                <div className="visor-camara">

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                  />

                </div>

                <canvas
                  ref={canvasRef}
                  className="canvas-oculto"
                />

                <div className="controles-camara">

                  <button
                    type="button"
                    className="boton-tomar-foto"
                    onClick={tomarFoto}
                  >
                    Tomar foto
                  </button>

                  <button
                    type="button"
                    className="boton-cancelar-foto"
                    onClick={cerrarCamara}
                  >
                    Cancelar
                  </button>

                </div>

              </div>
            )}

            {/* ==================================================
                GUARDAR NUEVA FOTO
                ================================================== */}

            {fotoSeleccionada && (
              <div className="acciones-foto">

                <p className="texto-foto-seleccionada">
                  Vista previa de la nueva foto
                </p>

                <div className="botones-foto">

                  <button
                    type="button"
                    className="boton-guardar-foto"
                    onClick={guardarFoto}
                    disabled={guardandoFoto}
                  >
                    {guardandoFoto
                      ? "Guardando..."
                      : "Guardar foto"}
                  </button>

                  <button
                    type="button"
                    className="boton-cancelar-foto"
                    onClick={cancelarCambioFoto}
                    disabled={guardandoFoto}
                  >
                    Cancelar
                  </button>

                </div>

              </div>
            )}

            {/* ==================================================
                ELIMINAR FOTO
                ================================================== */}

            {usuario.foto_url &&
              !fotoSeleccionada &&
              !mostrarCamara && (
                <div className="acciones-foto">

                  <button
                    type="button"
                    className="boton-eliminar-foto"
                    onClick={eliminarFoto}
                    disabled={eliminandoFoto}
                  >
                    {eliminandoFoto
                      ? "Eliminando..."
                      : "Eliminar foto de perfil"}
                  </button>

                </div>
              )}

            {/* ==================================================
                MENSAJES
                ================================================== */}

            {mensajeFoto && (
              <p className="mensaje-foto mensaje-foto-exito">
                {mensajeFoto}
              </p>
            )}

            {errorFoto && (
              <p className="mensaje-foto mensaje-foto-error">
                {errorFoto}
              </p>
            )}

            {/* ==================================================
                DATOS
                ================================================== */}

            <div className="perfil-datos">

              <div className="dato-perfil">

                <span className="dato-etiqueta">
                  Correo electrónico
                </span>

                <strong>
                  {correo}
                </strong>

              </div>

              <div className="dato-perfil">

                <span className="dato-etiqueta">
                  Teléfono
                </span>

                <strong>
                  {telefono}
                </strong>

              </div>

            </div>

          </article>

          {/* ==================================================
              ROL ACTIVO
              ================================================== */}

          <article className="tarjeta-experiencia">

            <div className="tarjeta-icono">
              {esConductor ? "C" : "P"}
            </div>

            <span className="tarjeta-etiqueta">
              TU EXPERIENCIA ACTUAL
            </span>

            <h2>
              {esConductor
                ? "Estás usando TdeA GO como conductor"
                : "Estás usando TdeA GO como pasajero"}
            </h2>

            <p>
              {esConductor
                ? "Puedes publicar rutas, administrar tus rutas y gestionar las solicitudes de los pasajeros."
                : "Puedes buscar rutas disponibles y gestionar las solicitudes de viaje que hayas realizado."}
            </p>

          </article>

        </div>

        {/* ==================================================
            ACCIONES SEGÚN ROL
            ================================================== */}

        <div className="seccion-experiencia">

          <div className="titulo-seccion">

            <span>
              Accesos rápidos
            </span>

            <h2>
              ¿Qué quieres hacer?
            </h2>

          </div>

          <div className="acciones-cuenta">

            {esConductor ? (
              <>
                <a
                  href="/publicar"
                  className="accion-cuenta accion-principal"
                >
                  <span className="accion-indicador">
                    +
                  </span>

                  <span className="accion-contenido">

                    <strong>
                      Publicar una ruta
                    </strong>

                    <small>
                      Comparte los cupos disponibles
                    </small>

                  </span>

                  <span className="accion-flecha">
                    →
                  </span>

                </a>

                <a
                  href="/mis-rutas"
                  className="accion-cuenta"
                >
                  <span className="accion-indicador">
                    R
                  </span>

                  <span className="accion-contenido">

                    <strong>
                      Mis rutas
                    </strong>

                    <small>
                      Consulta y administra tus rutas
                    </small>

                  </span>

                  <span className="accion-flecha">
                    →
                  </span>

                </a>
              </>
            ) : (
              <>
                <a
                  href="/buscar"
                  className="accion-cuenta accion-principal"
                >
                  <span className="accion-indicador">
                    B
                  </span>

                  <span className="accion-contenido">

                    <strong>
                      Buscar una ruta
                    </strong>

                    <small>
                      Encuentra una opción de transporte
                    </small>

                  </span>

                  <span className="accion-flecha">
                    →
                  </span>

                </a>

                <a
                  href="/mis-solicitudes"
                  className="accion-cuenta"
                >
                  <span className="accion-indicador">
                    S
                  </span>

                  <span className="accion-contenido">

                    <strong>
                      Mis solicitudes
                    </strong>

                    <small>
                      Consulta tus solicitudes de viaje
                    </small>

                  </span>

                  <span className="accion-flecha">
                    →
                  </span>

                </a>
              </>
            )}

          </div>

        </div>

        {/* ==================================================
            INFORMACIÓN DE CUENTA
            ================================================== */}

        <div className="seccion-configuracion">

          <div className="titulo-seccion">

            <span>
              Cuenta
            </span>

            <h2>
              Información de acceso
            </h2>

          </div>

          <div className="lista-configuracion">

            <div className="fila-configuracion">

              <div>

                <strong>
                  Rol actual
                </strong>

                <p>
                  Puedes cambiar entre pasajero y conductor
                  desde el menú de tu perfil.
                </p>

              </div>

              <span className="estado-cuenta">
                {esConductor
                  ? "Conductor"
                  : "Pasajero"}
              </span>

            </div>

            <div className="fila-configuracion">

              <div>

                <strong>
                  Estado de la cuenta
                </strong>

                <p>
                  Tu cuenta está disponible para utilizar
                  TdeA GO.
                </p>

              </div>

              <span className="estado-activo">
                Activa
              </span>

            </div>

          </div>

        </div>

        {/* ==================================================
            CERRAR SESIÓN
            ================================================== */}

        <div className="zona-cerrar-sesion">

          <button
            type="button"
            className="boton-cerrar-cuenta"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>

        </div>

      </div>

    </section>
  );
}

export default MiCuenta;