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
    public const string CurrentVersion = "1.0.0";
    private const string Platform = "windows";
    private static readonly TimeSpan UpdateCheckInterval = TimeSpan.FromHours(6);
    private static readonly HttpClient client = new HttpClient();
    private static bool periodicChecksStarted = false;

    public static void StartPeriodicChecks()
    {
        if (periodicChecksStarted) return;

        periodicChecksStarted = true;

        _ = Task.Run(async () =>
        {
            while (true)
            {
                await Task.Delay(UpdateCheckInterval);
                if (await CheckForUpdates())
                {
                    Environment.Exit(0);
                }
            }
        });
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
        var updateRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "IWF-Agent",
            "updates",
            update.latest_version!
        );
        var packagePath = Path.Combine(updateRoot, update.package_name!);
        var stagingPath = Path.Combine(updateRoot, "staged");

        Directory.CreateDirectory(updateRoot);

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
        var scriptPath = Path.Combine(
            Path.GetDirectoryName(stagingPath) ?? stagingPath,
            "apply-update.ps1"
        );

        var script = $@"
Start-Sleep -Seconds 2
$source = '{EscapePowerShell(stagingPath)}'
$destination = '{EscapePowerShell(installDir)}'
$exe = '{EscapePowerShell(exePath)}'
Get-ChildItem -Path $source | Where-Object {{ $_.Name -ne 'config.json' }} | ForEach-Object {{
  Copy-Item -Path $_.FullName -Destination $destination -Recurse -Force
}}
Start-Process -FilePath $exe -WindowStyle Hidden
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
