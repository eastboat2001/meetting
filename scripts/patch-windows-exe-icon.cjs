const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function psString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function patchWindowsExeIcon(executablePath, iconPath) {
  if (process.platform !== "win32") {
    throw new Error("Windows executable icon patching can only run on Windows.");
  }

  const resolvedExecutable = path.resolve(executablePath);
  const resolvedIcon = path.resolve(iconPath);

  if (!fs.existsSync(resolvedExecutable)) {
    throw new Error(`Missing Windows executable: ${resolvedExecutable}`);
  }
  if (!fs.existsSync(resolvedIcon)) {
    throw new Error(`Missing Windows icon: ${resolvedIcon}`);
  }

  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;

public static class ExeIconUpdater {
  private const int RT_ICON = 3;
  private const int RT_GROUP_ICON = 14;
  private const ushort LANGUAGE_NEUTRAL = 0;
  private const int GROUP_ICON_ID = 1;
  private const int FIRST_ICON_ID = 200;

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern IntPtr BeginUpdateResource(string fileName, bool deleteExistingResources);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool UpdateResource(IntPtr updateHandle, IntPtr type, IntPtr name, ushort language, byte[] data, uint dataLength);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool EndUpdateResource(IntPtr updateHandle, bool discard);

  private sealed class IconEntry {
    public byte Width;
    public byte Height;
    public byte ColorCount;
    public byte Reserved;
    public ushort Planes;
    public ushort BitCount;
    public uint BytesInResource;
    public uint ImageOffset;
    public ushort ResourceId;
    public byte[] Data;
  }

  public static void Update(string executablePath, string iconPath) {
    List<IconEntry> entries = ReadIconEntries(iconPath);
    IntPtr updateHandle = BeginUpdateResource(executablePath, false);
    if (updateHandle == IntPtr.Zero) {
      ThrowLastWin32Error("BeginUpdateResource failed");
    }

    bool discard = true;
    try {
      foreach (IconEntry entry in entries) {
        if (!UpdateResource(updateHandle, new IntPtr(RT_ICON), new IntPtr(entry.ResourceId), LANGUAGE_NEUTRAL, entry.Data, (uint)entry.Data.Length)) {
          ThrowLastWin32Error("UpdateResource failed for RT_ICON");
        }
      }

      byte[] groupIconData = BuildGroupIconData(entries);
      if (!UpdateResource(updateHandle, new IntPtr(RT_GROUP_ICON), new IntPtr(GROUP_ICON_ID), LANGUAGE_NEUTRAL, groupIconData, (uint)groupIconData.Length)) {
        ThrowLastWin32Error("UpdateResource failed for RT_GROUP_ICON");
      }

      discard = false;
    }
    finally {
      if (!EndUpdateResource(updateHandle, discard)) {
        ThrowLastWin32Error("EndUpdateResource failed");
      }
    }
  }

  private static List<IconEntry> ReadIconEntries(string iconPath) {
    byte[] iconFile = File.ReadAllBytes(iconPath);
    MemoryStream stream = new MemoryStream(iconFile);
    BinaryReader reader = new BinaryReader(stream);

    try {
      ushort reserved = reader.ReadUInt16();
      ushort type = reader.ReadUInt16();
      ushort count = reader.ReadUInt16();
      if (reserved != 0 || type != 1 || count == 0) {
        throw new InvalidDataException("The supplied file is not a valid ICO file.");
      }

      List<IconEntry> entries = new List<IconEntry>();
      for (ushort index = 0; index < count; index += 1) {
        IconEntry entry = new IconEntry();
        entry.Width = reader.ReadByte();
        entry.Height = reader.ReadByte();
        entry.ColorCount = reader.ReadByte();
        entry.Reserved = reader.ReadByte();
        entry.Planes = reader.ReadUInt16();
        entry.BitCount = reader.ReadUInt16();
        entry.BytesInResource = reader.ReadUInt32();
        entry.ImageOffset = reader.ReadUInt32();
        entry.ResourceId = (ushort)(FIRST_ICON_ID + index);

        byte[] imageData = new byte[entry.BytesInResource];
        Array.Copy(iconFile, entry.ImageOffset, imageData, 0, entry.BytesInResource);
        entry.Data = imageData;
        entries.Add(entry);
      }

      return entries;
    }
    finally {
      reader.Dispose();
      stream.Dispose();
    }
  }

  private static byte[] BuildGroupIconData(List<IconEntry> entries) {
    MemoryStream stream = new MemoryStream();
    BinaryWriter writer = new BinaryWriter(stream);

    try {
      writer.Write((ushort)0);
      writer.Write((ushort)1);
      writer.Write((ushort)entries.Count);

      foreach (IconEntry entry in entries) {
        writer.Write(entry.Width);
        writer.Write(entry.Height);
        writer.Write(entry.ColorCount);
        writer.Write(entry.Reserved);
        writer.Write(entry.Planes);
        writer.Write(entry.BitCount);
        writer.Write(entry.BytesInResource);
        writer.Write(entry.ResourceId);
      }

      return stream.ToArray();
    }
    finally {
      writer.Dispose();
      stream.Dispose();
    }
  }

  private static void ThrowLastWin32Error(string message) {
    throw new Win32Exception(Marshal.GetLastWin32Error(), message);
  }
}
"@

[ExeIconUpdater]::Update(${psString(resolvedExecutable)}, ${psString(resolvedIcon)})
`;

  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Failed to patch Windows executable icon: ${resolvedExecutable}`);
  }

  console.log(`Patched Windows executable icon: ${resolvedExecutable}`);
}

module.exports = { patchWindowsExeIcon };

if (require.main === module) {
  const executablePath = process.argv[2] || path.join(__dirname, "..", "dist", "win-unpacked", "AIHero-Meeting-Room-Booking.exe");
  const iconPath = process.argv[3] || path.join(__dirname, "..", "assets", "app-icon.ico");
  patchWindowsExeIcon(executablePath, iconPath);
}
