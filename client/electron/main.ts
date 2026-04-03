import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

// メインウィンドウの参照を保持してGC防止
let mainWindow: BrowserWindow | null = null;

app.commandLine.appendSwitch('disable-features', 'PasswordLeakDetection');

const MIN_WIDTH = 1000;
const MIN_HEIGHT = 600;

interface WindowState {
  width: number;
  height: number;
}

function writeDiagnosticLog(message: string, payload?: unknown): void {
  try {
    const logPath = path.join(app.getPath('userData'), 'electron-diagnostics.log');
    const line = [
      new Date().toISOString(),
      message,
      payload === undefined ? '' : JSON.stringify(payload),
    ]
      .filter(Boolean)
      .join(' ');

    fs.appendFileSync(logPath, `${line}\n`, 'utf-8');
  } catch {
    // ignore logging failures
  }
}

function getWindowIconPath(): string | undefined {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icons', 'app-icon.png')
    : path.resolve(__dirname, '..', '..', 'build', 'icons', 'runtime', 'app-icon.png');

  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function getWindowStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function getRendererHtmlPath(): string {
  return path.resolve(__dirname, '..', 'renderer', 'index.html');
}

function loadWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(getWindowStatePath(), 'utf-8');
    const state = JSON.parse(raw) as WindowState;
    return {
      width: Math.max(state.width, MIN_WIDTH),
      height: Math.max(state.height, MIN_HEIGHT),
    };
  } catch {
    return { width: MIN_WIDTH, height: MIN_HEIGHT };
  }
}

function saveWindowState(win: BrowserWindow): void {
  if (win.isMaximized() || win.isMinimized()) return;
  const { width, height } = win.getBounds();
  try {
    fs.writeFileSync(getWindowStatePath(), JSON.stringify({ width, height }));
  } catch {
    // ignore
  }
}

function createWindow(): void {
  const { width, height } = loadWindowState();

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    autoHideMenuBar: true,
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    // 本番: バンドル済みHTMLを読み込む
    mainWindow.loadFile(getRendererHtmlPath());
  } else {
    // 開発: webpack-dev-serverから読み込む
    mainWindow.loadURL('http://localhost:3001');
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    writeDiagnosticLog('[electron] failed to load renderer', {
      errorCode,
      errorDescription,
      validatedURL,
      rendererHtmlPath: getRendererHtmlPath(),
    });
    console.error('[electron] failed to load renderer', {
      errorCode,
      errorDescription,
      validatedURL,
      rendererHtmlPath: getRendererHtmlPath(),
    });
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    writeDiagnosticLog('[renderer console]', {
      level,
      message,
      line,
      sourceId,
    });
    console.log('[renderer console]', {
      level,
      message,
      line,
      sourceId,
    });
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    writeDiagnosticLog('[electron] render process gone', details);
    console.error('[electron] render process gone', details);
  });

  mainWindow.webContents.on('unresponsive', () => {
    writeDiagnosticLog('[electron] window became unresponsive');
    console.error('[electron] window became unresponsive');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    writeDiagnosticLog('[electron] renderer loaded', {
      isPackaged: app.isPackaged,
      url: mainWindow?.webContents.getURL(),
      rendererHtmlPath: getRendererHtmlPath(),
    });
    console.log('[electron] renderer loaded', {
      isPackaged: app.isPackaged,
      url: mainWindow?.webContents.getURL(),
      rendererHtmlPath: getRendererHtmlPath(),
    });
  });

  if (process.env.MYMAKE_OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  mainWindow.on('close', () => {
    if (mainWindow) saveWindowState(mainWindow);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  writeDiagnosticLog('[electron] app ready', {
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
  });
  createWindow();

  // macOSではウィンドウ再生成が必要
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 全ウィンドウ閉鎖時にアプリ終了（macOS以外）
app.on('window-all-closed', () => {
  writeDiagnosticLog('[electron] window-all-closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
