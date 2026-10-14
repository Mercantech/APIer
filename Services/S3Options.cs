namespace OpgaverAPI.Services
{
    public class S3Options
    {
        public const string Section = "S3";

        /// <summary>Intern MinIO/S3 endpoint, fx http://opgaver-minio:9000</summary>
        public string ServiceUrl { get; set; } = "";

        public string AccessKey { get; set; } = "";
        public string SecretKey { get; set; } = "";
        public string Bucket { get; set; } = "apier-assets";

        /// <summary>Offentlig sti via gateway, fx /assets</summary>
        public string PublicBasePath { get; set; } = "/assets";

        public bool Enabled =>
            !string.IsNullOrWhiteSpace(ServiceUrl)
            && !string.IsNullOrWhiteSpace(AccessKey)
            && !string.IsNullOrWhiteSpace(SecretKey)
            && !string.IsNullOrWhiteSpace(Bucket);

        public bool SyncChampionsOnStartup { get; set; } = true;
    }
}
