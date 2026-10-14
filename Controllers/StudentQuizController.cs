using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.JsonPatch.Operations;
using MongoDB.Driver;
using OpgaverAPI.Models;
using System.Net.WebSockets;
using OpgaverAPI.Attributes;

namespace OpgaverAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StudentQuizController : ControllerBase
    {
        private readonly IMongoDatabase _database;
        private readonly IMongoCollection<StudentQuiz> _studentQuizzes;

        public StudentQuizController(IMongoDatabase database)
        {
            _database = database;
            _studentQuizzes = database.GetCollection<StudentQuiz>("studentQuizzes");
        }

        /// <summary>
        /// Henter en oversigt over alle studenter-quizzes.
        /// </summary>
        /// <returns>En liste med oversigter over quizzes.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var studentQuizzes = await _studentQuizzes.Find(_ => true).ToListAsync();

            var overviews = studentQuizzes.Select(quiz => new StudentQuizOverviewDTO
            {
                Id = quiz.Id,
                MadeBy = quiz.MadeBy,
                Topic = quiz.Topic,
                NumberOfQuestions = quiz.Questions?.Count ?? 0,
                CreatedAt = quiz.CreatedAt ?? DateTime.MinValue
            }).ToList();

            return Ok(overviews);
        }

        /// <summary>
        /// Henter en specifik quiz via ID.
        /// </summary>
        /// <param name="id">ID'et på quizzen.</param>
        /// <returns>Quiz-objektet.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var studentQuiz = await _studentQuizzes.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (studentQuiz == null)
                return NotFound();
            return Ok(studentQuiz);
        }

        /// <summary>
        /// Opretter en ny quiz.
        /// </summary>
        /// <param name="studentQuiz">Data for den nye quiz.</param>
        /// <returns>Den oprettede quiz samt en hemmelig nøgle til senere redigering/sletning.</returns>
        [HttpPost]
        public async Task<IActionResult> Create(StudentQuizPostDTO studentQuiz)
        {
            var newStudentQuiz = new StudentQuiz
            {
                MadeBy = studentQuiz.MadeBy,
                Topic = studentQuiz.Topic,
                Questions = studentQuiz.Questions,
                SecretKey = studentQuiz.SecretKey ?? Guid.NewGuid().ToString("N")
            };
            
            newStudentQuiz.CreatedAt = DateTime.Now;
            newStudentQuiz.UpdatedAt = DateTime.Now;
            
            await _studentQuizzes.InsertOneAsync(newStudentQuiz);
            
            return CreatedAtAction(nameof(GetById), 
                new { id = newStudentQuiz.Id }, 
                new { 
                    quiz = newStudentQuiz,
                    message = "Gem denne secret key for at kunne redigere/slette quizzen senere",
                    secretKey = newStudentQuiz.SecretKey 
                });
        }

        /// <summary>
        /// Opdaterer en eksisterende quiz. Kræver en gyldig secret-key i headeren.
        /// </summary>
        /// <param name="id">ID'et på quizzen der skal opdateres.</param>
        /// <param name="studentQuiz">Det opdaterede quiz-objekt.</param>
        /// <returns>Statuskode.</returns>
        [HttpPut("{id}")]
        [RequireSecretKey]
        public async Task<IActionResult> Update(string id, StudentQuiz studentQuiz)
        {
            var existingStudentQuiz = await _studentQuizzes.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (existingStudentQuiz == null)
                return NotFound();
            
            var secretKey = Request.Headers["secret-key"].ToString();
            if (existingStudentQuiz.SecretKey != secretKey)
                return Unauthorized("Du har ikke rettigheder til at redigere denne quiz");
            
            studentQuiz.Id = existingStudentQuiz.Id;
            studentQuiz.SecretKey = existingStudentQuiz.SecretKey;
            await _studentQuizzes.ReplaceOneAsync(s => s.Id == id, studentQuiz);
            return NoContent();
        }

        /// <summary>
        /// Sletter en quiz. Kræver en gyldig secret-key i headeren.
        /// </summary>
        /// <param name="id">ID'et på quizzen der skal slettes.</param>
        /// <returns>Statuskode.</returns>
        [HttpDelete("{id}")]
        [RequireSecretKey]
        public async Task<IActionResult> Delete(string id)
        {
            var existingQuiz = await _studentQuizzes.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (existingQuiz == null)
                return NotFound();
            
            var secretKey = Request.Headers["secret-key"].ToString();
            if (existingQuiz.SecretKey != secretKey)
                return Unauthorized("Du har ikke rettigheder til at slette denne quiz");
            
            var result = await _studentQuizzes.DeleteOneAsync(s => s.Id == id);
            if (result.DeletedCount == 0)
                return NotFound();
            return NoContent();
        }

        /// <summary>
        /// Henter quizzes baseret på emne (topic).
        /// </summary>
        /// <param name="topic">Emnet der skal søges efter.</param>
        /// <returns>En liste af quizzes der matcher emnet.</returns>
        [HttpGet("topic/{topic}")]
        public async Task<IActionResult> GetByTopic(string topic)
        {
            var quizzes = await _studentQuizzes.Find(q => q.Topic == topic).ToListAsync();
            if (!quizzes.Any())
                return NotFound();
            return Ok(quizzes);
        }

        /// <summary>
        /// Opdaterer dele af en quiz. Kræver en gyldig secret-key i headeren.
        /// </summary>
        /// <param name="id">ID'et på quizzen der skal opdateres.</param>
        /// <param name="patchDoc">Et JSON Patch-dokument med ændringerne.</param>
        /// <returns>Den opdaterede quiz.</returns>
        [HttpPatch("{id}")]
        [RequireSecretKey]
        public async Task<IActionResult> PartialUpdate(string id, JsonPatchDocument<StudentQuiz> patchDoc)
        {
            var studentQuiz = await _studentQuizzes.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (studentQuiz == null)
                return NotFound();
            
            var secretKey = Request.Headers["secret-key"].ToString();
            if (studentQuiz.SecretKey != secretKey)
                return Unauthorized("Du har ikke rettigheder til at redigere denne quiz");

            patchDoc.ApplyTo(studentQuiz);
            studentQuiz.UpdatedAt = DateTime.Now;
            
            await _studentQuizzes.ReplaceOneAsync(s => s.Id == id, studentQuiz);
            return Ok(studentQuiz);
        }

        /// <summary>
        /// Returnerer metadata om quizzes, specifikt det samlede antal.
        /// </summary>
        /// <returns>En header `X-Total-Count` med antallet af quizzes.</returns>
        [HttpHead]
        public async Task<IActionResult> Head()
        {
            var count = await _studentQuizzes.CountDocumentsAsync(_ => true);
            Response.Headers.Add("X-Total-Count", count.ToString());
            return Ok();
        }

        /// <summary>
        /// Returnerer de tilladte HTTP-metoder for dette endpoint.
        /// </summary>
        /// <returns>En `Allow` header med de understøttede metoder.</returns>
        [HttpOptions]
        public IActionResult Options()
        {
            Response.Headers.Add("Allow", "GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS");
            return Ok();
        }

        /// <summary>
        /// Søger efter quizzes baseret på et nøgleord i emne eller 'MadeBy'-feltet.
        /// </summary>
        /// <param name="keyword">Nøgleordet der skal søges efter.</param>
        /// <returns>En liste af matchende quizzes.</returns>
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string keyword)
        {
            var filter = Builders<StudentQuiz>.Filter.Or(
                Builders<StudentQuiz>.Filter.Regex(x => x.Topic, new MongoDB.Bson.BsonRegularExpression(keyword, "i")),
                Builders<StudentQuiz>.Filter.Regex(x => x.MadeBy, new MongoDB.Bson.BsonRegularExpression(keyword, "i"))
            );
            
            var results = await _studentQuizzes.Find(filter).ToListAsync();
            return Ok(results);
        }

        /// <summary>
        /// Henter statistik om quizzes grupperet efter emne.
        /// </summary>
        /// <returns>Statistik der viser antal quizzes og gennemsnitligt antal spørgsmål pr. emne.</returns>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var stats = await _studentQuizzes.Aggregate()
                .Group(x => x.Topic, g => new
                {
                    Topic = g.Key,
                    Count = g.Count(),
                    AverageQuestions = g.Average(x => x.Questions.Count)
                })
                .ToListAsync();
            
            return Ok(stats);
        }

        /*
        [HttpTrace]
        public IActionResult Trace()
        {
            // TRACE returnerer request headers og body tilbage til klienten
            var traceInfo = new
            {
                Method = Request.Method,
                Path = Request.Path.ToString(),
                Headers = Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString()),
                Query = Request.QueryString.ToString(),
                Timestamp = DateTime.UtcNow
            };

            return Ok(traceInfo);
        }

        [Route("tunnel")]
        [HttpConnect]
        public async Task<IActionResult> Connect()
        {
            if (!HttpContext.WebSockets.IsWebSocketRequest)
            {
                return BadRequest("Dette endpoint kræver en WebSocket forbindelse");
            }

            using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
            
            await Task.Delay(TimeSpan.FromSeconds(10));
            
            return Ok("Tunnel forbindelse afsluttet");
        }
        */
    }
}
