using System;
using System.Threading.Tasks;
using Windows.ApplicationModel.Search;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Vidyano.Commands;
using Vidyano.View;
using Vidyano.ViewModel.Actions;

namespace Vidyano.ViewModel.Pages
{
    public class QueryPage : VidyanoPage, ISearchPage
    {
        private DataTemplate _ContentTemplate;
        private PersistentObjectTab[] _Groups;
        private ActionBase[] _LeftActions, _RightActions;
        private DataTemplate _QueryItemTemplate;
        private bool backupShowSearchPaneOnKeyboardInput;
        private AppBar bottomBar, topBar;

        internal QueryPage(LayoutAwarePage page, StoreQuery query)
            : base(page)
        {
            Query = query;

            Query.NotificationChanged += Query_NotificationChanged;
            if (Query.HasNotification)
                Query_NotificationChanged(this, new NotificationChangedEventArgs(Query.Notification, Query.NotificationType));

            if (Client.CurrentClient.HasSearch)
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = true;

            ActionBase[] leftActions, rightActions;
            StoreHooks.ArrangeActions(Query.Actions, Query.PinnedActions, out leftActions, out rightActions);
            LeftActions = leftActions;
            RightActions = rightActions;

            if (!Query.IsZoomedIn)
                UpdateActionBar(true);

            OnApplicationViewStateChanged();
        }

        public StoreQuery Query { get; private set; }

        public PersistentObjectTab[] Groups
        {
            get { return _Groups; }
            private set { SetProperty(ref _Groups, value); }
        }

        public ActionBase[] LeftActions
        {
            get { return _LeftActions; }
            private set { SetProperty(ref _LeftActions, value); }
        }

        public ActionBase[] RightActions
        {
            get { return _RightActions; }
            private set { SetProperty(ref _RightActions, value); }
        }

        public DataTemplate ContentTemplate
        {
            get { return _ContentTemplate; }
            private set { SetProperty(ref _ContentTemplate, value); }
        }

        public DataTemplate QueryItemTemplate
        {
            get { return _QueryItemTemplate; }
            private set { SetProperty(ref _QueryItemTemplate, value); }
        }

        public async Task Search(string text)
        {
            await Query.SearchTextAsync(text);
        }

        private async void Query_NotificationChanged(object sender, NotificationChangedEventArgs e)
        {
            if (Query.HasNotification)
                await Service.Current.Hooks.ShowNotification(e.Notification, e.NotificationType);
        }

        protected override void OnApplicationViewStateChanged()
        {
            object template;
            string templateName;

            // ContentTemplate
            templateName = ViewState != ApplicationViewState.Snapped ? "QueryTemplate" : "QuerySnappedTemplate";
            Application.Current.Resources.TryGetValue(templateName + "." + Query.PersistentObject.Type, out template);
            if (template == null)
                Application.Current.Resources.TryGetValue(templateName, out template);

            if (template == null || template != ContentTemplate)
                ContentTemplate = (DataTemplate)template ?? EmptyTemplate;

            // Template
            templateName = ViewState != ApplicationViewState.Snapped ? "QueryPage" : "QuerySnappedPage";
            Application.Current.Resources.TryGetValue(templateName + "." + Query.PersistentObject.Type, out template);
            if (template == null)
                Application.Current.Resources.TryGetValue(templateName, out template);

            if (template == null || template != Template)
                Template = (DataTemplate)template ?? EmptyTemplate;

            // QueryItemTemplate
            if (!Application.Current.Resources.TryGetValue("QueryItemTemplate." + Query.PersistentObject.Type, out template))
                template = Application.Current.Resources["QueryItemTemplate.Default"];

            if (template == null || template != QueryItemTemplate)
                QueryItemTemplate = (DataTemplate)template ?? EmptyTemplate;
        }

        private async void UpdateActionBar(bool isSourceZoomedInView)
        {
            if (isSourceZoomedInView)
            {
                topBar = Page.TopAppBar;
                Page.TopAppBar = null;

                bottomBar = Page.BottomAppBar;
                Page.BottomAppBar = null;

                backupShowSearchPaneOnKeyboardInput = SearchPane.GetForCurrentView().ShowOnKeyboardInput;
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = false;

                Groups = await Query.GetSemanticZoomTabs();
            }
            else
            {
                Page.BottomAppBar = bottomBar;
                Page.TopAppBar = topBar;

                SearchPane.GetForCurrentView().ShowOnKeyboardInput = backupShowSearchPaneOnKeyboardInput;
            }
        }

        private void SemanticZoomChanging(object sender, SemanticZoomViewChangedEventArgs e)
        {
            UpdateActionBar(e.IsSourceZoomedInView);
        }

        private async void QueryResultItemClick(object sender, ItemClickEventArgs e)
        {
            var item = e.ClickedItem as QueryResultItem;
            if (item == null)
                return;

            var clickHookArgs = new QueryItemClickedArgs(item);
            ((StoreHooks)Service.Current.Hooks).OnQueryItemClicked(sender, clickHookArgs);
            if (clickHookArgs.Cancel)
                return;

            if (!Query.CanRead)
                return;

            string err = null;
            try
            {
                await new Navigate().Execute(Service.Current.GetPersistentObjectAsync(Query.PersistentObject.Id, item.Id));
            }
            catch (Exception ex)
            {
                err = ex.Message;
            }

            if (err != null)
                await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
        }

        public override void Dispose()
        {
            base.Dispose();

            Query.NotificationChanged -= Query_NotificationChanged;
        }
    }
}