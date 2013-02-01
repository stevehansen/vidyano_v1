using System;
using System.Linq;
using Vidyano.ViewModel;
using Vidyano.ViewModel.Actions;
using Windows.Data.Xml.Dom;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Navigation;

namespace Vidyano.View
{
    sealed partial class PersistentObjectPage
    {
        public static readonly DependencyProperty PersistentObjectProperty = DependencyProperty.Register("PersistentObject", typeof(PersistentObject), typeof(PersistentObjectPage), new PropertyMetadata(null));
        public static readonly DependencyProperty ActiveSnappedTabProperty = DependencyProperty.Register("ActiveSnappedTab", typeof(PersistentObjectTab), typeof(PersistentObjectPage), new PropertyMetadata(null));
        private static readonly DependencyProperty HasNotificationProperty = DependencyProperty.Register("HasNotification", typeof(bool), typeof(PersistentObjectPage), new PropertyMetadata(false, HasNotificationChanged));

        public PersistentObjectPage()
        {
            InitializeComponent();

            SizeChanged += PersistentObjectPage_SizeChanged;
            SetBinding(HasNotificationProperty, new Binding { Path = new PropertyPath("PersistentObject.HasNotification") });
        }

        public PersistentObject PersistentObject
        {
            get { return (PersistentObject)GetValue(PersistentObjectProperty); }
            set { SetValue(PersistentObjectProperty, value); }
        }

        public ActionBase[] LeftActions { get; private set; }

        public ActionBase[] RightActions { get; private set; }

        public PersistentObjectTab ActiveSnappedTab
        {
            get { return (PersistentObjectTab)GetValue(ActiveSnappedTabProperty); }
            set { SetValue(ActiveSnappedTabProperty, value); }
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (e.NavigationMode == NavigationMode.Back && Service.Current.IsConnected && e.SourcePageType == typeof(SignInPage))
                e.Cancel = true;

            base.OnNavigatingFrom(e);
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = this;
            PersistentObject = Service.Current.GetCachedObject<PersistentObject>(e.Parameter as string);
            ActiveSnappedTab = PersistentObject.Tabs.FirstOrDefault();

            ActionBase[] leftActions, rightActions;
            ActionBase.ArrangeActions(PersistentObject.Actions, PersistentObject.PinnedActions, out leftActions, out rightActions);
            LeftActions = leftActions;
            RightActions = rightActions;

            base.OnNavigatedTo(e);
        }

        private void PersistentObjectPage_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            BottomAppBar.Visibility = ApplicationView.Value == ApplicationViewState.Snapped ? Visibility.Collapsed : Visibility.Visible;
        }

        private static void HasNotificationChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            if ((bool)e.NewValue)
            {
                var po = ((PersistentObjectPage)d).PersistentObject;
                ((Client)Client.Current).Hooks.ShowNotification(po.Notification, po.NotificationType);
            }
        }

        private void PreviousSnappedTab(object sender, RoutedEventArgs e)
        {
            var newIndex = Array.IndexOf(PersistentObject.Tabs, ActiveSnappedTab) - 1;
            if (newIndex < 0)
                newIndex = PersistentObject.Tabs.Length - 1;

            ActiveSnappedTab = PersistentObject.Tabs[newIndex];
        }

        private void NextSnappedTab(object sender, RoutedEventArgs e)
        {
            var newIndex = Array.IndexOf(PersistentObject.Tabs, ActiveSnappedTab) + 1;
            if (newIndex >= PersistentObject.Tabs.Length)
                newIndex = 0;

            ActiveSnappedTab = PersistentObject.Tabs[newIndex];
        }
    }
}