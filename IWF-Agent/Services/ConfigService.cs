using System;
using System.IO;
using System.Text.Json;

public class ConfigService
{
    private static AgentConfig _config;

    static ConfigService()
    {
        LoadConfig();
    }

    private static void LoadConfig()
    {
        try
        {
            var path = Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,
                "config.json"
            );

            if (File.Exists(path))
            {
                var json = File.ReadAllText(path);
                _config = JsonSerializer.Deserialize<AgentConfig>(json);
                Console.WriteLine("Config loaded: config.json");
            }
            else
            {
                _config = new AgentConfig
                {
                    agent_token = "",
                    api_base_url = ""
                };
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Config Error: {ex.Message}");

            _config = new AgentConfig
            {
                agent_token = "",
                api_base_url = ""
            };
        }
    }

    public static bool IsActivated()
    {
          return !string.IsNullOrEmpty(_config?.agent_token);
    }

    public static void SaveConfig(string token, string apiUrl)
    {
        var config = new AgentConfig
        {
            agent_token = token,
            api_base_url = apiUrl
        };

        var json = JsonSerializer.Serialize(config, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        File.WriteAllText(
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json"),
            json
        );

        _config = config;

        Console.WriteLine("Config saved successfully");
    }

    public static string GetToken()
    {
        return _config?.agent_token;
    }

public static string GetApiBaseUrl()
{
    if (string.IsNullOrEmpty(_config?.api_base_url))
        throw new Exception("API Base URL missing");

    return _config.api_base_url;
}
}