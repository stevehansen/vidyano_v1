using System;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using Microsoft.Phone.Controls;
using Newtonsoft.Json.Linq;
using Vidyano.Common;
using Vidyano.ViewModel;
using GestureEventArgs = System.Windows.Input.GestureEventArgs;

namespace Vidyano.View.Controls
{
    public class QueryItemsListBox : ListBox
    {
        public static readonly DependencyProperty QueryProperty = DependencyProperty.Register("Query", typeof(Query), typeof(QueryItemsListBox), new PropertyMetadata(null, QueryChanged));

        public QueryItemsListBox()
        {
            SelectionMode = SelectionMode.Multiple;

            Loaded += QueryItemListBox_Loaded;
            Unloaded += QueryItemListBox_Unloaded;
        }

        public Query Query
        {
            get { return (Query)GetValue(QueryProperty); }
            set { SetValue(QueryProperty, value); }
        }

        private static void QueryChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var list = d as QueryItemsListBox;
            if (list != null)
            {
                list.UnhookEvents(e.OldValue as Query);
                list.HookEvents(e.NewValue as Query);
            }
        }

        private void QueryItemListBox_Loaded(object sender, RoutedEventArgs e)
        {
            HookEvents(Query);
        }

        private void QueryItemListBox_Unloaded(object sender, RoutedEventArgs e)
        {
            UnhookEvents(Query);
        }

        internal void HookEvents(Query query, bool createItemsSource = true)
        {
            if (query != null)
            {
                query.SelectedItems.CollectionChanged += SelectedItems_CollectionChanged;
                if (createItemsSource)
                    ItemsSource = new QueryItemsListBoxItemsSource(query);
            }
        }

        internal void UnhookEvents(Query query, bool dispose = true)
        {
            if (query != null)
                query.SelectedItems.CollectionChanged -= SelectedItems_CollectionChanged;

            var itemsSource = ItemsSource as QueryItemsListBoxItemsSource;
            if (itemsSource != null && dispose)
                itemsSource.Dispose();
        }

