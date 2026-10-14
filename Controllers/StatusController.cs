using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using MongoDB.Driver;
using MongoDB.Bson;
using Microsoft.Extensions.Configuration;
using OpgaverAPI.Context;
using Microsoft.EntityFrameworkCore;

namespace OpgaverAPI.Controllers
{
    public class DatabaseStatus
    {
        public string Status { get; set; } = string.Empty;
        public string? Database { get; set; }
        public string? Error { get; set; }
        public bool IsError { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    /// <summary>
    /// Controller for checking the status of the server and database connections
    /// </summary>
    public class StatusController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly AppDBContext _context;

        public StatusController(IConfiguration configuration, AppDBContext context)
        {
            _configuration = configuration;
            _context = context;
        }

        /// <summary>
        /// Check if the server is running
        /// </summary>
        /// <returns>Server status</returns>
        [HttpGet]
        public IActionResult GetStatus()
        {
            return Ok(new { status = "Server is running", timestamp = DateTime.UtcNow });
        }

        /// <summary>
        /// Check MongoDB connection status
        /// </summary>
        /// <returns>MongoDB status</returns>
        [HttpGet("mongo")]
        public async Task<IActionResult> GetMongoStatus()
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("MongoDB");
                var databaseName = "opgaverapi"; // Hardcoded eller tilføj til config
                
                if (string.IsNullOrEmpty(connectionString))
                {
                    return BadRequest(new { 
                        status = "MongoDB configuration missing", 
                        timestamp = DateTime.UtcNow 
                    });
                }

                var client = new MongoClient(connectionString);
                var database = client.GetDatabase(databaseName);
                
                // Test connection by pinging the database
                await database.RunCommandAsync((Command<BsonDocument>)"{ping:1}");
                
                return Ok(new { 
                    status = "MongoDB is running", 
                    database = databaseName,
                    timestamp = DateTime.UtcNow 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    status = "MongoDB connection failed", 
                    error = ex.Message,
                    timestamp = DateTime.UtcNow 
                });
            }
        }

        /// <summary>
        /// Check PostgreSQL connection status
        /// </summary>
        /// <returns>PostgreSQL status</returns>
        [HttpGet("postgres")]
        public async Task<IActionResult> GetPostgresStatus()
        {
            try
            {
                // Test PostgreSQL connection by executing a simple query
                await _context.Database.ExecuteSqlRawAsync("SELECT 1");
                
                var connectionString = _context.Database.GetConnectionString();
                var databaseName = _context.Database.GetDbConnection().Database;
                
                return Ok(new { 
                    status = "PostgreSQL is running", 
                    database = databaseName,
                    timestamp = DateTime.UtcNow 
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    status = "PostgreSQL connection failed", 
                    error = ex.Message,
                    timestamp = DateTime.UtcNow 
                });
            }
        }

        /// <summary>
        /// Check all database connections
        /// </summary>
        /// <returns>Status of all database connections</returns>
        [HttpGet("all")]
        public async Task<IActionResult> GetAllStatus()
        {
            var mongoStatus = await GetMongoStatusInternal();
            var postgresStatus = await GetPostgresStatusInternal();
            
            var results = new
            {
                server = new { status = "Server is running" },
                mongodb = mongoStatus,
                postgresql = postgresStatus,
                timestamp = DateTime.UtcNow
            };

            // Return 500 if any database is down, otherwise 200
            bool anyDatabaseDown = mongoStatus.IsError || postgresStatus.IsError;
            
            if (anyDatabaseDown)
            {
                return StatusCode(500, results);
            }
            
            return Ok(results);
        }

        private async Task<DatabaseStatus> GetMongoStatusInternal()
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("MongoDB");
                var databaseName = "opgaverapi";
                
                if (string.IsNullOrEmpty(connectionString))
                {
                    return new DatabaseStatus
                    { 
                        Status = "MongoDB configuration missing", 
                        IsError = true 
                    };
                }

                var client = new MongoClient(connectionString);
                var database = client.GetDatabase(databaseName);
                await database.RunCommandAsync((Command<BsonDocument>)"{ping:1}");
                
                return new DatabaseStatus
                { 
                    Status = "MongoDB is running", 
                    Database = databaseName,
                    IsError = false 
                };
            }
            catch (Exception ex)
            {
                return new DatabaseStatus
                { 
                    Status = "MongoDB connection failed", 
                    Error = ex.Message,
                    IsError = true 
                };
            }
        }

        private async Task<DatabaseStatus> GetPostgresStatusInternal()
        {
            try
            {
                await _context.Database.ExecuteSqlRawAsync("SELECT 1");
                var databaseName = _context.Database.GetDbConnection().Database;
                
                return new DatabaseStatus
                { 
                    Status = "PostgreSQL is running", 
                    Database = databaseName,
                    IsError = false 
                };
            }
            catch (Exception ex)
            {
                return new DatabaseStatus
                { 
                    Status = "PostgreSQL connection failed", 
                    Error = ex.Message,
                    IsError = true 
                };
            }
        }
    }
} 