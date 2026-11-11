
import "./App.css";
import { useEffect, useRef, useState } from "react";
import RegistrarVehiculo from "./paginas/RegistrarVehiculo";
import SolicitarViajeNuevo from "./paginas/SolicitarViajeNuevo";
import MisSolicitudesNuevas from "./paginas/MisSolicitudesNuevas";
import MisNotificaciones from "./paginas/MisNotificaciones";
import Administrador from "./pages/Administrador";
import AlertaSolicitud from "./components/AlertaSolicitud";
import useNotificacionesGlobales from "./hooks/useNotificacionesGlobales";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";

import Login from "./Login";
import RestablecerContrasena from "./RestablecerContrasena";
import Inicio from "./paginas/Inicio";
import BuscarRuta from "./paginas/BuscarRuta";
import PublicarRuta from "./paginas/PublicarRuta";
import MiCuenta from "./paginas/MiCuenta";
import MisSolicitudes from "./paginas/MisSolicitudes";
import MisRutas from "./paginas/MisRutas";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function cargarUsuarioGuardado() {
  // Eliminar sesiones antiguas que hayan quedado guardadas permanentemente.
  localStorage.removeItem("tdea_go_usuario");

  // Recuperar únicamente la sesión de la pestaña actual.
  const usuarioGuardado = sessionStorage.getItem("tdea_go_usuario");

  if (!usuarioGuardado) {
    return null;
  }

  try {
    let datosUsuario = JSON.parse(usuarioGuardado);

    const registroPendiente = localStorage.getItem(
      "tdea_go_registro_pendiente"
    );

    if (registroPendiente) {
      try {
        const pendiente = JSON.parse(registroPendiente);

        const correoUsuario = (
          datosUsuario.correo ||
          datosUsuario.email ||
          ""
        ).toLowerCase();

        const correoPendiente = (
          pendiente.correo || ""
        ).toLowerCase();

        if (
          pendiente.rol_solicitado === "conductor" &&
          correoUsuario &&
          correoUsuario === correoPendiente &&
          datosUsuario.rol?.toLowerCase() !== "conductor"
        ) {
          datosUsuario = {
            ...datosUsuario,
            rol_solicitado: "conductor",
            requiere_vehiculo: true,
          };
        }
      } catch {
        localStorage.removeItem("tdea_go_registro_pendiente");
      }
    }

    return datosUsuario;
  } catch {
    localStorage.removeItem("tdea_go_usuario");
    return null;
  }
}

function RutaSoloConductor({
  usuario,
  requiereRegistroVehiculo,
  children,
}) {
  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  if (requiereRegistroVehiculo) {
    return <Navigate to="/mi-cuenta" replace />;
  }

  if (usuario.rol?.toLowerCase() !== "conductor") {
    return <Navigate to="/buscar" replace />;
  }

  return children;
}

