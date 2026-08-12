using System.Collections.Generic;
using System.Text.Json.Serialization;

public class AgentPolicyConfig
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("organization_policy")]
    public OrganizationPolicy OrganizationPolicy { get; set; } = new();

    [JsonPropertyName("monitoring_policy")]
    public MonitoringPolicy MonitoringPolicy { get; set; } = new();

    [JsonPropertyName("productivity_rules")]
    public List<ProductivityRule> ProductivityRules { get; set; } = new();
}

public class OrganizationPolicy
{
    [JsonPropertyName("timezone")]
    public string Timezone { get; set; } = "America/Los_Angeles";

    [JsonPropertyName("working_days")]
    public List<string> WorkingDays { get; set; } = new()
    {
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
    };

    [JsonPropertyName("working_start")]
    public string WorkingStart { get; set; } = "09:00";

    [JsonPropertyName("working_end")]
    public string WorkingEnd { get; set; } = "17:00";

    [JsonPropertyName("holidays")]
    public List<string> Holidays { get; set; } = new();
}

public class MonitoringPolicy
{
    [JsonPropertyName("screenshot_interval_seconds")]
    public int ScreenshotIntervalSeconds { get; set; }

    [JsonPropertyName("idle_threshold_seconds")]
    public int IdleThresholdSeconds { get; set; } = 300;

    [JsonPropertyName("url_tracking_enabled")]
    public bool UrlTrackingEnabled { get; set; } = true;

    [JsonPropertyName("app_tracking_enabled")]
    public bool AppTrackingEnabled { get; set; } = true;

    [JsonPropertyName("keyboard_activity_tracking_enabled")]
    public bool KeyboardActivityTrackingEnabled { get; set; }

    [JsonPropertyName("mouse_activity_tracking_enabled")]
    public bool MouseActivityTrackingEnabled { get; set; }
}

public class ProductivityRule
{
    [JsonPropertyName("rule_type")]
    public string RuleType { get; set; } = "app";

    [JsonPropertyName("pattern")]
    public string Pattern { get; set; } = "";

    [JsonPropertyName("category")]
    public string Category { get; set; } = "neutral";
}
