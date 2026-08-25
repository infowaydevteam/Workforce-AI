using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Timers;
using System.Windows.Forms;

public static class ScreenshotService
{
    private const int MinimumIntervalSeconds = 60;
    private static System.Timers.Timer? timer;
    private static bool uploadRunning = false;

    public static void Start(AgentPolicyConfig? policyConfig)
    {
        int configuredInterval =
            policyConfig?.MonitoringPolicy?.ScreenshotIntervalSeconds ?? 0;

        if (configuredInterval <= 0)
        {
            Console.WriteLine("Screenshot capture disabled by policy.");
            return;
        }

        int intervalSeconds = Math.Max(
            MinimumIntervalSeconds,
            configuredInterval
        );

        timer = new System.Timers.Timer(intervalSeconds * 1000);
        timer.Elapsed += CaptureAndUpload;
        timer.AutoReset = true;
        timer.Start();

        Console.WriteLine(
            $"Screenshot Service Started: every {intervalSeconds} seconds"
        );
    }

    public static void Stop()
    {
        timer?.Stop();
        timer?.Dispose();
        timer = null;
    }

    private static async void CaptureAndUpload(
        object? sender,
        ElapsedEventArgs e
    )
    {
        if (uploadRunning)
        {
            Console.WriteLine("Screenshot upload already running; skipping tick.");
            return;
        }

        uploadRunning = true;

        try
        {
            byte[] screenshot = CapturePrimaryScreenJpeg();

            await ApiService.SendScreenshot(
                screenshot,
                DateTime.UtcNow
            );

            Console.WriteLine("Screenshot uploaded.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Screenshot Error: {ex.Message}");
        }
        finally
        {
            uploadRunning = false;
        }
    }

    private static byte[] CapturePrimaryScreenJpeg()
    {
        Rectangle bounds = Screen.PrimaryScreen?.Bounds
            ?? throw new Exception("Primary screen not available");

        using Bitmap bitmap = new Bitmap(bounds.Width, bounds.Height);
        using Graphics graphics = Graphics.FromImage(bitmap);

        graphics.CopyFromScreen(
            bounds.Left,
            bounds.Top,
            0,
            0,
            bounds.Size
        );

        using MemoryStream stream = new MemoryStream();
        ImageCodecInfo jpegCodec = ImageCodecInfo
            .GetImageEncoders()
            .First(codec => codec.MimeType == "image/jpeg");

        using EncoderParameters encoderParameters = new EncoderParameters(1);
        encoderParameters.Param[0] = new EncoderParameter(
            Encoder.Quality,
            60L
        );

        bitmap.Save(stream, jpegCodec, encoderParameters);

        return stream.ToArray();
    }
}
