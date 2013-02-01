using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.Common
{
    public class KeyValueList : IReadOnlyDictionary<string, string>
    {
        private readonly IReadOnlyDictionary<string, string> dictionary;
        private readonly bool returnKeyAsDefault;

        internal KeyValueList(IReadOnlyDictionary<string, string> dictionary, bool returnKeyAsDefault = false)
        {
            this.dictionary = dictionary;
            this.returnKeyAsDefault = returnKeyAsDefault;
        }

        public bool ContainsKey(string key)
        {
            return dictionary.ContainsKey(key);
        }

        public IEnumerable<string> Keys
        {
            get { return dictionary.Keys; }
        }

        public bool TryGetValue(string key, out string value)
        {
            var retVal = dictionary.TryGetValue(key, out value);
            if (!retVal && returnKeyAsDefault)
                value = key;

            return retVal || returnKeyAsDefault;
        }

        public IEnumerable<string> Values
        {
            get { return dictionary.Values; }
        }

        public string this[string key]
        {
            get
            {
                string retVal;
                if (!dictionary.TryGetValue(key, out retVal) && returnKeyAsDefault)
                    retVal = key;

                return retVal;
            }
        }

        public int Count
        {
            get { return dictionary.Count; }
        }

        public IEnumerator<KeyValuePair<string, string>> GetEnumerator()
        {
            return dictionary.GetEnumerator();
        }

        System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator()
        {
            return dictionary.GetEnumerator();
        }
    }
}
