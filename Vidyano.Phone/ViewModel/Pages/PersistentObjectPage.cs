using System.Linq;
using System.Windows;
using Microsoft.Phone.Controls;

namespace Vidyano.ViewModel.Pages
{
    public class PersistentObjectPage : VidyanoPage
    {
        private readonly PhoneApplicationPage page;
        private PersistentObjectTab _CurrentTab;
        private ActionsManager actionsManager;

        public PersistentObjectPage(PhoneApplicationPage page, PhonePersistentObject po)
            : base(page)
        {
            this.page = page;
            PersistentObject = po;
            PersistentObject.NotificationChanged += PersistentObject_NotificationChanged;

            CurrentTab = PersistentObject.Tabs.FirstOrDefault();
            PersistentObject.CurrentTabChanged = tab => CurrentTab = tab;

            Template = (DataTemplate)Application.Current.Resources["PersistentObject." + po.Type] ?? (DataTemplate)Application.Current.Resources["PersistentObjectPage." + PersistentObject.LayoutMode.ToString()];
        }

        public PhonePersistentObject PersistentObject { get; private set; }

        public DataTemplate Template { get; private set; }

        public PersistentObjectTab CurrentTab
        {
            get { return _CurrentTab; }
            set
            {
                if (SetProperty(ref _CurrentTab, value))
                {
                    if (actionsManager != null)
                        actionsManager.Dispose();

                    if (value != null && !value.IsActionBarVisible)
                        actionsManager = new ActionsManager(this, new Actions.ActionBase[0], new Actions.ActionBase[0]);
                    else
                    {
                        var queryTab = value as PersistentObjectTabQuery;
                        if (queryTab == null)
                            actionsManager = new ActionsManager(this, PersistentObject.Actions, PersistentObject.PinnedActions);
                        else
                            actionsManager = new ActionsManager(this, queryTab.Query.Actions, queryTab.Query.PinnedActions);
                    }
                }
            }
        }

        protected override async void OnSearch(string searchText)
        {
            var queryTab = CurrentTab as PersistentObjectTabQuery;
            if (queryTab != null)
                await queryTab.Query.SearchTextAsync(searchText);
        }

        private async void PersistentObject_NotificationChanged(object sender, NotificationChangedEventArgs e)
        {
            if (!string.IsNullOrEmpty(e.Notification))
                await Service.Current.Hooks.ShowNotification(e.Notification, e.NotificationType);
        }

        public override void Dispose()
        {
            PersistentObject.NotificationChanged -= PersistentObject_NotificationChanged;

            if (actionsManager != null)
            {
                actionsManager.Dispose();
                actionsManager = null;
            }
        }
    }
}