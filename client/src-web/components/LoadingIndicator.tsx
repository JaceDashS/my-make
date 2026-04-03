import React, { useEffect, useRef } from 'react';

// Inject spinner keyframe CSS once
const SPINNER_STYLE_ID = 'rn-compat-spinner';
if (typeof document !== 'undefined' && !document.getElementById(SPINNER_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = SPINNER_STYLE_ID;
  style.textContent = `@keyframes rn-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

type LoadingIndicatorProps = {
  color: string;
  isVisible?: boolean;
  size?: 'small' | 'large';
  style?: React.CSSProperties;
};

export function LoadingIndicator({
  color,
  isVisible = true,
  size = 'small',
  style,
}: LoadingIndicatorProps) {
  const opacityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opacityRef.current) {
      opacityRef.current.style.opacity = isVisible ? '1' : '0';
      opacityRef.current.style.transform = isVisible ? 'scale(1)' : 'scale(0.7)';
    }
  }, [isVisible]);

  const dim = size === 'large' ? 32 : 18;

  return (
    <div
      ref={opacityRef}
      style={{
        minWidth: 18,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.7)',
        transition: 'opacity 240ms, transform 240ms',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: color,
          animation: 'rn-spin 0.7s linear infinite',
          display: 'inline-block',
        }}
      />
    </div>
  );
}
