using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace OpgaverAPI.Services
{
    public class ObjectStorageService
    {
        private readonly S3Options _opt;
        private readonly IAmazonS3 _s3;
        private readonly ILogger<ObjectStorageService> _log;

        public ObjectStorageService(IOptions<S3Options> options, ILogger<ObjectStorageService> log)
        {
            _opt = options.Value;
            _log = log;

            var cfg = new AmazonS3Config
            {
                ServiceURL = _opt.ServiceUrl.TrimEnd('/'),
                ForcePathStyle = true,
                AuthenticationRegion = "us-east-1",
            };
            _s3 = new AmazonS3Client(_opt.AccessKey, _opt.SecretKey, cfg);
        }

        public bool IsConfigured => _opt.Enabled;

        public string PublicUrl(string objectKey)
        {
            var basePath = _opt.PublicBasePath.TrimEnd('/');
            var key = objectKey.TrimStart('/');
            return $"{basePath}/{key}";
        }

        public async Task PutAsync(
            string objectKey,
            Stream content,
            string contentType,
            CancellationToken ct = default)
        {
            var req = new PutObjectRequest
            {
                BucketName = _opt.Bucket,
                Key = objectKey.TrimStart('/'),
                InputStream = content,
                ContentType = contentType,
                AutoCloseStream = false,
            };
            await _s3.PutObjectAsync(req, ct);
            _log.LogInformation("Uploaded s3://{Bucket}/{Key}", _opt.Bucket, req.Key);
        }

        public async Task<bool> ExistsAsync(string objectKey, CancellationToken ct = default)
        {
            try
            {
                await _s3.GetObjectMetadataAsync(_opt.Bucket, objectKey.TrimStart('/'), ct);
                return true;
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return false;
            }
        }
    }
}
