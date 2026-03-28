'use client';

interface CSSDonutIndicatorProps {
  percentage: number;
  label: string;
  size?: number;
  color?: string;
}

export default function CSSDonutIndicator({
  percentage,
  label,
  size = 72,
  color = '#3b82f6',
}: CSSDonutIndicatorProps) {
  const bgColor = '#e5e7eb';
  const clamped = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="rounded-full print-color-exact"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${color} ${clamped * 3.6}deg, ${bgColor} 0deg)`,
          position: 'relative',
        }}
      >
        <div
          className="absolute rounded-full bg-white flex items-center justify-center"
          style={{
            top: size * 0.12,
            left: size * 0.12,
            width: size * 0.76,
            height: size * 0.76,
          }}
        >
          <span className="text-sm font-bold text-gray-900">{Math.round(clamped)}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-600 text-center">{label}</span>
    </div>
  );
}
