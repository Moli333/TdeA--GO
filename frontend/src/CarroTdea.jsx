function CarroTdea() {
  return (
    <div className="carro-tdea" aria-label="Vehículo TdeA GO en movimiento">
      <svg
        className="carro-svg"
        viewBox="0 0 520 210"
        role="img"
        aria-hidden="true"
      >
        <defs>
          {/* Pintura principal */}
          <linearGradient
            id="carroPintura"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#062d4d" />
            <stop offset="28%" stopColor="#07537a" />
            <stop offset="54%" stopColor="#08758a" />
            <stop offset="76%" stopColor="#079071" />
            <stop offset="100%" stopColor="#0d9a68" />
          </linearGradient>

          {/* Parte inferior */}
          <linearGradient
            id="carroParteBaja"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#12627a" stopOpacity="0" />
            <stop offset="55%" stopColor="#04364e" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#01283d" stopOpacity="0.65" />
          </linearGradient>

          {/* Vidrios */}
          <linearGradient
            id="vidrioFrontal"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#8cb8c8" />
            <stop offset="24%" stopColor="#315c70" />
            <stop offset="58%" stopColor="#102f42" />
            <stop offset="100%" stopColor="#071c2c" />
          </linearGradient>

          <linearGradient
            id="vidrioTrasero"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#668fa0" />
            <stop offset="30%" stopColor="#24495b" />
            <stop offset="75%" stopColor="#0b2738" />
            <stop offset="100%" stopColor="#061a29" />
          </linearGradient>

          {/* Neumático */}
          <radialGradient
            id="neumatico"
            cx="40%"
            cy="35%"
            r="70%"
          >
            <stop offset="0%" stopColor="#354b55" />
            <stop offset="42%" stopColor="#172a34" />
            <stop offset="76%" stopColor="#091820" />
            <stop offset="100%" stopColor="#02090d" />
          </radialGradient>

          {/* Rin */}
          <radialGradient
            id="rin"
            cx="38%"
            cy="32%"
            r="70%"
          >
            <stop offset="0%" stopColor="#f5f8f9" />
            <stop offset="30%" stopColor="#cbd4d8" />
            <stop offset="58%" stopColor="#778991" />
            <stop offset="78%" stopColor="#334952" />
            <stop offset="100%" stopColor="#162a34" />
          </radialGradient>

          {/* Faros */}
          <linearGradient
            id="faro"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#b9f4ff" />
            <stop offset="45%" stopColor="#f8ffff" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Reflejo */}
          <linearGradient
            id="reflejoCarro"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.78" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Sombra */}
          <filter
            id="sombraCarro"
            x="-20%"
            y="-30%"
            width="140%"
            height="170%"
          >
            <feDropShadow
              dx="0"
              dy="9"
              stdDeviation="7"
              floodColor="#12384b"
              floodOpacity="0.30"
            />
          </filter>

          {/* Brillo de faro */}
          <filter
            id="brilloFaro"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur
              stdDeviation="3"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Recorte para el reflejo */}
          <clipPath id="recorteCarro">
            <path
              d="
                M44 126
                L54 101
                Q63 91 83 88
                L113 43
                Q125 26 151 22
                L337 22
                Q362 24 380 42
                L420 87
                Q438 91 455 103
                L474 126
                L474 143
                L44 143
                Z
              "
            />
          </clipPath>
        </defs>

        {/* Sombra */}
        <ellipse
          cx="260"
          cy="158"
          rx="202"
          ry="18"
          fill="#092b3d"
          opacity="0.20"
        />

        {/* Cuerpo completo */}
        <g filter="url(#sombraCarro)">
          <path
            d="
              M44 126
              L54 101
              Q63 91 83 88
              L113 43
              Q125 26 151 22
              L337 22
              Q362 24 380 42
              L420 87
              Q438 91 455 103
              L474 126
              Q480 134 474 143
              L44 143
              Q37 136 44 126
              Z
            "
            fill="url(#carroPintura)"
            stroke="#06283c"
            strokeWidth="2"
          />

          {/* Parte baja de la carrocería */}
          <path
            d="
              M43 123
              L476 123
              L474 143
              Q470 150 456 150
              L58 150
              Q44 149 40 140
              Z
            "
            fill="url(#carroParteBaja)"
          />

          {/* Línea de carácter lateral */}
          <path
            d="M65 105 Q210 96 421 104"
            fill="none"
            stroke="#9de1e2"
            strokeOpacity="0.23"
            strokeWidth="2"
          />

          <path
            d="M67 116 Q245 108 446 116"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.10"
            strokeWidth="2"
          />

          {/* Cabina / vidrio principal */}
          <path
            d="
              M112 86
              L138 47
              Q146 34 164 31
              L250 31
              L250 87
              Z
            "
            fill="url(#vidrioTrasero)"
            stroke="#092737"
            strokeWidth="2"
          />

          {/* Vidrio del conductor */}
          <path
            d="
              M255 31
              L335 32
              Q354 34 366 48
              L399 86
              L255 86
              Z
            "
            fill="url(#vidrioFrontal)"
            stroke="#092737"
            strokeWidth="2"
          />

          {/* Separación entre vidrios */}
          <path
            d="M250 31 L255 86"
            stroke="#061e2d"
            strokeWidth="5"
          />

          {/* Reflejo superior de ventanas */}
          <path
            d="
              M143 48
              Q150 35 169 32
              L224 32
              L145 70
              Z
            "
            fill="#ffffff"
            opacity="0.13"
          />

          <path
            d="
              M273 34
              L328 35
              Q347 37 358 50
              L370 64
              L285 43
              Z
            "
            fill="#ffffff"
            opacity="0.16"
          />

          {/* Conductor */}
          <g className="conductor-svg">
            {/* Cabeza */}
            <circle
              cx="316"
              cy="51"
              r="11"
              fill="#c88e68"
            />

            {/* Cabello */}
            <path
              d="
                M305 50
                Q306 38 317 37
                Q327 39 328 50
                Q322 45 315 45
                Q309 45 305 50
                Z
              "
              fill="#17232a"
            />

            {/* Torso / camisa */}
            <path
              d="
                M296 83
                Q299 63 314 61
                Q326 61 336 83
                Z
              "
              fill="#f2f5f6"
            />

            {/* Hombro */}
            <path
              d="
                M296 82
                Q302 67 315 64
                Q323 67 336 82
              "
              fill="none"
              stroke="#d6e2e5"
              strokeWidth="2"
            />

            {/* Brazo hacia volante */}
            <path
              d="
                M326 69
                Q335 69 342 76
                L350 82
              "
              fill="none"
              stroke="#c88e68"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Volante */}
            <circle
              cx="349"
              cy="82"
              r="9"
              fill="none"
              stroke="#101c22"
              strokeWidth="3"
            />

            <path
              d="M349 73 L349 91 M341 82 L357 82"
              stroke="#101c22"
              strokeWidth="2"
            />
          </g>

          {/* Espejo lateral */}
          <path
            d="
              M395 77
              Q407 74 416 80
              L411 90
              L399 89
              Z
            "
            fill="#153b4c"
            stroke="#062738"
            strokeWidth="2"
          />

          <path
            d="
              M401 80
              Q408 79 412 82
            "
            fill="none"
            stroke="#a9d2db"
            strokeOpacity="0.45"
            strokeWidth="2"
          />

          {/* Puertas */}
          <path
            d="M254 91 L254 124"
            stroke="#06384e"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />

          <path
            d="M375 92 L375 123"
            stroke="#06384e"
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />

          {/* Manijas */}
          <rect
            x="276"
            y="101"
            width="17"
            height="3"
            rx="1.5"
            fill="#d7e8eb"
            opacity="0.55"
          />

          <rect
            x="347"
            y="101"
            width="17"
            height="3"
            rx="1.5"
            fill="#d7e8eb"
            opacity="0.45"
          />

          {/* Logo TdeA GO */}
          <g transform="translate(289 117)">
            <text
              x="0"
              y="0"
              fill="#ffffff"
              fontSize="10"
              fontWeight="800"
              letterSpacing="0.4"
              fontFamily="Arial, sans-serif"
            >
              TdeA
            </text>

            <text
              x="28"
              y="0"
              fill="#8ce3a8"
              fontSize="10"
              fontWeight="900"
              letterSpacing="0.4"
              fontFamily="Arial, sans-serif"
            >
              GO
            </text>
          </g>

          {/* Moldura inferior */}
          <path
            d="M63 137 Q250 145 456 137"
            fill="none"
            stroke="#021c2b"
            strokeOpacity="0.55"
            strokeWidth="3"
          />

          {/* Faro delantero */}
          <path
            d="
              M447 104
              Q460 106 470 116
              L474 125
              L451 124
              Q446 116 447 104
              Z
            "
            fill="url(#faro)"
            filter="url(#brilloFaro)"
          />

          <path
            d="M452 113 L468 118"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Faro trasero */}
          <path
            d="
              M46 106
              Q55 101 63 102
              L68 121
              L47 121
              Z
            "
            fill="#e96a65"
            opacity="0.95"
          />

          <path
            d="M48 107 L62 107"
            stroke="#ffb0aa"
            strokeWidth="2"
            opacity="0.75"
          />

          {/* Brillo sobre la pintura */}
          <g clipPath="url(#recorteCarro)">
            <rect
              className="carro-reflejo"
              x="-180"
              y="10"
              width="95"
              height="160"
              fill="url(#reflejoCarro)"
              transform="skewX(-16)"
            />
          </g>
        </g>

        {/* Rueda trasera */}
        <g className="rueda-svg">
          <circle
            cx="130"
            cy="139"
            r="30"
            fill="#06121a"
            stroke="#0c202a"
            strokeWidth="4"
          />

          <circle
            cx="130"
            cy="139"
            r="22"
            fill="url(#neumatico)"
          />

          <circle
            cx="130"
            cy="139"
            r="15"
            fill="url(#rin)"
            stroke="#d8e0e3"
            strokeWidth="1.5"
          />

          <circle
            cx="130"
            cy="139"
            r="5"
            fill="#354d57"
          />

          <circle
            cx="130"
            cy="139"
            r="2"
            fill="#dce5e8"
          />
        </g>

        {/* Rueda delantera */}
        <g className="rueda-svg">
          <circle
            cx="404"
            cy="139"
            r="30"
            fill="#06121a"
            stroke="#0c202a"
            strokeWidth="4"
          />

          <circle
            cx="404"
            cy="139"
            r="22"
            fill="url(#neumatico)"
          />

          <circle
            cx="404"
            cy="139"
            r="15"
            fill="url(#rin)"
            stroke="#d8e0e3"
            strokeWidth="1.5"
          />

          <circle
            cx="404"
            cy="139"
            r="5"
            fill="#354d57"
          />

          <circle
            cx="404"
            cy="139"
            r="2"
            fill="#dce5e8"
          />
        </g>
      </svg>
    </div>
  );
}

export default CarroTdea;