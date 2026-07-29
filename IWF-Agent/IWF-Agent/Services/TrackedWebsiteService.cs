using System;
using System.Collections.Generic;
using System.Linq;

public static class TrackedWebsiteService
{
    private static List<string> websites = new();

    public static void SetWebsites(List<string> list)
    {
        websites = list
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLower())
            .Distinct()
            .ToList();

        Console.WriteLine("Tracked Websites Loaded :");

        foreach (var site in websites)
        {
            Console.WriteLine($"- {site}");
        }
    }

    public static string GetMatchedWebsite(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return "";

        title = title.ToLower();

        foreach (var site in websites)
        {
            if (title.Contains(site))
                return site;
        }

        return "";
    }

    public static IReadOnlyList<string> GetAll()
    {
        return websites;
    }
}