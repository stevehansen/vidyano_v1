using System;
using System.Linq;
using Vidyano.ViewModel;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Vidyano.Common;

namespace Vidyano.View
{
    public class QueryEx : DependencyObject
    {
        #region SyncSelectedItems

        public static readonly DependencyProperty SyncSelectedItemsProperty = DependencyProperty.RegisterAttached("SyncSelectedItems", typeof(bool), typeof(QueryEx), new PropertyMetadata(false, SyncSelectedItems_Changed));
        private static readonly DependencyProperty SyncSelectedItemsConnectorProperty = DependencyProperty.RegisterAttached("SyncSelectedItemsConnector", typeof(SyncSelectedItemsConnector), typeof(QueryEx), new PropertyMetadata(null));

        public static bool GetSyncSelectedItems(DependencyObject obj)
        {
            return (bool)obj.GetValue(SyncSelectedItemsProperty);
        }

        public static void SetSyncSelectedItems(DependencyObject obj, bool value)
        {
            obj.SetValue(SyncSelectedItemsProperty, value);
        }

        private static SyncSelectedItemsConnector GetSyncSelectedItemsConnector(DependencyObject obj)
        {
            return (SyncSelectedItemsConnector)obj.GetValue(SyncSelectedItemsConnectorProperty);
        }

        private static void SetSyncSelectedItemsConnector(DependencyObject obj, SyncSelectedItemsConnector value)
        {
            obj.SetValue(SyncSelectedItemsConnectorProperty, value);
        }

        private static void SyncSelectedItems_Changed(DependencyObject sender, DependencyPropertyChangedEventArgs e)
        {
            var target = sender as ListViewBase;
            if (target == null)
                return;

            if ((bool)e.NewValue)
                SetSyncSelectedItemsConnector(target, new SyncSelectedItemsConnector(target));
            else
            {
                var connector = GetSyncSelectedItemsConnector(target) as SyncSelectedItemsConnector;
                if (connector != null)
                    connector.Dispose();
            }
        }

        class SyncSelectedItemsConnector : DependencyObject, IDisposable
        {
            private static readonly DependencyProperty QueryProperty = DependencyProperty.Register("Query", typeof(Query), typeof(SyncSelectedItemsConnector), new PropertyMetadata(null, Query_Changed));
            public static readonly DependencyProperty SelectedItemsProperty = DependencyProperty.Register("SelectedItems", typeof(object), typeof(SyncSelectedItemsConnector), new PropertyMetadata(null, Query_SelectedItemsChanged));

            private readonly ListViewBase target;
            private bool skipSync;

            public SyncSelectedItemsConnector(ListViewBase target)
            {
                this.target = target;
                BindingOperations.SetBinding(this, QueryProperty, new Binding { Source = target, Path = new PropertyPath("ItemsSource.Query") });
                BindingOperations.SetBinding(this, SelectedItemsProperty, new Binding { Source = target, Path = new PropertyPath("ItemsSource.Query.SelectedItems") });
            }

            public Query Query
            {
                get { return (Query)GetValue(QueryProperty); }
                set { SetValue(QueryProperty, value); }
            }

            public object SelectedItems
            {
                get { return (object)GetValue(SelectedItemsProperty); }
                set { SetValue(SelectedItemsProperty, value); }
            }

            private static void Query_Changed(DependencyObject sender, DependencyPropertyChangedEventArgs e)
            {
                var connector = sender as SyncSelectedItemsConnector;
                if (connector == null)
                    return;

                var query = e.NewValue as Query;
                if (query == null)
                    return;

                if (connector.target.Parent == null)
                    connector.target.Loaded += connector.Target_Loaded;
                else
                    connector.Setup();

                connector.target.Unloaded += connector.Target_Unloaded;
            }

            private void Target_Loaded(object sender, RoutedEventArgs e)
            {
                target.Loaded -= Target_Loaded;
                Setup();
            }

            private void Target_Unloaded(object sender, RoutedEventArgs e)
            {
                target.Unloaded -= Target_Unloaded;
            }

            private void Target_SelectionChanged(object sender, SelectionChangedEventArgs e)
            {
                if (skipSync)
                    return;

                try
                {
                    skipSync = true;

                    if (e.AddedItems.Count > 0)
                        e.AddedItems.OfType<QueryResultItem>().Run(item => Query.SelectedItems.Add(item));

                    if (e.RemovedItems.Count > 0)
                        e.RemovedItems.OfType<QueryResultItem>().Run(item => Query.SelectedItems.Remove(item));

                    if (Query.SelectedItems.Count > 0 && (Query.Actions.Any(a => a.CanExecute) || Query.PinnedActions.Any(a => a.CanExecute)))
                        Query.IsActionsBarOpen = Query.IsActionsBarSticky = true;
                    else
                        Query.IsActionsBarOpen = Query.IsActionsBarSticky = false;

                }
                finally
                {
                    skipSync = false;
                }
            }

