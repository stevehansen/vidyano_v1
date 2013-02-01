using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.ViewModel
{
    public class ProgramUnitItem : ViewModelBase
    {
        internal ProgramUnitItem(JObject model) :
            base(model)
        {
        }

        public string Title { get { return GetProperty<string>(); } }

        public string Name { get { return GetProperty<string>(); } }

        public string QueryName { get { return GetProperty<string>(); } }

        public string PersistentObject { get { return GetProperty<string>(); } }

        public string PersistentObjectType { get { return GetProperty<string>(); } }

        public string ObjectId { get { return GetProperty<string>(); } }

        public string Query { get { return GetProperty<string>(); } }
    }
}