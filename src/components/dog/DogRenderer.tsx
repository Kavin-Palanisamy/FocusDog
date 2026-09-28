import React from "react";
import { DogCoat, DogState } from "../../models/settings";
import "../../styles/dog/dog_pet.css";

interface DogRendererProps {
  coat?: DogCoat;
  state?: DogState;
  direction?: "left" | "right";
  size?: number;
  speed?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export const DogRenderer: React.FC<DogRendererProps> = ({
  coat = "cream",
  state = "idle",
  direction = "right",
  size = 0.9,
  speed = 1.9,
  className = "",
  onClick,
  onContextMenu,
  onDoubleClick,
}) => {
  // Palettes based on coat
  const getCoatColors = (c: DogCoat) => {
    switch (c) {
      case "white":
        return {
          fur1: "#FFFFFF",
          fur2: "#E2E8F0",
          stroke: "#94A3B8",
          belly1: "#FFFFFF",
          belly2: "#F1F5F9",
          ear1: "#E2E8F0",
          ear2: "#CBD5E1",
          innerEar: "#FCE7F3",
          eyeColor: "#1E293B",
          eyeGlint: "#FFFFFF",
          nose: "#1E293B",
          collar1: "#3B82F6",
          collar2: "#1D4ED8",
        };
      case "black":
        return {
          fur1: "#292E39",
          fur2: "#14171E",
          stroke: "#0B0D12",
          belly1: "#373E4D",
          belly2: "#232833",
          ear1: "#1C2029",
          ear2: "#0E1117",
          innerEar: "#2E3442",
          eyeColor: "#F59E0B", // Glowing amber eyes for black dog
          eyeGlint: "#FFFBEB",
          nose: "#050608",
          collar1: "#10B981",
          collar2: "#047857",
        };
      case "cream":
      default:
        return {
          fur1: "#F5B070",
          fur2: "#E28945",
          stroke: "#B85D20",
          belly1: "#FFF7EC",
          belly2: "#FFE4C7",
          ear1: "#D97A38",
          ear2: "#B85D20",
          innerEar: "#FDBA74",
          eyeColor: "#241B15",
          eyeGlint: "#FFFFFF",
          nose: "#261E1A",
          collar1: "#EF4444",
          collar2: "#DC2626",
        };
    }
  };

  const colors = getCoatColors(coat);
  const isFlipped = direction === "left";

  const style: React.CSSProperties = {
    transform: `scale(${size}) ${isFlipped ? "scaleX(-1)" : ""}`,
    // @ts-expect-error custom CSS property
    "--speed-mult": `${speed}`,
  };

  return (
    <div
      className={`fd-dog-wrap fd-state-${state} fd-coat-${coat} ${className}`}
      style={style}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      <svg
        viewBox="0 0 200 200"
        className="fd-dog-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`furGrad-${coat}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.fur1} />
            <stop offset="100%" stopColor={colors.fur2} />
          </linearGradient>

          <linearGradient id={`bellyGrad-${coat}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.belly1} />
            <stop offset="100%" stopColor={colors.belly2} />
          </linearGradient>

          <linearGradient id={`earGrad-${coat}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.ear1} />
            <stop offset="100%" stopColor={colors.ear2} />
          </linearGradient>

          <linearGradient id={`collarGrad-${coat}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.collar1} />
            <stop offset="100%" stopColor={colors.collar2} />
          </linearGradient>
        </defs>

        {/* Ambient Ground Shadow */}
        <ellipse cx="100" cy="182" rx="58" ry="10" fill="rgba(15, 18, 25, 0.28)" />

        <g className="fd-dog-body-motion">
          {/* Tail */}
          <g className="fd-dog-tail-group">
            <path
              d="M 142 144 C 166 138, 178 118, 170 102 C 163 88, 148 94, 153 108 C 157 118, 148 132, 134 140 Z"
              fill={`url(#furGrad-${coat})`}
              stroke={colors.stroke}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M 170 102 C 167 96, 159 93, 153 108 C 158 104, 165 101, 170 102 Z"
              fill={colors.belly1}
            />
          </g>

          {/* Back Paws */}
          <ellipse
            cx="64"
            cy="168"
            rx="15"
            ry="9"
            fill={`url(#furGrad-${coat})`}
            stroke={colors.stroke}
            strokeWidth="2.5"
          />
          <ellipse
            cx="136"
            cy="168"
            rx="15"
            ry="9"
            fill={`url(#furGrad-${coat})`}
            stroke={colors.stroke}
            strokeWidth="2.5"
          />

          {/* Torso */}
          <path
            d="M 68 122 C 60 148, 64 168, 78 172 C 92 176, 108 176, 122 172 C 136 168, 140 148, 132 122 C 124 102, 76 102, 68 122 Z"
            fill={`url(#furGrad-${coat})`}
            stroke={colors.stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Belly Patch */}
          <path
            d="M 82 126 C 76 144, 80 166, 100 168 C 120 166, 124 144, 118 126 C 112 114, 88 114, 82 126 Z"
            fill={`url(#bellyGrad-${coat})`}
          />

          {/* Front Left Paw / Leg */}
          <g className="fd-dog-leg-left">
            <rect
              x="76"
              y="142"
              width="15"
              height="30"
              rx="7"
              fill={`url(#furGrad-${coat})`}
              stroke={colors.stroke}
              strokeWidth="2.5"
            />
            <path d="M 76 168 C 76 174, 91 174, 91 168 Z" fill={colors.belly1} />
          </g>

          {/* Front Right Paw / Leg */}
          <g className="fd-dog-leg-right">
            <rect
              x="109"
              y="142"
              width="15"
              height="30"
              rx="7"
              fill={`url(#furGrad-${coat})`}
              stroke={colors.stroke}
              strokeWidth="2.5"
            />
            <path d="M 109 168 C 109 174, 124 174, 124 168 Z" fill={colors.belly1} />
          </g>

          {/* Collar */}
          <path
            d="M 72 116 C 88 126, 112 126, 128 116 C 130 120, 126 126, 122 127 C 108 132, 92 132, 78 127 C 74 126, 70 120, 72 116 Z"
            fill={`url(#collarGrad-${coat})`}
            stroke="#991B1B"
            strokeWidth="1.8"
          />
          <circle cx="100" cy="132" r="4.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />

          {/* Left Ear */}
          <g className="fd-dog-ear-l">
            <path
              d="M 64 64 C 44 68, 32 94, 38 120 C 42 134, 58 136, 64 120 C 70 104, 72 74, 64 64 Z"
              fill={`url(#earGrad-${coat})`}
              stroke={colors.stroke}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M 48 84 C 42 100, 48 118, 56 122 C 60 114, 62 96, 56 86 Z"
              fill={colors.innerEar}
              opacity="0.6"
            />
          </g>

          {/* Right Ear */}
          <g className="fd-dog-ear-r">
            <path
              d="M 136 64 C 156 68, 168 94, 162 120 C 158 134, 142 136, 136 120 C 130 104, 128 74, 136 64 Z"
              fill={`url(#earGrad-${coat})`}
              stroke={colors.stroke}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M 152 84 C 158 100, 152 118, 144 122 C 140 114, 138 96, 144 86 Z"
              fill={colors.innerEar}
              opacity="0.6"
            />
          </g>

          {/* Head */}
          <g className="fd-dog-head-group">
            <circle
              cx="100"
              cy="80"
              r="44"
              fill={`url(#furGrad-${coat})`}
              stroke={colors.stroke}
              strokeWidth="2.5"
            />

            {/* Forehead blaze */}
            <path
              d="M 97 42 C 96 55, 93 64, 88 74 C 94 77, 106 77, 112 74 C 107 64, 104 55, 103 42 Z"
              fill={colors.belly1}
            />

            {/* Muzzle */}
            <ellipse
              cx="100"
              cy="95"
              rx="22"
              ry="16"
              fill={`url(#bellyGrad-${coat})`}
              stroke={colors.stroke}
              strokeWidth="1.8"
            />

            {/* Nose */}
            <path
              d="M 94 88 C 94 85, 106 85, 106 88 C 106 93, 101 96, 100 96 C 99 96, 94 93, 94 88 Z"
              fill={colors.nose}
            />
            <ellipse cx="97.5" cy="87.5" rx="2" ry="1.2" fill="#FFFFFF" opacity="0.85" />

            {/* Mouth */}
            {state === "finished" ? (
              <g>
                <path
                  d="M 90 98 Q 100 109 110 98"
                  fill="none"
                  stroke="#4A2612"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 96 102 C 96 112, 104 112, 104 102 Z"
                  fill="#FF6B8B"
                  stroke="#E11D48"
                  strokeWidth="1.5"
                />
              </g>
            ) : state === "sleeping" ? (
              <path
                d="M 94 100 Q 100 103 106 100"
                fill="none"
                stroke="#4A2612"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M 91 98 Q 96 103 100 98 Q 104 103 109 98"
                fill="none"
                stroke="#4A2612"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            )}

            {/* Whisker freckles */}
            <circle cx="88" cy="94" r="0.9" fill="#78350F" opacity="0.6" />
            <circle cx="85" cy="96" r="0.9" fill="#78350F" opacity="0.6" />
            <circle cx="112" cy="94" r="0.9" fill="#78350F" opacity="0.6" />
            <circle cx="115" cy="96" r="0.9" fill="#78350F" opacity="0.6" />

            {/* Cheeks */}
            <ellipse cx="73" cy="92" rx="6" ry="3.5" fill="#F43F5E" opacity="0.3" />
            <ellipse cx="127" cy="92" rx="6" ry="3.5" fill="#F43F5E" opacity="0.3" />

            {/* Eyes */}
            {state === "sleeping" ? (
              <g>
                <path
                  d="M 74 76 Q 81 83 88 76"
                  fill="none"
                  stroke={colors.eyeColor}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 112 76 Q 119 83 126 76"
                  fill="none"
                  stroke={colors.eyeColor}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </g>
            ) : state === "finished" ? (
              <g>
                <path
                  d="M 73 78 Q 80 69 87 78"
                  fill="none"
                  stroke={colors.eyeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 113 78 Q 120 69 127 78"
                  fill="none"
                  stroke={colors.eyeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
            ) : state === "focusing" ? (
              <g>
                <path d="M 73 66 L 87 69" stroke={colors.stroke} strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 127 66 L 113 69" stroke={colors.stroke} strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="81" cy="76" r="7" fill={colors.eyeColor} />
                <circle cx="79" cy="74" r="2.8" fill={colors.eyeGlint} />
                <circle cx="119" cy="76" r="7" fill={colors.eyeColor} />
                <circle cx="117" cy="74" r="2.8" fill={colors.eyeGlint} />
                {/* Red Focus Headband */}
                <path
                  d="M 64 52 Q 100 48 136 52 L 135 58 Q 100 54 65 58 Z"
                  fill="#EF4444"
                  stroke="#991B1B"
                  strokeWidth="1.2"
                />
                <circle cx="100" cy="54" r="3.2" fill="#FBBF24" />
              </g>
            ) : (
              <g className="fd-dog-blinking">
                <circle cx="81" cy="76" r="6.8" fill={colors.eyeColor} />
                <circle cx="79" cy="73.8" r="2.6" fill={colors.eyeGlint} />
                <circle cx="119" cy="76" r="6.8" fill={colors.eyeColor} />
                <circle cx="117" cy="73.8" r="2.6" fill={colors.eyeGlint} />
              </g>
            )}
          </g>

          {/* Sleeping Z's */}
          {state === "sleeping" && (
            <g className="fd-sleep-particles" fill="#60A5FA" fontWeight="bold">
              <text x="135" y="55" fontSize="14" className="fd-z-1">Z</text>
              <text x="145" y="42" fontSize="11" className="fd-z-2">z</text>
              <text x="154" y="32" fontSize="8" className="fd-z-3">z</text>
            </g>
          )}

          {/* Finished Celebration Stars */}
          {state === "finished" && (
            <g className="fd-sparkles">
              <path d="M 50 40 L 52 46 L 58 48 L 52 50 L 50 56 L 48 50 L 42 48 L 48 46 Z" fill="#FBBF24" />
              <path d="M 152 44 L 154 50 L 160 52 L 154 54 L 152 60 L 150 54 L 144 52 L 150 50 Z" fill="#F43F5E" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};