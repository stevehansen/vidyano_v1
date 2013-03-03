using System;
using System.ComponentModel;
using System.Linq;
using System.Threading;
using Vidyano.Common;
using Vidyano.ViewModel;
using Vidyano.ViewModel.Actions;
using Windows.ApplicationModel.Search;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Navigation;

namespace Vidyano.View
{
    sealed partial class QueryPage
    {
        private static readonly DependencyProperty HasNotificationProperty = DependencyProperty.Register("HasNotification", typeof(bool), typeof(QueryPage), new PropertyMetadata(false, HasNotificationChanged));

        private Query _Query;
        private QueryResultItem[] _SelectedItems = new QueryResultItem[0];
        private PersistentObjectTab[] _Groups;
        private ActionBase[] _LeftActions, _RightActions, backupLeftActions, backupRightActions;
        private bool backupIsActionsBarOpen, backupIsActionsBarSticky, backupShowSearchPaneOnKeyboardInput;

        public QueryPage()
        {
            InitializeComponent();
            SizeChanged += QueryPage_SizeChanged;

            SetBinding(HasNotificationProperty, new Binding { Path = new PropertyPath("Query.HasNotification") });

            queryGridView.ViewChangeStarted += GridView_ViewChangeStarted;
        }

        public DataTemplate QueryTemplate
        {
            get
            {
                object template;

                if (!Application.Current.Resources.TryGetValue("QueryTemplate." + Query.PersistentObject.Type, out template))
                    template = (DataTemplate)Application.Current.Resources["QueryTemplate.Default"];

                return (DataTemplate)template ?? new DataTemplate();
            }
        }

        public DataTemplate QuerySnappedTemplate
        {
            get
            {
                object template;

                if (!Application.Current.Resources.TryGetValue("QuerySnappedTemplate." + Query.PersistentObject.Type, out template))
                    template = (DataTemplate)Application.Current.Resources["QuerySnappedTemplate.Default"];

                return (DataTemplate)template ?? new DataTemplate();
            }
        }

        public Query Query { get { return _Query; } private set { SetProperty(ref _Query, value); } }

        public PersistentObjectTab[] Groups { get { return _Groups; } private set { SetProperty(ref _Groups, value); } }

        public ActionBase[] LeftActions { get { return _LeftActions; } private set { SetProperty(ref _LeftActions, value); } }

        public ActionBase[] RightActions { get { return _RightActions; } private set { SetProperty(ref _RightActions, value); } }

        #region Overrides

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            Query = Service.Current.GetCachedObject<Query>(e.Parameter as string);

            DataContext = this;

            if (((Client)Client.Current).HasSearch)
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = true;

            ActionBase[] leftActions, rightActions;
            ActionBase.ArrangeActions(Query.Actions, Query.PinnedActions, out leftActions, out rightActions);
            LeftActions = leftActions;
            RightActions = rightActions;

            queryGridView.CanChangeViews = Query.SemanticZoomOwner == null;

            Query.IsZoomedIn = !Query.IsZoomedOut;
            if (Query.IsZoomedOut && queryGridView.CanChangeViews)
            {
                queryGridView.IsZoomedInViewActive = false;
                Groups = await Query.GetSemanticZoomTabs();
            }

            base.OnNavigatedTo(e);
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (e.NavigationMode == NavigationMode.Back && Service.Current.IsConnected && e.SourcePageType == typeof(SignInPage))
                e.Cancel = true;
            else if (((Client)Client.Current).HasSearch)
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = false;

            base.OnNavigatingFrom(e);
        }

        #endregion

        #region Event Handlers

        private void QueryPage_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            BottomAppBar.Visibility = ApplicationView.Value == ApplicationViewState.Snapped ? Visibility.Collapsed : Visibility.Visible;
        }

        private async void GridView_ViewChangeStarted(object sender, SemanticZoomViewChangedEventArgs e)
        {
            Query.IsZoomedOut = !queryGridView.IsZoomedInViewActive;
            Query.IsZoomedIn = !Query.IsZoomedOut;

            if (e.IsSourceZoomedInView)
            {
                backupLeftActions = LeftActions;
                backupRightActions = RightActions;

                LeftActions = null;
                RightActions = null;

                backupIsActionsBarSticky = Query.IsActionsBarSticky;
                backupIsActionsBarOpen = Query.IsActionsBarOpen;

                Query.IsActionsBarOpen = Query.IsActionsBarSticky = false;

                backupShowSearchPaneOnKeyboardInput = SearchPane.GetForCurrentView().ShowOnKeyboardInput;
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = false;

                Groups = await Query.GetSemanticZoomTabs();
            }
            else
            {
                LeftActions = backupLeftActions;
                RightActions = backupRightActions;

                Query.IsActionsBarSticky = backupIsActionsBarSticky;
                Query.IsActionsBarOpen = backupIsActionsBarOpen;

                SearchPane.GetForCurrentView().ShowOnKeyboardInput = backupShowSearchPaneOnKeyboardInput;
            }
        }

        public async void QueryResultItemClick(object sender, ItemClickEventArgs e)
        {
            var item = e.ClickedItem as QueryResultItem;
            if (item == null)
                return;

            var clickHookArgs = new QueryItemClickedArgs(item);
            ((Client)Client.Current).Hooks.OnQueryItemClicked(sender, clickHookArgs);
            if (clickHookArgs.Cancel)
                return;

            if (!Query.CanRead)
                return;

            try
            {
                await new Commands.Navigate().Execute(Service.Current.GetPersistentObjectAsync(Query.PersistentObject.Id, item.Id));
            }
            catch (Exception ex)
            {
                ((Client)Client.Current).Hooks.ShowNotification(ex.Message, NotificationType.Error);
            }
        }

        private static void HasNotificationChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            if ((bool)e.NewValue)
            {
                var q = ((QueryPage)d).Query;
                ((Client)Client.Current).Hooks.ShowNotification(q.Notification, q.NotificationType);
            }
        }

        #endregion
    }
}