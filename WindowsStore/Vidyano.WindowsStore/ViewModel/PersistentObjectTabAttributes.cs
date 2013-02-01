using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.Common;

namespace Vidyano.ViewModel
{
    public sealed class PersistentObjectTabAttributes : PersistentObjectTab
    {
        internal PersistentObjectTabAttributes(PersistentObjectAttribute[] attributes, string title, PersistentObject parent)
            : base(title, parent)
        {
            Attributes = attributes;
        }

        public PersistentObjectAttribute[] Attributes { get; private set; }

        public PersistentObjectAttribute this[string name]
        {
            get
            {
                var matchingAttr = Attributes.FirstOrDefault(attr => attr.Name == name);
                if (matchingAttr != null)
                    return matchingAttr;

                return null;
            }
        }
    }
}