/**
 * Logo
 * ----
 * The CogniCode animated logo: a neural network of nodes with
 * pulsing connections. Uses CSS keyframes defined in index.css.
 *
 * The `size` prop scales the SVG; the `withWordmark` prop adds
 * the "CogniCode" text beside it.
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

import { useEffect } from "react";

// Inject keyframes once. Inline animation would be cleaner but
// keyframes cannot live inside JSX.
const KEYFRAMES_ID = "cc-logo-keyframes";
function ensureKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes cc-pulse { 0%,100% { opacity:.3; transform:scale(1) } 50% { opacity:1; transform:scale(1.4) } }
    @keyframes cc-line  { 0%,100% { stroke-opacity:.1 } 50% { stroke-opacity:.7 } }
    .cc-node { transform-origin:center; transform-box:fill-box; animation: cc-pulse 2.8s ease-in-out infinite; }
    .cc-line { animation: cc-line 2.2s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}


const NODES = [
  { cx: 16, cy: 7,  r: 3.2, delay: 0.00 },
  { cx: 30, cy: 7,  r: 2.8, delay: 0.35 },
  { cx: 38, cy: 16, r: 2.8, delay: 0.70 },
  { cx: 38, cy: 32, r: 2.8, delay: 1.05 },
  { cx: 30, cy: 41, r: 2.8, delay: 1.40 },
  { cx: 16, cy: 41, r: 3.2, delay: 1.75 },
  { cx: 10, cy: 24, r: 3.8, delay: 2.10 },
  { cx: 24, cy: 24, r: 4.2, delay: 2.45 },
];

const LINES = [
  [16, 7, 30, 7, 0.10], [30, 7, 38, 16, 0.40], [38, 32, 30, 41, 0.80],
  [30, 41, 16, 41, 1.10], [16, 7, 10, 24, 1.50], [10, 24, 16, 41, 1.90],
  [10, 24, 24, 24, 0.25], [16, 7, 24, 24, 0.65], [16, 41, 24, 24, 1.30],
];


export default function Logo({ size = 32, withWordmark = false, className = "" }) {
  useEffect(() => ensureKeyframes(), []);

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <g stroke="rgba(245,158,11,0.45)" strokeWidth="1.1" fill="none">
          {LINES.map(([x1, y1, x2, y2, delay], i) => (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              className="cc-line"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </g>
        <g fill="var(--warning)">
          {NODES.map((n, i) => (
            <circle
              key={i}
              cx={n.cx} cy={n.cy} r={n.r}
              className="cc-node"
              style={{ animationDelay: `${n.delay}s` }}
            />
          ))}
        </g>
        <circle cx="24" cy="24" r="1.8" fill="white" opacity="0.9" />
      </svg>

      {withWordmark && (
        <span className="text-base font-black tracking-tight text-[color:var(--text)]">
          CogniCode
        </span>
      )}
    </div>
  );
}