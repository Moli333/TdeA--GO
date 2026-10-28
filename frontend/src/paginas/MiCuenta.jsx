import "./MiCuenta.css";
import { useEffect, useRef, useState } from "react";
import RegistrarVehiculo from "./RegistrarVehiculo";

const API_URL_PREDETERMINADA =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function MiCuenta({
  usuario,
  cerrarSesion,
  actualizarUsuario,
  API_URL = API_URL_PREDETERMINADA,
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

  const [mensajeRol, setMensajeRol] = useState("");
  const [errorRol, setErrorRol] = useState("");
  const [cambiandoRol, setCambiandoRol] = useState(false);

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

  // =========================================================
  // REGISTRO DEL VEHÍCULO Y ACTIVACIÓN DEL ROL
  // =========================================================

  const manejarVehiculoRegistrado = async () => {
    setMensajeRol("");
    setErrorRol("");

    // Si ya es conductor, basta con actualizar el vehículo.
    if (esConductor) {
      localStorage.removeItem(
        "tdea_go_registro_pendiente"
      );

      if (actualizarUsuario) {
        actualizarUsuario({
          ...usuario,
          rol: "conductor",
          rol_solicitado: "conductor",
          requiere_vehiculo: false,
        });
      }

      setMensajeRol(
        "Tu vehículo quedó registrado o actualizado correctamente."
      );

      return;
    }

    if (!idUsuario) {
      setErrorRol(
        "No pudimos identificar tu cuenta. Cierra sesión e inicia sesión nuevamente."
      );

      return;
    }

    try {
      setCambiandoRol(true);

      setMensajeRol(
        "Vehículo registrado. Estamos activando tu perfil de conductor..."
      );

      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${idUsuario}/rol`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rol: "conductor",
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "El vehículo se registró, pero no pudimos activar el rol de conductor. Inténtalo nuevamente."
        );
      }

      if (actualizarUsuario) {
        actualizarUsuario({
          ...usuario,
          ...(datos.usuario || {}),
          rol: "conductor",
          rol_solicitado: "conductor",
          requiere_vehiculo: false,
        });
      }

      localStorage.removeItem(
        "tdea_go_registro_pendiente"
      );

      setErrorRol("");

      setMensajeRol(
        "¡Listo! Tu vehículo quedó registrado y ahora tienes el rol de conductor."
      );
    } catch (error) {
      console.error(
        "Error activando el rol de conductor:",
        error
      );

      setMensajeRol("");

      setErrorRol(
        error.message ||
        "No pudimos activar el rol de conductor."
      );
    } finally {
      setCambiandoRol(false);
    }
  };

  // =========================================================
  // FOTO ACTUAL DEL USUARIO
  // =========================================================

  const fotoActual =
    vistaPrevia ||
    usuario.foto_url ||
    null;

  console.log(
    "FOTO ACTUAL EN MI CUENTA:",
    fotoActual
  );

  // =========================================================
  // DETENER CÁMARA
  // =========================================================

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

  // =========================================================
  // ABRIR MENÚ DE FOTO
  // =========================================================

  const alternarOpcionesFoto = () => {
    setErrorFoto("");
    setMensajeFoto("");

    setMostrarOpcionesFoto(
      (estadoActual) => !estadoActual
    );
  };

  // =========================================================
  // ABRIR CÁMARA
  // =========================================================

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

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = flujo;
          videoRef.current.play().catch((error) => {
            console.error(
              "No se pudo iniciar la cámara:",
              error
            );
          });
        }
      }, 100);
    } catch (error) {
      console.error("Error al abrir la cámara:", error);

      setErrorFoto(
        "No pudimos acceder a la cámara. Verifica los permisos del navegador."
      );

      detenerCamara();
      setMostrarCamara(false);
    }
  };
  // =========================================================
  // CAPTURAR FOTO DESDE LA CÁMARA
  // =========================================================

  const capturarFoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setErrorFoto(
        "No fue posible preparar la captura de la imagen."
      );
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setErrorFoto(
        "La cámara todavía no está lista. Inténtalo nuevamente."
      );
      return;
    }

    const contexto = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    contexto.translate(canvas.width, 0);
    contexto.scale(-1, 1);

    contexto.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorFoto(
            "No pudimos generar la imagen capturada."
          );
          return;
        }

        const archivo = new File(
          [blob],
          `foto-perfil-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        if (vistaPrevia) {
          URL.revokeObjectURL(vistaPrevia);
        }

        setFotoSeleccionada(archivo);
        setVistaPrevia(URL.createObjectURL(archivo));

        detenerCamara();
        setMostrarCamara(false);
        setMensajeFoto(
          "Foto capturada. Recuerda guardar los cambios."
        );
        setErrorFoto("");
      },
      "image/jpeg",
      0.9
    );
  };

  // =========================================================
  // CANCELAR CÁMARA
  // =========================================================

  const cancelarCamara = () => {
    detenerCamara();
    setMostrarCamara(false);
  };

  // =========================================================
  // SELECCIONAR FOTO DEL EQUIPO
  // =========================================================

  const abrirSelectorArchivo = () => {
    setMostrarOpcionesFoto(false);
    setErrorFoto("");
    setMensajeFoto("");

    inputArchivoRef.current?.click();
  };

  const manejarArchivoSeleccionado = (evento) => {
    const archivo = evento.target.files?.[0];

    if (!archivo) {
      return;
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      setErrorFoto(
        "Selecciona una imagen JPG, PNG o WEBP."
      );

      evento.target.value = "";
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setErrorFoto(
        "La imagen no puede superar los 5 MB."
      );

      evento.target.value = "";
      return;
    }

    if (vistaPrevia) {
      URL.revokeObjectURL(vistaPrevia);
    }

    setFotoSeleccionada(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
    setMensajeFoto(
      "Imagen seleccionada. Pulsa Guardar foto para actualizar tu perfil."
    );
    setErrorFoto("");
    setMostrarOpcionesFoto(false);

    // Permitir seleccionar el mismo archivo otra vez.
    evento.target.value = "";
  };

  // =========================================================
  // GUARDAR FOTO EN EL BACKEND
  // =========================================================

  const guardarFoto = async () => {
    if (!fotoSeleccionada) {
      setErrorFoto(
        "Primero selecciona o captura una imagen."
      );
      return;
    }

    if (!idUsuario) {
      setErrorFoto(
        "No pudimos identificar tu cuenta. Inicia sesión nuevamente."
      );
      return;
    }

    try {
      setGuardandoFoto(true);
      setErrorFoto("");
      setMensajeFoto("");

      const formulario = new FormData();

      formulario.append("foto", fotoSeleccionada);

      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${idUsuario}/foto`,
        {
          method: "PUT",
          body: formulario,
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "No fue posible guardar la foto."
        );
      }

      const fotoGuardada =
        datos.usuario?.foto_url ||
        datos.foto_url;

      if (!fotoGuardada) {
        throw new Error(
          "El servidor no devolvió la dirección de la foto guardada."
        );
      }

      if (actualizarUsuario) {
        actualizarUsuario({
          ...usuario,
          ...(datos.usuario || {}),
          foto_url: fotoGuardada,
        });
      }

      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }

      setFotoSeleccionada(null);
      setVistaPrevia(null);
      setMensajeFoto(
        "Tu foto de perfil se actualizó correctamente."
      );
      setErrorFoto("");
    } catch (error) {
      console.error(
        "Error guardando la foto de perfil:",
        error
      );

      setErrorFoto(
        error.message ||
        "No fue posible guardar la foto de perfil."
      );
    } finally {
      setGuardandoFoto(false);
    }
  };

  // =========================================================
  // CANCELAR CAMBIOS DE FOTO
  // =========================================================

  const cancelarCambiosFoto = () => {
    if (vistaPrevia) {
      URL.revokeObjectURL(vistaPrevia);
    }

    setFotoSeleccionada(null);
    setVistaPrevia(null);
    setMensajeFoto("");
    setErrorFoto("");
    setMostrarOpcionesFoto(false);
  };

  // =========================================================
  // ELIMINAR FOTO DE PERFIL
  // =========================================================

  const eliminarFoto = async () => {
    if (!idUsuario) {
      setErrorFoto(
        "No pudimos identificar tu cuenta."
      );
      return;
    }

    const confirmar = window.confirm(
      "¿Estás seguro de que deseas eliminar tu foto de perfil?"
    );

    if (!confirmar) {
      return;
    }

    try {
      setEliminandoFoto(true);
      setErrorFoto("");
      setMensajeFoto("");

      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${idUsuario}/foto`,
        {
          method: "DELETE",
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "No fue posible eliminar la foto."
        );
      }

      if (actualizarUsuario) {
        actualizarUsuario({
          ...usuario,
          ...(datos.usuario || {}),
          foto_url: null,
        });
      }

      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }

      setFotoSeleccionada(null);
      setVistaPrevia(null);
      setMostrarOpcionesFoto(false);

      setMensajeFoto(
        "Tu foto de perfil fue eliminada correctamente."
      );
    } catch (error) {
      console.error(
        "Error eliminando foto:",
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
  // =========================================================
  // CAMBIAR A PASAJERO
  // =========================================================

  const cambiarAPasajero = async () => {
    if (!idUsuario) {
      setErrorRol(
        "No pudimos identificar tu cuenta."
      );
      return;
    }

    const confirmar = window.confirm(
      "¿Deseas cambiar tu rol a pasajero? Dejarás de tener acceso a las opciones exclusivas de conductor."
    );

    if (!confirmar) {
      return;
    }

    try {
      setCambiandoRol(true);
      setErrorRol("");
      setMensajeRol("");

      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${idUsuario}/rol`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rol: "pasajero",
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "No fue posible cambiar tu rol."
        );
      }

      if (actualizarUsuario) {
        actualizarUsuario({
          ...usuario,
          ...(datos.usuario || {}),
          rol: "pasajero",
          rol_solicitado: "pasajero",
          requiere_vehiculo: false,
        });
      }

      localStorage.removeItem(
        "tdea_go_registro_pendiente"
      );

      setMensajeRol(
        "Tu rol se actualizó correctamente. Ahora eres pasajero."
      );
    } catch (error) {
      console.error(
        "Error cambiando a pasajero:",
        error
      );

      setErrorRol(
        error.message ||
        "No fue posible cambiar el rol."
      );
    } finally {
      setCambiandoRol(false);
    }
  };

  // =========================================================
  // CAMBIAR A CONDUCTOR
  // =========================================================

  const solicitarRolConductor = () => {
    setErrorRol("");
    setMensajeRol("");

    if (esConductor) {
      setMensajeRol(
        "Tu cuenta ya tiene el rol de conductor."
      );
      return;
    }

    setMensajeRol(
      "Para activar el rol de conductor, registra los datos de tu vehículo en la sección inferior."
    );

    const seccionVehiculo =
      document.getElementById("seccion-registro-vehiculo");

    seccionVehiculo?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  // =========================================================
  // INTERFAZ PRINCIPAL DE MI CUENTA
  // =========================================================

  return (
    <section className="mi-cuenta-pagina">
      <div className="mi-cuenta-contenedor">

        {/* ENCABEZADO */}

        <div className="mi-cuenta-encabezado">
          <div>
            <span className="mi-cuenta-etiqueta">
              CUENTA PERSONAL
            </span>

            <h1>Mi cuenta</h1>

            <p>
              Consulta tus datos y administra tu perfil
              en TdeA GO.
            </p>
          </div>
        </div>

        {/* INFORMACIÓN DEL PERFIL */}

        <div className="mi-cuenta-grid">

          {/* TARJETA DE FOTO */}

          <article className="tarjeta-perfil">
            <div className="tarjeta-perfil-contenido">

              <div className="perfil-foto-contenedor">
                <div className="perfil-foto">
                  {fotoActual ? (
                    <img
                      src={fotoActual}
                      alt="Foto de perfil"
                      className="perfil-foto-imagen"
                    />
                  ) : (
                    <span className="perfil-foto-iniciales">
                      {iniciales || "U"}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="perfil-foto-editar"
                  onClick={alternarOpcionesFoto}
                  aria-label="Administrar foto de perfil"
                  title="Administrar foto de perfil"
                >
                  Editar
                </button>
              </div>

              <h2 className="perfil-nombre">
                {nombreCompleto}
              </h2>

              <p className="perfil-correo">
                {correo}
              </p>

              <span
                className={`perfil-rol ${esConductor
                  ? "perfil-rol-conductor"
                  : "perfil-rol-pasajero"
                  }`}
              >
                {esConductor
                  ? "Conductor"
                  : "Pasajero"}
              </span>

              {/* OPCIONES PARA ADMINISTRAR LA FOTO */}

              {mostrarOpcionesFoto && (
                <div className="perfil-opciones-foto">
                  <button
                    type="button"
                    onClick={abrirSelectorArchivo}
                    className="boton-opcion-foto"
                  >
                    Elegir imagen del equipo
                  </button>

                  <button
                    type="button"
                    onClick={abrirCamara}
                    className="boton-opcion-foto"
                  >
                    Tomar foto con la cámara
                  </button>

                  {usuario.foto_url && (
                    <button
                      type="button"
                      onClick={eliminarFoto}
                      disabled={eliminandoFoto}
                      className="boton-opcion-foto boton-eliminar-foto"
                    >
                      {eliminandoFoto
                        ? "Eliminando..."
                        : "Eliminar foto actual"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarOpcionesFoto(false)
                    }
                    className="boton-opcion-foto boton-cancelar-foto"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* SELECTOR DE ARCHIVOS */}

              <input
                ref={inputArchivoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={manejarArchivoSeleccionado}
                style={{ display: "none" }}
              />

              {/* VENTANA DE CÁMARA */}

              {mostrarCamara && (
                <div className="camara-contenedor">
                  <h3>Tomar foto</h3>

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camara-video"
                  />

                  <canvas
                    ref={canvasRef}
                    style={{ display: "none" }}
                  />

                  <div className="camara-acciones">
                    <button
                      type="button"
                      onClick={capturarFoto}
                      className="boton-guardar-foto"
                    >
                      Capturar foto
                    </button>

                    <button
                      type="button"
                      onClick={cancelarCamara}
                      className="boton-cancelar-foto"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* MENSAJES DE FOTO */}

              {mensajeFoto && (
                <p
                  className="mensaje-foto"
                  role="status"
                >
                  {mensajeFoto}
                </p>
              )}

              {errorFoto && (
                <p
                  className="error-foto"
                  role="alert"
                >
                  {errorFoto}
                </p>
              )}

              {/* GUARDAR FOTO */}

              {fotoSeleccionada && (
                <div className="acciones-foto-seleccionada">
                  <button
                    type="button"
                    onClick={guardarFoto}
                    disabled={guardandoFoto}
                    className="boton-guardar-foto"
                  >
                    {guardandoFoto
                      ? "Guardando..."
                      : "Guardar foto"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelarCambiosFoto}
                    disabled={guardandoFoto}
                    className="boton-cancelar-foto"
                  >
                    Descartar cambios
                  </button>
                </div>
              )}
            </div>
          </article>

          {/* TARJETA DE INFORMACIÓN PERSONAL */}

          <article className="tarjeta-informacion">
            <div className="tarjeta-seccion-encabezado">
              <div>
                <span className="mi-cuenta-etiqueta">
                  INFORMACIÓN PERSONAL
                </span>

                <h2>Datos de la cuenta</h2>
              </div>
            </div>

            <div className="informacion-datos">

              <div className="campo-informacion">
                <span className="campo-informacion-etiqueta">
                  Nombre completo
                </span>

                <p>{nombreCompleto}</p>
              </div>

              <div className="campo-informacion">
                <span className="campo-informacion-etiqueta">
                  Correo institucional
                </span>

                <p>{correo}</p>
              </div>

              <div className="campo-informacion">
                <span className="campo-informacion-etiqueta">
                  Teléfono
                </span>

                <p>{telefono}</p>
              </div>

              <div className="campo-informacion">
                <span className="campo-informacion-etiqueta">
                  Rol actual
                </span>

                <p>
                  {esConductor
                    ? "Conductor"
                    : "Pasajero"}
                </p>
              </div>

            </div>

            <p className="nota-informacion">
              Esta sección muestra la información registrada
              en tu cuenta.
            </p>
          </article>
        </div>
        {/* ADMINISTRACIÓN DEL ROL */}

        <section className="tarjeta-rol">
          <div className="tarjeta-rol-contenido">
            <div>
              <span className="mi-cuenta-etiqueta">
                TIPO DE USUARIO
              </span>

              <h2>
                {esConductor
                  ? "Tu cuenta de conductor"
                  : "Tu cuenta de pasajero"}
              </h2>

              <p>
                {esConductor
                  ? "Puedes administrar tus rutas y ofrecer cupos disponibles a otros estudiantes."
                  : "Puedes consultar rutas disponibles y solicitar cupos para tus desplazamientos."}
              </p>
            </div>

            <div className="tarjeta-rol-acciones">
              {esConductor ? (
                <button
                  type="button"
                  onClick={cambiarAPasajero}
                  disabled={cambiandoRol}
                  className="boton-secundario"
                >
                  {cambiandoRol
                    ? "Actualizando..."
                    : "Cambiar a pasajero"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={solicitarRolConductor}
                  className="boton-principal"
                >
                  Quiero ser conductor
                </button>
              )}
            </div>
          </div>

          {mensajeRol && (
            <p
              className="mensaje-rol"
              role="status"
            >
              {mensajeRol}
            </p>
          )}

          {errorRol && (
            <p
              className="error-rol"
              role="alert"
            >
              {errorRol}
            </p>
          )}
        </section>

        {/* REGISTRO DE VEHÍCULO */}

        <section
          className="tarjeta-vehiculo"
          id="seccion-registro-vehiculo"
        >
          <div className="tarjeta-vehiculo-encabezado">
            <span className="mi-cuenta-etiqueta">
              VEHÍCULO
            </span>

            <h2>
              {esConductor
                ? "Información de tu vehículo"
                : "Registra tu vehículo"}
            </h2>

            <p>
              {esConductor
                ? "Aquí puedes registrar o actualizar la información de tu vehículo."
                : "Para activar tu perfil de conductor debes registrar los datos de tu vehículo. Hasta completar este paso, no podrás publicar rutas."}
            </p>
          </div>

          {!esConductor && (
            <div className="aviso-registro-vehiculo">
              <strong>Antes de continuar</strong>

              <p>
                Completa el formulario y guarda los datos
                de tu vehículo. Después de registrarlo,
                activaremos el rol de conductor.
              </p>
            </div>
          )}

          <RegistrarVehiculo
            usuario={usuario}
            API_URL={API_URL}
            onVehiculoRegistrado={
              manejarVehiculoRegistrado
            }
          />

          {cambiandoRol && (
            <p className="mensaje-rol" role="status">
              Estamos activando tu perfil de conductor.
              No cierres esta página.
            </p>
          )}
        </section>
        {/* CERRAR SESIÓN */}

        <section className="seccion-cerrar-sesion">
          <div>
            <h2>¿Terminaste por ahora?</h2>

            <p>
              Puedes cerrar tu sesión de forma segura.
            </p>
          </div>

          <button
            type="button"
            onClick={cerrarSesion}
            className="boton-cerrar-sesion"
          >
            Cerrar sesión
          </button>
        </section>

      </div>
    </section>
  );
}

export default MiCuenta;