type SparklineProps = { values: readonly number[]; width?: number; height?: number };

export function Sparkline({ values, width = 240, height = 60 }: SparklineProps) {
  if (values.length === 0) return <svg width={width} height={height} role="img" aria-label="No data" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} role="img" aria-label="Trend">
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}
