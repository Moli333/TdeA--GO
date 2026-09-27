import "./App.css";
import { useEffect, useState } from "react";
import Login from "./Login";

import Pasajero from "./pages/Pasajero";
import Conductor from "./pages/Conductor";
import Administrador from "./pages/Administrador";

const API_URL = "http://localhost:3000";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [vistaActual, setVistaActual] = useState("inicio");

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nuevoOrigen, setNuevoOrigen] = useState("");
  const [nuevoDestino, setNuevoDestino] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [cuposTotales, setCuposTotales] = useState("");

  const [conductores, setConductores] = useState([]);
  const [publicando, setPublicando] = useState(false);
  const [mensajePublicacion, setMensajePublicacion] = useState("");

  // ==========================================
  // RECUPERAR SESIÓN
  // ==========================================

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem(
      "tdea_go_usuario"
    );

    if (usuarioGuardado) {
      try {
        const usuarioRecuperado = JSON.parse(usuarioGuardado);

        setUsuario(usuarioRecuperado);

        /*
         * Si existe una sesión guardada, mostramos
         * directamente el panel correspondiente al rol.
         */
        setVistaActual("rol");
      } catch {
        localStorage.removeItem("tdea_go_usuario");
      }
    }
  }, []);

  // ==========================================
  // CARGAR CONDUCTORES
  // ==========================================

  useEffect(() => {
    cargarConductores();
  }, []);

  const cargarConductores = async () => {
    try {
      const respuesta = await fetch(
        `${API_URL}/api/usuarios`
      );

      if (!respuesta.ok) {
        return;
      }

      const usuarios = await respuesta.json();

      const listaConductores = usuarios.filter(
        (usuario) =>
          String(usuario.rol).toLowerCase() ===
          "conductor"
      );

      setConductores(listaConductores);
    } catch (error) {
      console.error(
        "Error al cargar conductores:",
        error
      );
    }
  };

  // ==========================================
  // OBTENER ROL NORMALIZADO
  // ==========================================

  const obtenerRol = () => {
    if (!usuario?.rol) {
      return "";
    }

    return String(usuario.rol)
      .trim()
      .toLowerCase();
  };

  // ==========================================
  // LOGIN
  // ==========================================

  const manejarLogin = (usuarioAutenticado) => {
    /*
     * Nos aseguramos de tener siempre id_usuario,
     * porque las páginas de pasajero y conductor
     * utilizan este campo.
     */
    const usuarioNormalizado = {
      ...usuarioAutenticado,
      id_usuario:
        usuarioAutenticado?.id_usuario ??
        usuarioAutenticado?.id,
    };

    setUsuario(usuarioNormalizado);
    setMostrarLogin(false);

    /*
     * Después de iniciar sesión vamos directamente
     * al panel correspondiente al rol.
     */
    setVistaActual("rol");
  };

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  const cerrarSesion = () => {
    localStorage.removeItem("tdea_go_usuario");

    setUsuario(null);
    setMostrarLogin(false);
    setVistaActual("inicio");

    setResultados([]);
    setMostrarFormulario(false);
    setMensajePublicacion("");
  };

  // ==========================================
  // VOLVER AL INICIO
  // ==========================================

  const volverAlInicio = () => {
    setVistaActual("inicio");
  };

  // ==========================================
  // IR AL PANEL DEL ROL
  // ==========================================

  const irAlPanel = () => {
    if (!usuario) {
      setMostrarLogin(true);
      return;
    }

    setVistaActual("rol");
  };

  // ==========================================
  // BUSCAR RUTAS
  // ==========================================

  const buscarRutas = async () => {
    setBuscando(true);

    try {
      const parametros = new URLSearchParams();

      if (origen.trim()) {
        parametros.append(
          "origen",
          origen.trim()
        );
      }

      if (destino.trim()) {
        parametros.append(
          "destino",
          destino.trim()
        );
      }

      if (fecha) {
        parametros.append("fecha", fecha);
      }

      if (hora) {
        parametros.append("hora", hora);
      }

      const respuesta = await fetch(
        `${API_URL}/api/rutas?${parametros.toString()}`
      );

      if (!respuesta.ok) {
        throw new Error(
          "No fue posible consultar las rutas."
        );
      }

      const rutas = await respuesta.json();

      setResultados(rutas);
    } catch (error) {
      console.error(
        "Error al buscar rutas:",
        error
      );

      setResultados([]);
    } finally {
      setBuscando(false);
    }
  };

  // ==========================================
  // PUBLICAR RUTA
  // ==========================================

  const publicarRuta = async (e) => {
    e.preventDefault();

    setMensajePublicacion("");

    if (!usuario) {
      setMostrarLogin(true);
      return;
    }

    if (obtenerRol() !== "conductor") {
      setMensajePublicacion(
        "Solo los usuarios registrados como conductores pueden publicar rutas."
      );
      return;
    }

    if (
      !nuevoOrigen.trim() ||
      !nuevoDestino.trim() ||
      !nuevaFecha ||
      !nuevaHora ||
      !cuposTotales
    ) {
      setMensajePublicacion(
        "Completa todos los campos para publicar la ruta."
      );
      return;
    }

    setPublicando(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/rutas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id_conductor: usuario.id_usuario,
            origen: nuevoOrigen.trim(),
            destino: nuevoDestino.trim(),
            fecha: nuevaFecha,
            hora: nuevaHora,
            cupos_totales: Number(cuposTotales),
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No fue posible publicar la ruta."
        );
      }

      setMensajePublicacion(
        "¡Ruta publicada correctamente!"
      );

      setNuevoOrigen("");
      setNuevoDestino("");
      setNuevaFecha("");
      setNuevaHora("");
      setCuposTotales("");

      await buscarRutas();
    } catch (error) {
      console.error(
        "Error al publicar ruta:",
        error
      );

      setMensajePublicacion(
        error.message ||
          "No fue posible publicar la ruta."
      );
    } finally {
      setPublicando(false);
    }
  };

  // ==========================================
  // SOLICITAR CUPO
  // ==========================================

  const solicitarCupo = async (ruta) => {
    if (!usuario) {
      setMostrarLogin(true);
      return;
    }

    if (obtenerRol() !== "pasajero") {
      alert(
        "Los conductores no pueden solicitar cupos. Ingresa con una cuenta de pasajero."
      );
      return;
    }

    try {
      const respuesta = await fetch(
        `${API_URL}/api/solicitudes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id_ruta: ruta.id,
            id_pasajero: usuario.id_usuario,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No fue posible solicitar el cupo."
        );
      }

      alert(
        "¡Solicitud enviada correctamente!\n\nTu solicitud quedó pendiente de aprobación."
      );

      await buscarRutas();
    } catch (error) {
      alert(error.message);
    }
  };

  // ==========================================
  // PANTALLA LOGIN
  // ==========================================

  if (mostrarLogin) {
    return (
      <Login
        onLogin={manejarLogin}
        onVolver={() => setMostrarLogin(false)}
      />
    );
  }

  // ==========================================
  // PÁGINA SEGÚN ROL
  // ==========================================

  if (
    usuario &&
    vistaActual === "rol"
  ) {
    const rol = obtenerRol();

    if (rol === "pasajero") {
      return (
        <Pasajero
          usuario={usuario}
          onCerrarSesion={cerrarSesion}
          onInicio={volverAlInicio}
        />
      );
    }

    if (rol === "conductor") {
      return (
        <Conductor
          usuario={usuario}
          onCerrarSesion={cerrarSesion}
          onInicio={volverAlInicio}
        />
      );
    }

    if (
      rol === "administrador" ||
      rol === "admin"
    ) {
      return (
        <Administrador
          usuario={usuario}
          onCerrarSesion={cerrarSesion}
          onInicio={volverAlInicio}
        />
      );
    }

    /*
     * Si aparece un rol que todavía no conocemos,
     * no dejamos la aplicación en blanco.
     */
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          fontFamily: "Arial, sans-serif",
          textAlign: "center",
        }}
      >
        <div>
          <h2>Rol de usuario no reconocido</h2>

          <p>
            El usuario tiene el rol:
            <strong> {usuario.rol}</strong>
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (
    <div
      className="app"
      translate="no"
    >

      {/* HEADER */}

      <header className="header">

        <div className="logo">

          <span className="logo-main">
            TdeA
          </span>

          <span
            className="logo-go"
            translate="no"
          >
            GO
          </span>

        </div>

        <nav className="nav">

          <a href="#inicio">
            Inicio
          </a>

          <a href="#como-funciona">
            ¿Cómo funciona?
          </a>

          <a href="#rutas">
            Rutas
          </a>

          {usuario ? (
            <div className="user-menu">

              <button
                type="button"
                className="user-welcome"
                onClick={irAlPanel}
              >
                Hola, {usuario.nombre}
              </button>

              <button
                type="button"
                className="btn-login"
                onClick={cerrarSesion}
              >
                Cerrar sesión
              </button>

            </div>
          ) : (
            <button
              type="button"
              className="btn-login"
              onClick={() =>
                setMostrarLogin(true)
              }
            >
              Iniciar sesión
            </button>
          )}

        </nav>

      </header>

      {/* HERO */}

      <main id="inicio">

        <section className="hero-section">

          <div className="hero-content">

            <div className="tag">
              MOVILIDAD COLABORATIVA
            </div>

            <h1>

              {usuario
                ? `Hola, ${usuario.nombre}.`
                : "Muévete con tu"}

              {!usuario && (
                <span>
                  comunidad TdeA.
                </span>
              )}

              {usuario && (
                <span>
                  ¿A dónde quieres ir?
                </span>
              )}

            </h1>

            <p>
              TdeA GO conecta a estudiantes
              del Tecnológico de Antioquia
              para compartir rutas de transporte
              de manera organizada, práctica y segura.
            </p>

            <div className="hero-buttons">

              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  document
                    .getElementById(
                      "buscar-ruta"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >
                Buscar una ruta
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {

                  if (!usuario) {
                    setMostrarLogin(true);
                    return;
                  }

                  /*
                   * Si ya está conectado, un conductor
                   * puede ir directamente a su panel.
                   * Un pasajero también puede hacerlo.
                   */
                  irAlPanel();

                }}
              >
                {usuario
                  ? "Ir a mi panel"
                  : "Publicar una ruta"}
              </button>

            </div>

          </div>

          <div className="hero-visual">

            <div className="route-scene">

              <div className="route-point point-start">
                <span></span>
              </div>

              <div className="route-line">
                <div className="route-progress"></div>
              </div>

              <div className="route-point point-end">
                <span></span>
              </div>

              <div className="car">

                <div className="car-shadow"></div>

                <div className="car-body">

                  <div className="car-window"></div>

                  <div className="car-window car-window-back"></div>

                  <div
                    className="car-logo"
                    translate="no"
                  >
                    GO
                  </div>

                  <div className="car-light"></div>

                  <div className="car-light car-light-back"></div>

                </div>

                <div className="car-wheel car-wheel-front"></div>

                <div className="car-wheel car-wheel-back"></div>

              </div>

              <div className="route-info">

                <strong>
                  Tu próximo trayecto
                </strong>

                <p>
                  Conecta con tu comunidad TdeA
                </p>

              </div>

              <div className="gps-map">

                <div className="gps-road gps-road-1"></div>

                <div className="gps-road gps-road-2"></div>

                <div className="gps-road gps-road-3"></div>

                <div className="gps-route"></div>

                <div className="gps-point gps-start"></div>

                <div className="gps-point gps-end"></div>

              </div>

            </div>

          </div>

        </section>

        {/* CÓMO FUNCIONA */}

        <section
          id="como-funciona"
          className="features-section"
        >

          <div className="section-title">

            <h2>
              Moverte puede ser más sencillo
            </h2>

            <p>
              Encuentra personas de la comunidad
              TdeA que comparten trayectos similares
              al tuyo.
            </p>

          </div>

          <div className="features">

            <article className="feature-card">

              <div className="feature-icon icon-search">
                <span></span>
              </div>

              <h3>
                Busca una ruta
              </h3>

              <p>
                Encuentra rutas disponibles según
                tu origen, destino y horario.
              </p>

            </article>

            <article className="feature-card">

              <div className="feature-icon icon-car">
                <span></span>
              </div>

              <h3>
                Comparte tu trayecto
              </h3>

              <p>
                Publica una ruta y permite que
                otros estudiantes soliciten un cupo.
              </p>

            </article>

            <article className="feature-card">

              <div className="feature-icon icon-community">
                <span></span>
              </div>

              <h3>
                Conecta con tu comunidad
              </h3>

              <p>
                Coordina tus desplazamientos de
                forma más organizada dentro de
                la comunidad TdeA.
              </p>

            </article>

          </div>

        </section>

        {/* BUSCAR RUTA */}

        <section
          id="buscar-ruta"
          className="route-search-section"
        >

          <div className="section-title">

            <h2>
              Encuentra tu próxima ruta
            </h2>

            <p>
              Busca opciones de transporte
              compartido dentro de la comunidad TdeA.
            </p>

          </div>

          <div className="route-search-card">

            <div className="search-field">

              <label htmlFor="origen">
                Origen
              </label>

              <input
                id="origen"
                type="text"
                placeholder="¿Desde dónde viajas?"
                value={origen}
                onChange={(e) =>
                  setOrigen(e.target.value)
                }
              />

            </div>

            <div className="search-field">

              <label htmlFor="destino">
                Destino
              </label>

              <input
                id="destino"
                type="text"
                placeholder="¿Hacia dónde vas?"
                value={destino}
                onChange={(e) =>
                  setDestino(e.target.value)
                }
              />

            </div>

            <div className="search-field">

              <label htmlFor="fecha">
                Fecha
              </label>

              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) =>
                  setFecha(e.target.value)
                }
              />

            </div>

            <div className="search-field">

              <label htmlFor="hora">
                Hora
              </label>

              <input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) =>
                  setHora(e.target.value)
                }
              />

            </div>

            <button
              type="button"
              className="btn-primary search-button"
              onClick={buscarRutas}
              disabled={buscando}
            >
              {buscando
                ? "Buscando..."
                : "Buscar rutas"}
            </button>

          </div>

          {resultados.length > 0 && (

            <div className="route-results">

              <h3>
                Rutas disponibles
              </h3>

              <div className="route-results-grid">

                {resultados.map((ruta) => (

                  <article
                    className="route-result-card"
                    key={ruta.id}
                  >

                    <div className="route-result-header">

                      <div
                        className="route-result-icon"
                        translate="no"
                      >
                        GO
                      </div>

                      <div>

                        <strong>
                          {ruta.conductor ||
                            ruta.nombre_conductor ||
                            "Conductor"}
                        </strong>

                        <span>
                          Conductor TdeA GO
                        </span>

                      </div>

                    </div>

                    <div className="route-result-route">

                      <div>

                        <small>
                          Origen
                        </small>

                        <strong>
                          {ruta.origen}
                        </strong>

                      </div>

                      <div className="route-arrow">
                        →
                      </div>

                      <div>

                        <small>
                          Destino
                        </small>

                        <strong>
                          {ruta.destino}
                        </strong>

                      </div>

                    </div>

                    <div className="route-result-details">

                      <span>
                        📅 {ruta.fecha}
                      </span>

                      <span>
                        🕐 {ruta.hora}
                      </span>

                      <span>
                        🚗{" "}
                        {ruta.cupos_disponibles ??
                          ruta.cupos ??
                          ruta.cupos_totales ??
                          0}{" "}
                        cupos
                      </span>

                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        solicitarCupo(ruta)
                      }
                    >
                      Solicitar cupo
                    </button>

                  </article>

                ))}

              </div>

            </div>

          )}

          {resultados.length === 0 &&
            !buscando && (
              <p className="no-results">
                Busca una ruta para consultar
                las opciones disponibles.
              </p>
            )}

        </section>

        {/* PUBLICAR RUTA */}

        <section
          id="publicar-ruta"
          className="publish-section"
        >

          <div className="section-title">

            <h2>
              Comparte tu trayecto
            </h2>

            <p>
              Publica una ruta y permite que otros
              estudiantes soliciten un cupo.
            </p>

          </div>

          {!usuario && (

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setMostrarLogin(true)
              }
            >
              Inicia sesión para publicar
            </button>

          )}

          {usuario &&
            obtenerRol() !== "conductor" && (

              <p className="no-results">
                Tu cuenta está registrada como
                pasajero. Los conductores pueden
                publicar rutas.
              </p>

            )}

          {usuario &&
            obtenerRol() === "conductor" &&
            !mostrarFormulario && (

              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setMostrarFormulario(true)
                }
              >
                Publicar una ruta
              </button>

            )}

          {usuario &&
            obtenerRol() === "conductor" &&
            mostrarFormulario && (

              <form
                className="publish-form"
                onSubmit={publicarRuta}
              >

                <div className="publish-form-grid">

                  <div className="search-field">

                    <label>
                      Conductor
                    </label>

                    <input
                      type="text"
                      value={`${usuario.nombre || ""} ${
                        usuario.apellido || ""
                      }`}
                      disabled
                    />

                  </div>

                  <div className="search-field">

                    <label htmlFor="nuevo-origen">
                      Origen
                    </label>

                    <input
                      id="nuevo-origen"
                      type="text"
                      placeholder="Ej. Bello"
                      value={nuevoOrigen}
                      onChange={(e) =>
                        setNuevoOrigen(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="search-field">

                    <label htmlFor="nuevo-destino">
                      Destino
                    </label>

                    <input
                      id="nuevo-destino"
                      type="text"
                      placeholder="Ej. TdeA - Robledo"
                      value={nuevoDestino}
                      onChange={(e) =>
                        setNuevoDestino(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="search-field">

                    <label htmlFor="nueva-fecha">
                      Fecha
                    </label>

                    <input
                      id="nueva-fecha"
                      type="date"
                      value={nuevaFecha}
                      onChange={(e) =>
                        setNuevaFecha(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="search-field">

                    <label htmlFor="nueva-hora">
                      Hora
                    </label>

                    <input
                      id="nueva-hora"
                      type="time"
                      value={nuevaHora}
                      onChange={(e) =>
                        setNuevaHora(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="search-field">

                    <label htmlFor="cupos">
                      Cupos disponibles
                    </label>

                    <input
                      id="cupos"
                      type="number"
                      min="1"
                      max="20"
                      placeholder="Ej. 3"
                      value={cuposTotales}
                      onChange={(e) =>
                        setCuposTotales(
                          e.target.value
                        )
                      }
                    />

                  </div>

                </div>

                {mensajePublicacion && (

                  <div className="publish-message">
                    {mensajePublicacion}
                  </div>

                )}

                <div className="publish-actions">

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={publicando}
                  >
                    {publicando
                      ? "Publicando..."
                      : "Publicar ruta"}
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setMostrarFormulario(false);
                      setMensajePublicacion("");
                    }}
                  >
                    Cancelar
                  </button>

                </div>

              </form>

            )}

        </section>

        {/* CTA */}

        <section
          id="rutas"
          className="cta-section"
        >

          <h2>
            Tu ruta puede conectar con otra.
          </h2>

          <p>
            Forma parte de una comunidad que busca
            nuevas alternativas para movilizarse
            hacia el TdeA.
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              document
                .getElementById("buscar-ruta")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            Explorar rutas
          </button>

        </section>

      </main>

      {/* FOOTER */}

      <footer className="footer">

        <div className="logo">

          <span className="logo-main">
            TdeA
          </span>

          <span
            className="logo-go"
            translate="no"
          >
            GO
          </span>

        </div>

        <p>
          TdeA GO · Plataforma web de transporte
          colaborativo para la comunidad del
          Tecnológico de Antioquia.
        </p>

      </footer>

    </div>
  );
}

export default App;