// contextBridgeのプレースホルダー
// レンダラーに公開するAPIはここで定義する
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 今後必要に応じてAPIを追加
});
