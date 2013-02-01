using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Popups;

namespace Vidyano.ViewModel.Actions
{
    public class QueryAction: ActionBase
    {
        protected internal QueryAction(Definition definition, PersistentObject parent, Query query):
            base(definition, parent, query)
        {
            CanExecute = definition.SelectionRule(0);
        }

        internal void Invalidate(int selectedItemsCount)
        {
            CanExecute = definition.SelectionRule(selectedItemsCount);
        }
    }
}