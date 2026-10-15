import { cx } from "../_lib/cx";
import styles from "./HeroGraph.module.css";

// A service graph with one wrong edge. Names come from the eval catalog: checkout-api normally talks to
// orders-api; the rotation controller is allowed to read the secrets manager, checkout-api is not.
const minor = [
  { x: 64, y: 128, label: "gateway" },
  { x: 260, y: 58, label: "catalog" },
  { x: 176, y: 206, label: "frontend" },
  { x: 270, y: 296, label: "cart" },
  { x: 322, y: 132, label: "orders-api" },
  { x: 466, y: 70, label: "ledger" },
  { x: 572, y: 168, label: "fraud" },
  { x: 120, y: 372, label: "inventory" },
];

const edges = [
  "M64 128L176 206",
  "M176 206Q200 120 260 58",
  "M176 206Q214 276 270 296",
  "M176 206Q240 150 322 132",
  "M270 296Q332 232 322 132",
  "M322 132Q400 92 466 70",
  "M466 70Q548 92 572 168",
  "M322 132Q410 190 410 300",
  "M270 296Q190 352 120 372",
];

const attack = "M410 300Q520 330 548 440";

export function HeroGraph() {
  return (
    <svg
      className={styles.graph}
      viewBox="0 0 640 600"
      role="img"
      aria-labelledby="hero-graph-title hero-graph-desc"
    >
      <title id="hero-graph-title">A service graph with one flagged path</title>
      <desc id="hero-graph-desc">
        The compromised checkout-api service, which normally talks to orders-api, reaches for the
        secrets manager. Agentshield flags the path as a possible lateral path before it lands.
        The rotation controller’s declared path to the same secrets manager is left alone.
      </desc>

      <g>
        {edges.map((d) => (
          <path key={d} className={styles.edge} d={d} />
        ))}
        <path className={cx(styles.edge, styles["edge--declared"])} d="M254 518Q400 560 524 478" />
      </g>

      <circle className={styles.halo} cx={410} cy={300} r={38} />
      <path className={cx(styles.edge, styles["edge--attack"])} d={attack} pathLength={1} />
      <path className={styles.arrowhead} d="M537 430L548 448L559 430Z" />

      <g>
        {minor.map((node) => (
          <circle key={node.label} className={styles.node} cx={node.x} cy={node.y} r={14} />
        ))}
        <circle className={cx(styles.node, styles["node--threat"])} cx={410} cy={300} r={20} />
        <circle className={styles.node} cx={238} cy={520} r={16} />
        <rect
          className={cx(styles.node, styles["node--target"])}
          x={524}
          y={444}
          width={48}
          height={48}
          rx={12}
        />
        <g className={styles.lock} transform="translate(548 470)">
          <rect x={-10} y={-1} width={20} height={15} rx={3.5} />
          <path d="M-6 -2V-7a6 6 0 0 1 12 0V-2" fill="none" />
        </g>
      </g>

      <g>
        {minor.map((node) => (
          <text
            key={node.label}
            className={cx(styles.label, styles["label--minor"])}
            x={node.x}
            y={node.y + 36}
            textAnchor="middle"
          >
            {node.label}
          </text>
        ))}
        <text className={cx(styles.label, styles["label--key"])} x={410} y={346} textAnchor="middle">
          checkout-api
        </text>
        <text className={cx(styles.label, styles["label--key"])} x={238} y={558} textAnchor="middle">
          rotation-controller
        </text>
        <text className={cx(styles.label, styles["label--key"])} x={548} y={530} textAnchor="middle">
          secrets-manager
        </text>
        <text className={cx(styles.label, styles["label--note"])} x={392} y={510} textAnchor="middle">
          declared path
        </text>
      </g>

      <g className={styles.finding}>
        <rect className={styles.finding__tag} x={318} y={367} width={187} height={28} rx={14} />
        <text className={styles.finding__text} x={333} y={386}>
          possible_lateral_path
        </text>
        <circle className={styles.finding__ring} cx={524} cy={381} r={21} />
        <image href="/brand/mark-color.svg" x={513} y={369} width={22} height={24} />
      </g>
    </svg>
  );
}
