
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

const MENSAJE_CONFIRMACION =
  "¡Correo confirmado correctamente! Ahora inicia sesión para continuar en TdeA GO.";

// Recuperar la sesión guardada sin usar un efecto de React.
function recuperarUsuario() {
  try {
    const usuarioGuardado = localStorage.getItem("tdea_go_usuario");
    return usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
  } catch {
    localStorage.removeItem("tdea_go_usuario");
    return null;
  }
}

// Esta ruta se declara fuera de Aplicacion para evitar que React
// cree un componente nuevo en cada renderizado.
function RutaSoloConductor({ usuario, children }) {
  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  if (String(usuario.rol || "").toLowerCase() !== "conductor") {
    return <Navigate to="/buscar" replace />;
  }

  return children;
}

function Aplicacion() {
  const ubicacion = useLocation();
  const navegar = useNavigate();

  const confirmacionEnURL =
    new URLSearchParams(ubicacion.search).get("confirmacion") ===
    "exitosa";

  const [usuario, setUsuario] = useState(recuperarUsuario);

  const [mostrarLogin, setMostrarLogin] = useState(
    () => confirmacionEnURL
  );

  const [mensajeConfirmacion, setMensajeConfirmacion] = useState(
    () => (confirmacionEnURL ? MENSAJE_CONFIRMACION : "")
  );

  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const [mostrarMenuMovil, setMostrarMenuMovil] = useState(false);

  const contenedorUsuarioRef = useRef(null);

  // Limpiar el parámetro de confirmación de la dirección.
  // La navegación es una sincronización con la URL; no se actualiza
  // el estado de React dentro de este efecto.
  useEffect(() => {
    if (confirmacionEnURL) {
      navegar("/", { replace: true });
    }
  }, [confirmacionEnURL, navegar]);

  // Cerrar el menú del usuario al hacer clic fuera de él.
  useEffect(() => {
    const cerrarMenuAlHacerClicFuera = (evento) => {
      if (
        contenedorUsuarioRef.current &&
        !contenedorUsuarioRef.current.contains(evento.target)
      ) {
        setMostrarMenuUsuario(false);
      }
    };

    document.addEventListener("mousedown", cerrarMenuAlHacerClicFuera);
    document.addEventListener("touchstart", cerrarMenuAlHacerClicFuera);

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

  // =========================================================
  // NAVEGACIÓN Y MENÚS
  // =========================================================

  const navegarA = (ruta) => {
    setMostrarMenuUsuario(false);
    setMostrarMenuMovil(false);
    navegar(ruta);
  };

  const irAlServicio = (ruta) => {
    setMostrarMenuMovil(false);
    setMostrarMenuUsuario(false);

    if (!usuario) {
      setMostrarLogin(true);
      return;
    }

    navegar(ruta);
  };

  const navegarMenuMovil = (ruta) => {
    setMostrarMenuMovil(false);
    navegarA(ruta);
  };

  // =========================================================
  // ACTUALIZAR USUARIO
  // =========================================================

  const actualizarUsuario = (datosActualizados) => {
    if (!datosActualizados) return;

    const usuarioActualizado = {
      ...(usuario || {}),
      ...datosActualizados,
    };

    setUsuario(usuarioActualizado);

    localStorage.setItem(
      "tdea_go_usuario",
      JSON.stringify(usuarioActualizado)
    );
  };

  // =========================================================
  // INICIO DE SESIÓN
  // =========================================================

  const manejarLoginExitoso = (datosUsuario) => {
    setUsuario(datosUsuario);

    localStorage.setItem(
      "tdea_go_usuario",
      JSON.stringify(datosUsuario)
    );

    setMostrarLogin(false);
    setMostrarMenuUsuario(false);
    setMostrarMenuMovil(false);
    setMensajeConfirmacion("");

    const rol = String(datosUsuario?.rol || "pasajero")
      .trim()
      .toLowerCase();

    if (rol === "conductor") {
      navegar("/mi-cuenta");
    } else {
      navegar("/mis-solicitudes");
    }
  };

  // =========================================================
  // CERRAR SESIÓN
  // =========================================================

  const cerrarSesion = () => {
    localStorage.removeItem("tdea_go_usuario");

    setUsuario(null);
    setMostrarMenuUsuario(false);
    setMostrarMenuMovil(false);

    navegar("/");
  };

  // =========================================================
  // CAMBIAR ROL ACTIVO
  // =========================================================

  const cambiarRol = (nuevoRol) => {
    if (!usuario) return;

    setMostrarMenuUsuario(false);
    setMostrarMenuMovil(false);

    // Para ser conductor, primero debe registrar el vehículo.
    if (nuevoRol === "conductor") {
      navegar("/mi-cuenta");
      return;
    }

    const usuarioActualizado = {
      ...usuario,
      rol: "pasajero",
    };

    actualizarUsuario(usuarioActualizado);
    navegar("/buscar");
  };

  // =========================================================
  // DATOS DEL USUARIO
  // =========================================================

  const obtenerNombreUsuario = () => {
    if (!usuario) return "Usuario";

    return (
      usuario.nombre_completo ||
      usuario.nombre ||
      "Usuario"
    );
  };

  const obtenerRolUsuario = () =>
    String(usuario?.rol || "").toLowerCase();

  const esConductor = obtenerRolUsuario() === "conductor";
  const esPasajero = obtenerRolUsuario() === "pasajero";
  const fotoUsuario = usuario?.foto_url || null;

  return (
    <div className="app">
      {/* ENCABEZADO */}
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

          {/* NAVEGACIÓN DE ESCRITORIO */}
          <nav className="navegacion-principal">
            <Link
              to="/"
              className="enlace-navegacion"
              onClick={() => setMostrarMenuUsuario(false)}
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
                onClick={() => navegarA("/mi-cuenta")}
              >
                Mi cuenta
              </button>
            )}
          </nav>

          {/* MENÚ MÓVIL */}
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

          {/* ACCIONES DEL ENCABEZADO */}
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
                      onClick={() => navegarA("/mi-cuenta")}
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
                          <small>Publica tus propias rutas</small>
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

      {/* AVISO DE CONFIRMACIÓN DEL CORREO */}
      {mensajeConfirmacion && (
        <div
          role="status"
          style={{
            maxWidth: "1100px",
            margin: "16px auto",
            padding: "14px 18px",
            border: "1px solid #86c99a",
            borderRadius: "10px",
            backgroundColor: "#edf9f0",
            color: "#205c32",
            lineHeight: 1.5,
          }}
        >
          <strong>Confirmación completada</strong>
          <p style={{ margin: "4px 0 0" }}>
            {mensajeConfirmacion}
          </p>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Inicio
                usuario={usuario}
                irAlServicio={irAlServicio}
                abrirLogin={() => setMostrarLogin(true)}
              />
            }
          />

          <Route
            path="/buscar"
            element={
              <BuscarRuta
                usuario={usuario}
                API_URL={API_URL}
                abrirLogin={() => setMostrarLogin(true)}
              />
            }
          />

          <Route
            path="/publicar"
            element={
              <RutaSoloConductor usuario={usuario}>
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
                <MisSolicitudes
                  usuario={usuario}
                  API_URL={API_URL}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/mis-rutas"
            element={
              <RutaSoloConductor usuario={usuario}>
                <MisRutas
                  usuario={usuario}
                  API_URL={API_URL}
                />
              </RutaSoloConductor>
            }
          />
        </Routes>
      </main>

      {/* PIE DE PÁGINA */}
      <footer className="pie-pagina">
        <div className="contenedor pie-contenido">
          <div>
            <div className="marca-tdea marca-footer">
              <span className="marca-tdea-principal" translate="no">
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

      {/* MODAL DE INICIO DE SESIÓN */}
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
