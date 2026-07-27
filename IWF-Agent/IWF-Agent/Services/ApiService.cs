using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;

public class ApiService
{
    static HttpClient client = new HttpClient();

    public static async Task SendActivity(string app, DateTime start, DateTime end)
    {
        var data = new
        {
            user_id = UserContext.UserId,
            app_name = app,
            start_time = start,
            end_time = end
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
            Console.WriteLine("=========== END SESSION CALLED ===========");
Console.WriteLine(Environment.StackTrace);
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

    public static async Task SendIdle(string appName,DateTime start, DateTime end)
    {
        var data = new
        {
            user_id = UserContext.UserId,
             app_name = appName,
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


public static async Task SendIdleAlert(int userId, double idleDuration)
{
    try
    {
        var data = new
        {
            userId = userId,
            idleDuration = Math.Max(3600, (int)Math.Ceiling(idleDuration))
        };

        var json = JsonSerializer.Serialize(data);

        var content = new StringContent(
            json,
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.PostAsync(
            $"{ConfigService.GetApiBaseUrl()}/api/alerts/idle",
            content
        );

        var result = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"Idle Alert Response: {result}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Idle Alert Error: {ex.Message}");
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

public static async Task SendHeartbeat()
{
    try
    {
        var url =
            $"{ConfigService.GetApiBaseUrl()}/api/heartbeat";

        var payload = new
        {
            agent_token = ConfigService.GetToken()
        };

        var json = JsonSerializer.Serialize(payload);

        var content = new StringContent(
            json,
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.PostAsync(url, content);

        Console.WriteLine($"Heartbeat Status : {response.StatusCode}");

        var body = await response.Content.ReadAsStringAsync();

        Console.WriteLine(body);
    }
    catch(Exception ex)
    {
        Console.WriteLine($"Heartbeat Error : {ex}");
    }
}

public static async Task GetTrackedWebsites()
{
    try
    {
        Console.WriteLine("Loading Tracked Websites...");

        var response = await client.GetAsync(
    $"{ConfigService.GetApiBaseUrl()}/api/websites"
);

        if (!response.IsSuccessStatusCode)
{
    Console.WriteLine("Unable to load tracked websites.");
    TrackedWebsiteService.SetWebsites(new List<string>());
    return;
}

        var json = await response.Content.ReadAsStringAsync();

        var result = JsonSerializer.Deserialize<TrackedWebsiteResponse>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

        if (result != null && result.Success)
        {
            TrackedWebsiteService.SetWebsites(result.Websites);

            Console.WriteLine(
                $"Loaded {result.Websites.Count} tracked websites."
            );
        }
    }
    catch (Exception ex)
{
    Console.WriteLine($"Tracked Website Error : {ex.Message}");

    TrackedWebsiteService.SetWebsites(new List<string>());
}
}

public class TrackedWebsiteResponse
{
    public bool Success { get; set; }

    public List<string> Websites { get; set; } = new();
}

}