using System;
using System.Windows.Forms;

public class SessionNotificationWindow : NativeWindow
{
    public event Action? SessionLocked;
    public event Action? SessionUnlocked;

    public SessionNotificationWindow()
{
    CreateHandle(new CreateParams());

    bool result = NativeMethods.WTSRegisterSessionNotification(
        Handle,
        NativeMethods.NOTIFY_FOR_THIS_SESSION
    );

    Console.WriteLine(
        $"Session Notification Registered : {result}"
    );
}

    protected override void WndProc(ref Message m)
{
    Console.WriteLine(
        $"Message Received : {m.Msg}"
    );

    if (m.Msg == NativeMethods.WM_WTSSESSION_CHANGE)
    {
        Console.WriteLine(
            $"Session Change : {m.WParam}"
        );

        switch ((int)m.WParam)
        {
            case NativeMethods.WTS_SESSION_LOCK:

                Console.WriteLine(
                    "Windows Locked"
                );

                SessionLocked?.Invoke();

                break;


            case NativeMethods.WTS_SESSION_UNLOCK:

                Console.WriteLine(
                    "Windows Unlocked"
                );

                SessionUnlocked?.Invoke();

                break;
        }
    }


    base.WndProc(ref m);
}

    public void DisposeWindow()
    {
        NativeMethods.WTSUnRegisterSessionNotification(
            Handle
        );

        DestroyHandle();
    }
}