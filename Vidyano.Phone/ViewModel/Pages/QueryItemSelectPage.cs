using System;
using System.Collections.Specialized;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Controls;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using Vidyano.ViewModel.Actions;

namespace Vidyano.ViewModel.Pages
{
    public class QueryItemSelectPage : VidyanoPage
    {
        private readonly PersistentObjectAttribute dateTimeOffsetAttribute;
        private readonly ApplicationBarIconButton okButton;
        private readonly Query query;
        private readonly PersistentObjectAttributeWithReference referenceAttribute;
        private Query _Lookup;
        private SelectionMode _SelectionMode;

        public QueryItemSelectPage(PhoneApplicationPage page)
            : base(page)
        {
            var bar = new ApplicationBar();

            string queryId, attrName;
            page.NavigationContext.QueryString.TryGetValue("query", out queryId);
            page.NavigationContext.QueryString.TryGetValue("attribute", out attrName);

            if (!string.IsNullOrEmpty(attrName))
            {
                var parent = Client.CurrentClient.GetCachedObject<PersistentObject>(page.NavigationContext.QueryString["parent"]);
                var attribute = parent.GetAttribute(attrName);

                referenceAttribute = attribute as PersistentObjectAttributeWithReference;
                if (referenceAttribute != null)
                    Lookup = referenceAttribute.Lookup;
                else if (attribute.Type == DataTypes.DateTimeOffset || attribute.Type == DataTypes.NullableDateTimeOffset)
                {
                    dateTimeOffsetAttribute = attribute;
                    Lookup = Client.CurrentClient.GetCachedObject<Query>("94b37097-6496-4d32-ae0b-99770defa828");
                    Lookup.Label = Service.Current.Messages["ChooseTimeZone"].ToUpper();
                }

                SelectionMode = SelectionMode.Single;
            }
            else if (queryId != null)
            {
                query = Client.CurrentClient.GetCachedObject<Query>(queryId);
                Lookup = Service.Current.Hooks.OnConstruct(query.Model, query.Parent, true);
                Lookup.SelectedItems.CollectionChanged += SelectedItems_CollectionChanged;

                SelectionMode = SelectionMode.Multiple;

                okButton = new ApplicationBarIconButton(new Uri("/Assets/ActionIcons/OK.png", UriKind.RelativeOrAbsolute))
                           {
                               Text = Service.Current.Messages["Select"],
                               IsEnabled = false
                           };
                okButton.Click += OkButton_Click;
                bar.Buttons.Add(okButton);
            }

            var cancelButton = new ApplicationBarIconButton(new Uri("/Assets/ActionIcons/Cancel.png", UriKind.RelativeOrAbsolute))
                               {
                                   Text = Service.Current.Messages["Cancel"],
                                   IsEnabled = true
                               };
            cancelButton.Click += delegate { Client.RootFrame.GoBack(); };
            bar.Buttons.Add(cancelButton);

            if (Lookup != null)
            {
                Lookup.OpenItem += Lookup_OnOpenItem;
                Lookup.NotificationChanged += Lookup_NotificationChanged;
#pragma warning disable 4014
                Lookup.SearchTextAsync(null);
#pragma warning restore 4014

                var filterAction = Lookup.Actions.OfType<Filter>().FirstOrDefault();
                if (filterAction != null)
                {
                    var searchButton = new ApplicationBarIconButton(new Uri("/Assets/ActionIcons/Filter.png", UriKind.RelativeOrAbsolute))
                                       {
                                           Text = filterAction.DisplayName,
                                           IsEnabled = true
                                       };
                    searchButton.Click += delegate { IsSearchOpen = true; };
                    bar.Buttons.Add(searchButton);
                }
            }

            page.ApplicationBar = bar;
        }

        public Query Lookup
        {
            get { return _Lookup; }
            private set { SetProperty(ref _Lookup, value); }
        }

        public SelectionMode SelectionMode
        {
            get { return _SelectionMode; }
            private set { SetProperty(ref _SelectionMode, value); }
        }

        internal async Task FinishSelectItems(params QueryResultItem[] items)
        {
            if (referenceAttribute != null)
            {
                try
                {
                    await referenceAttribute.ChangeReference(items.First());

                    Client.RootFrame.GoBack();
                }
                catch (Exception ex)
                {
                    referenceAttribute.Parent.SetNotification(ex.Message);
                }
            }
            else if (dateTimeOffsetAttribute != null)
            {
                var tz = (DateTimeOffset?)dateTimeOffsetAttribute.Value ?? DateTimeOffset.Now;
                dateTimeOffsetAttribute.Value = new DateTimeOffset(tz.DateTime, TimeSpan.FromMinutes(int.Parse(items.First().Id)));

                Client.RootFrame.GoBack();
            }
            else if (query != null)
            {
                try
                {
                    var result = await Service.Current.ExecuteActionAsync("Query.AddReference", query.Parent, query, items);
                    if (result != null && result.HasNotification)
                        query.SetNotification(result.Notification, result.NotificationType);

                    await query.RefreshQueryAsync();

                    Client.RootFrame.GoBack();
                }
                catch (Exception ex)
                {
                    query.SetNotification(ex.Message);
                }
            }
        }

        private async void Lookup_OnOpenItem(object sender, OpenQueryItemEventArgs e)
        {
            e.Cancel = true;
            await FinishSelectItems(e.Item);
        }

        private async void Lookup_NotificationChanged(object sender, NotificationChangedEventArgs e)
        {
            await Service.Current.Hooks.ShowNotification(e.Notification, e.NotificationType);
        }

        private void SelectedItems_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            okButton.IsEnabled = Lookup.SelectedItems.Count > 0;
        }

        protected override async void OnSearch(string searchText)
        {
            if (Lookup == null)
                return;

            if (!string.Equals(searchText ?? string.Empty, Lookup.TextSearch ?? string.Empty))
                await Lookup.SearchTextAsync(searchText);
        }

        private async void OkButton_Click(object sender, EventArgs e)
        {
            await FinishSelectItems(Lookup.SelectedItems.ToArray());
        }

        public override void Dispose()
        {
            if (Lookup != null)
            {
                Lookup.NotificationChanged -= Lookup_NotificationChanged;

                Lookup.SelectedItems.CollectionChanged -= SelectedItems_CollectionChanged;
                Lookup.OpenItem -= Lookup_OnOpenItem;
            }
        }
    }
}