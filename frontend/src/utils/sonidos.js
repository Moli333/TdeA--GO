// ------------------------------------------------------------------
// SONIDOS DE ALERTA (sin archivos de audio: se generan en el navegador)
//
//  - sonarBocinaUnaVez(): aviso único (pasajero / avisos informativos)
//  - iniciarAlarmaBocina(): bocina de carro repetitiva (conductor)
//  - detenerAlarmaBocina(): apaga la alarma
//
// Los navegadores bloquean el audio hasta que el usuario toca la
// pantalla una vez; por eso se "desbloquea" con el primer clic/tecla.
// ------------------------------------------------------------------

let contexto = null;
let temporizadorAlarma = null;

function obtenerContexto() {
    if (!contexto) {
        const Clase = window.AudioContext || window.webkitAudioContext;
        if (!Clase) return null;
        contexto = new Clase();
    }
    return contexto;
}

export function desbloquearAudio() {
    const ctx = obtenerContexto();
    if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => { });
    }
}

export function activarDesbloqueoAutomatico() {
    const eventos = ["pointerdown", "keydown", "touchstart"];
    const manejar = () => {
        desbloquearAudio();
        eventos.forEach((e) => window.removeEventListener(e, manejar));
    };
    eventos.forEach((e) => window.addEventListener(e, manejar, { once: false }));
}

// Un "pi-pi" de bocina: dos tonos mezclados (como una bocina real).
function tocarPitido(ctx, inicio, duracion, volumen) {
    [415, 523].forEach((frecuencia) => {
        const oscilador = ctx.createOscillator();
        const ganancia = ctx.createGain();
        const filtro = ctx.createBiquadFilter();

        oscilador.type = "sawtooth";
        oscilador.frequency.value = frecuencia;
        filtro.type = "lowpass";
        filtro.frequency.value = 1800;

        ganancia.gain.setValueAtTime(0.0001, inicio);
        ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.02);
        ganancia.gain.setValueAtTime(volumen, inicio + duracion - 0.05);
        ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);

        oscilador.connect(filtro);
        filtro.connect(ganancia);
        ganancia.connect(ctx.destination);

        oscilador.start(inicio);
        oscilador.stop(inicio + duracion + 0.02);
    });
}

// Dos bocinazos cortos.
function bocinazoDoble(volumen) {
    const ctx = obtenerContexto();
    if (!ctx || ctx.state !== "running") return false;

    const t = ctx.currentTime + 0.02;
    tocarPitido(ctx, t, 0.28, volumen);
    tocarPitido(ctx, t + 0.4, 0.55, volumen);
    return true;
}

export function sonarBocinaUnaVez() {
    desbloquearAudio();
    bocinazoDoble(0.12);
}

export function iniciarAlarmaBocina() {
    if (temporizadorAlarma) return;

    desbloquearAudio();
    bocinazoDoble(0.2);

    temporizadorAlarma = setInterval(() => {
        bocinazoDoble(0.2);
    }, 1800);
}

export function detenerAlarmaBocina() {
    if (temporizadorAlarma) {
        clearInterval(temporizadorAlarma);
        temporizadorAlarma = null;
    }
}
