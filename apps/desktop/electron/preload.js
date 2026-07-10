const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bridge", {
  start: () => ipcRenderer.invoke("start"),
  stop: () => ipcRenderer.invoke("stop"),
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (cfg) => ipcRenderer.invoke("save-config", cfg),
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  onLog: (cb) => ipcRenderer.on("log", (_e, line) => cb(line)),
  onState: (cb) => ipcRenderer.on("state", (_e, running) => cb(running)),
});
