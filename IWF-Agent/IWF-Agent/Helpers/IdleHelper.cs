using System;
using System.Runtime.InteropServices;

public class IdleHelper
{
    [StructLayout(LayoutKind.Sequential)]
    struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    public static int GetIdleTime()
    {
        LASTINPUTINFO info = new LASTINPUTINFO();
        info.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));

        if (!GetLastInputInfo(ref info))
        {
            return 0;
        }

        uint tickCount = (uint)Environment.TickCount;

        return (int)((tickCount - info.dwTime) / 1000);
    }

    public static bool IsIdle(int seconds = 300)
    {
        return GetIdleTime() >= seconds;
    }
}