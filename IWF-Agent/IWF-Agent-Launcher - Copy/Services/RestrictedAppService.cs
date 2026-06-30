using System;
using System.Collections.Generic;

public static class RestrictedAppService
{
    private static List<string> apps =
        new List<string>();

    public static void Load(List<string> appList)
    {
        apps = appList ?? new List<string>();

        Console.WriteLine(
            $"Restricted Apps Loaded: {apps.Count}"
        );
    }

    public static string GetMatchedApp(
        string processName
    )
    {
        if (string.IsNullOrWhiteSpace(processName))
            return "";

        processName =
            processName.ToLower();

        foreach (var app in apps)
        {
            if (processName.Contains(app.ToLower()))
                return app;
        }

        return "";
    }
}