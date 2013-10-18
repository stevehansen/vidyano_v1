using System;
using System.Linq;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Vidyano.View;
using Vidyano.ViewModel.Actions;

namespace Vidyano.ViewModel.Pages
{
    public class PersistentObjectPage : VidyanoPage
    {
        private PersistentObjectTab _ActiveSnappedTab;
        private DataTemplate _ContentTemplate;
        private ActionBase[] _LeftActions;
        private PersistentObject _PersistentObject;
        private ActionBase[] _RightActions;

        internal PersistentObjectPage(LayoutAwarePage page, StorePersistentObject po)
            : base(page)
        {
            PersistentObject = po;
            PersistentObject.NotificationChanged += PersistentObject_NotificationChanged;
            if (PersistentObject.HasNotification)
                PersistentObject_NotificationChanged(this, new NotificationChangedEventArgs(PersistentObject.Notification, PersistentObject.NotificationType));

            ActiveSnappedTab = PersistentObject.Tabs.FirstOrDefault();

            ActionBase[] leftActions, rightActions;
            StoreHooks.ArrangeActions(PersistentObject.Actions, PersistentObject.PinnedActions, out leftActions, out rightActions);
            LeftActions = leftActions;
            RightActions = rightActions;

            OnApplicationViewStateChanged();
        }

        public PersistentObject PersistentObject
        {
            get { return _PersistentObject; }
            private set { SetProperty(ref _PersistentObject, value); }
        }

        public PersistentObjectTab ActiveSnappedTab
        {
            get { return _ActiveSnappedTab; }
            private set { SetProperty(ref _ActiveSnappedTab, value); }
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

        protected override void OnApplicationViewStateChanged()
        {
            object template;
            string templateName;

            // ContentTemplate
            templateName = ViewState != ApplicationViewState.Snapped ? "PersistentObjectTemplate" : "PersistentObjectSnappedTemplate";
            Application.Current.Resources.TryGetValue(templateName + "." + PersistentObject.Type, out template);
            if (template == null)
                Application.Current.Resources.TryGetValue(templateName, out template);

            if (template == null || template != ContentTemplate)
                ContentTemplate = (DataTemplate)template ?? EmptyTemplate;

            // Template
            templateName = ViewState != ApplicationViewState.Snapped ? "PersistentObjectPage" : "PersistentObjectSnappedPage";
            Application.Current.Resources.TryGetValue(templateName + "." + PersistentObject.Type, out template);
            if (template == null)
                Application.Current.Resources.TryGetValue(templateName, out template);

            if (template == null || template != Template)
                Template = (DataTemplate)template ?? EmptyTemplate;
        }

        private async void PersistentObject_NotificationChanged(object sender, NotificationChangedEventArgs e)
        {
            if (PersistentObject.HasNotification)
                await Service.Current.Hooks.ShowNotification(e.Notification, e.NotificationType);
        }

        private void PreviousSnappedTab(object sender, RoutedEventArgs e)
        {
            var newIndex = PersistentObject.Tabs.IndexOf(ActiveSnappedTab);
            if (newIndex < 0)
                newIndex = PersistentObject.Tabs.Count - 1;

            ActiveSnappedTab = PersistentObject.Tabs[newIndex];
        }

        private void NextSnappedTab(object sender, RoutedEventArgs e)
        {
            var newIndex = PersistentObject.Tabs.IndexOf(ActiveSnappedTab) + 1;
            if (newIndex >= PersistentObject.Tabs.Count)
                newIndex = 0;

            ActiveSnappedTab = PersistentObject.Tabs[newIndex];
        }
    }
}