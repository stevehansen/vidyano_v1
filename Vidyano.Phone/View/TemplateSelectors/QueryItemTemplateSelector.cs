using System.Windows;
using Vidyano.View.Controls;
using Vidyano.ViewModel;

namespace Vidyano.View.TemplateSelectors
{
    public sealed class QueryItemTemplateSelector : IDataTemplateSelector
    {
        public DataTemplate SelectTemplate(object obj, DependencyObject container)
        {
            var item = obj as QueryResultItem;
            if (obj is QueryItemsListBoxItemsSource.LoadMoreQueryResultItem)
            {
                if (!Service.Current.IsBusy)
#pragma warning disable 4014
                    item.Query.GetItemsAsync(item.Query.Count, item.Query.PageSize.GetValueOrDefault(20));
#pragma warning restore 4014
                return (DataTemplate)Application.Current.Resources["LoadingMoreQueryItems"];
            }

            return (item != null ? (DataTemplate)Application.Current.Resources["QueryItemTemplate." + item.Query.PersistentObject.Type] : null) ?? (DataTemplate)Application.Current.Resources["QueryItemTemplate.Default"];
        }
    }
}