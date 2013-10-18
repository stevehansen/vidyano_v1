using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using Vidyano.ViewModel.Actions;

namespace Vidyano.ViewModel
{
    public class PhoneQuery : Query
    {
        internal PhoneQuery(JObject model, PersistentObject parent, bool asLookup)
            : base(model, parent, asLookup)
        {
            ContextMenuActions = new List<ActionBase>(Actions.Where(a => a.HasSelectionRule));
            ContextMenuActions.AddRange(PinnedActions.Where(a => a.HasSelectionRule));
        }

        public List<ActionBase> ContextMenuActions { get; private set; }
    }
}