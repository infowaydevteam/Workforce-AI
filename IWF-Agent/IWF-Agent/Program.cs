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

            if (!ConfigService.IsActivated())
            {
                Console.WriteLine("Agent is not activated.");
                return;
            }

            string token = ConfigService.GetToken();

            var result = await ApiService.VerifyAgent(token);

            if (result == null || !result.success)
            {
                Console.WriteLine("Saved token invalid.");
                return;
            }

            UserContext.UserId = result.user_id;

            Console.WriteLine(
                $"Logged User ID: {UserContext.UserId}"
            );

            // START SESSION
            await ApiService.StartSession();
            Console.WriteLine("START SESSION API CALL");

            // Load Restricted Apps / Websites
var restrictedItems =
    await ApiService.GetRestrictedItems();

if (restrictedItems != null &&
    restrictedItems.Success)
{
    RestrictedAppService.Load(
        restrictedItems.Apps
    );

    RestrictedSiteService.Load(
        restrictedItems.Sites
    );
}
else
{
    Console.WriteLine(
        "Failed to load restricted items."
    );
}

// Load Tracked Websites
await ApiService.GetTrackedWebsites();

// Start Services
ActivityService.Start();

Console.WriteLine(
    "Activity Service Started"
);

LockService.Start();

            // HEARTBEAT
            _ = Task.Run(async () =>
            {
                while (true)
                {
                    try
                    {
                        await ApiService.SendHeartbeat();

                        Console.WriteLine(
                            $"Heartbeat Sent : {DateTime.Now}"
                        );
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine(
                            $"Heartbeat Error : {ex.Message}"
                        );
                    }

                    await Task.Delay(10000);
                }
            });

            await Task.Delay(Timeout.Infinite);
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.ToString());
        }
        finally
        {
            Console.WriteLine(
                "Stopping Activity Service..."
            );

            LockService.Stop();

            await ActivityService.Stop();
            
        }
    }
}