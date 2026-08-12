using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class WindowService
{
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(
        IntPtr hWnd,
        out uint processId
    );

    [DllImport("user32.dll", SetLastError = true)]
    private static extern int GetWindowText(
        IntPtr hWnd,
        StringBuilder text,
        int count
    );

    public static string GetActiveWindow()
    {
        try
        {
            IntPtr handle = GetForegroundWindow();

            if (handle == IntPtr.Zero)
                return "Unknown";

            GetWindowThreadProcessId(
                handle,
                out uint processId
            );

            Process process =
                Process.GetProcessById((int)processId);

            string appName = process.ProcessName switch
            {
                "chrome" => "Google Chrome",
                "msedge" => "Microsoft Edge",
                "firefox" => "Mozilla Firefox",
                "Code" => "Visual Studio Code",
                "EXCEL" => "Microsoft Excel",
                "WINWORD" => "Microsoft Word",
                "OUTLOOK" => "Microsoft Outlook",
                "Teams" => "Microsoft Teams",
                _ => process.ProcessName
            };

            string title = GetActiveWindowTitle();

            // Browser ke liye title bhi app_name me add hoga
            if (
                (
                    process.ProcessName.Equals(
                        "chrome",
                        StringComparison.OrdinalIgnoreCase
                    )
                    ||
                    process.ProcessName.Equals(
                        "msedge",
                        StringComparison.OrdinalIgnoreCase
                    )
                    ||
                    process.ProcessName.Equals(
                        "firefox",
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                &&
                !string.IsNullOrWhiteSpace(title)
            )
            {
                return $"{appName} - {title}";
            }

            return appName;
        }
        catch
        {
            return "Unknown";
        }
    }

    public static string GetActiveWindowTitle()
    {
        try
        {
            const int nChars = 512;

            StringBuilder buffer =
                new StringBuilder(nChars);

            IntPtr handle = GetForegroundWindow();

            if (handle == IntPtr.Zero)
                return "";

            if (GetWindowText(
                    handle,
                    buffer,
                    nChars
                ) > 0)
            {
                return buffer.ToString();
            }

            return "";
        }
        catch
        {
            return "";
        }
    }
}