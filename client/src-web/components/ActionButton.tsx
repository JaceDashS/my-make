import React, { useState } from 'react';

import { LoadingIndicator } from './LoadingIndicator';

type ActionButtonProps = {
  backgroundColor: string;
  disabled?: boolean;
  hint?: string;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
  style?: React.CSSProperties;
  textColor: string;
  titleStyle?: React.CSSProperties;
  hintStyle?: React.CSSProperties;
};

export function ActionButton({
  backgroundColor,
  disabled = false,
  hint,
  isLoading = false,
  label,
  onPress,
  style,
  textColor,
  titleStyle,
  hintStyle,
}: ActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isDisabled = disabled || isLoading;

  const surfaceStyle: React.CSSProperties = {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor,
    opacity: isDisabled ? 0.76 : 1,
    transform: isPressed ? 'scale(0.988)' : 'scale(1)',
    transition: 'opacity 140ms, transform 80ms',
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    textAlign: 'left',
    alignSelf: 'stretch',
    margin: 6,
    display: 'block',
    width: 'calc(100% - 12px)',
    ...(style as React.CSSProperties),
  };

  const hoverOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    opacity: isHovered ? 0.1 : 0,
    transition: 'opacity 140ms',
    pointerEvents: 'none',
  };

  const titleCss: React.CSSProperties = {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: textColor,
    ...titleStyle,
  };

  const hintCss: React.CSSProperties = {
    fontSize: 13,
    lineHeight: '18px',
    marginTop: 6,
    opacity: 0.9,
    color: textColor,
    ...hintStyle,
  };

  return (
    <button
      disabled={isDisabled}
      onClick={onPress}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      style={surfaceStyle}
    >
      <div style={hoverOverlayStyle} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span style={titleCss}>{label}</span>
        <LoadingIndicator color={textColor} isVisible={isLoading} size="small" />
      </div>
      {hint ? <span style={hintCss}>{hint}</span> : null}
    </button>
  );
}
