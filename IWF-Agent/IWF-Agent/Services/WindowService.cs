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

            if (GetWindowText(handle, buffer, nChars) > 0)
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

 public static string GetDisplayName()
{
    string process = GetActiveWindow();
    string title = GetActiveWindowTitle();

    if (string.IsNullOrWhiteSpace(title))
        return process;

    // Browser
if (
    process.Equals("Google Chrome", StringComparison.OrdinalIgnoreCase) ||
    process.Equals("Brave", StringComparison.OrdinalIgnoreCase) ||
    process.Equals("Microsoft Edge", StringComparison.OrdinalIgnoreCase) ||
    process.Equals("Firefox", StringComparison.OrdinalIgnoreCase)
)
{
    string cleanTitle = title
    .Replace(" - Google Chrome", "", StringComparison.OrdinalIgnoreCase)
    .Replace(" - Brave", "", StringComparison.OrdinalIgnoreCase)
    .Replace(" - Microsoft Edge", "", StringComparison.OrdinalIgnoreCase)
    .Replace(" - Mozilla Firefox", "", StringComparison.OrdinalIgnoreCase)
    .Trim();

while (cleanTitle.StartsWith("("))
{
    int end = cleanTitle.IndexOf(")");
    if (end == -1)
        break;

    cleanTitle = cleanTitle.Substring(end + 1).Trim();
}

// Check tracked websites first
string matchedWebsite =
    TrackedWebsiteService.GetMatchedWebsite(cleanTitle);

if (!string.IsNullOrEmpty(matchedWebsite))
{
    return matchedWebsite;
}

// Fallback
return $"{process} - {cleanTitle}";
}

    return process;
}
}