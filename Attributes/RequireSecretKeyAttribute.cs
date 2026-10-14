using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace OpgaverAPI.Attributes
{
    public class RequireSecretKeyAttribute : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            if (!context.HttpContext.Request.Headers.TryGetValue("secret-key", out var secretKey))
            {
                context.Result = new UnauthorizedObjectResult("Secret key er påkrævet");
                return;
            }

            // Tjek om secret key matcher den der blev brugt ved oprettelse
            var studentQuiz = context.ActionArguments["id"]?.ToString();
            if (studentQuiz != null)
            {
                // Her kunne man tjekke mod databasen om secret key matcher
                // For nu returnerer vi bare unauthorized
                if (secretKey != "din-hemmelige-kode")
                {
                    context.Result = new UnauthorizedObjectResult("Ugyldig secret key");
                    return;
                }
            }
        }
    }
} 