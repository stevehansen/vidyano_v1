using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Vidyano.Common;
using Vidyano.ViewModel.Actions;

namespace Vidyano.ViewModel
{
    [DebuggerDisplay("Query {Name}")]
    public class Query : ViewModelBase, IReadOnlyList<QueryResultItem>
    {
        private readonly List<int> queriedPages = new List<int>();
        private readonly SortedDictionary<int, QueryResultItem> items = new SortedDictionary<int, QueryResultItem>();
        private CancellationTokenSource searchCancellationTokenSource;
        private bool asLookup;
        private Task<bool> searchingTask;

        private int _TotalItems;
        private bool _HasSearched, _HasTextSearch;
        private QueryColumn[] _Columns;
        private QueryItemsSource _Items;
        private bool _IsActionsBarOpen, _IsActionsBarSticky;
        private readonly ObservableCollection<QueryResultItem> _SelectedItems = new ObservableCollection<QueryResultItem>();

        internal Query(JObject model, PersistentObject parent = null, bool asLookup = false) :
            base(model)
        {
            Parent = parent;
            this.asLookup = asLookup;

            var po = (JObject)model["persistentObject"];
            if (po != null)
                PersistentObject = new PersistentObject(po);

            JToken columnsToken;
            if (model.TryGetValue("columns", out columnsToken))
            {
                var columns = (JArray)columnsToken;
                Columns = columns.Select(jCol => new QueryColumn((JObject)jCol, this)).ToArray();
            }
            else
                Columns = new QueryColumn[0];

            var result = (JObject)model["result"];
            if (result != null)
                SetResult(result);

            Items = new QueryItemsSource(this);

            JToken actionsToken;
            if (model.TryGetValue("actions", out actionsToken))
            {
                var actions = ViewModel.Actions.ActionBase.GetActions(actionsToken, parent, this);
                CanFilter = actions.OfType<Filter>().Any();

                Actions = actions.Where(a => !a.IsPinned).OfType<QueryAction>().ToArray();
                PinnedActions = actions.Where(a => a.IsPinned).OfType<QueryAction>().ToArray();
            }
            else
                Actions = new QueryAction[0];

            var newAction = Actions.OfType<New>().FirstOrDefault();
            var addAction = Actions.OfType<AddReference>().FirstOrDefault();
            if (newAction != null && addAction != null)
            {
                Actions = EnumerableEx.Return(new AddAndNewAction(newAction, addAction)).Concat(Actions).ToArray();
            }

            SelectedItems.CollectionChanged += SelectedItems_CollectionChanged;
            HasTextSearch = !string.IsNullOrEmpty(TextSearch);
        }

        public string Id { get { return GetProperty<string>(); } }

        public string Name { get { return GetProperty<string>(); } }

        public bool CanRead { get { return GetProperty<bool>(); } }

        public bool IsHidden { get { return GetProperty<bool>(); } }

        public string Label { get { return GetProperty<string>(); } }

        public string Notification
        {
            get { return GetProperty<string>(); }
            private set
            {
                if (SetProperty(value))
                    HasNotification = !string.IsNullOrWhiteSpace(value);
            }
        }

        public NotificationType NotificationType { get { return (NotificationType)Enum.Parse(typeof(NotificationType), GetProperty<string>()); } private set { SetProperty(value.ToString()); } }

        public bool HasNotification { get { return GetProperty<bool>(); } private set { SetProperty(value); } }

        public int Offset { get { return GetProperty<int>(); } }

        public string SortOptions { get { return GetProperty<string>(); } internal set { SetProperty(value); } }

        public string TextSearch
        {
            get { return GetProperty<string>(); }
            private set
            {
                if (SetProperty(value))
                    HasTextSearch = !String.IsNullOrEmpty(value);
            }
        }

        public bool CanFilter { get; private set; }

        public PersistentObject Parent { get; private set; }

        public PersistentObject PersistentObject { get; private set; }

        private int? PageSize { get { return GetProperty<int?>(); } set { SetProperty(value); } }

        private int Skip { get { return GetProperty<int>(); } set { SetProperty(value); } }

        private int? Top { get { return GetProperty<int>(); } set { SetProperty(value); } }

        public int TotalItems { get { return _TotalItems; } private set { SetProperty(ref _TotalItems, value); } }

        public bool HasSearched { get { return _HasSearched; } private set { SetProperty(ref _HasSearched, value); } }

        public bool HasTextSearch { get { return _HasTextSearch; } private set { SetProperty(ref _HasTextSearch, value); } }

        public QueryColumn[] Columns { get { return _Columns; } private set { SetProperty(ref _Columns, value); } }

        public QueryItemsSource Items { get { return _Items; } private set { SetProperty(ref _Items, value); } }

        public QueryResultItem this[int index]
        {
            get
            {
                QueryResultItem result;
                items.TryGetValue(index, out result);

                return result;
            }
        }

        public int Count
        {
            get
            {
                return items.Count > 0 ? items.Keys.Max() + 1 : 0;
            }
        }

        public QueryAction[] Actions { get; private set; }

        public QueryAction[] PinnedActions { get; private set; }

        public bool HasActions
        {
            get
            {
                return Actions != null && Actions.Length > 0 && Actions.Any(a => a.IsVisible) || PinnedActions != null && PinnedActions.Length > 0 && PinnedActions.Any(a => a.IsVisible);
            }
        }

