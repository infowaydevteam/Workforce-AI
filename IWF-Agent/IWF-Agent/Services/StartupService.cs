using Microsoft.Win32;
using System.Diagnostics;

public static class StartupService
{
    public static void Register()
    {
        string exePath =
            Process.GetCurrentProcess()
            .MainModule
            .FileName;

        RegistryKey key =
            Registry.CurrentUser.OpenSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Run",
                true
            );

        key.SetValue("IWFAgent", exePath);

        Console.WriteLine("Startup Registered Successfully");
        Console.WriteLine(exePath);
    }
}