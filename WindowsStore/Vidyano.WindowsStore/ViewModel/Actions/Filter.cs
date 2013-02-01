using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    class Filter : QueryAction
    {
        public Filter(Definition definition, PersistentObject parent, Query query) :
            base(definition, parent, query)
        {
            IsVisible = false;
        }
    }
}
