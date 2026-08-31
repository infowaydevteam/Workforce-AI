using System;
using System.Threading;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        using CancellationTokenSource cts = new();

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

            StartupService.Register();

            if (await AgentUpdateService.CheckForUpdates())
            {
                return;
            }

            AgentUpdateService.StartPeriodicChecks();

            var policyConfig =
                await ApiService.GetAgentPolicyConfig();

            ActivityService.Configure(policyConfig);

            // ==========================
            // Start Session
            // ==========================

            // await ApiService.StartSession();


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

            await ActivityService.Start();
LockService.Start();
            // ==========================
            // Heartbeat
            // ==========================

            _ = Task.Run(async () =>
            {
                try
                {
                    while (!cts.Token.IsCancellationRequested)
                    {
                        await ApiService.SendHeartbeat();

                        await Task.Delay(
                            TimeSpan.FromSeconds(10),
                            cts.Token
                        );
                    }
                }
                catch (OperationCanceledException)
                {
                    Console.WriteLine(
                        "Heartbeat stopped."
                    );
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        $"Heartbeat Error: {ex.Message}"
                    );
                }
            }, cts.Token);

            // ==========================
            // Keep Agent Running
            // ==========================

            await Task.Delay(
                Timeout.Infinite,
                cts.Token
            );
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine(
                "Agent cancellation requested."
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.ToString());
        }
        finally
        {
            // Stop heartbeat
            cts.Cancel();

            // Stop activity tracking
            await ActivityService.Stop();

            Console.WriteLine(
                "Agent shutdown completed."
            );
        }
    }
}
