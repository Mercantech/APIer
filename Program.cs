using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using OpgaverAPI.Context;
using OpgaverAPI.Services;
using MongoDB.Driver;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;
using System.Reflection;

namespace OpgaverAPI
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

            builder.Services.AddCors(options =>
            {
                options.AddPolicy(
                    name: MyAllowSpecificOrigins,
                    policy =>
                    {
                        policy.WithOrigins("*").AllowAnyMethod().AllowAnyHeader();
                    }
                );
            });

            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });

            IConfiguration Configuration = builder.Configuration;

            string? connectionString = Configuration.GetConnectionString("DefaultConnection")
                                      ?? Environment.GetEnvironmentVariable("DefaultConnection");

            builder.Services.AddDbContext<AppDBContext>(options =>
                options.UseNpgsql(connectionString)
                    .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));
            builder.Services.AddControllers()
                .AddNewtonsoftJson();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });
                c.AddSecurityDefinition("SeedKey", new OpenApiSecurityScheme
                {
                    Description = "Seed header X-Seed-Key (env SEED_API_KEY)",
                    Name = "X-Seed-Key",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey
                });
                c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
                {
                    Description = "Elev API-nøgle (header X-Api-Key). Opret via kataloget efter Mercantec-login.",
                    Name = "X-Api-Key",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });

                var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                if (File.Exists(xmlPath))
                {
                    c.IncludeXmlComments(xmlPath);
                }
            });

            builder.Services.AddSingleton<IMongoClient>(sp =>
            {
                var mongoCs = builder.Configuration.GetConnectionString("MongoDB")
                    ?? throw new InvalidOperationException("ConnectionStrings:MongoDB mangler");
                return new MongoClient(mongoCs);
            });

            builder.Services.AddScoped(sp =>
            {
                var client = sp.GetRequiredService<IMongoClient>();
                var dbName = builder.Configuration["MongoDB:Database"] ?? "opgaverapi";
                return client.GetDatabase(dbName);
            });

            var jwtKey = Configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt:Key mangler");

            var authIssuer = Configuration["Auth:Issuer"]
                ?? Environment.GetEnvironmentVariable("AUTH_ISSUER")
                ?? "https://auth.mercantec.tech";
            var authAudience = Configuration["Auth:Audience"]
                ?? Environment.GetEnvironmentVariable("AUTH_AUDIENCE")
                ?? "mercantec-apps";
            var jwksUri = Configuration["Auth:JwksUri"]
                ?? Environment.GetEnvironmentVariable("JWKS_URI")
                ?? $"{authIssuer.TrimEnd('/')}/.well-known/jwks.json";

            builder.Services.AddScoped<ApiKeyService>();

            builder.Services.Configure<OpgaverAPI.Services.S3Options>(
                builder.Configuration.GetSection(OpgaverAPI.Services.S3Options.Section));
            builder.Services.AddSingleton<OpgaverAPI.Services.ObjectStorageService>();
            builder.Services.AddScoped<OpgaverAPI.Services.ChampionImageSyncService>();
            builder.Services.AddHttpClient("ddragon", c =>
                {
                    c.DefaultRequestHeaders.UserAgent.ParseAdd(
                        "Mozilla/5.0 (compatible; APIer-OpgaverAPI/1.0; +https://api-opgaver.mercantec.tech)");
                    c.Timeout = TimeSpan.FromMinutes(5);
                })
                .ConfigurePrimaryHttpMessageHandler(() =>
                {
                    var handler = new HttpClientHandler();
                    // Nogle hosts har ufuldstændig CA-kæde udad — tillad Data Dragon-sync
                    if (builder.Configuration.GetValue("S3:InsecureDdragon", true))
                    {
                        handler.ServerCertificateCustomValidationCallback =
                            HttpClientHandler.DangerousAcceptAnyServerCertificateValidator;
                    }
                    return handler;
                });
            builder.Services.AddHostedService<OpgaverAPI.Services.ChampionImageSyncHostedService>();

            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = Configuration["Jwt:Issuer"],
                        ValidAudience = Configuration["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                    };
                })
                .AddJwtBearer("Mercantec", options =>
                {
                    options.MetadataAddress = $"{authIssuer.TrimEnd('/')}/.well-known/openid-configuration";
                    options.RequireHttpsMetadata = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = authIssuer,
                        ValidateAudience = true,
                        ValidAudience = authAudience,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        NameClaimType = "sub",
                        RoleClaimType = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
                    };
                    // JWKS hentes via OIDC metadata; eksplicit URI som fallback-dokumentation
                    _ = jwksUri;
                });

            var app = builder.Build();

            await StorageBootstrap.EnsureAsync(app.Services);

            app.UseForwardedHeaders();

            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseWebSockets();

            app.UseCors(MyAllowSpecificOrigins);

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            app.MapGet("/", () => Results.Redirect("/swagger"));

            await app.RunAsync();
        }
    }
}
