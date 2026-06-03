const assert = require("assert");
const fs = require("fs");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const mainProcess = fs.readFileSync("electron/main.cjs", "utf8");
const preloadProcess = fs.readFileSync("electron/preload.cjs", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const appJs = fs.readFileSync("app.js", "utf8");

assert.strictEqual(packageJson.main, "electron/main.cjs", "Electron entry should point to the main process");
assert.strictEqual(packageJson.build.productName, "AIHero Meeting Room Booking", "desktop product name should be ASCII-only");
assert.ok(packageJson.scripts.start.includes("electron ."), "start script should launch Electron");
assert.ok(packageJson.scripts["build:win"].includes("electron-builder --win"), "build:win should package a Windows app");
assert.ok(packageJson.devDependencies.electron, "Electron should be declared as a dev dependency");
assert.ok(packageJson.devDependencies["electron-builder"], "electron-builder should be declared as a dev dependency");
assert.deepStrictEqual(packageJson.build.files.sort(), ["app.js", "assets/**/*", "!assets/app-icon-source.png", "electron/**/*", "index.html", "styles.css"].sort(), "packaged app should include only runtime files");
assert.strictEqual(packageJson.build.afterPack, "scripts/after-pack.cjs", "Windows package should patch the installed app executable icon after packing");
assert.strictEqual(packageJson.build.artifactName, "AIHero-Meeting-Room-Booking-Setup-${version}.${ext}", "installer filename should be ASCII-only");
assert.strictEqual(packageJson.build.win.executableName, "AIHero-Meeting-Room-Booking", "Windows executable filename should be ASCII-only");
assert.strictEqual(packageJson.build.win.icon, "assets/app-icon.ico", "Windows build should use the custom app icon");
assert.strictEqual(packageJson.build.win.signAndEditExecutable, false, "Windows build should avoid winCodeSign symlink requirements");
assert.ok(fs.existsSync("assets/app-icon.ico"), "custom Windows icon should exist");
assert.ok(fs.existsSync("assets/app-icon-source.png"), "custom PNG icon source should exist");
assert.ok(fs.existsSync("scripts/after-pack.cjs"), "after-pack hook should exist");
assert.ok(fs.existsSync("scripts/patch-windows-exe-icon.cjs"), "Windows icon patcher should exist");
assert.ok(fs.readFileSync("scripts/patch-windows-exe-icon.cjs", "utf8").includes("UpdateResource"), "Windows icon patcher should update executable resources");

assert.ok(mainProcess.includes("fullscreen: true"), "main window should start fullscreen");
assert.ok(mainProcess.includes("kiosk: true"), "main window should run in kiosk mode");
assert.ok(mainProcess.includes("alwaysOnTop: true"), "main window should stay above normal windows");
assert.ok(mainProcess.includes("autoHideMenuBar: true"), "main window should hide browser chrome");
assert.ok(mainProcess.includes("nodeIntegration: false"), "renderer should not expose Node integration");
assert.ok(mainProcess.includes("contextIsolation: true"), "renderer should use context isolation");
assert.ok(mainProcess.includes("sandbox: true"), "renderer should use Chromium sandboxing");
assert.ok(mainProcess.includes("preload: path.join(__dirname, \"preload.cjs\")"), "main window should use a preload bridge");
assert.ok(mainProcess.includes("backgroundThrottling: false"), "renderer should not throttle kiosk timer updates");
assert.ok(mainProcess.includes("powerSaveBlocker.start(\"prevent-display-sleep\")"), "app should prevent the display from sleeping");
assert.ok(mainProcess.includes("setWindowOpenHandler"), "app should deny popup windows");
assert.ok(mainProcess.includes("will-navigate"), "app should block unexpected navigation away from the local screen");
assert.ok(mainProcess.includes("ipcMain.on(\"aihero:quit-app\""), "main process should handle touch exit requests");
assert.ok(mainProcess.includes("globalShortcut.register(\"CommandOrControl+Shift+Q\""), "app should have an explicit maintenance quit shortcut");
assert.ok(mainProcess.includes("clearTimeout(refocusTimer)"), "refocus timer should be cleared to avoid leaked timers");

assert.ok(preloadProcess.includes("contextBridge.exposeInMainWorld(\"AIHeroDesktop\""), "preload should expose a minimal desktop bridge");
assert.ok(preloadProcess.includes("isDesktop: true"), "desktop bridge should identify Electron runtime");
assert.ok(preloadProcess.includes("ipcRenderer.send(\"aihero:quit-app\")"), "desktop bridge should send quit requests through IPC");

assert.ok(html.includes('id="exit-app-btn"'), "settings modal should include a touch-accessible desktop exit button");
assert.ok(html.includes("Exit App / 退出应用"), "desktop exit button should have bilingual copy");
assert.ok(appJs.includes("configureDesktopControls"), "renderer should configure desktop-only controls");
assert.ok(appJs.includes("root.AIHeroDesktop?.isDesktop"), "desktop exit button should only appear in Electron");
assert.ok(appJs.includes("root.AIHeroDesktop.requestExit()"), "renderer should request app exit through the preload bridge");

console.log("Electron packaging tests passed.");
