using System;
using System.Collections.Generic;
using System.Linq;

public static class RestrictedSiteService
{
    private static List<string> sites =
        new();

    public static void Load(List<string> siteList)
    {
        sites =
            siteList?
            .Select(x => x.ToLower())
            .ToList()
            ?? new List<string>();

        Console.WriteLine(
            $"Restricted Sites Loaded: {sites.Count}"
        );
    }

    public static bool IsRestricted(
        string windowTitle
    )
    {
        if (string.IsNullOrWhiteSpace(windowTitle))
            return false;

        string title =
            windowTitle.ToLower();

        return sites.Any(site =>
            title.Contains(site)
        );
    }

    public static string GetMatchedSite(
        string windowTitle
    )
    {
        if (string.IsNullOrWhiteSpace(windowTitle))
            return "";

        string title =
            windowTitle.ToLower();

        return sites.FirstOrDefault(site =>
            title.Contains(site)
        ) ?? "";
    }
}