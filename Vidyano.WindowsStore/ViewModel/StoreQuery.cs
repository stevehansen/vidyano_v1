using System.Collections.Specialized;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace Vidyano.ViewModel
{
    public class StoreQuery : Query
    {
        private bool _CanSemanticZoom;
        private bool _IsActionsBarOpen, _IsActionsBarSticky;
        private QueryItemsSource _Items;
        private bool _KeepActionsBarOpen;

        internal StoreQuery(JObject model, PersistentObject parent = null, bool asLookup = false)
            : base(model, parent, asLookup)
        {
        }

        public QueryItemsSource Items
        {
            get { return _Items; }
            internal set
            {
                if (SetProperty(ref _Items, value))
                {
                    if (SelectedItems.Count > 0)
                        SelectedItems.Clear();

                    PendingSemanicZoomTabsRefresh = true;
                }
            }
        }

        public bool IsActionsBarOpen
        {
            get { return _IsActionsBarOpen; }
            internal set { SetProperty(ref _IsActionsBarOpen, value && HasActions); }
        }

        public bool KeepActionsBarOpen
        {
            get { return _KeepActionsBarOpen; }
            set
            {
                if (SetProperty(ref _KeepActionsBarOpen, value && HasActions) && value)
                    IsActionsBarOpen = IsActionsBarSticky = _KeepActionsBarOpen;
            }
        }

        public bool IsActionsBarSticky
        {
            get { return _IsActionsBarSticky; }
            internal set { SetProperty(ref _IsActionsBarSticky, value && HasActions); }
        }

        public bool CanSemanticZoom
        {
            get { return _CanSemanticZoom && !IsSemanticZoomQuery; }
            internal set { SetProperty(ref _CanSemanticZoom, value); }
        }

        internal override void SetResult(JObject result)
        {
            base.SetResult(result);

            IsActionsBarOpen = IsActionsBarSticky = KeepActionsBarOpen || TotalItems == 0;
        }

        internal override void SelectedItems_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            base.SelectedItems_CollectionChanged(sender, e);

            IsActionsBarOpen = IsActionsBarSticky = KeepActionsBarOpen || TotalItems == 0 || SelectedItems.Count > 0 && (Actions.Any(a => a.CanExecute) || PinnedActions.Any(a => a.CanExecute));
        }

        public override async Task RefreshQueryAsync()
        {
            await base.RefreshQueryAsync();
            Items = new QueryItemsSource(this);
        }

        public override async Task SearchTextAsync(string text)
        {
            await base.SearchTextAsync(text);

            Items = new QueryItemsSource(this);
        }
    }
}