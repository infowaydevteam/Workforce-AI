using System;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;

public static class AgentUpdateService
{
    public const string CurrentVersion = "1.0.8";
    private const string Platform = "windows";
    private static readonly TimeSpan UpdateCheckInterval = TimeSpan.FromHours(6);
    private static readonly HttpClient client = new HttpClient();
    private static bool periodicChecksStarted = false;

    // An update that cannot be applied restarts the old build, which checks for
    // updates again the moment it comes back. Without a ceiling that is a loop
    // that re-downloads the whole package every few seconds, forever. Three
    // attempts per version, then stop for good: whatever blocks the copy is not
    // going to clear itself, and an agent quietly burning bandwidth is worse
    // than one sitting on an old build with the reason written down. Publishing
    // a new version starts a fresh budget.
    private const int MaxApplyAttempts = 3;

    private class UpdateAttemptState
    {
        public string? version { get; set; }
        public int attempts { get; set; }
        public DateTime last_attempt_utc { get; set; }
    }

    private static string UpdatesRoot => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "IWF-Agent",
        "updates"
    );

    private static string AttemptStatePath => Path.Combine(UpdatesRoot, "update-state.json");

    private static UpdateAttemptState LoadAttemptState()
    {
        try
        {
            if (File.Exists(AttemptStatePath))
            {
                var parsed = JsonSerializer.Deserialize<UpdateAttemptState>(
                    File.ReadAllText(AttemptStatePath)
                );

                if (parsed != null)
                {
                    return parsed;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Could not read update attempt state: {ex.Message}");
        }

        return new UpdateAttemptState();
    }

    private static void SaveAttemptState(UpdateAttemptState state)
    {
        try
        {
            Directory.CreateDirectory(UpdatesRoot);
            File.WriteAllText(
                AttemptStatePath,
                JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true })
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Could not record update attempt state: {ex.Message}");
        }
    }

    // Returns false once this version has used up its attempts. That decision is
    // final for the version: only a newer release, or deleting update-state.json
    // by hand, will make the agent try again.
    private static bool ClaimApplyAttempt(string version)
    {
        var state = LoadAttemptState();

        if (state.version != version)
        {
            state = new UpdateAttemptState { version = version };
        }
        else if (state.attempts >= MaxApplyAttempts)
        {
            Console.WriteLine(
                $"Giving up on update {version}: {state.attempts} attempts failed and no further " +
                $"attempts will be made for this version. See apply-update.log under " +
                $"{Path.Combine(UpdatesRoot, version)}, and {AttemptStatePath} to reset."
            );
            return false;
        }

        state.attempts++;
        state.last_attempt_utc = DateTime.UtcNow;
        SaveAttemptState(state);

        Console.WriteLine($"Update {version}: attempt {state.attempts} of {MaxApplyAttempts}.");
        return true;
    }

    public static void StartPeriodicChecks()
{
    if (periodicChecksStarted) return;

    periodicChecksStarted = true;

    _ = Task.Run(async () =>
    {
        // Check immediately
        if (await CheckForUpdates())
        {
            await ExitForUpdate();
            return;
        }

        while (true)
        {
            await Task.Delay(UpdateCheckInterval);

            if (await CheckForUpdates())
            {
                await ExitForUpdate();
                return;
            }
        }
    });
}

    // These checks run once monitoring is already under way, so the process is
    // leaving an open session behind. Environment.Exit on its own skipped the
    // normal teardown and left the employee showing Online until the offline
    // checker reaped them; mirror Program's finally block instead.
    private static async Task ExitForUpdate()
    {
        try
        {
            await ActivityService.Stop();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Shutdown before update warning: {ex.Message}");
        }

        Environment.Exit(0);
    }

    public static async Task<bool> CheckForUpdates()
    {
        try
        {
            var token = ConfigService.GetToken();
            var url =
                $"{ConfigService.GetApiBaseUrl()}/api/agent/updates?platform={Platform}&version={CurrentVersion}&agent_token={Uri.EscapeDataString(token ?? "")}";

            var response = await client.GetAsync(url);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"Update check skipped: {response.StatusCode}");
                return false;
            }

            var update = JsonSerializer.Deserialize<AgentUpdateResponse>(json);

            if (update == null || !update.success)
            {
                Console.WriteLine("Update check returned an invalid response.");
                return false;
            }

            if (!update.update_available)
            {
                Console.WriteLine($"Agent is up to date ({CurrentVersion}).");
                return false;
            }

            if (string.IsNullOrWhiteSpace(update.download_url) ||
                string.IsNullOrWhiteSpace(update.latest_version) ||
                string.IsNullOrWhiteSpace(update.package_name))
            {
                Console.WriteLine("Update is available, but download metadata is incomplete.");
                return false;
            }

            if (!ClaimApplyAttempt(update.latest_version!))
            {
                return false;
            }

            return await DownloadAndApply(update);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Update check warning: {ex.Message}");
            return false;
        }
    }

    private static async Task<bool> DownloadAndApply(AgentUpdateResponse update)
    {
        var updateRoot = Path.Combine(UpdatesRoot, update.latest_version!);
        var packagePath = Path.Combine(updateRoot, update.package_name!);
        var stagingPath = Path.Combine(updateRoot, "staged");

        Directory.CreateDirectory(updateRoot);

        // A retry after a failed apply already has the package on disk. Checking
        // its hash costs a local read; downloading it again costs the full
        // package over the network, once per restart.
        var reusable =
            File.Exists(packagePath) &&
            !string.IsNullOrWhiteSpace(update.checksum_sha256) &&
            (await Sha256File(packagePath)).Equals(
                update.checksum_sha256,
                StringComparison.OrdinalIgnoreCase
            );

        if (reusable)
        {
            Console.WriteLine(
                $"Reusing already downloaded {update.package_name} for {update.latest_version}."
            );
        }
        else
        {
            Console.WriteLine($"Downloading agent update {update.latest_version}...");

            using (var stream = await client.GetStreamAsync(update.download_url))
            using (var file = File.Create(packagePath))
            {
                await stream.CopyToAsync(file);
            }

            if (!string.IsNullOrWhiteSpace(update.checksum_sha256))
            {
                var checksum = await Sha256File(packagePath);

                if (!checksum.Equals(update.checksum_sha256, StringComparison.OrdinalIgnoreCase))
                {
                    File.Delete(packagePath);
                    Console.WriteLine("Downloaded update failed checksum validation.");
                    return false;
                }
            }
        }

        if (Directory.Exists(stagingPath))
        {
            Directory.Delete(stagingPath, true);
        }

        Directory.CreateDirectory(stagingPath);

        if (Path.GetExtension(packagePath).Equals(".zip", StringComparison.OrdinalIgnoreCase))
        {
            ZipFile.ExtractToDirectory(packagePath, stagingPath, true);
        }

        Console.WriteLine(
            $"Update {update.latest_version} downloaded and staged at {stagingPath}. It will apply on the next safe agent restart."
        );

        return LaunchInstaller(packagePath, stagingPath);
    }

    private static bool LaunchInstaller(string packagePath, string stagingPath)
    {
        var extension = Path.GetExtension(packagePath).ToLowerInvariant();

        try
        {
            if (extension == ".zip")
            {
                return LaunchZipUpdater(stagingPath);
            }

            if (extension == ".msi")
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "msiexec.exe",
                    Arguments = $"/i \"{packagePath}\" /qn /norestart",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                Console.WriteLine("Launched Windows MSI updater. Current agent will exit.");
                return true;
            }

            if (extension == ".exe")
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = packagePath,
                    Arguments = "/quiet /norestart",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                Console.WriteLine("Launched Windows EXE updater. Current agent will exit.");
                return true;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to launch updater: {ex.Message}");
        }

        return false;
    }

    private static bool LaunchZipUpdater(string stagingPath)
    {
        var installDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
        var exePath = Process.GetCurrentProcess().MainModule?.FileName ??
            Path.Combine(installDir, "IWF-Agent.exe");
        var updateRoot = Path.GetDirectoryName(stagingPath) ?? stagingPath;
        var scriptPath = Path.Combine(updateRoot, "apply-update.ps1");
        var logPath = Path.Combine(updateRoot, "apply-update.log");

        // Windows will not let the copy overwrite IWF-Agent.exe until the exiting
        // process has released it. The original script slept two seconds, ignored
        // any copy error because Copy-Item fails non-terminating by default, and
        // then restarted the agent regardless - so a locked executable silently
        // relaunched the old build while the log claimed the update had been
        // applied. Retry the copy, and write the outcome somewhere it can be read
        // afterwards, since this script runs with no console attached.
        var script = $@"
$ErrorActionPreference = 'Stop'
$log = '{EscapePowerShell(logPath)}'
$source = '{EscapePowerShell(stagingPath)}'
$destination = '{EscapePowerShell(installDir)}'
$exe = '{EscapePowerShell(exePath)}'

function Write-UpdateLog($message) {{
  try {{
    ""$((Get-Date).ToString('o')) $message"" | Add-Content -Path $log -Encoding UTF8
  }} catch {{ }}
}}

$applied = $false

for ($attempt = 1; $attempt -le 5; $attempt++) {{
  Start-Sleep -Seconds 2

  try {{
    Get-ChildItem -Path $source | Where-Object {{ $_.Name -ne 'config.json' }} | ForEach-Object {{
      Copy-Item -Path $_.FullName -Destination $destination -Recurse -Force
    }}

    $applied = $true
    Write-UpdateLog ""Applied update into $destination on attempt $attempt.""
    break
  }} catch {{
    Write-UpdateLog ""Attempt $attempt failed: $($_.Exception.Message)""
  }}
}}

if (-not $applied) {{
  Write-UpdateLog 'Update was NOT applied. Restarting the existing build instead.'
}}

try {{
  Start-Process -FilePath $exe -WindowStyle Hidden
  Write-UpdateLog ""Restarted $exe (updated=$applied).""
}} catch {{
  Write-UpdateLog ""Failed to restart $($exe): $($_.Exception.Message)""
}}
";

        File.WriteAllText(scriptPath, script);

        Process.Start(new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = $"-ExecutionPolicy Bypass -File \"{scriptPath}\"",
            UseShellExecute = false,
            CreateNoWindow = true
        });

        Console.WriteLine("Launched Windows ZIP updater. Current agent will exit.");
        Console.WriteLine($"Updater outcome will be written to {logPath}");
        return true;
    }

    private static string EscapePowerShell(string value)
    {
        return value.Replace("'", "''");
    }

    private static async Task<string> Sha256File(string filePath)
    {
        using var stream = File.OpenRead(filePath);
        using var sha256 = SHA256.Create();
        var hash = await sha256.ComputeHashAsync(stream);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
