import {Clipboard} from 'react-native';

type ClipboardModule = {
  setString?: (text: string) => void;
};

function getClipboardModule(): ClipboardModule | null {
  const reactNativeClipboard = Clipboard as ClipboardModule | undefined;

  if (typeof reactNativeClipboard?.setString === 'function') {
    return reactNativeClipboard;
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
