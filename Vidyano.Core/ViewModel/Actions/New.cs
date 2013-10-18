using System;
using System.Linq;

namespace Vidyano.ViewModel.Actions
{
    sealed class New : QueryAction
    {
        public New(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
            var newOptions = query.PersistentObject.NewOptions;
            Options = !string.IsNullOrWhiteSpace(newOptions) ? newOptions.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries).Select(o => o.Trim()).ToArray() : new string[0];
        }
    }
}