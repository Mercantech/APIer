using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;

namespace OpgaverAPI.Controllers
{
    public class HttpTraceAttribute : HttpMethodAttribute
    {
        private static readonly IEnumerable<string> _supportedMethods = new[] { "TRACE" };

        public HttpTraceAttribute()
            : base(_supportedMethods)
        {
        }
    }

    public class HttpConnectAttribute : HttpMethodAttribute
    {
        private static readonly IEnumerable<string> _supportedMethods = new[] { "CONNECT" };

        public HttpConnectAttribute()
            : base(_supportedMethods)
        {
        }
    }
} 