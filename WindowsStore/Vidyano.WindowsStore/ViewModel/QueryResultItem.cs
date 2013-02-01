using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.ViewModel
{
    public class QueryResultItem : ViewModelBase
    {
        private readonly JArray values;

        internal QueryResultItem(string id):
            base(new JObject(new JProperty("id", id)))
        {
        }

        internal QueryResultItem(JObject model, Query query) :
            base(model)
        {
            Query = query;
            values = (JArray)model["values"];
        }

        #region Properties

        public string Id { get { return GetProperty<string>(); } }

        public string Breadcrumb { get { return GetProperty<string>(); } }

        public Query Query { get; private set; }

        public object this[string key]
        {
            get
            {
                var column = Query.Columns.FirstOrDefault(c => c.Name == key);

                var value = values.FirstOrDefault(v => (string)v["key"] == key);
                if (value != null)
                    return Service.FromServiceString((string)value["value"], column.Type);

                return null;
            }
        }

        #endregion

        #region Service Serialization

        protected override string[] GetServiceProperties()
        {
            return new[] { "id", "values" };
        }

        #endregion
    }
}