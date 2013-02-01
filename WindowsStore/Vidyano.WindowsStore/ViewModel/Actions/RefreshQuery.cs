using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    class RefreshQuery : QueryAction
    {
        public RefreshQuery(Definition definition, PersistentObject parent, Query query) :
            base(definition, parent, query)
        {
        }

        public override async Task Execute(object option)
        {
            await Query.RefreshQueryAsync();
        }
    }
}