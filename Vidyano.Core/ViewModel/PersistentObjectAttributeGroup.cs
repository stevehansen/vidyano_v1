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
            IsNameVisible = true;
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

        public bool IsNameVisible { get; internal set; }

        public PersistentObjectAttribute[] Attributes { get; private set; }
    }
}