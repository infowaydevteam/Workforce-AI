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
            // Read Saved Token
            // ==========================

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

            Console.WriteLine($"Logged User ID: {UserContext.UserId}");

            // ==========================
            // Start Session
            // ==========================

            await ApiService.StartSession();

            // ==========================
            // Load Restricted Items
            // ==========================

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

            // ==========================
            // Start Monitoring
            // ==========================

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
}