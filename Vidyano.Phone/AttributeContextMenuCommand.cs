using System;
using Vidyano.ViewModel;

namespace Vidyano
{
    public class AttributeContextMenuCommand
    {
        public AttributeContextMenuCommand(string text, Action<PersistentObjectAttribute> action)
        {
            Text = text;
            Action = action;
        }

        public string Text { get; private set; }

        internal Action<PersistentObjectAttribute> Action { get; private set; }
    }
}