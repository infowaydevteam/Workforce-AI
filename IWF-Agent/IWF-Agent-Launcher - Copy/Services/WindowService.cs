using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class WindowService
{
    // ── Windows-only P/Invoke ──────────────────────────────────────────────
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

    // ── macOS: run a one-liner AppleScript and return stdout ──────────────
    private static string RunOsascript(string script)
    {
        try
        {
            var psi = new ProcessStartInfo("osascript", $"-e \"{script}\"")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var p = Process.Start(psi)!;
            string output = p.StandardOutput.ReadToEnd().Trim();
            p.WaitForExit();
            return output;
        }
        catch
        {
            return "";
        }
    }

    // ── Friendly display name map (shared by both platforms) ──────────────
    private static string FriendlyName(string processName) =>
        processName switch
        {
            "chrome"          => "Google Chrome",
            "Google Chrome"   => "Google Chrome",
            "Code"            => "Visual Studio Code",
            "EXCEL"           => "Microsoft Excel",
            "WINWORD"         => "Microsoft Word",
            "OUTLOOK"         => "Microsoft Outlook",
            "Teams"           => "Microsoft Teams",
            "Safari"          => "Safari",
            "Firefox"         => "Mozilla Firefox",
            "Slack"           => "Slack",
            "zoom.us"         => "Zoom",
            _                 => processName
        };

    // ── Public API ─────────────────────────────────────────────────────────

    public static string GetActiveWindow()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            // AppleScript: name of the frontmost app process
            string name = RunOsascript(
                "tell application \\\"System Events\\\" to name of first application process whose frontmost is true"
            );
            return string.IsNullOrEmpty(name) ? "Unknown" : FriendlyName(name);
        }

        // Windows path
        try
        {
            IntPtr handle = GetForegroundWindow();

            if (handle == IntPtr.Zero)
                return "Unknown";

            GetWindowThreadProcessId(handle, out uint processId);

            Process process = Process.GetProcessById((int)processId);

            return FriendlyName(process.ProcessName);
        }
        catch
        {
            return "Unknown";
        }
    }

    public static string GetActiveWindowTitle()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            // AppleScript: title of the front window of the frontmost process
            string title = RunOsascript(
                "tell application \\\"System Events\\\" to get title of front window of (first application process whose frontmost is true)"
            );
            return title;
        }

        // Windows path
        try
        {
            const int nChars = 512;

            StringBuilder buffer = new StringBuilder(nChars);

            IntPtr handle = GetForegroundWindow();

            if (handle == IntPtr.Zero)
                return "";

            if (GetWindowText(handle, buffer, nChars) > 0)
                return buffer.ToString();

            return "";
        }
        catch
        {
            return "";
        }
    }
}
