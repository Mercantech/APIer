using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using OpgaverAPI.Services;

namespace OpgaverAPI.Attributes
{
    /// <summary>
    /// Kræver gyldig elev-API-nøgle i header X-Api-Key.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class RequireApiKeyAttribute : Attribute, IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            if (!context.HttpContext.Request.Headers.TryGetValue(ApiKeyService.HeaderName, out var provided)
                || string.IsNullOrWhiteSpace(provided))
            {
                context.Result = new UnauthorizedObjectResult(
                    $"Header {ApiKeyService.HeaderName} mangler. Log ind på kataloget og opret en API-nøgle.");
                return;
            }

            var service = context.HttpContext.RequestServices.GetRequiredService<ApiKeyService>();
            var key = await service.ValidateAndTouchAsync(provided.ToString(), context.HttpContext.RequestAborted);
            if (key == null)
            {
                context.Result = new UnauthorizedObjectResult(
                    $"Header {ApiKeyService.HeaderName} er ugyldig eller tilbagekaldt.");
                return;
            }

            context.HttpContext.Items["ApiKeyId"] = key.Id;
            context.HttpContext.Items["ApiKeyUserSub"] = key.UserSub;
            await next();
        }
    }
}
