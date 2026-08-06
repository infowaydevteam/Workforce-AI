using Microsoft.Win32;
using System.Diagnostics;

public static class StartupService
{
    public static void Register()
    {
        try
        {
            if (!OperatingSystem.IsWindows())
            {
                Console.WriteLine("Startup registration skipped: not running on Windows.");
                return;
            }

            string? exePath =
                Process.GetCurrentProcess()
                .MainModule
                ?.FileName;

            if (string.IsNullOrWhiteSpace(exePath))
            {
                Console.WriteLine("Startup registration skipped: executable path missing.");
                return;
            }

            RegistryKey? key =
                Registry.CurrentUser.OpenSubKey(
                    @"Software\Microsoft\Windows\CurrentVersion\Run",
                    true
                );

            if (key == null)
            {
                Console.WriteLine("Startup registration skipped: registry key unavailable.");
                return;
            }

            key.SetValue("IWFAgent", exePath);

            Console.WriteLine("Startup Registered Successfully");
            Console.WriteLine(exePath);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Startup registration warning: {ex.Message}");
        }
    }
}
