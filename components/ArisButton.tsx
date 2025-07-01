import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { theme } from '../utils/theme';

interface ArisButtonProps {
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

const arisSvg = `
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="800px" height="800px" viewBox="0 0 64 64" id="wizard" xmlns="http://www.w3.org/2000/svg" fill="#000000">
<g id="SVGRepo_bgCarrier" stroke-width="0"/>
<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
<g id="SVGRepo_iconCarrier">
<title>wizard</title>
<circle cx="33" cy="23" r="23" style="fill:#D1E9F1"/>
<line x1="7" y1="17" x2="7" y2="19" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="7" y1="23" x2="7" y2="25" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<path d="M21.778,47H47.222A8.778,8.778,0,0,1,56,55.778V61a0,0,0,0,1,0,0H13a0,0,0,0,1,0,0V55.778A8.778,8.778,0,0,1,21.778,47Z" style="fill:#0F2A3F;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<polygon points="32 61 28 61 34 49 38 49 32 61" style="fill:#ffffff;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<path d="M59,39H11v4.236A5.763,5.763,0,0,0,16.764,49L34,55l19.236-6A5.763,5.763,0,0,0,59,43.236Z" style="fill:#0F2A3F;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="3" y1="21" x2="5" y2="21" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="9" y1="21" x2="11" y2="21" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="55.5" cy="6.5" r="2.5" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="13.984" cy="6.603" r="1.069" style="fill:#091A2B"/>
<ellipse cx="35" cy="39" rx="24" ry="6" style="fill:#091A2B;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="5.984" cy="30.603" r="1.069" style="fill:#091A2B"/>
<path d="M48,13V10.143A6.143,6.143,0,0,0,41.857,4H27.143A6.143,6.143,0,0,0,21,10.143V13" style="fill:#0F2A3F;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<rect x="20" y="17.81" width="29" height="14.19" style="fill:#ffe8dc;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<path d="M41.972,13H48a4,4,0,0,1,4,4h0a4,4,0,0,1-4,4H21a4,4,0,0,1-4-4h0a4,4,0,0,1,4-4H37" style="fill:#ffffff;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="39.5" cy="25.5" r="1.136" style="fill:#091A2B"/>
<circle cx="29.5" cy="25.5" r="1.136" style="fill:#091A2B"/>
<path d="M43.875,32a6.472,6.472,0,0,0-5.219-2.2A5.2,5.2,0,0,0,35,31.974,5.2,5.2,0,0,0,31.344,29.8,6.472,6.472,0,0,0,26.125,32H20v4.5a14.5,14.5,0,0,0,29,0V32Z" style="fill:#ffffff;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="33" y1="36" x2="37" y2="36" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<rect x="32" y="10" width="5" height="5" transform="translate(1.266 28.056) rotate(-45)" style="fill:#75BDD5;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
</g>
</svg>
`;

export const ArisButton: React.FC<ArisButtonProps> = ({
  onPress,
  size = 'md',
  variant = 'primary',
  disabled = false,
  style,
}) => {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 24;

  return (
    <Pressable
      style={[
        styles.base,
        styles[size],
        styles[variant],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <SvgXml xml={arisSvg} width={iconSize} height={iconSize} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  sm: {
    width: 32,
    height: 32,
  },
  md: {
    width: 40,
    height: 40,
  },
  lg: {
    width: 44,
    height: 44,
  },
  primary: {
    backgroundColor: theme.colors.primary[600],
  },
  secondary: {
    backgroundColor: theme.colors.defaultGrey,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: theme.colors.grey[300],
    opacity: 0.6,
  },
});