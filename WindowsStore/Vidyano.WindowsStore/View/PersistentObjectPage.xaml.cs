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
        private static readonly DependencyProperty HasNotificationProperty = DependencyProperty.Register("HasNotification", typeof(bool), typeof(PersistentObjectPage), new PropertyMetadata(false, HasNotificationChanged));

        private PersistentObject _PersistentObject;
        private PersistentObjectTab _ActiveSnappedTab;
        private ActionBase[] _LeftActions, _RightActions;

        public PersistentObjectPage()
        {
            InitializeComponent();

            SizeChanged += PersistentObjectPage_SizeChanged;
            SetBinding(HasNotificationProperty, new Binding { Path = new PropertyPath("PersistentObject.HasNotification") });
        }

        public PersistentObject PersistentObject { get { return _PersistentObject; } private set { SetProperty(ref _PersistentObject, value); } }

        public PersistentObjectTab ActiveSnappedTab { get { return _ActiveSnappedTab; } private set { SetProperty(ref _ActiveSnappedTab, value); } }

        public ActionBase[] LeftActions { get { return _LeftActions; } private set { SetProperty(ref _LeftActions, value); } }

        public ActionBase[] RightActions { get { return _RightActions; } private set { SetProperty(ref _RightActions, value); } }

        public DataTemplate PersistentObjectTemplate
        {
            get
            {
                object template;

                if (!Application.Current.Resources.TryGetValue("PersistentObjectTemplate." + PersistentObject.Type, out template))
                    template = (DataTemplate)Application.Current.Resources["PersistentObjectTemplate.Default"];

                return (DataTemplate)template ?? new DataTemplate();
            }
        }

        public DataTemplate PersistentObjectSnappedTemplate
        {
            get
            {
                object template;

                if (!Application.Current.Resources.TryGetValue("PersistentObjectSnappedTemplate." + PersistentObject.Type, out template))
                    template = (DataTemplate)Application.Current.Resources["PersistentObjectSnappedTemplate.Default"];

                return (DataTemplate)template ?? new DataTemplate();
            }
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (e.NavigationMode == NavigationMode.Back && Service.Current.IsConnected && e.SourcePageType == typeof(SignInPage))
                e.Cancel = true;

            base.OnNavigatingFrom(e);
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            PersistentObject = Service.Current.GetCachedObject<PersistentObject>(e.Parameter as string);

            DataContext = this;
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