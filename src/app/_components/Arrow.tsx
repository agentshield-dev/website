const paths = {
  right: "M3 8h10M9 4l4 4-4 4",
  "up-right": "M5 11l6-6M6 5h5v5",
  down: "M8 3v10M4 9l4 4 4-4",
} as const;

export function Arrow({
  direction = "right",
  size = 16,
}: {
  direction?: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none" }}
    >
      <path
        d={paths[direction]}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
