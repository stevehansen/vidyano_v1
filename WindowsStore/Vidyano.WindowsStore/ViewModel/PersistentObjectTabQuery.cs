using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;
using Vidyano.View;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Input;

namespace Vidyano.ViewModel
{
    public sealed class PersistentObjectTabQuery : PersistentObjectTab
    {
        private string _TextSearch;
        private bool _IsEmpty = true;

        internal PersistentObjectTabQuery(Query query)
            : base(query.Label, query.Parent)
        {
            NavigationTarget = Query = query;

            TextSearch = Query.TextSearch;
        }

        public string TextSearch
        {
            get { return _TextSearch; }
            set
            {
                if (SetProperty(ref _TextSearch, value))
                    IsEmpty = string.IsNullOrEmpty(value);
            }
        }

        public bool IsEmpty { get { return _IsEmpty; } set { SetProperty(ref _IsEmpty, value); } }

        public string FilterSearchHint
        {
            get
            {
                return String.Format(Service.Current.Messages["FilterSearchHint"], Query.Label);
            }
        }

        public Query Query { get; private set; }

        public async void QueryResultItemClick(object sender, ItemClickEventArgs e)
        {
            var item = e.ClickedItem as QueryResultItem;
            if (item == null)
                return;

            try
            {
                Navigate.Execute(await Service.Current.GetPersistentObjectAsync(Query.PersistentObject.Id, item.Id));
            }
            catch (Exception ex)
            {
                ((Client)Client.Current).Hooks.ShowNotification(ex.Message, NotificationType.Error);
            }
        }

        public async void ResetClick(object sender, Windows.UI.Xaml.RoutedEventArgs e)
        {
            TextSearch = string.Empty;
            await Query.SearchTextAsync(TextSearch);
        }

        public async void SearchClick(object sender, Windows.UI.Xaml.RoutedEventArgs e)
        {
            await Query.SearchTextAsync(TextSearch);
        }

        public async void SearchBoxKeyDown(object sender, KeyRoutedEventArgs e)
        {
            if (e.Key == Windows.System.VirtualKey.Enter)
                await Query.SearchTextAsync(TextSearch);
        }
    }
}