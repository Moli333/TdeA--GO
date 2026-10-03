import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function Login({ onLoginExitoso }) {
  const [modo, setModo] = useState("login");

  // Inicio de sesión
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Registro
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("pasajero");
  const [mostrarContrasenaRegistro, setMostrarContrasenaRegistro] =
    useState(false);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setError("");
    setMensaje("");
  };

  const iniciarSesion = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    if (!correo.trim() || !contrasena) {
      setError("Completa el correo electrónico y la contraseña.");
      return;
    }

    try {
      setCargando(true);

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

      if (onLoginExitoso) {
        onLoginExitoso(datos.usuario);
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);

      setError(
        error.message || "Ocurrió un error al iniciar sesión."
      );
    } finally {
      setCargando(false);
    }
  };

  const registrarUsuario = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    if (
      !nombre.trim() ||
      !apellido.trim() ||
      !correo.trim() ||
      !telefono.trim() ||
      !contrasena
    ) {
      setError("Completa todos los campos para crear tu cuenta.");
      return;
    }

    if (contrasena.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    try {
      setCargando(true);

      const respuesta = await fetch(`${API_URL}/api/usuarios`, {
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
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible crear la cuenta."
        );
      }

      setMensaje(
        "Cuenta creada correctamente. Ahora puedes iniciar sesión."
      );

      setNombre("");
      setApellido("");
      setCorreo("");
      setTelefono("");
      setContrasena("");
      setRol("pasajero");

      setTimeout(() => {
        setModo("login");
        setMensaje("");
      }, 1800);
    } catch (error) {
      console.error("Error al registrar usuario:", error);

      setError(
        error.message || "Ocurrió un error al crear la cuenta."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-brand">
        <span className="login-brand-tdea">TdeA</span>
        <span className="login-brand-go">GO</span>
      </div>

      {modo === "login" ? (
        <>
          <div className="login-header">
            <h2>Inicia sesión</h2>
            <p>Ingresa para continuar</p>
          </div>

          <form className="login-form" onSubmit={iniciarSesion}>
            <div className="login-field">
              <label htmlFor="correo">Correo electrónico</label>

              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu correo"
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="contrasena">Contraseña</label>

              <div className="password-wrapper">
                <input
                  id="contrasena"
                  type={mostrarContrasena ? "text" : "password"}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setMostrarContrasena(!mostrarContrasena)
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
              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  setError(
                    "La recuperación de contraseña estará disponible próximamente."
                  )
                }
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="login-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={cargando}
            >
              {cargando ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

          <div className="login-register">
            <span>¿No tienes una cuenta?</span>

            <button
              type="button"
              onClick={() => cambiarModo("registro")}
            >
              Crear cuenta
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="login-header register-header">
            <h2>Crear una cuenta</h2>
            <p>Únete a la comunidad TdeA</p>
          </div>

          <form
            className="login-form register-form"
            onSubmit={registrarUsuario}
          >
            <div className="register-grid">
              <div className="login-field">
                <label htmlFor="nombre">Nombre</label>

                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                />
              </div>

              <div className="login-field">
                <label htmlFor="apellido">Apellido</label>

                <input
                  id="apellido"
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Tu apellido"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="correoRegistro">
                Correo electrónico
              </label>

              <input
                id="correoRegistro"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu correo"
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="telefono">Teléfono</label>

              <input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Tu número de teléfono"
                autoComplete="tel"
              />
            </div>

            <div className="login-field">
              <label htmlFor="contrasenaRegistro">
                Contraseña
              </label>

              <div className="password-wrapper">
                <input
                  id="contrasenaRegistro"
                  type={
                    mostrarContrasenaRegistro
                      ? "text"
                      : "password"
                  }
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setMostrarContrasenaRegistro(
                      !mostrarContrasenaRegistro
                    )
                  }
                  aria-label={
                    mostrarContrasenaRegistro
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {mostrarContrasenaRegistro ? "◉" : "○"}
                </button>
              </div>
            </div>

            <div className="role-section">
              <label>Tipo de usuario</label>

              <div className="role-options">
                <button
                  type="button"
                  className={`role-option ${
                    rol === "pasajero" ? "selected" : ""
                  }`}
                  onClick={() => setRol("pasajero")}
                >
                  <span className="role-icon">○</span>

                  <span>
                    <strong>Pasajero</strong>
                    <small>Busco un cupo</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`role-option ${
                    rol === "conductor" ? "selected" : ""
                  }`}
                  onClick={() => setRol("conductor")}
                >
                  <span className="role-icon">⌁</span>

                  <span>
                    <strong>Conductor</strong>
                    <small>Ofrezco un cupo</small>
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="login-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            {mensaje && (
              <div className="login-success" role="status">
                <span className="login-success-icon">✓</span>
                <span>{mensaje}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-submit register-submit"
              disabled={cargando}
            >
              {cargando ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="login-register">
            <span>¿Ya tienes una cuenta?</span>

            <button
              type="button"
              onClick={() => cambiarModo("login")}
            >
              Iniciar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Login;