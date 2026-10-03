import "./App.css";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
} from "react-router-dom";

import Login from "./Login";

import Inicio from "./paginas/Inicio";
import BuscarRuta from "./paginas/BuscarRuta";
import PublicarRuta from "./paginas/PublicarRuta";
import MiCuenta from "./paginas/MiCuenta";
import MisSolicitudes from "./paginas/MisSolicitudes";
import MisRutas from "./paginas/MisRutas";

// Puerto del backend
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function Aplicacion() {
  const [usuario, setUsuario] = useState(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);

  const navegar = useNavigate();

  // =========================================================
  // RECUPERAR USUARIO
  // =========================================================

  useEffect(() => {
    const usuarioGuardado =
      localStorage.getItem("tdea_go_usuario");

    if (usuarioGuardado) {
      try {
        const datosUsuario =
          JSON.parse(usuarioGuardado);

        setUsuario(datosUsuario);
      } catch {
        localStorage.removeItem("tdea_go_usuario");
      }
    }
  }, []);

  // =========================================================
  // ACTUALIZAR USUARIO
  // =========================================================
  //
  // Esta función mantiene todos los datos actuales del usuario
  // y reemplaza únicamente los datos que lleguen actualizados.
  //
  // Es especialmente importante para foto_url.
  // =========================================================

  const actualizarUsuario = (datosActualizados) => {
    if (!datosActualizados) {
      return;
    }

    setUsuario((usuarioActual) => {
      const usuarioBase =
        usuarioActual || {};

      const usuarioActualizado = {
        ...usuarioBase,
        ...datosActualizados,
      };

      console.log(
        "USUARIO ACTUALIZADO EN APP:",
        usuarioActualizado
      );

      console.log(
        "FOTO GUARDADA EN APP:",
        usuarioActualizado.foto_url
      );

      localStorage.setItem(
        "tdea_go_usuario",
        JSON.stringify(usuarioActualizado)
      );

      return usuarioActualizado;
    });
  };

  // =========================================================
  // LOGIN
  // =========================================================

  const manejarLoginExitoso = (datosUsuario) => {
    setUsuario(datosUsuario);

    localStorage.setItem(
      "tdea_go_usuario",
      JSON.stringify(datosUsuario)
    );

    setMostrarLogin(false);
    setMostrarMenuUsuario(false);

    navegar("/mis-solicitudes");
  };

  // =========================================================
  // CERRAR SESIÓN
  // =========================================================

  const cerrarSesion = () => {
    localStorage.removeItem("tdea_go_usuario");

    setUsuario(null);
    setMostrarMenuUsuario(false);

    navegar("/");
  };

  // =========================================================
  // CAMBIAR ROL ACTIVO
  // =========================================================
  //
  // Este cambio modifica el rol activo de la sesión.
  // No modifica todavía el registro del usuario en la base de datos.
  //
  // La foto y los demás datos del usuario se conservan.
  // =========================================================

  const cambiarRol = (nuevoRol) => {
    if (!usuario) return;

    const usuarioActualizado = {
      ...usuario,
      rol: nuevoRol,
    };

    setUsuario(usuarioActualizado);

    localStorage.setItem(
      "tdea_go_usuario",
      JSON.stringify(usuarioActualizado)
    );

    setMostrarMenuUsuario(false);

    if (nuevoRol === "conductor") {
      navegar("/publicar");
    } else {
      navegar("/buscar");
    }
  };

  // =========================================================
  // ACCESO A SERVICIOS
  // =========================================================

  const irAlServicio = (ruta) => {
    if (!usuario) {
      setMostrarLogin(true);
      return;
    }

    navegar(ruta);
  };

  // =========================================================
  // NOMBRE DEL USUARIO
  // =========================================================

  const obtenerNombreUsuario = () => {
    if (!usuario) return "Usuario";

    return (
      usuario.nombre_completo ||
      usuario.nombre ||
      "Usuario"
    );
  };

  // =========================================================
  // ROL ACTUAL
  // =========================================================

  const obtenerRolUsuario = () => {
    if (!usuario) return "";

    return usuario.rol?.toLowerCase() || "";
  };

  const esConductor =
    obtenerRolUsuario() === "conductor";

  const esPasajero =
    obtenerRolUsuario() === "pasajero";

  // =========================================================
  // RUTA PROTEGIDA PARA CONDUCTORES
  // =========================================================

  const RutaSoloConductor = ({ children }) => {
    if (!usuario) {
      return <Navigate to="/" replace />;
    }

    if (!esConductor) {
      return <Navigate to="/buscar" replace />;
    }

    return children;
  };

  // =========================================================
  // FOTO DEL USUARIO
  // =========================================================

  const obtenerFotoUsuario = () => {
    if (!usuario?.foto_url) {
      return null;
    }

    return usuario.foto_url;
  };

  const fotoUsuario = obtenerFotoUsuario();

  return (
    <div className="app">

      {/* =====================================================
          ENCABEZADO
          ===================================================== */}

      <header className="encabezado">
        <div className="contenedor encabezado-contenido">

          {/* MARCA */}

          <Link to="/" className="marca-tdea">
            <span
              className="marca-tdea-principal"
              translate="no"
            >
              TdeA
            </span>

            <span
              className="marca-go"
              translate="no"
            >
              GO
            </span>
          </Link>

          {/* =================================================
              NAVEGACIÓN PRINCIPAL
              ================================================= */}

          <nav className="navegacion-principal">

            <Link
              to="/"
              className="enlace-navegacion"
            >
              Inicio
            </Link>

            <button
              className="enlace-navegacion boton-navegacion"
              onClick={() =>
                irAlServicio("/buscar")
              }
            >
              Buscar ruta
            </button>

            {/* ---------------------------------------------
                SOLO CONDUCTOR
                --------------------------------------------- */}

            {esConductor && (
              <>
                <button
                  className="enlace-navegacion boton-navegacion"
                  onClick={() =>
                    irAlServicio("/publicar")
                  }
                >
                  Publicar ruta
                </button>

                <button
                  className="enlace-navegacion boton-navegacion"
                  onClick={() =>
                    irAlServicio("/mis-rutas")
                  }
                >
                  Mis rutas
                </button>
              </>
            )}

            {/* ---------------------------------------------
                SOLO PASAJERO
                --------------------------------------------- */}

            {esPasajero && (
              <button
                className="enlace-navegacion boton-navegacion"
                onClick={() =>
                  irAlServicio("/mis-solicitudes")
                }
              >
                Mis solicitudes
              </button>
            )}

            {/* ---------------------------------------------
                MI CUENTA
                --------------------------------------------- */}

            {usuario && (
              <button
                className="enlace-navegacion boton-navegacion"
                onClick={() =>
                  navegar("/mi-cuenta")
                }
              >
                Mi cuenta
              </button>
            )}

          </nav>

          {/* =================================================
              ACCIONES DEL ENCABEZADO
              ================================================= */}

          <div className="acciones-encabezado">

            {usuario ? (
              <div className="contenedor-usuario">

                {/* -------------------------------------------
                    BOTÓN DEL USUARIO
                    ------------------------------------------- */}

                <button
                  className="usuario-activo"
                  onClick={() =>
                    setMostrarMenuUsuario(
                      !mostrarMenuUsuario
                    )
                  }
                  aria-expanded={
                    mostrarMenuUsuario
                  }
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

                          evento.currentTarget.style.display =
                            "none";
                        }}
                      />
                    ) : (
                      obtenerNombreUsuario()
                        .charAt(0)
                        .toUpperCase()
                    )}

                  </span>

                  <span className="usuario-nombre">
                    {obtenerNombreUsuario()}
                  </span>

                  <span className="usuario-flecha">
                    {mostrarMenuUsuario
                      ? "▲"
                      : "▼"}
                  </span>

                </button>

                {/* -------------------------------------------
                    MENÚ DEL USUARIO
                    ------------------------------------------- */}

                {mostrarMenuUsuario && (
                  <div className="menu-usuario">

                    <div className="menu-usuario-cabecera">

                      <strong>
                        {obtenerNombreUsuario()}
                      </strong>

                      <span className="rol-actual">
                        {esConductor
                          ? "Conductor"
                          : "Pasajero"}
                      </span>

                    </div>

                    <button
                      className="opcion-menu-usuario"
                      onClick={() => {
                        setMostrarMenuUsuario(
                          false
                        );

                        navegar("/mi-cuenta");
                      }}
                    >
                      Mi cuenta
                    </button>

                    {/* ---------------------------------------
                        CAMBIO DE PASAJERO A CONDUCTOR
                        --------------------------------------- */}

                    {esPasajero && (
                      <button
                        className="opcion-menu-usuario opcion-cambio-rol"
                        onClick={() =>
                          cambiarRol("conductor")
                        }
                      >
                        <span className="icono-opcion">
                          C
                        </span>

                        <span>
                          <strong>
                            Quiero ser conductor
                          </strong>

                          <small>
                            Publica tus propias rutas
                          </small>
                        </span>
                      </button>
                    )}

                    {/* ---------------------------------------
                        CAMBIO DE CONDUCTOR A PASAJERO
                        --------------------------------------- */}

                    {esConductor && (
                      <button
                        className="opcion-menu-usuario opcion-cambio-rol"
                        onClick={() =>
                          cambiarRol("pasajero")
                        }
                      >
                        <span className="icono-opcion">
                          P
                        </span>

                        <span>
                          <strong>
                            Quiero ser pasajero
                          </strong>

                          <small>
                            Busca una ruta disponible
                          </small>
                        </span>
                      </button>
                    )}

                    {/* ---------------------------------------
                        CERRAR SESIÓN
                        --------------------------------------- */}

                    <div className="separador-menu"></div>

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

              /* ---------------------------------------------
                 USUARIO NO AUTENTICADO
                 --------------------------------------------- */

              <button
                className="boton-login-header"
                onClick={() =>
                  setMostrarLogin(true)
                }
              >
                Iniciar sesión
              </button>

            )}

          </div>

        </div>
      </header>

      {/* =====================================================
          CONTENIDO PRINCIPAL
          ===================================================== */}

      <main>
        <Routes>

          {/* INICIO */}

          <Route
            path="/"
            element={
              <Inicio
                usuario={usuario}
                irAlServicio={irAlServicio}
                abrirLogin={() =>
                  setMostrarLogin(true)
                }
              />
            }
          />

          {/* BUSCAR RUTA */}

          <Route
            path="/buscar"
            element={
              <BuscarRuta
                usuario={usuario}
                API_URL={API_URL}
                abrirLogin={() =>
                  setMostrarLogin(true)
                }
              />
            }
          />

          {/* =================================================
              PUBLICAR RUTA
              SOLO CONDUCTOR
              ================================================= */}

          <Route
            path="/publicar"
            element={
              <RutaSoloConductor>
                <PublicarRuta
                  usuario={usuario}
                  API_URL={API_URL}
                  abrirLogin={() =>
                    setMostrarLogin(true)
                  }
                />
              </RutaSoloConductor>
            }
          />

          {/* =================================================
              MI CUENTA
              ================================================= */}

          <Route
            path="/mi-cuenta"
            element={
              usuario ? (
                <MiCuenta
                  usuario={usuario}
                  actualizarUsuario={
                    actualizarUsuario
                  }
                  cerrarSesion={cerrarSesion}
                  API_URL={API_URL}
                />
              ) : (
                <Navigate
                  to="/"
                  replace
                />
              )
            }
          />

          {/* =================================================
              MIS SOLICITUDES
              ================================================= */}

          <Route
            path="/mis-solicitudes"
            element={
              usuario ? (
                <MisSolicitudes
                  usuario={usuario}
                  API_URL={API_URL}
                />
              ) : (
                <Navigate
                  to="/"
                  replace
                />
              )
            }
          />

          {/* =================================================
              MIS RUTAS
              SOLO CONDUCTOR
              ================================================= */}

          <Route
            path="/mis-rutas"
            element={
              <RutaSoloConductor>
                <MisRutas
                  usuario={usuario}
                  API_URL={API_URL}
                />
              </RutaSoloConductor>
            }
          />

        </Routes>
      </main>

      {/* =====================================================
          PIE DE PÁGINA
          ===================================================== */}

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

              <span
                className="marca-go"
                translate="no"
              >
                GO
              </span>

            </div>

            <p>
              Transporte compartido para la comunidad TdeA.
            </p>

          </div>

          <div
            className="pie-derechos"
            translate="no"
          >
            © {new Date().getFullYear()} TdeA GO
          </div>

        </div>
      </footer>

      {/* =====================================================
          MODAL DE LOGIN
          ===================================================== */}

      {mostrarLogin && (
        <div
          className="modal-overlay"
          onMouseDown={(evento) => {

            if (
              evento.target ===
              evento.currentTarget
            ) {
              setMostrarLogin(false);
            }

          }}
        >

          <div className="modal-card">

            <button
              className="modal-cerrar"
              onClick={() =>
                setMostrarLogin(false)
              }
              aria-label="Cerrar"
            >
              ×
            </button>

            <Login
              onLoginExitoso={
                manejarLoginExitoso
              }
            />

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