using Newtonsoft.Json.Linq;

namespace Vidyano.Common
{
    public static class JObjectEx
    {
        public static JObject CopyProperties(this JObject obj, params string[] propertyNames)
        {
            var result = new JObject();
            foreach (var propertyName in propertyNames)
                result[propertyName] = obj[propertyName];
            return result;
        }
    }
}