import {Platform} from 'react-native';

export const windowsPressableFocusProps =
  Platform.OS === 'windows' ? {enableFocusRing: false} : {};

export const windowsTextInputFocusProps =
  Platform.OS === 'windows' ? {enableFocusRing: false} : {};
