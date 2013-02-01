using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.Common;

namespace Vidyano.ViewModel
{
    public sealed class PersistentObjectAttributeGroup : NotifyableBase
    {
        private string _Name;

        internal PersistentObjectAttributeGroup(string name, PersistentObjectAttribute[] attributes)
        {
            _Name = name;
            Attributes = attributes;
            Attributes.Run(attr => attr.Group = this);
        }

        public string Name
        {
            get
            {
                if (string.IsNullOrEmpty(_Name))
                    _Name = Service.Current.Messages["DefaultAttributesGroup"];

                return _Name;
            }
        }

        public PersistentObjectAttribute[] Attributes { get; private set; }
    }
}