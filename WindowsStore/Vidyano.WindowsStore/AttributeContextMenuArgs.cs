using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel;
using Windows.UI.Popups;

namespace Vidyano
{
    public sealed class AttributeContextMenuArgs
    {
        internal AttributeContextMenuArgs(PersistentObjectAttribute attribute)
        {
            Attribute = attribute;
            Commands = new List<UICommand>();
        }

        public PersistentObjectAttribute Attribute { get; private set; }
        
        public List<UICommand> Commands { get; private set; }

        public bool AutoExecuteFirst { get; set; }
    }
}