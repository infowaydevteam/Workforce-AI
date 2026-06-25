using System;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        try
        {
            Console.WriteLine("IWF Agent Started...");

VerifyResponse result;

if (!ConfigService.IsActivated())
{
    Console.Write("Enter Activation Code: ");
    string code = Console.ReadLine();

    result = await ApiService.VerifyAgent(code);

    if (result == null || !result.success)
    {
        Console.WriteLine("❌ Invalid Activation Code");
        Console.ReadLine();
        return;
    }

    ConfigService.SaveConfig(
        result.agent_token,
        ConfigService.GetApiBaseUrl()
    );

    Console.WriteLine("✔ Activation Successful");
}
else
{
    Console.WriteLine("Agent Already Activated");

    var token = ConfigService.GetToken();

    result = await ApiService.VerifyAgent(token);

    if (result == null || !result.success)
    {
        Console.WriteLine("❌ Saved token invalid");
        Console.ReadLine();
        return;
    }
}

UserContext.UserId = result.user_id;

Console.WriteLine($"Logged User ID: {UserContext.UserId}");

await ApiService.StartSession();

ActivityService.Start();

Console.WriteLine("Press ENTER to stop agent...");
Console.ReadLine();
        }
        catch (Exception ex)
        {
            Console.WriteLine("CRASH:");
            Console.WriteLine(ex.ToString());

            Console.ReadLine();
        }
        finally
        {
            await ActivityService.Stop();
        }
    }
}