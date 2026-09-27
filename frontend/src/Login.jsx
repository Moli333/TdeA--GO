import { useState } from "react";

const API_URL = "http://localhost:3000";

function Login({ onLogin, onVolver }) {
  const [modo, setModo] = useState("login");

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [rol, setRol] = useState("pasajero");

  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setError("");
    setMensaje("");
  };

  // =====================================================
  // INICIAR SESIÓN
  // =====================================================

  const iniciarSesion = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    if (!correo.trim() || !contrasena) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correo: correo.trim(),
          contrasena,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible iniciar sesión."
        );
      }

      if (!datos.usuario) {
        throw new Error(
          "El servidor no devolvió la información del usuario."
        );
      }

      const usuario = {
        ...datos.usuario,
        id_usuario:
          datos.usuario.id_usuario ??
          datos.usuario.id ??
          datos.usuario.usuario_id,
      };

      if (!usuario.id_usuario) {
        throw new Error(
          "No se encontró el identificador del usuario."
        );
      }

      localStorage.setItem(
        "tdea_go_usuario",
        JSON.stringify(usuario)
      );

      onLogin(usuario);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);

      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        setError(
          "No se pudo conectar con el servidor TdeA GO. Verifica que el servidor esté ejecutándose."
        );
      } else {
        setError(
          error.message || "No fue posible iniciar sesión."
        );
      }
    } finally {
      setCargando(false);
    }
  };

  // =====================================================
  // REGISTRO
  // =====================================================

  const registrarse = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    if (
      !nombre.trim() ||
      !apellido.trim() ||
      !correo.trim() ||
      !telefono.trim() ||
      !contrasena ||
      !confirmarContrasena
    ) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    if (contrasena.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    if (contrasena !== confirmarContrasena) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (rol !== "pasajero" && rol !== "conductor") {
      setError("Selecciona un rol válido.");
      return;
    }

    setCargando(true);

    try {
      // -------------------------------------------------
      // Crear cuenta
      // -------------------------------------------------

      const respuestaRegistro = await fetch(
        `${API_URL}/api/usuarios`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            correo: correo.trim(),
            telefono: telefono.trim(),
            contrasena,
            rol,
          }),
        }
      );

      const datosRegistro = await respuestaRegistro.json();

      if (!respuestaRegistro.ok) {
        throw new Error(
          datosRegistro.mensaje ||
            "No fue posible crear la cuenta."
        );
      }

      // -------------------------------------------------
      // Iniciar sesión automáticamente
      // -------------------------------------------------

      const respuestaLogin = await fetch(
        `${API_URL}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            correo: correo.trim(),
            contrasena,
          }),
        }
      );

      const datosLogin = await respuestaLogin.json();

      // -------------------------------------------------
      // La cuenta fue creada, pero el login automático
      // no funcionó.
      // -------------------------------------------------

      if (!respuestaLogin.ok || !datosLogin.usuario) {
        setMensaje(
          "Cuenta creada correctamente. Ahora puedes iniciar sesión."
        );

        setModo("login");
        setContrasena("");
        setConfirmarContrasena("");

        return;
      }

      // -------------------------------------------------
      // Usuario creado y autenticado correctamente
      // -------------------------------------------------

      const usuario = {
        ...datosLogin.usuario,
        id_usuario:
          datosLogin.usuario.id_usuario ??
          datosLogin.usuario.id ??
          datosLogin.usuario.usuario_id,
      };

      if (!usuario.id_usuario) {
        setMensaje(
          "Cuenta creada correctamente. Ahora puedes iniciar sesión."
        );

        setModo("login");
        setContrasena("");
        setConfirmarContrasena("");

        return;
      }

      localStorage.setItem(
        "tdea_go_usuario",
        JSON.stringify(usuario)
      );

      onLogin(usuario);
    } catch (error) {
      console.error("Error durante el registro:", error);

      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        setError(
          "No se pudo conectar con el servidor TdeA GO. Verifica que el servidor esté ejecutándose."
        );
      } else {
        setError(
          error.message || "No fue posible crear la cuenta."
        );
      }
    } finally {
      setCargando(false);
    }
  };

  // =====================================================
  // RECUPERAR CONTRASEÑA
  // =====================================================

  const recuperarContrasena = () => {
    alert(
      "La recuperación de contraseña estará disponible próximamente."
    );
  };

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <div className="login-page">
      <div className="login-background-decoration decoration-one"></div>
      <div className="login-background-decoration decoration-two"></div>

      <div className="login-card">

        {/* VOLVER */}
        <button
          type="button"
          className="login-back-button"
          onClick={onVolver}
        >
          ← Volver
        </button>

        {/* MARCA */}
        <div className="login-brand">
          <div className="login-brand-icon">
            🚗
          </div>

          <div>
            <strong>TdeA</strong>
            <span translate="no">GO</span>
          </div>
        </div>

        {/* ENCABEZADO */}
        <div className="login-header">
          <h1>
            {modo === "login"
              ? "Bienvenido de nuevo"
              : "Crea tu cuenta"}
          </h1>

          <p>
            {modo === "login"
              ? "Ingresa para continuar usando TdeA GO."
              : "Únete a la comunidad de transporte compartido del TdeA."}
          </p>
        </div>

        {/* CAMBIO DE MODO */}
        <div className="login-mode-buttons">
          <button
            type="button"
            className={`login-mode ${
              modo === "login" ? "active" : ""
            }`}
            onClick={() => cambiarModo("login")}
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            className={`login-mode ${
              modo === "registro" ? "active" : ""
            }`}
            onClick={() => cambiarModo("registro")}
          >
            Registrarse
          </button>
        </div>

        {/* MENSAJES */}
        {error && (
          <div className="login-message login-error">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {mensaje && (
          <div className="login-message login-success">
            <span>✓</span>
            <p>{mensaje}</p>
          </div>
        )}

        {/* =================================================
            INICIO DE SESIÓN
        ================================================== */}

        {modo === "login" && (
          <form
            className="login-form"
            onSubmit={iniciarSesion}
          >
            <div className="form-group">
              <label htmlFor="correo">
                Correo electrónico
              </label>

              <input
                id="correo"
                type="email"
                placeholder="ejemplo@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contrasena">
                Contraseña
              </label>

              <div className="password-input-wrapper">
                <input
                  id="contrasena"
                  type={
                    mostrarContrasena
                      ? "text"
                      : "password"
                  }
                  placeholder="Ingresa tu contraseña"
                  value={contrasena}
                  onChange={(e) =>
                    setContrasena(e.target.value)
                  }
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setMostrarContrasena(
                      !mostrarContrasena
                    )
                  }
                  aria-label={
                    mostrarContrasena
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {mostrarContrasena ? "◉" : "○"}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-option">
                <input type="checkbox" />
                <span>Recordarme</span>
              </label>

              <button
                type="button"
                className="forgot-password"
                onClick={recuperarContrasena}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className="login-spinner"></span>
                  Ingresando...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* =================================================
            REGISTRO
        ================================================== */}

        {modo === "registro" && (
          <form
            className="login-form"
            onSubmit={registrarse}
          >
            {/* DATOS PERSONALES */}
            <div className="register-grid">
              <div className="form-group">
                <label htmlFor="nombre">
                  Nombre
                </label>

                <input
                  id="nombre"
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) =>
                    setNombre(e.target.value)
                  }
                  autoComplete="given-name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellido">
                  Apellido
                </label>

                <input
                  id="apellido"
                  type="text"
                  placeholder="Tu apellido"
                  value={apellido}
                  onChange={(e) =>
                    setApellido(e.target.value)
                  }
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            {/* CONTACTO */}
            <div className="register-grid">
              <div className="form-group">
                <label htmlFor="correo-registro">
                  Correo electrónico
                </label>

                <input
                  id="correo-registro"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={correo}
                  onChange={(e) =>
                    setCorreo(e.target.value)
                  }
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono">
                  Teléfono
                </label>

                <input
                  id="telefono"
                  type="tel"
                  placeholder="300 000 0000"
                  value={telefono}
                  onChange={(e) =>
                    setTelefono(e.target.value)
                  }
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            {/* TIPO DE USUARIO */}
            <div className="form-group">
              <label>
                ¿Cómo utilizarás TdeA GO?
              </label>

              <div className="role-buttons">
                <button
                  type="button"
                  className={`role-button ${
                    rol === "pasajero"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setRol("pasajero")
                  }
                >
                  <span className="role-icon">
                    🧑‍🎓
                  </span>

                  <span>
                    <strong>Pasajero</strong>
                    <small>
                      Quiero encontrar rutas
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`role-button ${
                    rol === "conductor"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setRol("conductor")
                  }
                >
                  <span className="role-icon">
                    🚗
                  </span>

                  <span>
                    <strong>Conductor</strong>
                    <small>
                      Quiero compartir mi ruta
                    </small>
                  </span>
                </button>
              </div>
            </div>

            {/* CONTRASEÑAS */}
            <div className="register-grid">
              <div className="form-group">
                <label htmlFor="contrasena-registro">
                  Contraseña
                </label>

                <div className="password-input-wrapper">
                  <input
                    id="contrasena-registro"
                    type={
                      mostrarContrasena
                        ? "text"
                        : "password"
                    }
                    placeholder="Mínimo 6 caracteres"
                    value={contrasena}
                    onChange={(e) =>
                      setContrasena(e.target.value)
                    }
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setMostrarContrasena(
                        !mostrarContrasena
                      )
                    }
                    aria-label={
                      mostrarContrasena
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {mostrarContrasena ? "◉" : "○"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmar-contrasena">
                  Confirmar contraseña
                </label>

                <div className="password-input-wrapper">
                  <input
                    id="confirmar-contrasena"
                    type={
                      mostrarConfirmacion
                        ? "text"
                        : "password"
                    }
                    placeholder="Repite tu contraseña"
                    value={confirmarContrasena}
                    onChange={(e) =>
                      setConfirmarContrasena(
                        e.target.value
                      )
                    }
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setMostrarConfirmacion(
                        !mostrarConfirmacion
                      )
                    }
                    aria-label={
                      mostrarConfirmacion
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {mostrarConfirmacion ? "◉" : "○"}
                  </button>
                </div>
              </div>
            </div>

            {/* CREAR CUENTA */}
            <button
              type="submit"
              className="login-submit"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className="login-spinner"></span>
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* PIE */}
        <div className="login-footer">
          {modo === "login"
            ? "¿Aún no tienes una cuenta?"
            : "¿Ya tienes una cuenta?"}

          <button
            type="button"
            onClick={() =>
              cambiarModo(
                modo === "login"
                  ? "registro"
                  : "login"
              )
            }
          >
            {modo === "login"
              ? "Regístrate"
              : "Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;