        public ObservableCollection<QueryResultItem> SelectedItems { get { return _SelectedItems; } }

        public bool IsActionsBarOpen { get { return _IsActionsBarOpen; } internal set { SetProperty(ref _IsActionsBarOpen, value && HasActions); } }

        public bool IsActionsBarSticky { get { return _IsActionsBarSticky; } internal set { SetProperty(ref _IsActionsBarSticky, value && HasActions); } }

        #region Private Methods

        private void SelectedItems_CollectionChanged(object sender, System.Collections.Specialized.NotifyCollectionChangedEventArgs e)
        {
            if (Actions != null && Actions.Length > 0)
                Actions.Run(a => a.Invalidate(SelectedItems.Count));

            if (PinnedActions != null && PinnedActions.Length > 0)
                PinnedActions.Run(a => a.Invalidate(SelectedItems.Count));
        }

        private async Task<bool> SearchAsync(bool resetItems = false)
        {
            if (searchCancellationTokenSource != null)
                searchCancellationTokenSource.Cancel();

            searchCancellationTokenSource = new CancellationTokenSource();
            var token = searchCancellationTokenSource.Token;

            try
            {
                if (resetItems)
                {
                    Skip = 0;
                    Top = PageSize;
                    items.Clear();
                    queriedPages.Clear();
                }

                var result = await Service.Current.ExecuteQueryAsync(this, Parent, null, asLookup);
                if (!token.IsCancellationRequested)
                {
                    SetResult(result);
                    return true;
                }
                else
                    return false;
            }
            finally
            {
                searchCancellationTokenSource = null;
            }
        }

        private void SetResult(JObject result)
        {
            JToken columnsToken;
            if (result.TryGetValue("columns", out columnsToken))
            {
                var columns = (JArray)columnsToken;
                Columns = columns.Select(jCol => new QueryColumn((JObject)jCol, this)).ToArray();
            }
            else
                Columns = new QueryColumn[0];

            TotalItems = (int?)result["totalItems"] ?? 0;
            PageSize = (int?)result["pageSize"];
            HasSearched = true;

            var items = new QueryResultItem[0];
            JToken itemsToken;
            if (result.TryGetValue("items", out itemsToken))
                items = itemsToken.Select(jItem => new QueryResultItem((JObject)jItem, this)).ToArray();

            if (items.Length > 0)
            {
                var startIndex = (int?)result["skip"] ?? 0;
                for (int i = 0; i < items.Length; i++)
                {
                    this.items[startIndex + i] = items[i];
                }

                if (PageSize.HasValue && PageSize != 0)
                    queriedPages.AddRange(Enumerable.Range(startIndex / PageSize.Value, Math.Max(1, items.Length / PageSize.Value)));
            }
        }

        #endregion

        #region Public Methods

        public async Task<QueryResultItem[]> GetItemsAsync(int skip, int top)
        {
            if(searchingTask != null)
                await searchingTask;

            var gotItems = false;

            if (PageSize.HasValue)
            {
                if (PageSize != 0)
                {
                    var pageSize = PageSize.Value;

                    var startPage = (int)Math.Floor((double)skip / pageSize);
                    var endPage = (int)Math.Floor(((double)skip + top - 1) / pageSize);

                    while (startPage < endPage && queriedPages.Contains(startPage))
                        startPage++;
                    while (endPage > startPage && queriedPages.Contains(endPage))
                        endPage--;

                    if (startPage != endPage || !queriedPages.Contains(startPage))
                    {
                        Skip = startPage * pageSize;
                        Top = (endPage - startPage + 1) * pageSize;

                        var st = searchingTask = SearchAsync();
                        gotItems = await st;
                        searchingTask = null;
                    }
                    else
                        gotItems = true;
                }
            }
            else
            {
                gotItems = await SearchAsync();
            }

            return gotItems ? this.Skip(skip).Take(top == 0 ? TotalItems - skip : top).ToArray() : new QueryResultItem[0];
        }

        public async Task RefreshQueryAsync()
        {
            await SearchAsync(true);
            Items = new QueryItemsSource(this);
        }

        public async Task SearchTextAsync(string text)
        {
            TextSearch = !String.IsNullOrEmpty(text) ? text : null;
            await SearchAsync(true);

            Items = new QueryItemsSource(this);
        }

        public void SetNotification(string notification, NotificationType notificationType = NotificationType.Error)
        {
            NotificationType = notificationType;
            Notification = notification;
        }

        #endregion

        #region IEnumerable<QueryResultItem>

        IEnumerator<QueryResultItem> IEnumerable<QueryResultItem>.GetEnumerator()
        {
            var count = Count;
            for (int i = 0; i < count; i++)
            {
                QueryResultItem item;
                yield return items.TryGetValue(i, out item) ? item : null;
            }
        }

        System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator()
        {
            return ((IEnumerable<QueryResultItem>)this).GetEnumerator();
        }

        #endregion

        #region Service Serialization

        protected override string[] GetServiceProperties()
        {
            return new[] { "id", "name", "label", "pageSize", "skip", "top", "sortOptions", "textSearch" };
        }

        internal override JObject ToServiceObject()
        {
            var jObj = base.ToServiceObject();

            if (PersistentObject != null)
                jObj["persistentObject"] = PersistentObject.ToServiceObject();

            if (Columns != null)
                jObj["column"] = JArray.FromObject(Columns.Select(col => col.ToServiceObject()));

            return jObj;
        }

        #endregion
    }
}