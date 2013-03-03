using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.ViewModel
{
    [DebuggerDisplay("QueryColumn {Name}")]
    public class QueryColumn : ViewModelBase
    {
        internal QueryColumn(JObject model, Query query) :
            base(model)
        {
            Query = query;
        }

        public Query Query { get; private set; }

        internal bool DisableSort { get { return GetProperty<bool>(); } }

        internal string[] Includes { get { return GetProperty<string[]>(); } set { SetProperty(value); } }

        internal string[] Excludes { get { return GetProperty<string[]>(); } set { SetProperty(value); } }

        public string Label { get { return GetProperty<string>(); } }

        public string Name { get { return GetProperty<string>(); } }

        public int Offset { get { return GetProperty<int>(); } }

        public string Type { get { return GetProperty<string>(); } }

        #region Service Serialization

        protected override string[] GetServiceProperties()
        {
            return new[] { "id", "name", "label", "includes", "excludes", "type", "displayAttribute" };
        }

        #endregion
    }
}
