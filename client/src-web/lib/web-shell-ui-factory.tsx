import React from 'react';

type CommonShellPalette = {
  border: string;
  card: string;
  muted: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
};

type CommonShellStyles = {
  bodyStrong: React.CSSProperties;
  bodyText: React.CSSProperties;
  card: React.CSSProperties;
  cardTitle: React.CSSProperties;
  fieldLabel: React.CSSProperties;
  optionChip: React.CSSProperties;
  optionChipText: React.CSSProperties;
};

export function createShellUi<Palette extends CommonShellPalette>(
  styles: CommonShellStyles,
) {
  function Card({
    children,
    headerRight,
    palette,
    title,
  }: React.PropsWithChildren<{
    headerRight?: React.ReactNode;
    palette: Palette;
    title: string;
  }>) {
    return (
      <div
        style={{
          ...styles.card,
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderStyle: 'solid',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span
            style={{...styles.cardTitle, color: palette.text, display: 'block', flexShrink: 1}}
          >
            {title}
          </span>
          {headerRight ? <div style={{flexShrink: 0}}>{headerRight}</div> : null}
        </div>
        {children}
      </div>
    );
  }

  function OptionChip({
    active,
    label,
    onPress,
    palette,
  }: {
    active: boolean;
    label: string;
    onPress: () => void;
    palette: Palette;
  }) {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
      <button
        onClick={onPress}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...styles.optionChip,
          border: '1px solid',
          backgroundColor: active
            ? palette.primary
            : isHovered
              ? palette.card
              : palette.muted,
          borderColor: active
            ? palette.primary
            : isHovered
              ? palette.textMuted
              : palette.border,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            ...styles.optionChipText,
            color: active ? palette.primaryText : palette.text,
          }}
        >
          {label}
        </span>
      </button>
    );
  }

  function BodyText({
    children,
    palette,
    style,
  }: React.PropsWithChildren<{
    palette: Palette;
    style?: React.CSSProperties;
  }>) {
    return (
      <span
        style={{
          ...styles.bodyText,
          color: palette.textMuted,
          ...style,
          display: 'block',
        }}
      >
        {children}
      </span>
    );
  }

  function BodyStrong({
    children,
    palette,
    style,
  }: React.PropsWithChildren<{
    palette: Palette;
    style?: React.CSSProperties;
  }>) {
    return (
      <span
        style={{
          ...styles.bodyStrong,
          color: palette.text,
          ...style,
          display: 'block',
        }}
      >
        {children}
      </span>
    );
  }

  function FieldLabel({
    children,
    palette,
    style,
  }: React.PropsWithChildren<{
    palette: Palette;
    style?: React.CSSProperties;
  }>) {
    return (
      <span
        style={{
          ...styles.fieldLabel,
          color: palette.text,
          ...style,
          display: 'block',
        }}
      >
        {children}
      </span>
    );
  }

  return {
    BodyStrong,
    BodyText,
    Card,
    FieldLabel,
    OptionChip,
  };
}
