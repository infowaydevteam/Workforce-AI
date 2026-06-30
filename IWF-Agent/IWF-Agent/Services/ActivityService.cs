using System;
using System.Timers;

public class ActivityService
{
    static System.Timers.Timer? timer;

    static string lastWindow = "";

    static DateTime lastActivitySave;

    static bool isIdle = false;

    static DateTime idleStartTime;

    // Restricted Website Timer

static bool restrictedRunning = false;

static string restrictedSite = "";

static DateTime restrictedStartTime;

static bool emailSent = false;

    public static void Start()
    {
        Console.WriteLine("Activity Service Started");

        lastWindow =
            WindowService.GetActiveWindow();

        lastActivitySave =
            DateTime.Now;

        Console.WriteLine(
            $"Initial Window: {lastWindow}"
        );

        _ = ApiService.UpdateStatus(
            "Online"
        );

        timer = new System.Timers.Timer(
            5000
        );

        timer.Elapsed += Track;

        timer.AutoReset = true;

        timer.Start();
    }

    private static async void Track(
        object? sender,
        ElapsedEventArgs e
    )
    {
        try
        {
            string currentWindow =
                WindowService.GetActiveWindow();

                string title =
    WindowService.GetActiveWindowTitle();

            int idleSeconds = IdleHelper.GetIdleTime();

Console.WriteLine($"Idle Seconds: {idleSeconds}");

bool idle = idleSeconds >= 5;

            Console.WriteLine(
                $"Idle: {idle} | Window: {currentWindow}"
            );

            // =====================
            // IDLE START
            // =====================
            if (idle)
            {
                if (!isIdle)
                {
                    isIdle = true;

                    idleStartTime =
                        DateTime.Now;

                    Console.WriteLine(
                        "Idle Started"
                    );

                    await ApiService.SendActivity(
                        lastWindow,
                        lastActivitySave,
                        DateTime.Now
                    );

                    await ApiService.UpdateStatus(
                        "Idle"
                    );
                }

                return;
            }

            // =====================
            // IDLE END
            // =====================
            if (isIdle)
            {
                isIdle = false;

                Console.WriteLine(
                    "Idle Ended"
                );

                await ApiService.SendIdle(
                    idleStartTime,
                    DateTime.Now
                );

                lastActivitySave =
                    DateTime.Now;

                await ApiService.UpdateStatus(
                    "Online"
                );
            }

            // =====================
            // APP SWITCH
            // =====================
            if (currentWindow != lastWindow)
            {
                Console.WriteLine(
                    $"Switch: {lastWindow} → {currentWindow}"
                );

                await ApiService.SendActivity(
                    lastWindow,
                    lastActivitySave,
                    DateTime.Now
                );

                lastWindow =
                    currentWindow;

                lastActivitySave =
                    DateTime.Now;

                return;
            }

// =====================
// APP / WEBSITE RESTRICTED
// =====================

string matchedApp =
    RestrictedAppService.GetMatchedApp(currentWindow);

string matchedSite =
    RestrictedSiteService.GetMatchedSite(title);

string restrictedName = "";

if (!string.IsNullOrEmpty(matchedApp))
{
    restrictedName = matchedApp;
    Console.WriteLine($"Restricted App: {restrictedName}");
}
else if (!string.IsNullOrEmpty(matchedSite))
{
    restrictedName = matchedSite;
    Console.WriteLine($"Restricted Website: {restrictedName}");
}

if (!string.IsNullOrEmpty(restrictedName))
{
    if (!restrictedRunning)
    {
        restrictedRunning = true;
        restrictedSite = restrictedName;
        restrictedStartTime = DateTime.Now;
        emailSent = false;

        Console.WriteLine($"Started Timer for {restrictedName}");
    }
    else if (restrictedSite == restrictedName)
    {
        double minutes =
            (DateTime.Now - restrictedStartTime).TotalMinutes;

        Console.WriteLine(
            $"{restrictedName} Running: {minutes:F1} min"
        );

        if (minutes >= 0.2 && !emailSent)
        {
            emailSent = true;

            Console.WriteLine(
                $"Sending Restricted Alert: {restrictedName}"
            );

            await ApiService.SendRestrictedAlert(
                UserContext.UserId,
                restrictedName,
                minutes
            );
        }
    }
}
else
{
    if (restrictedRunning)
    {
        Console.WriteLine(
            $"Stopped Timer for {restrictedSite}"
        );
    }

    restrictedRunning = false;
    restrictedSite = "";
    emailSent = false;
}


            // =====================
            // CONTINUOUS ACTIVE
            // =====================
            double activeSeconds =
                (
                    DateTime.Now -
                    lastActivitySave
                ).TotalSeconds;

            if (activeSeconds >= 30)
            {
                await ApiService.SendActivity(
                    currentWindow,
                    lastActivitySave,
                    DateTime.Now
                );

                Console.WriteLine(
                    $"Active Chunk Saved: {currentWindow}"
                );

                lastActivitySave =
                    DateTime.Now;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR: {ex.Message}"
            );
        }
    }

public static async Task Stop()
{
    try
    {
        timer?.Stop();

        DateTime now = DateTime.Now;

        if (isIdle)
        {
            await ApiService.SendIdle(
                idleStartTime,
                now
            );
        }
        else
        {
            if ((now - lastActivitySave).TotalSeconds > 1)
            {
                await ApiService.SendActivity(
                    lastWindow,
                    lastActivitySave,
                    now
                );
            }
        }

        await ApiService.UpdateStatus("Offline");

        await ApiService.EndSession();

        Console.WriteLine("Agent Stopped");
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"Stop Error: {ex.Message}"
        );
    }
}
}