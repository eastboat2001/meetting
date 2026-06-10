const { app, BrowserWindow, globalShortcut, ipcMain, powerSaveBlocker } = require("electron");
const path = require("path");

const isDevelopment = !app.isPackaged;
const indexPath = path.join(__dirname, "..", "index.html");

let mainWindow = null;
let displaySleepBlockerId = null;
let kioskEnforcementTimer = null;

app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    fullscreen: true,
    kiosk: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      devTools: isDevelopment
    }
  });

  mainWindow.once("ready-to-show", () => {
    enforceKioskState();
    mainWindow.show();
    mainWindow.moveTop();
  });

  mainWindow.on("blur", scheduleKioskEnforcement);
  mainWindow.on("leave-full-screen", enforceKioskState);
  mainWindow.on("closed", () => {
    clearTimeout(kioskEnforcementTimer);
    kioskEnforcementTimer = null;
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!targetUrl.startsWith("file://")) {
      event.preventDefault();
    }
  });

  mainWindow.loadFile(indexPath);
}

function enforceKioskState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.setFullScreen(true);
  mainWindow.setKiosk(true);
  mainWindow.setAlwaysOnTop(true, "screen-saver");
}

function scheduleKioskEnforcement() {
  clearTimeout(kioskEnforcementTimer);
  kioskEnforcementTimer = setTimeout(() => {
    kioskEnforcementTimer = null;
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    enforceKioskState();
    if (typeof mainWindow.moveTop === "function") {
      mainWindow.moveTop();
    }
  }, 120);
}

function startDisplaySleepBlocker() {
  if (displaySleepBlockerId === null) {
    displaySleepBlockerId = powerSaveBlocker.start("prevent-display-sleep");
  }
}

function stopDisplaySleepBlocker() {
  if (displaySleepBlockerId !== null && powerSaveBlocker.isStarted(displaySleepBlockerId)) {
    powerSaveBlocker.stop(displaySleepBlockerId);
  }
  displaySleepBlockerId = null;
}

function registerMaintenanceShortcuts() {
  globalShortcut.register("CommandOrControl+Shift+Q", () => {
    app.quit();
  });

  if (isDevelopment) {
    globalShortcut.register("CommandOrControl+Shift+I", () => {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    });
  }
}

ipcMain.on("aihero:quit-app", (event) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    return;
  }
  app.quit();
});

app.whenReady().then(() => {
  startDisplaySleepBlocker();
  registerMaintenanceShortcuts();
  createMainWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("before-quit", () => {
  clearTimeout(kioskEnforcementTimer);
  kioskEnforcementTimer = null;
  stopDisplaySleepBlocker();
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