function Aplicacion() {
  const [usuario, setUsuario] = useState(cargarUsuarioGuardado);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const [mostrarModalVehiculo, setMostrarModalVehiculo] = useState(false);
  const [cambiandoRol, setCambiandoRol] = useState(false);
  const contenedorUsuarioRef = useRef(null);

  const [mostrarFormularioVehiculo, setMostrarFormularioVehiculo] =
    useState(false);
  const [registrandoVehiculo, setRegistrandoVehiculo] = useState(false);

  const navegar = useNavigate();
  const ubicacion = useLocation();

  // Cierra el menú al hacer clic fuera de él.
  useEffect(() => {
    const cerrarMenuAlHacerClicFuera = (evento) => {
      if (
        contenedorUsuarioRef.current &&
        !contenedorUsuarioRef.current.contains(evento.target)
      ) {
        setMostrarMenuUsuario(false);
      }
    };

    document.addEventListener(
      "mousedown",
      cerrarMenuAlHacerClicFuera
    );

    document.addEventListener(
      "touchstart",
      cerrarMenuAlHacerClicFuera
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        cerrarMenuAlHacerClicFuera
      );

      document.removeEventListener(
        "touchstart",
        cerrarMenuAlHacerClicFuera
      );
    };
  }, []);

  const requiereRegistroVehiculo = Boolean(
    usuario &&
    (
      usuario.requiere_vehiculo === true ||
      (
        usuario.rol_solicitado?.toLowerCase() === "conductor" &&
        usuario.rol?.toLowerCase() !== "conductor"
      )
    )
  );

  // Redirige a Mi cuenta si el usuario debe registrar su vehículo.
  useEffect(() => {
    if (
      requiereRegistroVehiculo &&
      ubicacion.pathname !== "/mi-cuenta"
    ) {
      navegar("/mi-cuenta", { replace: true });
    }
  }, [
    requiereRegistroVehiculo,
    ubicacion.pathname,
    navegar,
  ]);

  const actualizarUsuario = (datosActualizados) => {
    if (!datosActualizados) {
      return;
    }

    setUsuario((usuarioActual) => {
      const usuarioBase = usuarioActual || {};

      const usuarioActualizado = {
        ...usuarioBase,
        ...datosActualizados,
      };

      sessionStorage.setItem(
        "tdea_go_usuario",
        JSON.stringify(usuarioActualizado)
      );

      return usuarioActualizado;
    });
  };

  const manejarLoginExitoso = (datosUsuario) => {
    let usuarioFinal = { ...datosUsuario };

    const registroPendiente = localStorage.getItem(
      "tdea_go_registro_pendiente"
    );

    if (registroPendiente) {
      try {
        const pendiente = JSON.parse(registroPendiente);

        const correoUsuario = (
          usuarioFinal.correo ||
          usuarioFinal.email ||
          ""
        ).toLowerCase();

        const correoPendiente = (
          pendiente.correo || ""
        ).toLowerCase();

        if (
          pendiente.rol_solicitado === "conductor" &&
          correoUsuario &&
          correoUsuario === correoPendiente &&
          usuarioFinal.rol?.toLowerCase() !== "conductor"
        ) {
          usuarioFinal.rol_solicitado = "conductor";
          usuarioFinal.requiere_vehiculo = true;
        }
      } catch {
        localStorage.removeItem("tdea_go_registro_pendiente");
      }
    }

    setUsuario(usuarioFinal);

    sessionStorage.setItem(
      "tdea_go_usuario",
      JSON.stringify(usuarioFinal)
    );

    setMostrarLogin(false);
    setMostrarMenuUsuario(false);

    navegar(
      usuarioFinal.rol?.toLowerCase() === "administrador"
        ? "/admin"
        : usuarioFinal.requiere_vehiculo
          ? "/mi-cuenta"
          : "/mis-solicitudes"
    );
  };

  // Aviso cuando el sistema obliga a usar un rol por un viaje activo.
  const [avisoCompromiso, setAvisoCompromiso] = useState(null);

  const { resumen: resumenNotificaciones, refrescar: refrescarNotificaciones } =
    useNotificacionesGlobales({
      usuario,
      API_URL,
      alCambiarRol: (nuevoRol, compromiso) => {
        actualizarUsuario({ rol: nuevoRol });
        setAvisoCompromiso({ rol: nuevoRol, compromiso });
        navegar(nuevoRol === "conductor" ? "/mis-rutas" : "/buscar");
      },
    });

  const hayNotificacionesSinLeer = resumenNotificaciones.no_leidas > 0;

  const cerrarSesion = () => {
    localStorage.removeItem("tdea_go_usuario");
    sessionStorage.removeItem("tdea_go_usuario");

    setUsuario(null);
    setMostrarMenuUsuario(false);

    navegar("/");
  };

  const cambiarRol = async (nuevoRol) => {
    if (!usuario || cambiandoRol) return;

    // Los administradores no pueden cambiar su privilegio
    // mediante el menú normal de usuario.
    if (!["conductor", "pasajero"].includes(usuario.rol?.toLowerCase())) {
      alert("Tu cuenta no puede cambiar de rol desde esta opción.");
      return;
    }

    if (!["conductor", "pasajero"].includes(nuevoRol)) return;

    const idUsuario = usuario.id || usuario.id_usuario;
    const token = usuario.token || usuario.access_token;

    if (!idUsuario || !token) {
      alert("Tu sesión no tiene una autenticación válida. Cierra sesión e inicia nuevamente.");
      return;
    }

    setMostrarMenuUsuario(false);

    try {
      setCambiandoRol(true);

      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${encodeURIComponent(idUsuario)}/rol`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rol: nuevoRol }),
        }
      );

      const datos = await respuesta.json();

      if (
        !respuesta.ok &&
        nuevoRol === "conductor" &&
        (
          datos.requiereVehiculo === true ||
          datos.requiere_vehiculo === true
        )
      ) {
        setMostrarModalVehiculo(true);
        return;
      }

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible actualizar tu rol."
        );
      }

      const usuarioActualizado = {
        ...usuario,
        ...(datos.usuario || datos.perfil || {}),
        rol: nuevoRol,
        rol_solicitado: nuevoRol,
        requiere_vehiculo: false,
      };

      actualizarUsuario(usuarioActualizado);

      localStorage.removeItem("tdea_go_registro_pendiente");
      setMostrarModalVehiculo(false);
      setMostrarFormularioVehiculo(false);

      navegar(
        nuevoRol === "conductor" ? "/mis-rutas" : "/buscar"
      );
    } catch (error) {
      console.error("Error al cambiar el rol:", error);
      alert(error.message || "Ocurrió un error al cambiar de rol.");
    } finally {
      setCambiandoRol(false);
    }
  };

  const manejarVehiculoRegistradoEnModal = async (vehiculo) => {
    if (registrandoVehiculo) return;

    // Verifica que el formulario haya entregado el vehículo registrado.
    if (!vehiculo || typeof vehiculo !== "object") {
      alert(
        "No se recibieron los datos del vehículo. Verifica el registro e inténtalo nuevamente."
      );
      return;
    }

    const idUsuario = usuario?.id || usuario?.id_usuario;
    const token = usuario?.token || usuario?.access_token;

    if (!idUsuario || !token) {
      alert("No se pudo validar tu sesión. Inicia sesión nuevamente.");
      return;
    }

    try {
      setRegistrandoVehiculo(true);

      const respuesta = await fetch(
        `${API_URL}/api/usuarios/${encodeURIComponent(idUsuario)}/rol`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rol: "conductor" }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          "El vehículo se guardó, pero no fue posible activar el rol de conductor."
        );
      }

      const usuarioActualizado = {
        ...usuario,
        ...(datos.usuario || datos.perfil || {}),
        rol: "conductor",
        rol_solicitado: "conductor",
        requiere_vehiculo: false,
      };

      actualizarUsuario(usuarioActualizado);

      localStorage.removeItem("tdea_go_registro_pendiente");

      setMostrarFormularioVehiculo(false);
      setMostrarModalVehiculo(false);

      navegar("/mis-rutas");
    } catch (error) {
      console.error(
        "Error al activar el rol después de registrar el vehículo:",
        error
      );

      alert(
        `El vehículo se guardó, pero no fue posible activar el rol de conductor. ${error.message}`
      );
    } finally {
      setRegistrandoVehiculo(false);
    }
  };


  const irAlServicio = (ruta) => {
    setMostrarMenuUsuario(false);

    if (!usuario) {
      setMostrarLogin(true);
      return;
    }

    if (requiereRegistroVehiculo) {
      navegar("/mi-cuenta");
      return;
    }

    navegar(ruta);
  };

  const obtenerNombreUsuario = () => {
    if (!usuario) {
      return "Usuario";
    }

    return usuario.nombre_completo || usuario.nombre || "Usuario";
  };

  const obtenerRolUsuario = () => {
    return usuario?.rol?.toLowerCase() || "";
  };

  const esConductor = obtenerRolUsuario() === "conductor";
  const esPasajero = obtenerRolUsuario() === "pasajero";
  const esAdministrador = obtenerRolUsuario() === "administrador";
  const fotoUsuario = usuario?.foto_url || null;

  return (
    <div className="app">
      {avisoCompromiso && (
        <div className="banner-compromiso" role="status">
          Llegó la hora de tu viaje
          {avisoCompromiso.compromiso
            ? ` (${avisoCompromiso.compromiso.origen} → ${avisoCompromiso.compromiso.destino})`
            : ""}
          . Tu cuenta quedó en modo {avisoCompromiso.rol} hasta que lo cumplas.
          <button type="button" onClick={() => setAvisoCompromiso(null)}>
            Entendido
          </button>
        </div>
      )}

      {usuario && obtenerRolUsuario() === "conductor" && (
        <AlertaSolicitud
          alarmas={resumenNotificaciones.alarmas}
          API_URL={API_URL}
          token={usuario.token || usuario.access_token}
          alResponder={refrescarNotificaciones}
        />
      )}

      <header className="encabezado">
        <div className="contenedor encabezado-contenido">
          <Link
            to="/"
            className="marca-tdea"
            onClick={() => setMostrarMenuUsuario(false)}
          >
            <span className="marca-tdea-principal" translate="no">
              TdeA
            </span>

            <span className="marca-go" translate="no">
              GO
            </span>
          </Link>

          <nav className="navegacion-principal">
            {!usuario && (
              <Link
                to="/"
                className="enlace-navegacion"
                onClick={() => setMostrarMenuUsuario(false)}
              >
                Inicio
              </Link>
            )}
          </nav>

          <div className="acciones-encabezado">
            {usuario ? (
              <div
                className="contenedor-usuario"
                ref={contenedorUsuarioRef}
              >
                <button
                  type="button"
                  className="usuario-activo"
                  onClick={() =>
                    setMostrarMenuUsuario((actual) => !actual)
                  }
                  aria-expanded={mostrarMenuUsuario}
                  aria-haspopup="true"
                >
                  <span className="usuario-icono">
                    {fotoUsuario ? (
                      <img
                        src={fotoUsuario}
                        alt={`Foto de ${obtenerNombreUsuario()}`}
                        onError={(evento) => {
                          evento.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      obtenerNombreUsuario().charAt(0).toUpperCase()
                    )}
                  </span>

                  <span className="usuario-nombre">
                    {obtenerNombreUsuario()}
                  </span>

                  {hayNotificacionesSinLeer && (
                    <span
                      className="punto-notificacion"
                      aria-label="Tienes notificaciones sin leer"
                    />
                  )}

                  <span className="usuario-flecha">
                    {mostrarMenuUsuario ? "▲" : "▼"}
                  </span>
                </button>

                {mostrarMenuUsuario && (
                  <div className="menu-usuario">
                    <div className="menu-usuario-cabecera">
                      <strong>{obtenerNombreUsuario()}</strong>

                      <span className="rol-actual">
                        {esAdministrador
                          ? "Administradora"
                          : esConductor
                            ? "Conductor"
                            : "Pasajero"}
                      </span>
                    </div>

                    {esAdministrador && (
                      <Link
                        to="/admin"
                        className="opcion-menu-usuario"
                        onClick={() => setMostrarMenuUsuario(false)}
                      >
                        Panel administrativo
                      </Link>
                    )}

                    {esPasajero && (
                      <>
                        <Link
                          to="/buscar"
                          className="opcion-menu-usuario"
                          onClick={() => setMostrarMenuUsuario(false)}
                        >
                          Buscar ruta
                        </Link>

                        <Link
                          to="/mis-solicitudes"
                          className="opcion-menu-usuario"
                          onClick={() => setMostrarMenuUsuario(false)}
                        >
                          Mis reservas de cupo
                        </Link>

                        <Link
                          to="/solicitar-viaje"
                          className="opcion-menu-usuario"
                          onClick={() => setMostrarMenuUsuario(false)}
                        >
                          Solicitar viaje nuevo
                        </Link>

                        <Link
                          to="/mis-solicitudes-nuevas"
                          className="opcion-menu-usuario"
                          onClick={() => setMostrarMenuUsuario(false)}
                        >
                          Mis viajes solicitados
                        </Link>
                      </>
                    )}

                    {esConductor && (
                      <>
                        <Link
                          to="/publicar"
                          className="opcion-menu-usuario"
                          onClick={() => setMostrarMenuUsuario(false)}
                        >
                          Publicar ruta
                        </Link>

                        <Link
                          to="/mis-rutas"
                          className="opcion-menu-usuario"
                          onClick={() => setMostrarMenuUsuario(false)}
                        >
                          Mis rutas y solicitudes
                        </Link>
                      </>
                    )}

                    {!esAdministrador && (
                      <Link
                        to="/notificaciones"
                        className="opcion-menu-usuario"
                        onClick={() => setMostrarMenuUsuario(false)}
                      >
                        Notificaciones
                        {hayNotificacionesSinLeer && (
                          <span
                            className="punto-notificacion"
                            aria-label="Hay notificaciones sin leer"
                          />
                        )}
                      </Link>
                    )}

                    <Link
                      to="/mi-cuenta"
                      className="opcion-menu-usuario"
                      onClick={() => setMostrarMenuUsuario(false)}
                    >
                      Mi cuenta
                    </Link>

                    <div className="separador-menu" />

                    {esPasajero && (
                      <button
                        type="button"
                        className="opcion-menu-usuario opcion-cambio-rol"
                        onClick={() => cambiarRol("conductor")}
                      >
                        <span className="icono-opcion">C</span>

                        <span>
                          <strong>Quiero ser conductor</strong>
                          <small>
                            Registra tu vehículo para publicar rutas
                          </small>
                        </span>
                      </button>
                    )}

                    {esConductor && (
                      <button
                        type="button"
                        className="opcion-menu-usuario opcion-cambio-rol"
                        onClick={() => cambiarRol("pasajero")}
                      >
                        <span className="icono-opcion">P</span>

                        <span>
                          <strong>Quiero ser pasajero</strong>
                          <small>Busca una ruta disponible</small>
                        </span>
                      </button>
                    )}

                    <div className="separador-menu" />

                    <button
                      type="button"
                      className="opcion-menu-usuario opcion-cerrar-sesion"
                      onClick={cerrarSesion}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="boton-login-header"
                onClick={() => setMostrarLogin(true)}
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <Routes>
          <Route
            path="/restablecer-contrasena"
            element={<RestablecerContrasena />}
          />
          <Route
            path="/"
            element={
              requiereRegistroVehiculo ? (
                <Navigate to="/mi-cuenta" replace />
              ) : (
                <Inicio
                  usuario={usuario}
                  irAlServicio={irAlServicio}
                  abrirLogin={() => setMostrarLogin(true)}
                />
              )
            }
          />


          <Route
            path="/notificaciones"
            element={
              usuario ? (
                <MisNotificaciones usuario={usuario} API_URL={API_URL} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />


          <Route
            path="/buscar"
            element={
              requiereRegistroVehiculo ? (
                <Navigate to="/mi-cuenta" replace />
              ) : esConductor ? (
                <Navigate to="/mis-rutas" replace />
              ) : esAdministrador ? (
                <Navigate to="/admin" replace />
              ) : (
                <BuscarRuta
                  usuario={usuario}
                  API_URL={API_URL}
                  abrirLogin={() => setMostrarLogin(true)}
                />
              )
            }
          />

          <Route
            path="/publicar"
            element={
              <RutaSoloConductor
                usuario={usuario}
                requiereRegistroVehiculo={requiereRegistroVehiculo}
              >
                <PublicarRuta
                  usuario={usuario}
                  API_URL={API_URL}
                  abrirLogin={() => setMostrarLogin(true)}
                />
              </RutaSoloConductor>
            }
          />

          <Route
            path="/mi-cuenta"
            element={
              usuario ? (
                <MiCuenta
                  usuario={usuario}
                  actualizarUsuario={actualizarUsuario}
                  cerrarSesion={cerrarSesion}
                  API_URL={API_URL}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/mis-solicitudes"
            element={
              usuario ? (
                requiereRegistroVehiculo ? (
                  <Navigate to="/mi-cuenta" replace />
                ) : !esPasajero ? (
                  <Navigate to={esConductor ? "/mis-rutas" : "/admin"} replace />
                ) : (
                  <MisSolicitudes
                    usuario={usuario}
                    API_URL={API_URL}
                  />
                )
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/solicitar-viaje"
            element={
              usuario ? (
                usuario.rol?.toLowerCase() === "pasajero" ? (
                  <SolicitarViajeNuevo usuario={usuario} API_URL={API_URL} />
                ) : (
                  <Navigate to="/mis-rutas" replace />
                )
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/mis-solicitudes-nuevas"
            element={
              usuario ? (
                usuario.rol?.toLowerCase() === "pasajero" ? (
                  <MisSolicitudesNuevas usuario={usuario} API_URL={API_URL} />
                ) : (
                  <Navigate to="/mis-rutas" replace />
                )
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/mis-rutas"
            element={
              <RutaSoloConductor
                usuario={usuario}
                requiereRegistroVehiculo={requiereRegistroVehiculo}
              >
                <MisRutas
                  usuario={usuario}
                  API_URL={API_URL}
                />
              </RutaSoloConductor>
            }
          />

          <Route
            path="/admin"
            element={
              usuario?.rol?.toLowerCase() === "administrador" ? (
                <Administrador
                  usuario={usuario}
                  API_URL={API_URL}
                  onCerrarSesion={cerrarSesion}
                  onInicio={() => navegar("/")}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </main>

      <footer className="pie-pagina">
        <div className="contenedor pie-contenido">
          <div>
            <div className="marca-tdea marca-footer">
              <span
                className="marca-tdea-principal"
                translate="no"
              >
                TdeA
              </span>

              <span className="marca-go" translate="no">
                GO
              </span>
            </div>

            <p>
              Transporte compartido para la comunidad TdeA.
            </p>
          </div>

          <div className="pie-derechos" translate="no">
            © {new Date().getFullYear()} TdeA GO
          </div>
        </div>
      </footer>

      {mostrarModalVehiculo && (
        <div
          className="modal-overlay"
          onMouseDown={(evento) => {
            if (
              evento.target === evento.currentTarget &&
              !registrandoVehiculo
            ) {
              setMostrarFormularioVehiculo(false);
              setMostrarModalVehiculo(false);
            }
          }}
        >
          <div
            className="modal-card modal-vehiculo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-vehiculo"
          >
            <button
              type="button"
              className="modal-cerrar"
              onClick={() => {
                if (registrandoVehiculo) return;

                setMostrarFormularioVehiculo(false);
                setMostrarModalVehiculo(false);
              }}
              aria-label="Cerrar"
              disabled={registrandoVehiculo}
            >
              ×
            </button>

            {!mostrarFormularioVehiculo ? (
              <>
                <span className="modal-vehiculo-etiqueta">
                  PERFIL DE CONDUCTOR
                </span>

                <h2 id="titulo-modal-vehiculo">
                  Registra tu vehículo
                </h2>

                <p>
                  Para publicar rutas en TdeA GO, primero debes registrar
                  los datos de tu vehículo.
                </p>

                <div className="acciones-modal-vehiculo">
                  <button
                    type="button"
                    className="boton-modal-vehiculo-principal"
                    onClick={() => setMostrarFormularioVehiculo(true)}
                  >
                    Registrar vehículo
                  </button>

                  <button
                    type="button"
                    className="boton-modal-vehiculo-secundario"
                    onClick={() => setMostrarModalVehiculo(false)}
                  >
                    Ahora no
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="modal-vehiculo-etiqueta">
                  DATOS DEL VEHÍCULO
                </span>

                <h2 id="titulo-modal-vehiculo">
                  Información del vehículo
                </h2>

                <p>
                  Completa los datos para continuar con la activación
                  de tu perfil de conductor.
                </p>

                <RegistrarVehiculo
                  usuarioId={usuario?.id || usuario?.id_usuario}
                  API_URL={API_URL}
                  onVehiculoRegistrado={manejarVehiculoRegistradoEnModal}
                />

                {registrandoVehiculo && (
                  <p className="modal-vehiculo-procesando">
                    Activando tu perfil de conductor...
                  </p>
                )}

                <button
                  type="button"
                  className="boton-modal-vehiculo-secundario"
                  disabled={registrandoVehiculo}
                  onClick={() => setMostrarFormularioVehiculo(false)}
                >
                  Volver
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {mostrarLogin && (
        <div
          className="modal-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setMostrarLogin(false);
            }
          }}
        >
          <div className="modal-card">
            <button
              type="button"
              className="modal-cerrar"
              onClick={() => setMostrarLogin(false)}
              aria-label="Cerrar"
            >
              ×
            </button>

            <Login onLoginExitoso={manejarLoginExitoso} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Aplicacion />
    </BrowserRouter>
  );
}
