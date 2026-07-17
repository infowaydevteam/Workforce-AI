using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;

public static class StartupService
{
    public static void Register()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            RegisterMac();
        }
        else
        {
            RegisterWindows();
        }
    }

    // ── Windows: write to HKCU Run registry key ───────────────────────────
    private static void RegisterWindows()
    {
        // Keep Microsoft.Win32 usage inside a runtime-guarded method so the
        // compiler warning CA1416 is scoped and the macOS build stays clean.
        try
        {
            string exePath = Process.GetCurrentProcess().MainModule!.FileName;

            // Reflection-guarded so this compiles on non-Windows SDKs.
            var registryType = Type.GetType("Microsoft.Win32.Registry, Microsoft.Win32.Registry");
            if (registryType == null)
            {
                Console.WriteLine("Registry not available on this platform.");
                return;
            }

            dynamic currentUser = registryType.GetProperty("CurrentUser")!.GetValue(null)!;
            dynamic key = currentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
            key.SetValue("IWFAgent", exePath);

            Console.WriteLine("Startup Registered (Windows Registry)");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Windows startup registration failed: {ex.Message}");
        }
    }

    // ── macOS: write a LaunchAgent plist to ~/Library/LaunchAgents ────────
    private static void RegisterMac()
    {
        try
        {
            string exePath = Process.GetCurrentProcess().MainModule!.FileName;
            string exeDir  = Path.GetDirectoryName(exePath)!;

            string launchAgentsDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Library", "LaunchAgents"
            );

            Directory.CreateDirectory(launchAgentsDir);

            string plistPath = Path.Combine(launchAgentsDir, "com.iwf.agent.plist");

            string plist = $"""
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.iwf.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>{exePath}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>{exeDir}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>{exeDir}/iwf-agent.log</string>
    <key>StandardErrorPath</key>
    <string>{exeDir}/iwf-agent-error.log</string>
</dict>
</plist>
""";

            File.WriteAllText(plistPath, plist);

            // macOS loads LaunchAgents from this directory at the next login.
            // Do not load it now: RunAtLoad would start a duplicate while the
            // currently activated agent is already monitoring.
            Console.WriteLine($"Startup registered for the next macOS login: {plistPath}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"macOS startup registration failed: {ex.Message}");
        }
    }
}
