using System.Windows;
using Microsoft.Phone.Controls;

namespace Vidyano.ViewModel.Pages
{
    public class QueryPage : VidyanoPage
    {
        private ActionsManager actionsManager;

        public QueryPage(PhoneApplicationPage page, Query query)
            : base(page)
        {
            Query = query;
            if (Query.AutoQuery && !Query.HasSearched)
#pragma warning disable 4014
                Query.SearchTextAsync(Query.TextSearch);
#pragma warning restore 4014

            Query.NotificationChanged += Query_NotificationChanged;
            actionsManager = new ActionsManager(this, Query.Actions, Query.PinnedActions);

            Template = (DataTemplate)Application.Current.Resources["Query." + Query.PersistentObject.Type] ?? (DataTemplate)Application.Current.Resources["QueryPage"];
        }

        public Query Query { get; private set; }

        public DataTemplate Template { get; private set; }

        protected override async void OnSearch(string searchText)
        {
            if (!string.Equals(searchText ?? string.Empty, Query.TextSearch ?? string.Empty))
                await Query.SearchTextAsync(searchText);
        }

        private async void Query_NotificationChanged(object sender, NotificationChangedEventArgs e)
        {
            if (!string.IsNullOrEmpty(e.Notification))
                await Service.Current.Hooks.ShowNotification(e.Notification, e.NotificationType);
        }

        public override void Dispose()
        {
            Query.NotificationChanged -= Query_NotificationChanged;

            if (actionsManager != null)
            {
                actionsManager.Dispose();
                actionsManager = null;
            }
        }
    }
}