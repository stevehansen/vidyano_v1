using System.Collections.Generic;
using Vidyano.ViewModel;

namespace Vidyano
{
    public sealed class AttributeContextMenuArgs
    {
        internal AttributeContextMenuArgs(PersistentObjectAttribute attribute)
        {
            Attribute = attribute;
            Commands = new List<AttributeContextMenuCommand>();
        }

        public PersistentObjectAttribute Attribute { get; private set; }

        public List<AttributeContextMenuCommand> Commands { get; private set; }

        public bool AutoExecuteFirst { get; set; }
    }
}