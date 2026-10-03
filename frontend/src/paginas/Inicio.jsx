import { Link } from "react-router-dom";
import CarroTdea from "../CarroTdea";

function Inicio({ usuario, irAlServicio, abrirLogin }) {
  return (
    <div className="pagina-inicio">

      {/* HERO */}
      <section className="hero-inicio">

        <div className="contenedor hero-contenido">

          <div className="hero-texto">

            <span className="hero-etiqueta">
              MOVILIDAD COMPARTIDA · TdeA
            </span>

            <h1 translate="no">
              Tu ruta.
              <br />
              Tu comunidad.
              <br />
              <span translate="no">TdeA GO.</span>
            </h1>

            <p>
              Encuentra personas de la comunidad TdeA que comparten
              recorridos similares y coordina tus desplazamientos de
              una manera más sencilla.
            </p>

            <div className="hero-botones">

              <button
                className="boton-principal"
                onClick={() => irAlServicio("/buscar")}
              >
                Buscar una ruta
                <span>→</span>
              </button>

              <button
                className="boton-secundario"
                onClick={() => {
                  if (usuario?.rol === "conductor") {
                    irAlServicio("/publicar");
                  } else if (!usuario) {
                    abrirLogin();
                  }
                }}
              >
                Publicar una ruta
              </button>

            </div>

          </div>

          <div className="hero-visual">

            <div className="hero-circulo"></div>

            <div className="hero-foto-principal">
              <img
                src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=900&q=85"
                alt="Estudiantes universitarios compartiendo una experiencia"
              />
            </div>

            <div className="hero-tarjeta">
              <span className="hero-tarjeta-icono">✓</span>

              <div>
                <strong>Una comunidad conectada</strong>
                <small>Encuentra tu ruta</small>
              </div>
            </div>

          </div>

        </div>

<div className="carretera-hero">
  <div className="linea-carretera"></div>
  <CarroTdea />
</div>

      </section>


      {/* PRESENTACIÓN */}
      <section className="seccion-comunidad">

        <div className="contenedor">

          <div className="encabezado-seccion">

            <span>
              TRANSPORTE COMPARTIDO
            </span>

            <h2>
              Diseñado para la comunidad TdeA
            </h2>

            <p>
              TdeA GO facilita la conexión entre quienes necesitan
              transporte y quienes tienen un cupo disponible en su
              recorrido.
            </p>

          </div>


          <div className="comunidad-grid">


            {/* TARJETA 01 */}
            <article className="tarjeta-comunidad">

              <div className="foto-comunidad">

                <img
                  src="https://media.istockphoto.com/id/1323167372/es/foto/hombre-indio-usando-computadora-port%C3%A1til-tel%C3%A9fono-m%C3%B3vil-trabajando-proyecto-freelance-en-l%C3%ADnea.jpg?s=612x612&w=0&k=20&c=MlBPvioXSGLBsCMSW4hc7o-dDn9H0I2xfxyFYu-fsBI="
                  alt="Estudiantes universitarios buscando opciones de transporte"
                />

              </div>

              <div className="contenido-tarjeta">

                <span className="numero-tarjeta">
                  
                </span>

                <h3>
                  ¿Necesitas transporte?
                </h3>

                <p>
                  Busca rutas disponibles y encuentra opciones
                  que coincidan con tu recorrido.
                </p>

                <button
                  onClick={() => irAlServicio("/buscar")}
                  className="enlace-tarjeta"
                >
                  Buscar una ruta →
                </button>

              </div>

            </article>


            {/* TARJETA 02 */}
            <article className="tarjeta-comunidad">

              <div className="foto-comunidad">

                <img
                  src="https://www.elcarrocolombiano.com/wp-content/webp-express/webp-images/uploads/2025/12/20251221-20-CARROS-HIBRIDOS-Y-ELECTRICOS-MAS-VENDIDOS-DE-COLOMBIA-NOVIEMBRE-2025-01-1.jpg.webp"
                  alt="Personas preparándose para realizar un desplazamiento compartido"
                />

              </div>

              <div className="contenido-tarjeta">

                <span className="numero-tarjeta">
                  
                </span>

                <h3>
                  ¿Tienes un cupo?
                </h3>

                <p>
                  Comparte tu recorrido y permite que otros
                  estudiantes soliciten un cupo.
                </p>

                <button
                  onClick={() => {
                    if (usuario?.rol === "conductor") {
                      irAlServicio("/publicar");
                    } else {
                      abrirLogin();
                    }
                  }}
                  className="enlace-tarjeta"
                >
                  Publicar una ruta →
                </button>

              </div>

            </article>


            {/* TARJETA 03 */}
            <article className="tarjeta-comunidad">

              <div className="foto-comunidad">

                <img
                  src="https://media.istockphoto.com/id/1179125140/es/foto/hombre-sacudiendo-hanks-con-amigos-sentados-en-el-coche.jpg?s=612x612&w=0&k=20&c=ViXAUc6MiSp-UMFpAuDRr2CoQSvAvPzhVIndK0jNu-g="
                  alt="Personas desplazándose juntas hacia su destino"
                />

              </div>

              <div className="contenido-tarjeta">

                <span className="numero-tarjeta">
                  
                </span>

                <h3>
                  Viaja acompañado
                </h3>

                <p>
                  Consulta la información de la ruta y coordina
                  tu solicitud dentro de la plataforma.
                </p>

                <Link
                  to="/buscar"
                  className="enlace-tarjeta"
                >
                  Conocer el servicio →
                </Link>

              </div>

            </article>

          </div>

        </div>

      </section>


      {/* CONDUCTORES */}
      <section className="seccion-conductores">

        <div className="contenedor conductores-contenido">

          <div className="conductores-texto">

            <span className="etiqueta-verde">
              PARA CONDUCTORES
            </span>

            <h2>
              Tu moto o tu carro también pueden formar parte de
              la comunidad.
            </h2>

            <p>
              Si realizas un recorrido habitual hacia o desde el
              TdeA y tienes cupos disponibles, puedes publicar tu
              ruta para que otros estudiantes puedan solicitar un
              espacio.
            </p>


            <div className="vehiculos-lista">

              <div className="vehiculo-item">

                <span>
                  
                </span>

                <div>

                  <strong>
                    Moto
                  </strong>

                  <small>
                    Comparte un cupo en tu recorrido.
                  </small>

                </div>

              </div>


              <div className="vehiculo-item">

                <span>
                  
                </span>

                <div>

                  <strong>
                    Carro
                  </strong>

                  <small>
                    Publica los cupos disponibles.
                  </small>

                </div>

              </div>

            </div>


            <button
              className="boton-principal"
              onClick={() => {
                if (usuario?.rol === "conductor") {
                  irAlServicio("/publicar");
                } else {
                  abrirLogin();
                }
              }}
            >
              Publicar mi ruta
              <span>
                →
              </span>
            </button>

          </div>


          <div className="conductores-fotos">


            {/* FOTO MOTO */}
            <div className="foto-conductor foto-moto">

              <img
                src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=700&q=85"
                alt="Conductor desplazándose en motocicleta por la ciudad"
              />

              <div className="etiqueta-foto">
                Conductor en moto
              </div>

            </div>


            {/* FOTO CARRO */}
            <div className="foto-conductor foto-carro">

              <img
                src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=700&q=85"
                alt="Conductor realizando un recorrido en automóvil"
              />

              <div className="etiqueta-foto">
                Conductor en carro
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* CTA */}
      <section className="seccion-cta">

        <div className="contenedor cta-contenido">

          <div>

            <span>
              ¿LISTO PARA EMPEZAR?
            </span>

            <h2 translate="no">
              Encuentra tu próxima ruta con TdeA GO.
            </h2>

          </div>

          <button
            className="boton-cta"
            onClick={() => irAlServicio("/buscar")}
          >
            Buscar una ruta →
          </button>

        </div>

      </section>

    </div>
  );
}

export default Inicio;