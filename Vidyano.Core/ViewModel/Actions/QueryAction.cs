using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    public class QueryAction : ActionBase
    {
        protected internal QueryAction(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
            CanExecute = definition.SelectionRule(0);
        }

        internal void Invalidate(int selectedItemsCount)
        {
            CanExecute = definition.SelectionRule(selectedItemsCount);
        }

        public override async Task Execute(object option)
        {
            await base.Execute(option);
            Query.PendingSemanicZoomTabsRefresh = true;

            if (Query.SemanticZoomOwner != null)
                Query.SemanticZoomOwner.PendingSemanicZoomTabsRefresh = true;
        }
    }
}