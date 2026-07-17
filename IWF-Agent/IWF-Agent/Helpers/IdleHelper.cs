using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

public class IdleHelper
{
    // ── Windows-only P/Invoke ──────────────────────────────────────────────
    [StructLayout(LayoutKind.Sequential)]
    struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    // ── macOS: read HIDIdleTime from IOKit via ioreg ───────────────────────
    // ioreg outputs the nanosecond idle time; divide by 1e9 for seconds.
    private static int GetMacIdleSeconds()
    {
        try
        {
            var psi = new ProcessStartInfo("/usr/sbin/ioreg")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            psi.ArgumentList.Add("-c");
            psi.ArgumentList.Add("IOHIDSystem");

            using var p = Process.Start(psi)!;
            string raw = p.StandardOutput.ReadToEnd().Trim();
            p.WaitForExit();

            Match match = Regex.Match(raw, "\\\"HIDIdleTime\\\"\\s*=\\s*(\\d+)");

            if (match.Success && long.TryParse(match.Groups[1].Value, out long nanoseconds))
                return (int)(nanoseconds / 1_000_000_000L);

            return 0;
        }
        catch
        {
            return 0;
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────

    public static int GetIdleTime()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return GetMacIdleSeconds();

        // Windows path
        LASTINPUTINFO info = new LASTINPUTINFO();
        info.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));

        if (!GetLastInputInfo(ref info))
            return 0;

        uint tickCount = (uint)Environment.TickCount;

        return (int)((tickCount - info.dwTime) / 1000);
    }

    public static bool IsIdle(int seconds = 300)
    {
        return GetIdleTime() >= seconds;
    }
}
