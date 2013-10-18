using System.Collections.Generic;
using Vidyano.Common;

namespace Vidyano
{
    public class ServiceLanguage : NotifyableBase
    {
        internal ServiceLanguage(string isoLanguageName, string name, bool isDefault, IReadOnlyDictionary<string, string> messages)
        {
            TwoLetterISOLanguageName = isoLanguageName;
            Name = name;
            IsDefault = isDefault;
            Messages = messages;
        }

        public string TwoLetterISOLanguageName { get; private set; }

        public string Name { get; private set; }

        public bool IsDefault { get; private set; }

        public IReadOnlyDictionary<string, string> Messages { get; private set; }
    }
}