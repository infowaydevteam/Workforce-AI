using System;
using System.Collections.Generic;
using System.Linq;

public static class ProductivityRuleService
{
    private static List<ProductivityRule> rules = new();

    public static void Load(List<ProductivityRule> ruleList)
    {
        rules = ruleList ?? new List<ProductivityRule>();

        Console.WriteLine($"Productivity Rules Loaded: {rules.Count}");
    }

    public static string GetCategory(string appName, string windowTitle)
    {
        string app = (appName ?? "").ToLower();
        string title = (windowTitle ?? "").ToLower();

        var match = rules.FirstOrDefault(rule =>
        {
            string pattern = (rule.Pattern ?? "").ToLower();

            if (string.IsNullOrWhiteSpace(pattern))
                return false;

            if (rule.RuleType == "site")
                return title.Contains(pattern) || app.Contains(pattern);

            return app.Contains(pattern) || title.Contains(pattern);
        });

        return match?.Category ?? "neutral";
    }
}
