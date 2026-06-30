using System.Text.Json.Serialization;

public class RestrictedItemsResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("apps")]
    public List<string> Apps { get; set; } = new();

    [JsonPropertyName("sites")]
    public List<string> Sites { get; set; } = new();
}