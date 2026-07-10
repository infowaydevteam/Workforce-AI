using System;
using System.Threading;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        try
        {
            Console.WriteLine("IWF Background Agent Started...");

            // ==========================
            // Activation Flow
            // ==========================

            if (!ConfigService.IsActivated())
            {
                await ActivateAgent();
                return;
            }

            // ==========================
            // Verify Saved Token
            // ==========================

            string token = ConfigService.GetToken();

            var result = await ApiService.VerifyAgent(token);

            if (result == null || !result.success)
            {
                Console.WriteLine("Saved token is invalid or expired.");
                Console.WriteLine("Please re-activate the agent.");
                await ActivateAgent();
                return;
            }

            UserContext.UserId = result.user_id;

            Console.WriteLine($"Welcome! Logged in as User ID: {UserContext.UserId}");

            // ==========================
            // Start Session
            // ==========================

            await ApiService.StartSession();

            // ==========================
            // Load Restricted Items
            // ==========================

            var restrictedItems = await ApiService.GetRestrictedItems();

            if (restrictedItems != null && restrictedItems.Success)
            {
                RestrictedAppService.Load(restrictedItems.Apps);
                RestrictedSiteService.Load(restrictedItems.Sites);
            }
            else
            {
                Console.WriteLine("Failed to load restricted items.");
            }

            // ==========================
            // Start Monitoring
            // ==========================

            Console.WriteLine("Monitoring started. Press Ctrl+C to stop.");

            ActivityService.Start();

            await Task.Delay(Timeout.Infinite);
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.ToString());
        }
        finally
        {
            await ActivityService.Stop();
        }
    }

    // ── Interactive first-run activation ──────────────────────────────────

    static async Task ActivateAgent()
    {
        Console.WriteLine("");
        Console.WriteLine("===========================================");
        Console.WriteLine("  IWF Agent — First Time Setup");
        Console.WriteLine("===========================================");
        Console.WriteLine("");
        Console.WriteLine("You received an Activation Code in your welcome email.");
        Console.WriteLine("Please enter it below to activate this agent.");
        Console.WriteLine("");

        string apiUrl = "";
        string activationCode = "";

        // Server URL
        while (string.IsNullOrWhiteSpace(apiUrl))
        {
            Console.Write("Server URL (e.g. http://192.168.1.10:5001): ");
            apiUrl = Console.ReadLine()?.Trim() ?? "";

            if (string.IsNullOrWhiteSpace(apiUrl))
                Console.WriteLine("Server URL cannot be empty. Please try again.");
        }

        // Activation Code
        while (string.IsNullOrWhiteSpace(activationCode))
        {
            Console.Write("Activation Code: ");
            activationCode = Console.ReadLine()?.Trim() ?? "";

            if (string.IsNullOrWhiteSpace(activationCode))
                Console.WriteLine("Activation code cannot be empty. Please try again.");
        }

        Console.WriteLine("");
        Console.WriteLine("Verifying activation code...");

        // Save URL first so ApiService can use it
        ConfigService.SaveConfig(activationCode, apiUrl);

        var result = await ApiService.VerifyAgent(activationCode);

        if (result == null || !result.success)
        {
            Console.WriteLine("");
            Console.WriteLine("Activation failed. The code may be incorrect or expired.");
            Console.WriteLine("Please check your welcome email and try again.");

            // Clear the saved config so next run prompts again
            ConfigService.SaveConfig("", apiUrl);
            return;
        }

        Console.WriteLine("");
        Console.WriteLine($"Activation successful! Welcome, {result.name}.");
        Console.WriteLine("The agent will now start monitoring.");
        Console.WriteLine("You can close this window — it runs in the background.");
        Console.WriteLine("");

        UserContext.UserId = result.user_id;

        await ApiService.StartSession();

        var restrictedItems = await ApiService.GetRestrictedItems();

        if (restrictedItems != null && restrictedItems.Success)
        {
            RestrictedAppService.Load(restrictedItems.Apps);
            RestrictedSiteService.Load(restrictedItems.Sites);
        }

        ActivityService.Start();

        await Task.Delay(Timeout.Infinite);
    }
}
