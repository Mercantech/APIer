using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OpgaverAPI.Models
{
    public class Country
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("name")]
        public Name Name { get; set; }

        [BsonElement("tld")]
        public string[] Tld { get; set; }

        [BsonElement("cca2")]
        public string Cca2 { get; set; }

        [BsonElement("ccn3")]
        public string Ccn3 { get; set; }

        [BsonElement("cca3")]
        public string Cca3 { get; set; }

        [BsonElement("cioc")]
        public string? Cioc { get; set; }

        [BsonElement("borders")]
        public string[] Borders { get; set; }

        [BsonElement("independent")]
        public bool Independent { get; set; }

        [BsonElement("status")]
        public string Status { get; set; }

        [BsonElement("unMember")]
        public bool UnMember { get; set; }

        [BsonElement("currencies")]
        public Dictionary<string, Currency> Currencies { get; set; }

        [BsonElement("idd")]
        public Idd Idd { get; set; }

        [BsonElement("capital")]
        public string[] Capital { get; set; }

        [BsonElement("altSpellings")]
        public string[] AltSpellings { get; set; }

        [BsonElement("region")]
        public string Region { get; set; }

        [BsonElement("subregion")]
        public string? Subregion { get; set; }

        [BsonElement("languages")]
        public Dictionary<string, string> Languages { get; set; }

        [BsonElement("translations")]
        public Dictionary<string, Translation> Translations { get; set; }

        [BsonElement("latlng")]
        public double[] Latlng { get; set; }

        [BsonElement("landlocked")]
        public bool Landlocked { get; set; }

        [BsonElement("area")]
        public double Area { get; set; }

        [BsonElement("demonyms")]
        public Demonyms Demonyms { get; set; }

        [BsonElement("flag")]
        public string Flag { get; set; }

        [BsonElement("maps")]
        public Maps Maps { get; set; }

        [BsonElement("population")]
        public int Population { get; set; }

        [BsonElement("fifa")]
        public string? Fifa { get; set; }

        [BsonElement("car")]
        public Car Car { get; set; }

        [BsonElement("gini")]
        public Gini Gini { get; set; }

        [BsonElement("timezones")]
        public string[] Timezones { get; set; }

        [BsonElement("continents")]
        public string[] Continents { get; set; }

        [BsonElement("flags")]
        public Flags Flags { get; set; }

        [BsonElement("coatOfArms")]
        public Dictionary<string, object> CoatOfArms { get; set; }

        [BsonElement("startOfWeek")]
        public string StartOfWeek { get; set; }

        [BsonElement("capitalInfo")]
        public CapitalInfo CapitalInfo { get; set; }
    }

    public class Name
    {
        [BsonElement("common")]
        public string Common { get; set; }

        [BsonElement("official")]
        public string Official { get; set; }

        [BsonElement("nativeName")]
        public Dictionary<string, NativeName> NativeName { get; set; }
    }

    public class NativeName
    {
        [BsonElement("official")]
        public string Official { get; set; }

        [BsonElement("common")]
        public string Common { get; set; }
    }

    public class Currency
    {
        [BsonElement("name")]
        public string Name { get; set; }

        [BsonElement("symbol")]
        public string Symbol { get; set; }
    }

    public class Idd
    {
        [BsonElement("root")]
        public string Root { get; set; }

        [BsonElement("suffixes")]
        public string[] Suffixes { get; set; }
    }

    public class Translation
    {
        [BsonElement("official")]
        public string Official { get; set; }

        [BsonElement("common")]
        public string Common { get; set; }
    }
    public class Gini
    {
        [BsonExtraElements]
        public Dictionary<string, object> YearValues { get; set; }
    }
    public class Demonyms
    {
        [BsonElement("eng")]
        public DemonymGender Eng { get; set; }
    }

    public class DemonymGender
    {
        [BsonElement("f")]
        public string F { get; set; }

        [BsonElement("m")]
        public string M { get; set; }
    }

    public class Maps
    {
        [BsonElement("googleMaps")]
        public string GoogleMaps { get; set; }

        [BsonElement("openStreetMaps")]
        public string OpenStreetMaps { get; set; }

        [BsonElement("mapillary")]
        public string[] Mapillary { get; set; }
    }

    public class Car
    {
        [BsonElement("signs")]
        public string[] Signs { get; set; }

        [BsonElement("side")]
        public string Side { get; set; }
    }

    public class Flags
    {
        [BsonElement("png")]
        public string Png { get; set; }

        [BsonElement("svg")]
        public string Svg { get; set; }

        [BsonElement("alt")]
        public string Alt { get; set; }
    }

    public class CapitalInfo
    {
        [BsonElement("latlng")]
        public double[] Latlng { get; set; }
    }
    public class SimplifiedCountry
    {
        [BsonElement("name")]
        public SimplifiedName Name { get; set; }

        [BsonElement("flags")]
        public Flags Flags { get; set; }

        [BsonElement("cca3")]
        public string Cca3 { get; set; }

        [BsonElement("altSpellings")]
        public string[] AltSpellings { get; set; }
    }

    public class SimplifiedName
    {
        [BsonElement("common")]
        public string Common { get; set; }
    }

    public class CountryUpdateDto
    {
        public Name Name { get; set; }
        public int Population { get; set; }
        public string Region { get; set; }
        public string? Subregion { get; set; }
        public Dictionary<string, string> Languages { get; set; }
        public bool UnMember { get; set; }
        public string[] Capital { get; set; }
        public Maps Maps { get; set; }
        public Flags Flags { get; set; }
        public bool Landlocked { get; set; }
        public string[] Borders { get; set; }
        public double Area { get; set; }
    }
    public class AddmapillaryDTO
    {
        public string[] Mapillary { get; set; }
    }
}
