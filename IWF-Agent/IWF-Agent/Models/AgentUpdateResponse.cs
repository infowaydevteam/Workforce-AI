using System.Collections.Generic;

public class AgentUpdateResponse
{
    public bool success { get; set; }
    public string? platform { get; set; }
    public string? current_version { get; set; }
    public string? latest_version { get; set; }
    public bool update_available { get; set; }
    public bool mandatory { get; set; }
    public string? package_name { get; set; }
    public long package_size_bytes { get; set; }
    public string? checksum_sha256 { get; set; }
    public List<string>? release_notes { get; set; }
    public string? download_url { get; set; }
    public string? message { get; set; }
}
