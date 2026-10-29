
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
  const [mostrarOpcionesFoto, setMostrarOpcionesFoto] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [guardandoFoto, setGuardandoFoto] = useState(false);
  const [mensajeFoto, setMensajeFoto] = useState("");
  const [tipoMensajeFoto, setTipoMensajeFoto] = useState("");
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [cargandoCamara, setCargandoCamara] = useState(false);

  const inputFotoRef = useRef(null);
  const videoRef = useRef(null);
  const flujoCamaraRef = useRef(null);
  const urlPreviaRef = useRef(null);

  const idUsuario = usuario?.id || usuario?.id_usuario;
  const fotoActual = vistaPrevia || usuario?.foto_url || null;

  const nombreUsuario =
    usuario?.nombre_completo || usuario?.nombre || "Usuario";

  const correoUsuario = usuario?.correo || usuario?.email || "No disponible";

  const rolActual = usuario?.rol?.toLowerCase() || "pasajero";
  const esConductor = rolActual === "conductor";

  function detenerCamara() {
    if (flujoCamaraRef.current) {
      flujoCamaraRef.current.getTracks().forEach((track) => track.stop());
      flujoCamaraRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCamaraActiva(false);
    setCargandoCamara(false);
  }

  function liberarVistaPrevia() {
    if (urlPreviaRef.current) {
      URL.revokeObjectURL(urlPreviaRef.current);
      urlPreviaRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (flujoCamaraRef.current) {
        flujoCamaraRef.current.getTracks().forEach((track) => track.stop());
      }

      if (urlPreviaRef.current) {
        URL.revokeObjectURL(urlPreviaRef.current);
      }
    };
  }, []);

  function abrirSelectorFoto() {
    setMostrarOpcionesFoto(false);
    inputFotoRef.current?.click();
  }

  function manejarArchivoFoto(evento) {
    const archivo = evento.target.files?.[0];

    if (!archivo) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setMensajeFoto("Selecciona una imagen JPG, PNG o WEBP.");
      setTipoMensajeFoto("error");
      evento.target.value = "";
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setMensajeFoto("La imagen no puede superar los 5 MB.");
      setTipoMensajeFoto("error");
      evento.target.value = "";
      return;
    }

    liberarVistaPrevia();

    const url = URL.createObjectURL(archivo);
    urlPreviaRef.current = url;

    setArchivoFoto(archivo);
    setVistaPrevia(url);
    setMensajeFoto("");
    setTipoMensajeFoto("");
    setMostrarOpcionesFoto(false);
  }

  async function activarCamara() {
    setMostrarOpcionesFoto(false);
    setMensajeFoto("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setMensajeFoto("Tu navegador no permite acceder a la cámara.");
      setTipoMensajeFoto("error");
      return;
    }

    try {
      setCargandoCamara(true);

      const flujo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      flujoCamaraRef.current = flujo;
      setCamaraActiva(true);
    } catch (error) {
      console.error("Error al abrir la cámara:", error);
      setMensajeFoto("No fue posible acceder a la cámara. Revisa los permisos.");
      setTipoMensajeFoto("error");
      setCargandoCamara(false);
    }
  }

  useEffect(() => {
    if (!camaraActiva || !videoRef.current || !flujoCamaraRef.current) {
      return;
    }

    videoRef.current.srcObject = flujoCamaraRef.current;

    videoRef.current.play().catch((error) => {
      console.error("No fue posible iniciar el video:", error);
    });

    setCargandoCamara(false);
  }, [camaraActiva]);

  function capturarFoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setMensajeFoto("Espera a que la cámara esté lista.");
      setTipoMensajeFoto("error");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexto = canvas.getContext("2d");

    if (!contexto) {
      setMensajeFoto("No fue posible capturar la imagen.");
      setTipoMensajeFoto("error");
      return;
    }

    contexto.translate(canvas.width, 0);
    contexto.scale(-1, 1);
    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMensajeFoto("No fue posible procesar la imagen.");
          setTipoMensajeFoto("error");
          return;
        }

        const archivo = new File([blob], "foto-perfil.jpg", {
          type: "image/jpeg",
        });

        liberarVistaPrevia();

        const url = URL.createObjectURL(archivo);
        urlPreviaRef.current = url;

        setArchivoFoto(archivo);
        setVistaPrevia(url);
        setMensajeFoto("");
        setTipoMensajeFoto("");
        detenerCamara();
      },
      "image/jpeg",
      0.9
    );
  }

  function cancelarCambioFoto() {
    liberarVistaPrevia();
    setArchivoFoto(null);
    setVistaPrevia(null);
    setMensajeFoto("");
    setTipoMensajeFoto("");

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }
  }

  async function guardarFoto() {
    if (!idUsuario || !archivoFoto) {
      setMensajeFoto("No se identificó al usuario o no seleccionaste una foto.");
      setTipoMensajeFoto("error");
      return;
    }

    try {
      setGuardandoFoto(true);
      setMensajeFoto("");

      const formulario = new FormData();
      formulario.append("foto", archivoFoto);

      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${idUsuario}/foto`,
        {
          method: "PUT",
          body: formulario,
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible guardar la foto.");
      }

      const fotoGuardada =
        datos.foto_url || datos.usuario?.foto_url || datos.perfil?.foto_url;

      if (!fotoGuardada) {
        throw new Error("La respuesta no contiene la dirección de la foto guardada.");
      }

      actualizarUsuario?.({ foto_url: fotoGuardada });

      liberarVistaPrevia();
      setArchivoFoto(null);
      setVistaPrevia(null);
      setMensajeFoto("Foto de perfil actualizada correctamente.");
      setTipoMensajeFoto("exito");

      if (inputFotoRef.current) {
        inputFotoRef.current.value = "";
      }
    } catch (error) {
      console.error("Error al guardar la foto:", error);
      setMensajeFoto(error.message || "No fue posible guardar la foto.");
      setTipoMensajeFoto("error");
    } finally {
      setGuardandoFoto(false);
    }
  }

  async function eliminarFoto() {
    if (!idUsuario) {
      setMensajeFoto("No se identificó al usuario.");
      setTipoMensajeFoto("error");
      return;
    }

    try {
      setGuardandoFoto(true);
      setMensajeFoto("");

      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${idUsuario}/foto`,
        { method: "DELETE" }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible eliminar la foto.");
      }

      liberarVistaPrevia();
      setArchivoFoto(null);
      setVistaPrevia(null);
      actualizarUsuario?.({ foto_url: null });

      setMensajeFoto("Foto de perfil eliminada.");
      setTipoMensajeFoto("exito");
      setMostrarOpcionesFoto(false);

      if (inputFotoRef.current) {
        inputFotoRef.current.value = "";
      }
    } catch (error) {
      console.error("Error al eliminar la foto:", error);
      setMensajeFoto(error.message || "No fue posible eliminar la foto.");
      setTipoMensajeFoto("error");
    } finally {
      setGuardandoFoto(false);
    }
  }

  async function manejarVehiculoRegistrado(vehiculo) {
    try {
      const respuesta = await fetch(`${API_URL}/api/usuarios/${idUsuario}/rol`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: "conductor" }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible activar el rol de conductor.");
      }

      actualizarUsuario?.({
        ...(datos.usuario || {}),
        rol: "conductor",
        rol_solicitado: "conductor",
        requiere_vehiculo: false,
      });

      setMensajeFoto("");
      console.log("Vehículo registrado correctamente:", vehiculo);
    } catch (error) {
      console.error("Error al activar el rol de conductor:", error);
      setMensajeFoto(
        `El vehículo se registró, pero no fue posible activar el rol de conductor: ${error.message}`
      );
      setTipoMensajeFoto("error");
    }
  }

  if (!usuario) {
    return (
      <section className="mi-cuenta-pagina">
        <div className="mi-cuenta-contenedor mi-cuenta-vacio">
          <h2>No hay una sesión activa</h2>
          <p>Inicia sesión para consultar tu cuenta.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mi-cuenta-pagina">
      <div className="mi-cuenta-contenedor">
        <div className="mi-cuenta-introduccion">
          <span className="mi-cuenta-etiqueta">MI ESPACIO PERSONAL</span>
          <h1>Mi cuenta</h1>
          <p>
            Administra tu información personal y configura tu experiencia en
            TdeA GO.
          </p>
        </div>

        <div className="mi-cuenta-grid">
          <article className="tarjeta-perfil">
            <div className="perfil-superior">
              <div className="zona-foto-perfil">
                <div className="avatar-grande">
                  {fotoActual ? (
                    <img src={fotoActual} alt={`Foto de ${nombreUsuario}`} />
                  ) : (
                    nombreUsuario.charAt(0).toUpperCase()
                  )}
                </div>

                <button
                  type="button"
                  className="boton-cambiar-foto"
                  onClick={() => setMostrarOpcionesFoto((actual) => !actual)}
                >
                  {fotoActual ? "Cambiar foto" : "Agregar foto"}
                </button>

                {mostrarOpcionesFoto && (
                  <div className="opciones-foto">
                    <button type="button" onClick={abrirSelectorFoto}>
                      Elegir imagen
                    </button>
                    <button type="button" onClick={activarCamara}>
                      Tomar foto
                    </button>
                    {fotoActual && (
                      <button type="button" onClick={eliminarFoto}>
                        Eliminar foto
                      </button>
                    )}
                  </div>
                )}

                <input
                  ref={inputFotoRef}
                  className="input-foto-oculto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={manejarArchivoFoto}
                />
              </div>

              <div className="perfil-identidad">
                <h2>{nombreUsuario}</h2>
                <span className="perfil-rol">
                  {esConductor ? "Conductor" : "Pasajero"}
                </span>
              </div>
            </div>

            {camaraActiva && (
              <div className="panel-camara">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="video-camara"
                />
                <div className="acciones-camara">
                  <button type="button" onClick={capturarFoto}>
                    Capturar foto
                  </button>
                  <button type="button" onClick={detenerCamara}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {cargandoCamara && <p>Iniciando cámara...</p>}

            {archivoFoto && (
              <div className="acciones-foto">
                <p className="texto-foto-seleccionada">
                  Tienes una foto nueva sin guardar.
                </p>
                <div className="botones-foto">
                  <button
                    type="button"
                    className="boton-guardar-foto"
                    onClick={guardarFoto}
                    disabled={guardandoFoto}
                  >
                    {guardandoFoto ? "Guardando..." : "Guardar foto"}
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

            {mensajeFoto && (
              <p
                className={`mensaje-foto ${tipoMensajeFoto === "error"
                  ? "mensaje-foto-error"
                  : "mensaje-foto-exito"
                  }`}
              >
                {mensajeFoto}
              </p>
            )}

            <div className="perfil-datos">
              <div className="dato-perfil">
                <span className="dato-etiqueta">Correo electrónico</span>
                <strong>{correoUsuario}</strong>
              </div>
              <div className="dato-perfil">
                <span className="dato-etiqueta">Tipo de cuenta</span>
                <strong>{esConductor ? "Conductor" : "Pasajero"}</strong>
              </div>
            </div>
          </article>

          <article className="tarjeta-experiencia">
            <div className="tarjeta-icono">TG</div>
            <span className="tarjeta-etiqueta">TU EXPERIENCIA</span>
            <h2>
              {esConductor
                ? "Comparte tus rutas con la comunidad"
                : "Encuentra una forma más organizada de viajar"}
            </h2>
            <p>
              {esConductor
                ? "Administra tu vehículo y publica rutas para que otros estudiantes puedan solicitar un cupo."
                : "Consulta las rutas disponibles y solicita un cupo según tus necesidades de desplazamiento."}
            </p>
          </article>
        </div>

        {(
          esConductor ||
          usuario?.requiere_vehiculo === true ||
          usuario?.rol_solicitado?.toLowerCase() === "conductor"
        ) && (
            <section className="seccion-experiencia">
              <div className="titulo-seccion">
                <span>MI VEHÍCULO</span>
                <h2>Información del vehículo</h2>
              </div>

              <RegistrarVehiculo
                usuarioId={idUsuario}
                API_URL={API_URL}
                onVehiculoRegistrado={manejarVehiculoRegistrado}
              />
            </section>
          )}

        <section className="seccion-configuracion">
          <div className="titulo-seccion">
            <span>CUENTA</span>
            <h2>Información de la cuenta</h2>
          </div>

          <div className="lista-configuracion">
            <div className="fila-configuracion">
              <div>
                <strong>Estado de la sesión</strong>
                <p>Tu cuenta está abierta en este dispositivo.</p>
              </div>
              <span className="estado-activo">Sesión activa</span>
            </div>
            <div className="fila-configuracion">
              <div>
                <strong>Datos personales</strong>
                <p>La información se utiliza para identificar tu cuenta en TdeA GO.</p>
              </div>
              <span className="estado-cuenta">Cuenta registrada</span>
            </div>
          </div>
        </section>

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
