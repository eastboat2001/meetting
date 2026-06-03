const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("AIHeroDesktop", {
  isDesktop: true,
  requestExit() {
    ipcRenderer.send("aihero:quit-app");
  }
});
