using System.Collections;
using System.Collections.Generic;

namespace Vidyano.Common
{
    public class KeyValueList<TKey, TValue> : IReadOnlyDictionary<TKey, TValue>
    {
        private readonly IReadOnlyDictionary<TKey, TValue> dictionary;
        private readonly bool returnKeyAsDefault;

        internal KeyValueList(IReadOnlyDictionary<TKey, TValue> dictionary, bool returnKeyAsDefault = false)
        {
            this.dictionary = dictionary;
            this.returnKeyAsDefault = returnKeyAsDefault;
        }

        public bool ContainsKey(TKey key)
        {
            return dictionary.ContainsKey(key);
        }

        public IEnumerable<TKey> Keys
        {
            get { return dictionary.Keys; }
        }

        public bool TryGetValue(TKey key, out TValue value)
        {
            var retVal = dictionary.TryGetValue(key, out value);
            if (!retVal && returnKeyAsDefault)
                value = (TValue)(object)key;

            return retVal || returnKeyAsDefault;
        }

        public IEnumerable<TValue> Values
        {
            get { return dictionary.Values; }
        }

        public TValue this[TKey key]
        {
            get
            {
                TValue retVal;
                if (!dictionary.TryGetValue(key, out retVal) && returnKeyAsDefault)
                    retVal = (TValue)(object)key;

                return retVal;
            }
        }

        public int Count
        {
            get { return dictionary.Count; }
        }

        public IEnumerator<KeyValuePair<TKey, TValue>> GetEnumerator()
        {
            return dictionary.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return dictionary.GetEnumerator();
        }
    }
}