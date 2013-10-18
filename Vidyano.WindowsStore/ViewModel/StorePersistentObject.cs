using System;
using System.Windows.Input;
using Windows.System;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Input;
using Newtonsoft.Json.Linq;
using Vidyano.Commands;

namespace Vidyano.ViewModel
{
    public class StorePersistentObject : PersistentObject
    {
        internal StorePersistentObject(JObject model)
            : base(model)
        {
        }

        public bool IsActionsBarOpen
        {
            get { return GetProperty<bool>(); }
            internal set { SetProperty(value && HasActions); }
        }

        public bool IsActionsBarSticky
        {
            get { return GetProperty<bool>(); }
            internal set { SetProperty(value && HasActions); }
        }

        public override bool IsInEdit
        {
            get { return base.IsInEdit; }
            internal set
            {
                base.IsInEdit = value;

                IsActionsBarSticky = value;
                IsActionsBarOpen = value;
            }
        }

        protected override PersistentObjectTabAttributes CreateAttributesTab(PersistentObjectAttribute[] attributes, string title, PersistentObject parent)
        {
            return new StorePersistentObjectTabAttributes(attributes, title, parent);
        }

        protected override PersistentObjectTabQuery CreateQueryTab(Query query)
        {
            return new StorePersistentObjectTabQuery(query);
        }

        public class StorePersistentObjectTabAttributes : PersistentObjectTabAttributes
        {
            private object _NavigationTarget;

            public StorePersistentObjectTabAttributes(PersistentObjectAttribute[] attributes, string title, PersistentObject parent)
                :
                    base(attributes, title, parent)
            {
                Navigate = new Navigate();
            }

            public ICommand Navigate { get; private set; }

            public object NavigationTarget
            {
                get { return _NavigationTarget; }
                protected set { SetProperty(ref _NavigationTarget, value); }
            }
        }

        public class StorePersistentObjectTabQuery : PersistentObjectTabQuery
        {
            protected static readonly DataTemplate EmptyTemplate = new DataTemplate();
            private object _NavigationTarget;

            public StorePersistentObjectTabQuery(Query query)
                : base(query)
            {
                Navigate = new Navigate();
                NavigationTarget = Query;

                object template;

                // QueryItemTemplate
                if (!Application.Current.Resources.TryGetValue("QueryItemTemplate." + Query.PersistentObject.Type, out template))
                    template = Application.Current.Resources["QueryItemTemplate.Default"];

                QueryItemTemplate = (DataTemplate)template ?? EmptyTemplate;
            }

            public ICommand Navigate { get; private set; }

            public DataTemplate QueryItemTemplate { get; private set; }

            public object NavigationTarget
            {
                get { return _NavigationTarget; }
                protected set { SetProperty(ref _NavigationTarget, value); }
            }

            public async void QueryResultItemClick(object sender, ItemClickEventArgs e)
            {
                var item = e.ClickedItem as QueryResultItem;
                if (item == null)
                    return;

                var clickHookArgs = new QueryItemClickedArgs(item);
                ((StoreHooks)Service.Current.Hooks).OnQueryItemClicked(sender, clickHookArgs);
                if (clickHookArgs.Cancel)
                    return;

                if (!item.Query.CanRead)
                    return;

                string err = null;
                try
                {
                    Service.Current.Hooks.OnOpen(await Service.Current.GetPersistentObjectAsync(Query.PersistentObject.Id, item.Id));
                }
                catch (Exception ex)
                {
                    err = ex.Message;
                }

                if (err != null)
                    await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
            }

            public async void ResetClick(object sender, RoutedEventArgs e)
            {
                TextSearch = string.Empty;
                await Query.SearchTextAsync(TextSearch);
            }

            public async void SearchClick(object sender, RoutedEventArgs e)
            {
                await Query.SearchTextAsync(TextSearch);
            }

            public async void SearchBoxKeyDown(object sender, KeyRoutedEventArgs e)
            {
                if (e.Key == VirtualKey.Enter)
                    await Query.SearchTextAsync(TextSearch);
            }
        }
    }
}