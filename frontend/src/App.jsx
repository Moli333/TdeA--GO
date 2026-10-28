import "./App.css";
import { useEffect, useRef, useState } from "react";

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
import Inicio from "./paginas/Inicio";
import BuscarRuta from "./paginas/BuscarRuta";
import PublicarRuta from "./paginas/PublicarRuta";
import MiCuenta from "./paginas/MiCuenta";
import MisSolicitudes from "./paginas/MisSolicitudes";
import MisRutas from "./paginas/MisRutas";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

// Recupera el usuario antes del primer renderizado.
function cargarUsuarioGuardado() {
  const usuarioGuardado = localStorage.getItem("tdea_go_usuario");

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
          pendiente.rol === "conductor" &&
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

// Componente declarado fuera de Aplicacion para evitar
// que React lo vuelva a crear en cada renderizado.
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
  const [mostrarMenuMovil, setMostrarMenuMovil] = useState(false);

  const contenedorUsuarioRef = useRef(null);

  const navegar = useNavigate();
  const ubicacion = useLocation();

  // Cierra el menú del usuario cuando se hace clic fuera.
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

  // Redirige al registro del vehículo cuando sea necesario.
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

      localStorage.setItem(
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
          pendiente.rol === "conductor" &&
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

    localStorage.setItem(
      "tdea_go_usuario",
      JSON.stringify(usuarioFinal)
    );

    setMostrarLogin(false);
    setMostrarMenuUsuario(false);
    setMostrarMenuMovil(false);

    navegar(
      usuarioFinal.requiere_vehiculo
        ? "/mi-cuenta"
        : "/mis-solicitudes"
    );
  };

  const cerrarSesion = () => {
    localStorage.removeItem("tdea_go_usuario");

    setUsuario(null);
    setMostrarMenuUsuario(false);
    setMostrarMenuMovil(false);

    navegar("/");
  };

  const cambiarRol = (nuevoRol) => {
    if (!usuario) {
      return;
    }

    setMostrarMenuUsuario(false);
    setMostrarMenuMovil(false);

    if (nuevoRol === "conductor") {
      navegar("/mi-cuenta");
      return;
    }

    const usuarioActualizado = {
      ...usuario,
      rol: "pasajero",
      rol_solicitado: "pasajero",
      requiere_vehiculo: false,
    };

    actualizarUsuario(usuarioActualizado);
    navegar("/buscar");
  };

  const irAlServicio = (ruta) => {
    setMostrarMenuMovil(false);
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

  const navegarMenuMovil = (ruta) => {
    setMostrarMenuMovil(false);
    setMostrarMenuUsuario(false);
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

  const fotoUsuario = usuario?.foto_url || null;
  return (
    <div className="app">
      <header className="encabezado">
        <div className="contenedor encabezado-contenido">
          <Link
            to="/"
            className="marca-tdea"
            onClick={() => {
              setMostrarMenuUsuario(false);
              setMostrarMenuMovil(false);
            }}
          >
            <span className="marca-tdea-principal" translate="no">
              TdeA
            </span>

            <span className="marca-go" translate="no">
              GO
            </span>
          </Link>

          <nav className="navegacion-principal">
            <Link
              to="/"
              className="enlace-navegacion"
              onClick={() => {
                setMostrarMenuUsuario(false);
                setMostrarMenuMovil(false);
              }}
            >
              Inicio
            </Link>

            <button
              className="enlace-navegacion boton-navegacion"
              onClick={() => irAlServicio("/buscar")}
            >
              Buscar ruta
            </button>

            {esConductor && (
              <>
                <button
                  className="enlace-navegacion boton-navegacion"
                  onClick={() => irAlServicio("/publicar")}
                >
                  Publicar ruta
                </button>

                <button
                  className="enlace-navegacion boton-navegacion"
                  onClick={() => irAlServicio("/mis-rutas")}
                >
                  Mis rutas
                </button>
              </>
            )}

            {esPasajero && (
              <button
                className="enlace-navegacion boton-navegacion"
                onClick={() => irAlServicio("/mis-solicitudes")}
              >
                Mis solicitudes
              </button>
            )}

            {usuario && (
              <button
                className="enlace-navegacion boton-navegacion"
                onClick={() => {
                  setMostrarMenuUsuario(false);
                  navegar("/mi-cuenta");
                }}
              >
                Mi cuenta
              </button>
            )}
          </nav>

          <div className="menu-movil">
            <button
              className="boton-menu-movil"
              onClick={() => setMostrarMenuMovil((actual) => !actual)}
              aria-expanded={mostrarMenuMovil}
              aria-label="Abrir menú de navegación"
            >
              <span className="icono-menu-movil">
                {mostrarMenuMovil ? "×" : "☰"}
              </span>

              <span>Menú</span>
            </button>

            {mostrarMenuMovil && (
              <div className="lista-menu-movil">
                <button
                  className="opcion-menu-movil"
                  onClick={() => navegarMenuMovil("/")}
                >
                  Inicio
                </button>

                <button
                  className="opcion-menu-movil"
                  onClick={() => irAlServicio("/buscar")}
                >
                  Buscar ruta
                </button>

                {esConductor && (
                  <>
                    <button
                      className="opcion-menu-movil"
                      onClick={() => irAlServicio("/publicar")}
                    >
                      Publicar ruta
                    </button>

                    <button
                      className="opcion-menu-movil"
                      onClick={() => irAlServicio("/mis-rutas")}
                    >
                      Mis rutas
                    </button>
                  </>
                )}

                {esPasajero && (
                  <button
                    className="opcion-menu-movil"
                    onClick={() => irAlServicio("/mis-solicitudes")}
                  >
                    Mis solicitudes
                  </button>
                )}

                {usuario && (
                  <button
                    className="opcion-menu-movil"
                    onClick={() => navegarMenuMovil("/mi-cuenta")}
                  >
                    Mi cuenta
                  </button>
                )}

                {!usuario && (
                  <button
                    className="opcion-menu-movil opcion-login-movil"
                    onClick={() => {
                      setMostrarMenuMovil(false);
                      setMostrarLogin(true);
                    }}
                  >
                    Iniciar sesión
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="acciones-encabezado">
            {usuario ? (
              <div
                className="contenedor-usuario"
                ref={contenedorUsuarioRef}
              >
                <button
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
                          console.error(
                            "No fue posible cargar la foto del encabezado:",
                            fotoUsuario
                          );

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

                  <span className="usuario-flecha">
                    {mostrarMenuUsuario ? "▲" : "▼"}
                  </span>
                </button>

                {mostrarMenuUsuario && (
                  <div className="menu-usuario">
                    <div className="menu-usuario-cabecera">
                      <strong>{obtenerNombreUsuario()}</strong>

                      <span className="rol-actual">
                        {esConductor ? "Conductor" : "Pasajero"}
                      </span>
                    </div>

                    <button
                      className="opcion-menu-usuario"
                      onClick={() => {
                        setMostrarMenuUsuario(false);
                        navegar("/mi-cuenta");
                      }}
                    >
                      Mi cuenta
                    </button>

                    {esPasajero && (
                      <button
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
            path="/buscar"
            element={
              requiereRegistroVehiculo ? (
                <Navigate to="/mi-cuenta" replace />
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