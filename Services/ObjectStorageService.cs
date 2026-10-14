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

        public async Task EnsureBucketAsync(CancellationToken ct = default)
        {
            var exists = await Amazon.S3.Util.AmazonS3Util.DoesS3BucketExistV2Async(_s3, _opt.Bucket);
            if (!exists)
            {
                await _s3.PutBucketAsync(new PutBucketRequest { BucketName = _opt.Bucket }, ct);
                _log.LogInformation("Oprettede S3-bucket {Bucket}", _opt.Bucket);
            }

            // Offentlig read — så gateway kan proxyere uden signerede URL'er
            var policy =
                "{"
                + "\"Version\":\"2012-10-17\","
                + "\"Statement\":[{"
                + "\"Effect\":\"Allow\","
                + "\"Principal\":{\"AWS\":[\"*\"]},"
                + "\"Action\":[\"s3:GetObject\"],"
                + $"\"Resource\":[\"arn:aws:s3:::{_opt.Bucket}/*\"]"
                + "}]}";
            await _s3.PutBucketPolicyAsync(new PutBucketPolicyRequest
            {
                BucketName = _opt.Bucket,
                Policy = policy,
            }, ct);
        }

        public async Task PutAsync(
            string objectKey,
            Stream content,
            string contentType,
            CancellationToken ct = default)
        {
            if (content.CanSeek)
                content.Position = 0;

            var req = new PutObjectRequest
            {
                BucketName = _opt.Bucket,
                Key = objectKey.TrimStart('/'),
                InputStream = content,
                ContentType = contentType,
                AutoCloseStream = false,
            };
            var resp = await _s3.PutObjectAsync(req, ct);
            _log.LogInformation(
                "Uploaded s3://{Bucket}/{Key} etag={ETag} size={Size}",
                _opt.Bucket,
                req.Key,
                resp.ETag,
                content.CanSeek ? content.Length : -1);

            // Verificér at objektet faktisk ligger i bucket (MinIO kan ellers “lyve”)
            var ok = await ExistsAsync(req.Key, ct);
            if (!ok)
                throw new InvalidOperationException($"Upload af {req.Key} kunne ikke verificeres");
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
