using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Windows.Input;
using Vidyano.Common;

namespace Vidyano
{
    public sealed class ServiceProvider : NotifyableBase
    {
        internal ServiceProvider(string name, IDictionary<string, string> parameters)
        {
            Name = name;
            Parameters = new ReadOnlyDictionary<string, string>(parameters);
        }

        public string Name { get; private set; }

        public string Label
        {
            get
            {
                string label;
                return Parameters.TryGetValue("label", out label) ? label : Name;
            }
        }

        public IReadOnlyDictionary<string, string> Parameters { get; private set; }

        public ICommand Select { get; internal set; }
    }
}