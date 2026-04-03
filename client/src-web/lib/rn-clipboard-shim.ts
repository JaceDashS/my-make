import { copyText } from './clipboard';

const Clipboard = {
  setString: (s: string) => {
    copyText(s).catch(() => undefined);
  },
  getString: async () => '',
};

export default Clipboard;
