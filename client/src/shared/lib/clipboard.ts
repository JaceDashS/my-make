import {Clipboard, Platform} from 'react-native';

type ClipboardModule = {
  setString?: (text: string) => void;
};

function getClipboardModule(): ClipboardModule | null {
  const reactNativeClipboard = Clipboard as ClipboardModule | undefined;

  if (typeof reactNativeClipboard?.setString === 'function') {
    return reactNativeClipboard;
  }

  if (Platform.OS === 'windows') {
    try {
      const windowsClipboard = (
        require('react-native-windows') as {
          Clipboard?: ClipboardModule;
        }
      ).Clipboard;

      if (windowsClipboard?.setString) {
        return windowsClipboard;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function copyText(text: string): boolean {
  const clipboard = getClipboardModule();

  if (!clipboard?.setString) {
    return false;
  }

  try {
    clipboard.setString(text);
    return true;
  } catch {
    return false;
  }
}
