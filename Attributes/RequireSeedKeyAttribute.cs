using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace OpgaverAPI.Attributes
{
    /// <summary>
    /// Kræver header X-Seed-Key som matcher Seed:ApiKey (env SEED_API_KEY).
    /// Bruges til at fylde data uden elev-JWT.
    /// </summary>
    public class RequireSeedKeyAttribute : ActionFilterAttribute
    {
        public const string HeaderName = "X-Seed-Key";

        public override void OnActionExecuting(ActionExecutingContext context)
        {
            var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var expected = config["Seed:ApiKey"];

            if (string.IsNullOrWhiteSpace(expected))
            {
                context.Result = new ObjectResult("Seed:ApiKey er ikke konfigureret")
                {
                    StatusCode = StatusCodes.Status503ServiceUnavailable
                };
                return;
            }

            if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var provided)
                || provided != expected)
            {
                context.Result = new UnauthorizedObjectResult($"Header {HeaderName} mangler eller er ugyldig");
            }
        }
    }
}
