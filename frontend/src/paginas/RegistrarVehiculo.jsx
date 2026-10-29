
import { useEffect, useState } from "react";

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
        setError("No se identificó al usuario. Cierra sesión e inicia sesión nuevamente si el problema continúa.");
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
        <p>Consultando la información del vehículo...</p>
      </section>
    );
  }

  return (
    <section className="vehiculo-panel">
      {vehiculo && (
        <div className="vehiculo-resumen">
          <h3>Vehículo registrado</h3>
          <p><strong>Tipo:</strong> {vehiculo.tipo || "No disponible"}</p>
          <p><strong>Marca y modelo:</strong> {vehiculo.marca_modelo || "No disponible"}</p>
          <p><strong>Placa:</strong> {vehiculo.placa || "No disponible"}</p>
          <p><strong>Color:</strong> {vehiculo.color || "No disponible"}</p>
          <p><strong>Capacidad:</strong> {vehiculo.capacidad_maxima ?? "No disponible"}</p>
        </div>
      )}

      <form onSubmit={guardarVehiculo} className="vehiculo-formulario">
        <h3>{vehiculo ? "Actualizar vehículo" : "Registrar vehículo"}</h3>

        <label htmlFor="vehiculo-tipo">Tipo de vehículo</label>
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

        <label htmlFor="vehiculo-marca">Marca y modelo</label>
        <input
          id="vehiculo-marca"
          type="text"
          value={marcaModelo}
          onChange={(evento) => setMarcaModelo(evento.target.value)}
          placeholder="Ej. Chevrolet Onix"
          required
        />

        <label htmlFor="vehiculo-placa">Placa</label>
        <input
          id="vehiculo-placa"
          type="text"
          value={placa}
          onChange={(evento) => setPlaca(evento.target.value.toUpperCase())}
          placeholder="Ej. ABC123"
          required
        />

        <label htmlFor="vehiculo-color">Color</label>
        <input
          id="vehiculo-color"
          type="text"
          value={color}
          onChange={(evento) => setColor(evento.target.value)}
          placeholder="Color del vehículo"
          required
        />

        <label htmlFor="vehiculo-capacidad">Capacidad máxima de pasajeros</label>
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

        {error && <p className="vehiculo-mensaje vehiculo-error">{error}</p>}
        {mensaje && <p className="vehiculo-mensaje vehiculo-exito">{mensaje}</p>}

        <button type="submit" disabled={cargando}>
          {cargando
            ? "Guardando..."
            : vehiculo
              ? "Actualizar vehículo"
              : "Guardar vehículo"}
        </button>
      </form>
    </section>
  );
}

export default RegistrarVehiculo;
