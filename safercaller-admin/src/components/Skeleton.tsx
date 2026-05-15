import { CSSProperties } from 'react';

type Props = {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
};

export default function Skeleton({ width = '100%', height = 16, radius = 6, style }: Props) {
  return (
    <div
      className="shimmer"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 16 }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton
              key={c}
              height={14}
              width={c === 0 ? '20%' : `${Math.max(10, 70 / cols)}%`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
