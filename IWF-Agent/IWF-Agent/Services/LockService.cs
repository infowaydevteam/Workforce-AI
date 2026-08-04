using Microsoft.Win32;
using System;
using System.Runtime.Versioning;

[SupportedOSPlatform("windows")]
public static class LockService
{
    public static void Start()
    {
        SystemEvents.SessionSwitch += OnSessionSwitch;

        Console.WriteLine("Lock Service Started");
    }


    private static async void OnSessionSwitch(
        object sender,
        SessionSwitchEventArgs e
    )
    {
        try
        {
            switch (e.Reason)
            {
                case SessionSwitchReason.SessionLock:

    Console.WriteLine("Windows Locked");

    UserSessionState.IsLocked = true;

    await ApiService.UpdateStatus("Offline");

    await ApiService.EndSession();

    break;


case SessionSwitchReason.SessionUnlock:

    Console.WriteLine("Windows Unlocked");

    UserSessionState.IsLocked = false;

    ActivityService.ResetIdle();

    await ApiService.UpdateStatus("Online");

    await ApiService.StartSession();

    break;
            }
        }
        catch(Exception ex)
        {
            Console.WriteLine(
                $"LockService Error: {ex.Message}"
            );
        }
    }



    public static void Stop()
    {
        SystemEvents.SessionSwitch -= OnSessionSwitch;
    }
}
