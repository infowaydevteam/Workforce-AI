using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        try
        {
            Console.WriteLine("========== IWF Agent Launcher ==========");

            if (ConfigService.IsActivated())
            {
                Console.WriteLine("Agent Already Activated.");

                StartBackgroundAgent();

                return;
            }

            Console.Write("Enter Activation Code: ");
            string code = Console.ReadLine();

            var result = await ApiService.VerifyAgent(code);

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

            StartupService.Register();

            Console.WriteLine("✔ Activation Successful");
            Console.WriteLine("Starting Background Agent...");

            StartBackgroundAgent();
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.ToString());
            Console.ReadLine();
        }
    }

static void StartBackgroundAgent()
{
    string agentExe = Path.Combine(
        AppDomain.CurrentDomain.BaseDirectory,
        "IWF-Agent.exe"
    );

    if (!File.Exists(agentExe))
    {
        Console.WriteLine("IWF-Agent.exe not found.");
        Console.ReadLine();
        return;
    }

    Process.Start(new ProcessStartInfo
    {
        FileName = agentExe,
        WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory,
        UseShellExecute = true
    });

    Environment.Exit(0);
}
}