
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

  const contenedorUsuarioRef = useRef(null);

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

    navegar("/");
  };

  const cambiarRol = async (nuevoRol) => {
    if (!usuario) return;

    setMostrarMenuUsuario(false);

    if (nuevoRol === "pasajero") {
      const usuarioActualizado = {
        ...usuario,
        rol: "pasajero",
        rol_solicitado: "pasajero",
        requiere_vehiculo: false,
      };

      actualizarUsuario(usuarioActualizado);
      navegar("/buscar");
      return;
    }

    if (nuevoRol !== "conductor") return;

    const idUsuario = usuario.id || usuario.id_usuario;

    if (!idUsuario) {
      alert("No se pudo identificar tu cuenta. Cierra sesión e inicia nuevamente.");
      return;
    }

    try {
      // Primero comprobamos si ya existe un vehículo registrado.
      const respuestaVehiculo = await fetch(
        `${API_URL}/api/vehiculos/${idUsuario}`
      );
      const datosVehiculo = await respuestaVehiculo.json();

      if (!respuestaVehiculo.ok) {
        throw new Error(
          datosVehiculo.mensaje || "No fue posible consultar tu vehículo."
        );
      }

      const vehiculo = datosVehiculo.vehiculo;

      // Si no tiene vehículo, guardamos la solicitud y exigimos el registro.
      if (!vehiculo) {
        const usuarioPendiente = {
          ...usuario,
          rol_solicitado: "conductor",
          requiere_vehiculo: true,
        };

        actualizarUsuario(usuarioPendiente);

        localStorage.setItem(
          "tdea_go_registro_pendiente",
          JSON.stringify({
            correo: usuario.correo || usuario.email,
            rol_solicitado: "conductor",
          })
        );

        navegar("/mi-cuenta");
        return;
      }

      // Si ya tiene vehículo, activamos el rol sin cerrar sesión.
      const respuestaRol = await fetch(
        `${API_URL}/api/usuarios/${idUsuario}/rol`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rol: "conductor" }),
        }
      );

      const datosRol = await respuestaRol.json();

      if (!respuestaRol.ok) {
        throw new Error(
          datosRol.mensaje || "No fue posible activar el rol de conductor."
        );
      }

      const usuarioActualizado = {
        ...usuario,
        ...(datosRol.usuario || datosRol.perfil || {}),
        rol: "conductor",
        rol_solicitado: "conductor",
        requiere_vehiculo: false,
      };

      actualizarUsuario(usuarioActualizado);
      localStorage.removeItem("tdea_go_registro_pendiente");

      // Ya puede entrar a las opciones de conductor.
      navegar("/mis-rutas");
    } catch (error) {
      console.error("Error al cambiar al rol de conductor:", error);
      alert(error.message || "No fue posible cambiar al rol de conductor.");
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
  const fotoUsuario = usuario?.foto_url || null;

  return (
    <div className="app">
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

                    <Link
                      to="/buscar"
                      className="opcion-menu-usuario"
                      onClick={() => setMostrarMenuUsuario(false)}
                    >
                      Buscar ruta
                    </Link>

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
                          Mis rutas
                        </Link>
                      </>
                    )}

                    {esPasajero && (
                      <Link
                        to="/mis-solicitudes"
                        className="opcion-menu-usuario"
                        onClick={() => setMostrarMenuUsuario(false)}
                      >
                        Mis solicitudes
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
