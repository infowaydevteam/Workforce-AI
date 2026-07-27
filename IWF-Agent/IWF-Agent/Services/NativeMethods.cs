using System;
using System.Runtime.InteropServices;

internal static class NativeMethods
{
    public const int WM_WTSSESSION_CHANGE = 0x02B1;

    public const int WTS_SESSION_LOCK = 0x7;
    public const int WTS_SESSION_UNLOCK = 0x8;

    public const int NOTIFY_FOR_THIS_SESSION = 0;

    [DllImport("wtsapi32.dll", SetLastError = true)]
    public static extern bool WTSRegisterSessionNotification(
        IntPtr hWnd,
        int dwFlags
    );

    [DllImport("wtsapi32.dll", SetLastError = true)]
    public static extern bool WTSUnRegisterSessionNotification(
        IntPtr hWnd
    );

    [DllImport("user32.dll")]
    public static extern IntPtr DefWindowProc(
        IntPtr hWnd,
        uint msg,
        IntPtr wParam,
        IntPtr lParam
    );
}