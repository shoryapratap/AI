import React from 'react';

const VoiceOrb = ({ isUserTalking, isAiTalking }) => {
  const isTalking = isUserTalking || isAiTalking;

  return (
    <button className="organic-orb-container omen-orb-btn">
      <div className="omen-orb-container-inner">
        <div className="omen-orb-svg-wrapper">
          <svg
            className="omen-orb-svg-bg"
            viewBox="0 0 260 260"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="g1" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"></stop>
                <stop offset="20%" stopColor="#6ee7b7" stopOpacity="0.28"></stop>
                <stop offset="70%" stopColor="#0b1020" stopOpacity="0.02"></stop>
              </radialGradient>
              <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="10" result="b"></feGaussianBlur>
                <feBlend in="SourceGraphic" in2="b"></feBlend>
              </filter>
            </defs>

            <circle
              cx="130"
              cy="130"
              r="90"
              fill="url(#g1)"
              opacity="0.9"
              filter="url(#blur)"
            ></circle>

            <g opacity="0.6" transform="translate(130,130)">
              <ellipse
                cx="0"
                cy="0"
                rx="110"
                ry="110"
                fill="none"
                stroke="#60a5fa"
                strokeOpacity="0.06"
                strokeWidth="2"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  dur="18s"
                  repeatCount="indefinite"
                ></animateTransform>
              </ellipse>
            </g>

            <g opacity="0.5" transform="translate(130,130)">
              <ellipse
                cx="0"
                cy="0"
                rx="85"
                ry="85"
                fill="none"
                stroke="#6ee7b7"
                strokeOpacity="0.05"
                strokeWidth="2"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  dur="10s"
                  repeatCount="indefinite"
                ></animateTransform>
              </ellipse>
            </g>

            <g transform="translate(130,130)" opacity="0.4">
              <circle
                r="30"
                fill="none"
                stroke="#6ee7b7"
                strokeOpacity="0.08"
                strokeWidth="2"
              ></circle>
              <circle
                r="20"
                fill="none"
                stroke="#60a5fa"
                strokeOpacity="0.06"
                strokeWidth="1.6"
              ></circle>
            </g>
          </svg>

          <div className={`omen-orb-ring-1 ${isTalking ? 'omen-orb-pulse' : ''}`}>
            <div className="omen-orb-core">
              <svg
                className="omen-orb-equalizer"
                viewBox="0 0 100 60"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="10"
                  y="10"
                  width="8"
                  height="40"
                  rx="2"
                  fill="url(#barGrad)"
                  transformOrigin="14 40"
                >
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="1 0.3;1 1;1 0.3"
                    dur="1.2s"
                    repeatCount="indefinite"
                    begin="-0.9s"
                  ></animateTransform>
                </rect>
                <rect
                  x="26"
                  y="16"
                  width="8"
                  height="34"
                  rx="2"
                  fill="url(#barGrad)"
                  transformOrigin="30 40"
                >
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="1 0.35;1 1;1 0.35"
                    dur="1.2s"
                    repeatCount="indefinite"
                    begin="-0.6s"
                  ></animateTransform>
                </rect>
                <rect
                  x="42"
                  y="6"
                  width="8"
                  height="44"
                  rx="2"
                  fill="url(#barGrad)"
                  transformOrigin="46 40"
                >
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="1 0.25;1 1;1 0.25"
                    dur="1.2s"
                    repeatCount="indefinite"
                    begin="-0.3s"
                  ></animateTransform>
                </rect>
                <rect
                  x="58"
                  y="14"
                  width="8"
                  height="36"
                  rx="2"
                  fill="url(#barGrad)"
                  transformOrigin="62 40"
                >
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="1 0.4;1 1;1 0.4"
                    dur="1.2s"
                    repeatCount="indefinite"
                    begin="0s"
                  ></animateTransform>
                </rect>
                <rect
                  x="74"
                  y="8"
                  width="8"
                  height="42"
                  rx="2"
                  fill="url(#barGrad)"
                  transformOrigin="78 40"
                >
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="1 0.28;1 1;1 0.28"
                    dur="1.2s"
                    repeatCount="indefinite"
                    begin="0.3s"
                  ></animateTransform>
                </rect>

                <defs>
                  <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="#a5f3fc"
                      stopOpacity="0.95"
                    ></stop>
                    <stop
                      offset="100%"
                      stopColor="#1e3a8a"
                      stopOpacity="0.25"
                    ></stop>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <span className="omen-orb-glow"></span>
        </div>
      </div>
    </button>
  );
};

export default VoiceOrb;
