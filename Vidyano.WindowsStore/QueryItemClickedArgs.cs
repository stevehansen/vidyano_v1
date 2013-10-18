using System.ComponentModel;
using Vidyano.ViewModel;

namespace Vidyano
{
    public sealed class QueryItemClickedArgs: CancelEventArgs
    {
        internal QueryItemClickedArgs(QueryResultItem item)
        {
            Item = item;
        }

        public QueryResultItem Item { get; private set; }
    }
}