            private void SelectedItems_CollectionChanged(object sender, System.Collections.Specialized.NotifyCollectionChangedEventArgs e)
            {
                if (skipSync)
                    return;

                try
                {
                    skipSync = true;

                    if (e.OldItems != null && e.OldItems.Count > 0)
                        e.OldItems.OfType<QueryResultItem>().Run(item => target.SelectedItems.Remove(item));

                    if (e.NewItems != null && e.NewItems.Count > 0)
                        e.NewItems.OfType<QueryResultItem>().Run(item =>
                            {
                                target.SelectedItems.Add(item);
                            });
                }
                finally
                {
                    skipSync = false;
                }
            }

            private static void Query_SelectedItemsChanged(DependencyObject sender, DependencyPropertyChangedEventArgs e)
            {
                var connector = sender as SyncSelectedItemsConnector;
                if (connector == null)
                    return;

                connector.Sync();
            }

            private void Setup()
            {
                target.SelectionChanged += Target_SelectionChanged;
                Query.SelectedItems.CollectionChanged += SelectedItems_CollectionChanged;
                Sync();
            }

            private void Sync()
            {
                if (skipSync || (target.SelectionMode != ListViewSelectionMode.Extended && target.SelectionMode != ListViewSelectionMode.Multiple))
                    return;

                try
                {
                    skipSync = true;
                    target.SelectedItems.Clear();
                    Query.SelectedItems.Run(item => target.SelectedItems.Add(item));
                }
                finally
                {
                    skipSync = false;
                }
            }

            public void Dispose()
            {
                target.Loaded -= Target_Loaded;
                target.Unloaded -= Target_Unloaded;
                target.SelectionChanged -= Target_SelectionChanged;
                Query.SelectedItems.CollectionChanged -= SelectedItems_CollectionChanged;

                BindingOperations.SetBinding(this, QueryProperty, null);
                BindingOperations.SetBinding(this, SelectedItemsProperty, null);
                SetSyncSelectedItemsConnector(target, null);
            }
        }

        #endregion

        #region AutoLoadItemsAsync

        public static readonly DependencyProperty AutoLoadItemsAsyncProperty = DependencyProperty.RegisterAttached("AutoLoadItemsAsync", typeof(bool), typeof(QueryEx), new PropertyMetadata(false, AutoLoadItemsAsync_Changed));
        private static readonly DependencyProperty AutoLoadItemsAsyncConnectorProperty = DependencyProperty.RegisterAttached("AutoLoadItemsAsyncConnector", typeof(object), typeof(QueryEx), new PropertyMetadata(null));

        public static bool GetAutoLoadItemsAsync(DependencyObject obj)
        {
            return (bool)obj.GetValue(AutoLoadItemsAsyncProperty);
        }

        public static void SetAutoLoadItemsAsync(DependencyObject obj, bool value)
        {
            obj.SetValue(AutoLoadItemsAsyncProperty, value);
        }

        private static object GetAutoLoadItemsAsyncConnector(DependencyObject obj)
        {
            return obj.GetValue(AutoLoadItemsAsyncConnectorProperty);
        }

        private static void SetAutoLoadItemsAsyncConnector(DependencyObject obj, object value)
        {
            obj.SetValue(AutoLoadItemsAsyncConnectorProperty, value);
        }

        private static void AutoLoadItemsAsync_Changed(DependencyObject sender, DependencyPropertyChangedEventArgs e)
        {
            var target = sender as ListViewBase;
            if (target != null)
            {
                if ((bool)e.NewValue)
                {
                    var connector = new AutoLoadItemsAsyncConnector(target);
                    SetAutoLoadItemsAsyncConnector(sender, connector);

                    target.Loaded += connector.Target_Loaded;
                }
                else
                {
                    var connector = GetAutoLoadItemsAsyncConnector(sender) as AutoLoadItemsAsyncConnector;
                    if (connector != null)
                    {
                        target.Unloaded -= connector.Target_Unloaded;
                        SetAutoLoadItemsAsyncConnector(sender, null);
                        connector.ItemsSource = null;
                    }
                }
            }
        }

        class AutoLoadItemsAsyncConnector : DependencyObject
        {
            private static readonly DependencyProperty ItemsSourceProperty = DependencyProperty.Register("ItemsSource", typeof(object), typeof(AutoLoadItemsAsyncConnector), new PropertyMetadata(null, ItemsSource_Changed));
            private readonly ListViewBase target;

            public AutoLoadItemsAsyncConnector(ListViewBase target)
            {
                this.target = target;
            }

            public object ItemsSource
            {
                get { return GetValue(ItemsSourceProperty); }
                set { SetValue(ItemsSourceProperty, value); }
            }

            public void Target_Loaded(object sender, RoutedEventArgs e)
            {
                BindingOperations.SetBinding(this, ItemsSourceProperty, new Binding { Source = target, Path = new PropertyPath("ItemsSource") });
                target.Loaded -= Target_Loaded;
                target.Unloaded += Target_Unloaded;
            }

            public void Target_Unloaded(object sender, RoutedEventArgs e)
            {
                SetAutoLoadItemsAsync(target, false);
            }

            private static async void ItemsSource_Changed(DependencyObject sender, DependencyPropertyChangedEventArgs e)
            {
                var connector = sender as AutoLoadItemsAsyncConnector;
                if (connector != null && e.NewValue != null && e.OldValue != null)
                    await connector.target.LoadMoreItemsAsync();
            }
        }

        #endregion
    }
}