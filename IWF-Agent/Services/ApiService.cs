using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

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

// public static async Task<int> VerifyAgent()
// {
//     var token = ConfigService.GetToken();

//     var data = new
//     {
//         agent_token = token
//     };

//     var json = JsonSerializer.Serialize(data);

//     var content =
//         new StringContent(
//             json,
//             Encoding.UTF8,
//             "application/json"
//         );

//     var response =
//         await client.PostAsync(
//             $"{ConfigService.GetApiBaseUrl()}/api/agent/verify",
//             content
//         );

//     var result =
//         await response.Content.ReadAsStringAsync();

//     using JsonDocument doc =
//         JsonDocument.Parse(result);

//     return doc.RootElement
//               .GetProperty("user_id")
//               .GetInt32();
// }

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
}