        private void SelectedItems_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            if (e.Action == NotifyCollectionChangedAction.Reset && SelectedItems.Count > 0)
                SelectedItems.Clear();
            else if (e.Action == NotifyCollectionChangedAction.Add)
                e.NewItems.OfType<QueryResultItem>().Run(item => SelectedItems.Add(item));
            else if (e.Action == NotifyCollectionChangedAction.Remove)
            {
                e.OldItems.OfType<QueryResultItem>().Run(item =>
                {
                    if (SelectedItems.Contains(item))
                        SelectedItems.Remove(item);
                });
            }
        }

        protected override DependencyObject GetContainerForItemOverride()
        {
            return new QueryItemsListBoxItem(this);
        }

        internal async Task OnItemClicked(QueryResultItem item)
        {
            await Query.InvokeOpenItem(item);
        }
    }

    public class QueryItemsListBoxItem : ListBoxItem
    {
        public static readonly DependencyProperty SelectorVisibilityProperty = DependencyProperty.Register("SelectorVisibility", typeof(Visibility), typeof(QueryItemsListBoxItem), new PropertyMetadata(Visibility.Visible));
        public static readonly DependencyProperty ParentListBoxProperty = DependencyProperty.Register("ParentListBox", typeof(QueryItemsListBox), typeof(QueryItemsListBoxItem), new PropertyMetadata(null));

        public QueryItemsListBoxItem(QueryItemsListBox parent)
        {
            ParentListBox = parent;
            Loaded += QueryItemsListBoxItem_Loaded;

            SetBinding(SelectorVisibilityProperty, new Binding { Converter = new QueryResultItemToSelectorVisibilityConverter() });

            var q = parent.Query as PhoneQuery;
            if (q != null && q.ContextMenuActions.Count > 0)
            {
                var ctxMenu = new ContextMenu();
                q.ContextMenuActions.Run(ctxAction =>
                {
                    var item = new MenuItem { Header = ctxAction.DisplayName };
                    item.Click += async delegate
                    {
                        try
                        {
                            parent.Query.SelectedItems.Clear();

                            var queryResultItem = DataContext as QueryResultItem;
                            if (queryResultItem != null)
                                parent.Query.SelectedItems.Add(queryResultItem);

                            await ctxAction.Execute(-1);
                        }
                        finally
                        {
                            parent.Query.SelectedItems.Clear();
                        }
                    };
                    ctxMenu.Items.Add(item);
                });

                ContextMenuService.SetContextMenu(this, ctxMenu);
            }
        }

        public QueryItemsListBox ParentListBox
        {
            get { return (QueryItemsListBox)GetValue(ParentListBoxProperty); }
            set { SetValue(ParentListBoxProperty, value); }
        }

        public Visibility SelectorVisibility
        {
            get { return (Visibility)GetValue(SelectorVisibilityProperty); }
            set { SetValue(SelectorVisibilityProperty, value); }
        }

        private void QueryItemsListBoxItem_Loaded(object sender, RoutedEventArgs e)
        {
            var item = DataContext as QueryResultItem;
            if (item != null && !(item is QueryItemsListBoxItemsSource.LoadMoreQueryResultItem))
                IsSelected = item.Query.SelectedItems.Contains(item);
        }

        protected override async void OnTap(GestureEventArgs e)
        {
            var item = DataContext as QueryResultItem;
            if (item != null)
            {
                e.Handled = true;

                if (item is QueryItemsListBoxItemsSource.LoadMoreQueryResultItem)
                    await item.Query.GetItemsAsync(item.Query.Count, item.Query.PageSize.GetValueOrDefault(20));
                else
                {
                    var position = e.GetPosition(this);
                    if (item.Query.Actions.Any(a => a.IsVisible && a.HasSelectionRule) && (item.Query.AsLookup || (ParentListBox.SelectionMode != SelectionMode.Single && (position.X <= ActualWidth * 0.1d || item.Query.HasSelectedItems))))
                    {
                        if (!item.Query.SelectedItems.Contains(item))
                            item.Query.SelectedItems.Add(item);
                        else
                            item.Query.SelectedItems.Remove(item);
                    }
                    else
                        await ParentListBox.OnItemClicked(item);
                }
            }
        }

        private class QueryResultItemToSelectorVisibilityConverter : IValueConverter
        {
            public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
            {
                return value is QueryItemsListBoxItemsSource.LoadMoreQueryResultItem ? Visibility.Collapsed : Visibility.Visible;
            }

            public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            {
                throw new NotImplementedException();
            }
        }
    }

    class QueryItemsListBoxItemsSource : ObservableCollection<QueryResultItem>, IDisposable
    {
        private readonly Query query;

        public QueryItemsListBoxItemsSource(Query query)
            :
                base(query)
        {
            this.query = query;
            query.CollectionChanged += Query_CollectionChanged;

            if (query.Count < query.TotalItems)
                Add(new LoadMoreQueryResultItem(query));
        }

        public void Dispose()
        {
            query.CollectionChanged -= Query_CollectionChanged;
        }

        private void Query_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            if (e.Action == NotifyCollectionChangedAction.Reset)
            {
                Clear();
                query.Run(Add);
            }
            else if (e.Action == NotifyCollectionChangedAction.Add)
                e.NewItems.OfType<QueryResultItem>().Run(item => Add(item));
            else if (e.Action == NotifyCollectionChangedAction.Remove)
                e.OldItems.OfType<QueryResultItem>().Run(item => Remove(item));

            this.OfType<LoadMoreQueryResultItem>().ToArray().Run(item => Remove(item));
            if (query.Count < query.TotalItems)
                Add(new LoadMoreQueryResultItem(query));
        }

        public class LoadMoreQueryResultItem : QueryResultItem
        {
            public LoadMoreQueryResultItem(Query query)
                :
                    base(new JObject(new JProperty("id", null)), query) {}
        }
    }
}