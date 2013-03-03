using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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