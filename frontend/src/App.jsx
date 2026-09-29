import "./App.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";

import Login from "./Login";

import Inicio from "./paginas/Inicio";
import BuscarRuta from "./paginas/BuscarRuta";
import PublicarRuta from "./paginas/PublicarRuta";
import MiCuenta from "./paginas/MiCuenta";
import MisSolicitudes from "./paginas/MisSolicitudes";
import MisRutas from "./paginas/MisRutas";

// Asegúrate de usar el mismo puerto en el que corre tu backend (por ejemplo: http://localhost:5000 o http://localhost:3000)
const API_URL = "http://localhost:5000";

function Aplicacion() {
  const [usuario, setUsuario] = useState(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);

  const navegar = useNavigate();

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("tdea_go_usuario");

    if (usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch {
        localStorage.removeItem("tdea_go_usuario");
      }
    }
  }, []);

  const manejarLoginExitoso = (datosUsuario) => {
    setUsuario(datosUsuario);
    localStorage.setItem(
      "tdea_go_usuario",
      JSON.stringify(datosUsuario)
    );

    setMostrarLogin(false);

    // Redirigir a la página de Mis Solicitudes tras iniciar sesión exitosamente
    navegar("/mis-solicitudes");
  };

  const cerrarSesion = () => {
    localStorage.removeItem("tdea_go_usuario");
    setUsuario(null);
    navegar("/");
  };

  const irAlServicio = (ruta) => {
    if (!usuario) {
      setMostrarLogin(true);
      return;
    }

    navegar(ruta);
  };

  // Obtener el nombre visible soportando tanto "nombre_completo" (Supabase) como "nombre"
  const obtenerNombreUsuario = () => {
    if (!usuario) return "Usuario";
    return usuario.nombre_completo || usuario.nombre || "Usuario";
  };

  return (
    <div className="app">
      <header className="encabezado">
        <div className="contenedor encabezado-contenido">

          <Link to="/" className="marca-tdea">
            <span className="marca-tdea-principal">TdeA</span>
            <span className="marca-go">GO</span>
          </Link>

          <nav className="navegacion-principal">

            <Link to="/" className="enlace-navegacion">
              Inicio
            </Link>

            <button
              className="enlace-navegacion boton-navegacion"
              onClick={() => irAlServicio("/buscar")}
            >
              Buscar ruta
            </button>

            {usuario?.rol === "conductor" && (
              <button
                className="enlace-navegacion boton-navegacion"
                onClick={() => irAlServicio("/publicar")}
              >
                Publicar ruta
              </button>
            )}

            {usuario?.rol === "pasajero" && (
              <button
                className="enlace-navegacion boton-navegacion"
                onClick={() => irAlServicio("/mis-solicitudes")}
              >
                Mis solicitudes
              </button>
            )}

            {usuario?.rol === "conductor" && (
              <button
                className="enlace-navegacion boton-navegacion"
                onClick={() => irAlServicio("/mis-rutas")}
              >
                Mis rutas
              </button>
            )}

            {usuario && (
              <button
                className="enlace-navegacion boton-navegacion"
                onClick={() => navegar("/mi-cuenta")}
              >
                Mi cuenta
              </button>
            )}

          </nav>

          <div className="acciones-encabezado">

            {usuario ? (
              <>
                <button
                  className="usuario-activo"
                  onClick={() => navegar("/mi-cuenta")}
                >
                  <span className="usuario-icono">
                    {obtenerNombreUsuario().charAt(0).toUpperCase()}
                  </span>

                  <span className="usuario-nombre">
                    {obtenerNombreUsuario()}
                  </span>
                </button>

                <button
                  className="boton-cerrar-sesion"
                  onClick={cerrarSesion}
                >
                  Cerrar sesión
                </button>
              </>
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
              <PublicarRuta
                usuario={usuario}
                API_URL={API_URL}
                abrirLogin={() => setMostrarLogin(true)}
              />
            }
          />

          <Route
            path="/mi-cuenta"
            element={
              <MiCuenta
                usuario={usuario}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/mis-solicitudes"
            element={
              <MisSolicitudes
                usuario={usuario}
                API_URL={API_URL}
              />
            }
          />

          <Route
            path="/mis-rutas"
            element={
              <MisRutas
                usuario={usuario}
                API_URL={API_URL}
              />
            }
          />

        </Routes>
      </main>

      <footer className="pie-pagina">
        <div className="contenedor pie-contenido">

          <div>
            <div className="marca-tdea marca-footer">
              <span className="marca-tdea-principal">TdeA</span>
              <span className="marca-go">GO</span>
            </div>

            <p>
              Transporte compartido para la comunidad TdeA.
            </p>
          </div>

          <div className="pie-derechos">
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