import Image from "next/image";

// Official lockup, white on transparent for night surfaces. 2910x489 is its cropped viewBox.
const ratio = 2910 / 489;

export function Logo({ height, eager = false }: { height: number; eager?: boolean }) {
  return (
    <Image
      src="/brand/logo-light.svg"
      alt=""
      width={Math.round(height * ratio)}
      height={height}
      loading={eager ? "eager" : "lazy"}
    />
  );
}
