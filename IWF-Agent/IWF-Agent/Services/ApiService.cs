using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class ApiService
{
    static HttpClient client = new HttpClient();

    public static async Task SendActivity(
        string app,
        DateTime start,
        DateTime end,
        string productivityCategory = "neutral"
    )
    {
        var data = new
        {
            user_id = UserContext.UserId,
            app_name = app,
            start_time = start,
            end_time = end,
            productivity_category = productivityCategory
        };

        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        await client.PostAsync($"{ConfigService.GetApiBaseUrl()}/api/activity/log", content);
    }

    public static async Task StartSession()
    {
        var data = new {user_id = UserContext.UserId};

        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        await client.PostAsync($"{ConfigService.GetApiBaseUrl()}/api/session/start", content);
    }

   public static async Task EndSession()
{
    try
    {
        var data = new {user_id = UserContext.UserId};

        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(
            json,
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.PostAsync(
            $"{ConfigService.GetApiBaseUrl()}/api/session/end",
            content
        );

        Console.WriteLine($"End Session Status: {response.StatusCode}");

        var result = await response.Content.ReadAsStringAsync();

        Console.WriteLine(result);
    }
    catch (Exception ex)
    {
        Console.WriteLine("EndSession Error: " + ex.Message);
    }
}

public static async Task<VerifyResponse> VerifyAgent(string token)
{
    var data = new
    {
        agent_token = token
    };

    var json = JsonSerializer.Serialize(data);

    var content = new StringContent(json, Encoding.UTF8, "application/json");

    var response = await client.PostAsync(
        $"{ConfigService.GetApiBaseUrl()}/api/agent/verify",
        content
    );

    var result = await response.Content.ReadAsStringAsync();

    if (!response.IsSuccessStatusCode)
    {
        Console.WriteLine("Verification Failed");
        return null;
    }

    return JsonSerializer.Deserialize<VerifyResponse>(result);
}


public static async Task<int> VerifyAgentFromConfig()
{
    var token = ConfigService.GetToken();

    var data = new { agent_token = token };

    var json = JsonSerializer.Serialize(data);

    var content = new StringContent(json, Encoding.UTF8, "application/json");

    var response = await client.PostAsync(
        $"{ConfigService.GetApiBaseUrl()}/api/agent/verify",
        content
    );

    var result = await response.Content.ReadAsStringAsync();

    using JsonDocument doc = JsonDocument.Parse(result);

    var root = doc.RootElement;

    if (!root.TryGetProperty("user_id", out var userId))
    {
        Console.WriteLine("Invalid response from server:");
        Console.WriteLine(result);
        return 0;
    }

    return userId.GetInt32();
}

    public static async Task SendIdle(DateTime start, DateTime end)
    {
        var data = new
        {
            user_id = UserContext.UserId,
            start_time = start,
            end_time = end
        };

        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        await client.PostAsync($"{ConfigService.GetApiBaseUrl()}/api/idle/log", content);
    }

public static async Task UpdateStatus(string status)
{
    try
    {
        Console.WriteLine($"Updating Status => {status}");

        var data = new
        {
            user_id = UserContext.UserId,
            status = status
        };

        var json = JsonSerializer.Serialize(data);

        var content = new StringContent(
            json,
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.PostAsync(
            $"{ConfigService.GetApiBaseUrl()}/api/employee/status",
            content
        );

        Console.WriteLine(
            $"Status API Response: {response.StatusCode}"
        );

        var result =
            await response.Content.ReadAsStringAsync();

        Console.WriteLine(result);
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"UpdateStatus Error: {ex.Message}"
        );
    }
}

public static async Task SendRestrictedAlert(
    int userId,
    string website,
    double duration
)
{
    try
    {
        var data = new
        {
            userId = userId,
            website = website,
            duration = Math.Max(1, (int)Math.Ceiling(duration))
        };

        var json =
            JsonSerializer.Serialize(data);

        var content =
            new StringContent(
                json,
                Encoding.UTF8,
                "application/json"
            );

        var response =
            await client.PostAsync(
                $"{ConfigService.GetApiBaseUrl()}/api/alerts/send",
                content
            );

        var result =
            await response.Content.ReadAsStringAsync();

        Console.WriteLine(
            $"Restricted Alert Response: {result}"
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"Restricted Alert Error: {ex.Message}"
        );
    }
}

public static async Task<RestrictedItemsResponse?> GetRestrictedItems()
{
    try
    {
        var response =
            await client.GetAsync(
                $"{ConfigService.GetApiBaseUrl()}/api/restricted-items"
            );

        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine(
                "Failed to fetch restricted items."
            );

            return null;
        }

        var json =
            await response.Content.ReadAsStringAsync();

        Console.WriteLine(
            $"Restricted Items Response: {json}"
        );

        return JsonSerializer.Deserialize<RestrictedItemsResponse>(
            json
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"Restricted Items Error: {ex.Message}"
        );

        return null;
    }
}

public static async Task<AgentPolicyConfig?> GetAgentPolicyConfig()
{
    try
    {
        var token = ConfigService.GetToken();

        var response =
            await client.GetAsync(
                $"{ConfigService.GetApiBaseUrl()}/api/agent/config?agent_token={Uri.EscapeDataString(token)}"
            );

        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine("Failed to fetch agent policy config.");
            return null;
        }

        var json =
            await response.Content.ReadAsStringAsync();

        Console.WriteLine($"Agent Policy Response: {json}");

        return JsonSerializer.Deserialize<AgentPolicyConfig>(
            json
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"Agent Policy Error: {ex.Message}"
        );

        return null;
    }
}

public static async Task SendScreenshot(
    byte[] imageBytes,
    DateTime capturedAt
)
{
    try
    {
        var data = new
        {
            agent_token = ConfigService.GetToken(),
            employee_id = UserContext.UserId,
            captured_at = capturedAt,
            image_base64 = Convert.ToBase64String(imageBytes)
        };

        var json = JsonSerializer.Serialize(data);

        var content = new StringContent(
            json,
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.PostAsync(
            $"{ConfigService.GetApiBaseUrl()}/api/screenshots/upload",
            content
        );

        if (!response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Screenshot upload failed: {result}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"SendScreenshot Error: {ex.Message}");
    }
}

}
