using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OpgaverAPI.Models
{
    public class StudentQuiz
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("MadeBy")]
        public string MadeBy { get; set; }

        [BsonElement("topic")]
        public string Topic { get; set; }

        [BsonElement("questions")]
        public List<Question>? Questions { get; set; }

        [BsonElement("createdAt")]
        public DateTime? CreatedAt { get; set; }

        [BsonElement("updatedAt")]
        public DateTime? UpdatedAt { get; set; }

        [BsonElement("secretKey")]
        public string? SecretKey { get; set; }
    }

    public class Question
    {
        [BsonElement("questionText")]
        public string QuestionText { get; set; }

        [BsonElement("options")]
        public List<string> Options { get; set; }

        [BsonElement("correctAnswerIndex")]
        public int CorrectAnswerIndex { get; set; }
    }

    public class StudentQuizOverviewDTO
    {
        public string Id { get; set; }
        public string MadeBy { get; set; }
        public string Topic { get; set; }
        public int NumberOfQuestions { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class StudentQuizPostDTO
    {
        public string MadeBy { get; set; }
        public string Topic { get; set; }
        public List<Question> Questions { get; set; }
        public string? SecretKey { get; set; }
    }

    public class StudentQuizPutDTO
    {
        public string Topic { get; set; }
        public List<Question> Questions { get; set; }
    }
}
