type SparklineProps = { values: readonly number[]; width?: number; height?: number };

export function Sparkline({ values, width = 240, height = 60 }: SparklineProps) {
  if (values.length === 0) return <svg width={width} height={height} role="img" aria-label="No data" />;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  // Guard against a flat series (all equal) so we never divide by zero below.
  const valueRange = maxValue - minValue || 1;
  // Horizontal distance between adjacent points; a single value sits at x=0.
  const xStep = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((value, index) => {
      const x = index * xStep;
      // SVG y grows downward, so invert: the largest value maps to y=0 (the top).
      const y = height - ((value - minValue) / valueRange) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} role="img" aria-label="Trend">
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}
