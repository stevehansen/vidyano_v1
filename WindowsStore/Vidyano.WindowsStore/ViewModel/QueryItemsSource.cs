using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml.Data;

namespace Vidyano.ViewModel
{
    public class QueryItemsSource : ObservableCollection<QueryResultItem>, ISupportIncrementalLoading
    {
        internal QueryItemsSource(Query query)
        {
            Query = query;
            foreach (var item in query)
            {
                Add(item);
            }
        }

        public Query Query { get; private set; }

        public bool HasMoreItems
        {
            get
            {
                return Count < Query.TotalItems || !Query.HasSearched;
            }
        }

        public Windows.Foundation.IAsyncOperation<LoadMoreItemsResult> LoadMoreItemsAsync(uint count)
        {
            return Query.GetItemsAsync(Count, (int)count).ContinueWith(t =>
            {
                for (int i = 0; i < t.Result.Length; i++)
                {
                    Add(t.Result[i]);
                }

                return new LoadMoreItemsResult { Count = (uint)t.Result.Length };
            }, TaskScheduler.FromCurrentSynchronizationContext()).AsAsyncOperation();
        }
    }
}