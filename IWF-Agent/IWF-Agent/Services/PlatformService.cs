using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public static class PlatformService
{
    public static bool CanStartMonitoring()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return true;

        try
        {
            var processInfo = new ProcessStartInfo("osascript")
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            processInfo.ArgumentList.Add("-e");
            processInfo.ArgumentList.Add(
                "tell application \"System Events\" to name of first application process whose frontmost is true"
            );

            using var process = Process.Start(processInfo)!;
            string output = process.StandardOutput.ReadToEnd().Trim();
            string error = process.StandardError.ReadToEnd().Trim();
            process.WaitForExit();

            if (process.ExitCode == 0 && !string.IsNullOrEmpty(output))
                return true;

            Console.WriteLine("macOS Accessibility permission is required to monitor activity.");
            Console.WriteLine(
                "Enable the IWF Agent (or Terminal while developing) in System Settings > Privacy & Security > Accessibility."
            );

            if (!string.IsNullOrEmpty(error))
                Console.WriteLine($"macOS permission check: {error}");

            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Unable to verify macOS Accessibility permission: {ex.Message}");
            return false;
        }
    }
}
