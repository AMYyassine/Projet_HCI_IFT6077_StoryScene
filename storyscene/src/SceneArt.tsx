import type { ArtKind, Character } from "./model";

export function Person({
  character,
  portrait = false,
}: {
  character: Character;
  portrait?: boolean;
}) {
  const older = character.id === "rose";
  const masculine = character.id === "adam";
  return (
    <svg
      viewBox={portrait ? "16 0 64 62" : "0 0 96 130"}
      aria-hidden="true"
      className="person-svg"
    >
      <g className="person-body">
        {!portrait && (
          <>
            <path d="M34 101L31 124h14l4-23m2 0 3 23h14l-8-25" fill="#4b4552" />
            <path
              d="M30 124h17m6 0h18"
              stroke="#423a43"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </>
        )}
        <path
          d="M30 61Q48 53 66 61L74 102H23Z"
          fill={character.color}
          stroke="#695a66"
          strokeWidth="1.8"
        />
        {!portrait && (
          <path
            d="M29 67L17 95M67 67l12 27"
            stroke={character.color}
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        <path d="M41 49v12q7 7 14 0V49" fill="#e4bba2" />
        {!masculine && (
          <path
            d="M25 31q0-28 24-28t24 28v29l-12-4-26 1-11 6Z"
            fill={older ? "#c0b2a0" : "#524248"}
            stroke="#665253"
            strokeWidth="1.5"
          />
        )}
        <ellipse
          cx="48"
          cy="31"
          rx="21"
          ry="25"
          fill="#f0cfb4"
          stroke="#8c6c60"
          strokeWidth="1.2"
        />
        <path
          d={
            masculine
              ? "M27 30Q22 2 47 2q28-3 24 31L59 14q-12 8-29 6Z"
              : older
                ? "M27 26Q23 1 49 2q24 0 22 26L60 14q-14 18-33 12Z"
                : "M26 31Q22 2 48 2q30-2 24 34L59 13Q42 28 27 26Z"
          }
          fill={masculine ? "#625253" : older ? "#b4aba0" : "#524248"}
        />
        <g className="eyes">
          <ellipse cx="40" cy="33" rx="1.7" ry="2.3" fill="#524248" />
          <ellipse cx="57" cy="33" rx="1.7" ry="2.3" fill="#524248" />
        </g>
        <path
          d="M44 45q5 3 10-1"
          fill="none"
          stroke="#a5756c"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {older && (
          <g fill="none" stroke="#756a61" strokeWidth="1.4">
            <circle cx="39" cy="33" r="7" />
            <circle cx="58" cy="33" r="7" />
            <path d="M46 33h5" />
          </g>
        )}
      </g>
    </svg>
  );
}

export function SceneBackground({ kind }: { kind: ArtKind }) {
  const outside = ["house", "garden", "farewell"].includes(kind);
  const cafe = ["cafe", "confession"].includes(kind);
  const desk = ["letter", "photo", "desk"].includes(kind);
  return (
    <svg
      viewBox="0 0 260 156"
      preserveAspectRatio="xMidYMid slice"
      className={`scene-background art-${kind}`}
      aria-hidden="true"
    >
      <rect
        width="260"
        height="156"
        fill={
          outside
            ? "#e9eee5"
            : cafe
              ? "#eaddcc"
              : kind === "attic"
                ? "#d8c5aa"
                : "#e9dfcf"
        }
      />
      <rect
        y="117"
        width="260"
        height="39"
        fill={outside ? "#c4c7a0" : "#ccb79d"}
      />
      <path
        d="M0 130h260M0 147h260M50 117l-8 39m70-39v39m65-39 6 39m49-39 18 39"
        stroke={outside ? "#bdc49e" : "#b6a08a"}
        strokeWidth="1"
        opacity=".55"
      />
      {kind === "house" && (
        <g stroke="#8a7b6d" strokeWidth="1.5">
          <path d="M53 119V42L122 7l74 35v77" fill="#e8ddc7" />
          <path d="M40 43L123 0l87 44" fill="#8f7770" />
          <rect x="112" y="74" width="30" height="45" rx="13" fill="#8d7d70" />
          <rect x="70" y="55" width="23" height="31" fill="#a9b7ad" />
          <rect x="160" y="55" width="23" height="31" fill="#a9b7ad" />
          <path d="M81 55v31m-11-16h23m78-15v31m-11-16h23" />
          <path
            d="M8 153V91m0 11 30-17M232 151V80m0 18-24-11"
            stroke="#7d8c66"
            strokeWidth="5"
          />
          <g fill="#94a178" stroke="none">
            <circle cx="10" cy="76" r="25" />
            <circle cx="241" cy="69" r="32" />
          </g>
        </g>
      )}
      {["garden", "farewell"].includes(kind) && (
        <g>
          <path d="M0 88h260v20H0Z" fill="#b3b697" />
          <path
            d="M30 124V41m200 83V41M30 50q100-83 200 0"
            stroke="#8b927a"
            strokeWidth="5"
            fill="none"
          />
          <path
            d="M48 123V63m164 60V63m-164 5h164"
            stroke="#a4a68c"
            strokeWidth="3"
          />
          <g fill="#94a17e">
            <ellipse cx="18" cy="87" rx="33" ry="53" />
            <ellipse cx="246" cy="92" rx="36" ry="52" />
          </g>
          <g fill="#c58c8d">
            <circle cx="21" cy="65" r="7" />
            <circle cx="13" cy="101" r="6" />
            <circle cx="237" cy="77" r="7" />
            <circle cx="256" cy="104" r="6" />
          </g>
        </g>
      )}
      {kind === "attic" && (
        <g stroke="#9f856c" fill="none">
          <path
            d="M0 0l130 112L260 0M0 27l108 91M260 27l-108 91"
            strokeWidth="8"
          />
          <rect
            x="109"
            y="20"
            width="43"
            height="47"
            fill="#c9d5d0"
            strokeWidth="4"
          />
          <path d="M130 21v46m-21-24h43" />
          <path d="M161 117v-25q0-12 15-12h47q14 0 14 12v25Z" fill="#a58b6d" />
          <path d="M162 94h74" strokeWidth="3" />
          <rect x="190" y="91" width="9" height="12" fill="#d2ba83" />
        </g>
      )}
      {(desk || cafe || kind === "confession") && (
        <g stroke="#b7a68e" strokeWidth="2">
          <rect
            x={cafe ? 81 : 156}
            y="12"
            width="73"
            height="82"
            rx="30"
            fill="#b8cbc6"
          />
          <path
            d={cafe ? "M117 12v82M82 51h72" : "M192 12v82m-35-43h72"}
            stroke="#efe4d0"
            strokeWidth="5"
          />
          <path d="M20 35h35v49H20Z" fill="#d4c2a2" />
          <path d="M26 41h23v37H26Z" fill="#b4b396" />
          <path
            d={
              cafe
                ? "M76 120h111m-102 2-6 34m98-34 7 34"
                : "M13 122h120m-110 0v34m100-34v34"
            }
            stroke="#987d66"
            strokeWidth="5"
          />
          {cafe ? (
            <>
              <ellipse cx="132" cy="115" rx="58" ry="9" fill="#d7bea1" />
              <path d="M98 103h13v11H98zm51 0h13v11h-13Z" fill="#f6f0e5" />
              <path
                d="M98 97q-5-6 0-12m57 12q5-6 0-12"
                className="steam"
                stroke="#fff"
                fill="none"
              />
              <path d="M122 106l20 3-5 9-21-3Z" fill="#f3e7d2" />
            </>
          ) : (
            <>
              <path d="M44 113l43-9 19 13-44 9Z" fill="#f7edda" />
              <path d="M54 112l20 5 14-11" fill="none" />
              <path d="M25 81v34m-10-34h23L31 56h-9Z" fill="#c5b382" />
            </>
          )}
        </g>
      )}
      {kind === "photo" && (
        <g transform="translate(178 46) rotate(7)">
          <rect width="50" height="62" fill="#faf1dc" />
          <rect x="5" y="5" width="40" height="43" fill="#9eaca5" />
          <path d="M6 37l12-12 15 7 11-9v25H6Z" fill="#7f8f86" />
        </g>
      )}
      {kind === "train" && (
        <g>
          <rect x="12" y="12" width="236" height="88" rx="18" fill="#8eaaa6" />
          <rect x="20" y="19" width="220" height="72" rx="12" fill="#d1dfd2" />
          <path
            d="M20 71q30-40 72-10t81-4 68 7v27H20Z"
            fill="#b0c1a6"
            className="passing-landscape"
          />
          <path d="M130 13v86" stroke="#9a9384" strokeWidth="6" />
          <path
            d="M10 150v-35q0-12 12-12h70v47m76 0v-47h70q12 0 12 12v35"
            fill="#a48b89"
            stroke="#8f7775"
            strokeWidth="3"
          />
        </g>
      )}
      <path d="M0 155h260" stroke="#a8967e" strokeWidth="2" />
    </svg>
  );
}
