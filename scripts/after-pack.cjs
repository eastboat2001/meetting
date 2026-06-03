const fs = require("fs");
const path = require("path");
const { patchWindowsExeIcon } = require("./patch-windows-exe-icon.cjs");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const winOptions = context.packager.platformSpecificBuildOptions || {};
  const executableBaseName = winOptions.executableName || context.packager.appInfo.productFilename;
  let executablePath = path.join(context.appOutDir, `${executableBaseName}.exe`);

  if (!fs.existsSync(executablePath)) {
    const candidates = fs.readdirSync(context.appOutDir)
      .filter((name) => name.toLowerCase().endsWith(".exe"))
      .map((name) => path.join(context.appOutDir, name));
    if (candidates.length !== 1) {
      throw new Error(`Unable to locate packaged Windows executable in ${context.appOutDir}`);
    }
    executablePath = candidates[0];
  }

  const iconPath = path.join(__dirname, "..", "assets", "app-icon.ico");
  patchWindowsExeIcon(executablePath, iconPath);
};
