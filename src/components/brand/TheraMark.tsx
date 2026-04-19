type Props = {
  size?: number;
  className?: string;
};

/**
 * Thera brand mark — renders the official two-bubble logo PNG.
 * `size` sets the height; width is auto to preserve the natural aspect ratio.
 */
export function TheraMark({ size = 28, className }: Props) {
  return (
    <img
      src="/logo.png"
      alt="Thera"
      height={size}
      width={size}
      style={{ height: size, width: "auto", objectFit: "contain", display: "inline-block" }}
      className={className}
      draggable={false}
    />
  );
}
