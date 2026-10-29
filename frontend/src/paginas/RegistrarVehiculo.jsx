
import { useEffect, useState } from "react";
import "./RegistrarVehiculo.css";

const API_URL_PREDETERMINADA =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function RegistrarVehiculo({
  usuarioId,
  API_URL = API_URL_PREDETERMINADA,
  onVehiculoRegistrado,
}) {
  const [tipo, setTipo] = useState("Automóvil");
  const [marcaModelo, setMarcaModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [color, setColor] = useState("");
  const [capacidadMaxima, setCapacidadMaxima] = useState("");

  const [vehiculo, setVehiculo] = useState(null);
  const [cargandoVehiculo, setCargandoVehiculo] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    async function consultarVehiculo() {
      setCargandoVehiculo(true);
      setError("");

      if (!usuarioId) {
        setVehiculo(null);
        setCargandoVehiculo(false);
        setError(
          "No se identificó al usuario. Cierra sesión e inicia sesión nuevamente si el problema continúa."
        );
        return;
      }

      try {
        const respuesta = await fetch(
          `${API_URL}/api/vehiculos/${encodeURIComponent(usuarioId)}`
        );
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || "No fue posible consultar el vehículo."
          );
        }

        if (!activo) return;

        const encontrado = datos.vehiculo || null;
        setVehiculo(encontrado);

        if (encontrado) {
          setTipo(encontrado.tipo || "Automóvil");
          setMarcaModelo(encontrado.marca_modelo || "");
          setPlaca(encontrado.placa || "");
          setColor(encontrado.color || "");
          setCapacidadMaxima(
            encontrado.capacidad_maxima != null
              ? String(encontrado.capacidad_maxima)
              : ""
          );
        }
      } catch (err) {
        if (activo) {
          console.error("Error consultando vehículo:", err);
          setError(err.message || "No fue posible consultar el vehículo.");
        }
      } finally {
        if (activo) setCargandoVehiculo(false);
      }
    }

    consultarVehiculo();

    return () => {
      activo = false;
    };
  }, [usuarioId, API_URL]);

  async function guardarVehiculo(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    if (!usuarioId) {
      setError("No se identificó al usuario. Inicia sesión nuevamente.");
      return;
    }

    const capacidad = Number(capacidadMaxima);

    if (!tipo || !marcaModelo.trim() || !placa.trim() || !color.trim()) {
      setError("Completa todos los campos del vehículo.");
      return;
    }

    if (!Number.isInteger(capacidad) || capacidad < 1) {
      setError("La capacidad debe ser un número entero mayor que cero.");
      return;
    }

    try {
      setCargando(true);

      const respuesta = await fetch(`${API_URL}/api/vehiculos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conductor_id: usuarioId,
          tipo,
          marca_modelo: marcaModelo.trim(),
          placa: placa.trim().toUpperCase(),
          color: color.trim(),
          capacidad_maxima: capacidad,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible guardar el vehículo."
        );
      }

      const vehiculoGuardado = datos.vehiculo || {
        usuario_id: usuarioId,
        tipo,
        marca_modelo: marcaModelo.trim(),
        placa: placa.trim().toUpperCase(),
        color: color.trim(),
        capacidad_maxima: capacidad,
      };

      setVehiculo(vehiculoGuardado);
      setMensaje("Vehículo guardado correctamente.");
      onVehiculoRegistrado?.(vehiculoGuardado);
    } catch (err) {
      console.error("Error guardando vehículo:", err);
      setError(err.message || "Ocurrió un error al guardar el vehículo.");
    } finally {
      setCargando(false);
    }
  }

  if (cargandoVehiculo) {
    return (
      <section className="vehiculo-panel">
        <div className="vehiculo-cargando">
          <span className="vehiculo-indicador" />
          <p>Consultando la información del vehículo...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="vehiculo-panel">
      <header className="vehiculo-encabezado">
        <div className="vehiculo-icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M5 11l1.7-5.1A2 2 0 0 1 8.6 4.5h6.8a2 2 0 0 1 1.9 1.4L19 11"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.5 11.5A2.5 2.5 0 0 1 6 9h12a2.5 2.5 0 0 1 2.5 2.5v5A1.5 1.5 0 0 1 19 18h-1v1.5M6 19.5V18H5a1.5 1.5 0 0 1-1.5-1.5v-5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 13.5h.01M17 13.5h.01M4 15h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="vehiculo-encabezado-texto">
          <span className="vehiculo-etiqueta">PERFIL DE CONDUCTOR</span>
          <h3>{vehiculo ? "Tu vehículo" : "Registra tu vehículo"}</h3>
          <p>
            {vehiculo
              ? "Consulta o actualiza la información de tu vehículo."
              : "Completa los datos para tener tu vehículo registrado en TdeA GO."}
          </p>
        </div>
      </header>

      {vehiculo && (
        <section className="vehiculo-resumen" aria-label="Vehículo registrado">
          <div className="vehiculo-resumen-titulo">
            <span className="vehiculo-estado-punto" />
            <h4>Vehículo registrado</h4>
            <span className="vehiculo-estado">Registrado</span>
          </div>

          <div className="vehiculo-datos">
            <div className="vehiculo-dato">
              <span>Tipo</span>
              <strong>{vehiculo.tipo || "No disponible"}</strong>
            </div>
            <div className="vehiculo-dato">
              <span>Marca y modelo</span>
              <strong>{vehiculo.marca_modelo || "No disponible"}</strong>
            </div>
            <div className="vehiculo-dato">
              <span>Placa</span>
              <strong>{vehiculo.placa || "No disponible"}</strong>
            </div>
            <div className="vehiculo-dato">
              <span>Color</span>
              <strong>{vehiculo.color || "No disponible"}</strong>
            </div>
            <div className="vehiculo-dato">
              <span>Capacidad máxima</span>
              <strong>
                {vehiculo.capacidad_maxima ?? "No disponible"} pasajeros
              </strong>
            </div>
          </div>
        </section>
      )}

      <form onSubmit={guardarVehiculo} className="vehiculo-formulario">
        <div className="vehiculo-formulario-titulo">
          <h4>{vehiculo ? "Actualizar información" : "Datos del vehículo"}</h4>
          <p>Los campos marcados con * son obligatorios.</p>
        </div>

        <div className="vehiculo-campos">
          <div className="vehiculo-campo">
            <label htmlFor="vehiculo-tipo">Tipo de vehículo *</label>
            <select
              id="vehiculo-tipo"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
              required
            >
              <option value="Automóvil">Automóvil</option>
              <option value="Motocicleta">Motocicleta</option>
              <option value="Camioneta">Camioneta</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="vehiculo-campo">
            <label htmlFor="vehiculo-marca">Marca y modelo *</label>
            <input
              id="vehiculo-marca"
              type="text"
              value={marcaModelo}
              onChange={(evento) => setMarcaModelo(evento.target.value)}
              placeholder="Ej. Chevrolet Onix"
              autoComplete="off"
              required
            />
          </div>

          <div className="vehiculo-campo">
            <label htmlFor="vehiculo-placa">Placa *</label>
            <input
              id="vehiculo-placa"
              type="text"
              value={placa}
              onChange={(evento) => setPlaca(evento.target.value.toUpperCase())}
              placeholder="Ej. ABC123"
              autoComplete="off"
              maxLength={10}
              required
            />
          </div>

          <div className="vehiculo-campo">
            <label htmlFor="vehiculo-color">Color *</label>
            <input
              id="vehiculo-color"
              type="text"
              value={color}
              onChange={(evento) => setColor(evento.target.value)}
              placeholder="Ej. Blanco"
              required
            />
          </div>

          <div className="vehiculo-campo vehiculo-campo-capacidad">
            <label htmlFor="vehiculo-capacidad">
              Capacidad máxima de pasajeros *
            </label>
            <input
              id="vehiculo-capacidad"
              type="number"
              min="1"
              step="1"
              value={capacidadMaxima}
              onChange={(evento) => setCapacidadMaxima(evento.target.value)}
              placeholder="Ej. 4"
              required
            />
            <small>Incluye únicamente los pasajeros que puede transportar.</small>
          </div>
        </div>

        {error && (
          <p className="vehiculo-mensaje vehiculo-error" role="alert">
            {error}
          </p>
        )}

        {mensaje && (
          <p className="vehiculo-mensaje vehiculo-exito" role="status">
            {mensaje}
          </p>
        )}

        <div className="vehiculo-acciones">
          <button
            type="submit"
            className="vehiculo-boton-guardar"
            disabled={cargando}
          >
            {cargando
              ? "Guardando..."
              : vehiculo
                ? "Guardar cambios"
                : "Registrar vehículo"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default RegistrarVehiculo;
