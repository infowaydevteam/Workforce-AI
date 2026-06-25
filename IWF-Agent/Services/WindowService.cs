using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class WindowService
{
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(
        IntPtr hWnd,
        out uint processId
    );

    public static string GetActiveWindow()
    {
        try
        {
            IntPtr handle = GetForegroundWindow();

            if (handle == IntPtr.Zero)
                return "Unknown";

            GetWindowThreadProcessId(handle, out uint processId);

            Process process = Process.GetProcessById((int)processId);

            return process.ProcessName switch
{
    "chrome" => "Google Chrome",
    "Code" => "Visual Studio Code",
    "EXCEL" => "Microsoft Excel",
    "WINWORD" => "Microsoft Word",
    "OUTLOOK" => "Microsoft Outlook",
    "Teams" => "Microsoft Teams",
    _ => process.ProcessName
};
        }
        catch
        {
            return "Unknown";
        }
    }
}