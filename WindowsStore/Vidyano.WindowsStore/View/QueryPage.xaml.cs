using System;
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
        public static readonly DependencyProperty QueryProperty = DependencyProperty.Register("Query", typeof(Query), typeof(QueryPage), new PropertyMetadata(null));
        private static readonly DependencyProperty HasNotificationProperty = DependencyProperty.Register("HasNotification", typeof(bool), typeof(QueryPage), new PropertyMetadata(false, HasNotificationChanged));

        private QueryResultItem[] _SelectedItems = new QueryResultItem[0];

        public QueryPage()
        {
            InitializeComponent();
            SizeChanged += QueryPage_SizeChanged;

            SetBinding(HasNotificationProperty, new Binding { Path = new PropertyPath("Query.HasNotification") });
        }

        public Query Query
        {
            get { return (Query)GetValue(QueryProperty); }
            set { SetValue(QueryProperty, value); }
        }

        public ActionBase[] LeftActions { get; private set; }
        
        public ActionBase[] RightActions { get; private set; }

        #region Overrides

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = this;
            
            if (((Client)Client.Current).HasSearch)
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = true;

            Query = Service.Current.GetCachedObject<Query>(e.Parameter as string);

            ActionBase[] leftActions, rightActions;
            ActionBase.ArrangeActions(Query.Actions, Query.PinnedActions, out leftActions, out rightActions);
            LeftActions = leftActions;
            RightActions = rightActions;

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

        public async void QueryResultItemClick(object sender, ItemClickEventArgs e)
        {
            if (!Query.CanRead)
                return;

            var item = e.ClickedItem as QueryResultItem;
            if (item == null)
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