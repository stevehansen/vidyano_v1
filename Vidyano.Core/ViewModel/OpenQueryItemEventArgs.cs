using System.ComponentModel;

namespace Vidyano.ViewModel
{
    public class OpenQueryItemEventArgs : CancelEventArgs
    {
        internal OpenQueryItemEventArgs(QueryResultItem item)
        {
            Item = item;
        }

        public QueryResultItem Item { get; private set; }
    }
}