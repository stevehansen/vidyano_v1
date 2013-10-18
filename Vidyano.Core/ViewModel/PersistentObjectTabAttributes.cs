using System.Linq;

namespace Vidyano.ViewModel
{
    public class PersistentObjectTabAttributes : PersistentObjectTab
    {
        internal PersistentObjectTabAttributes(PersistentObjectAttribute[] attributes, string title, PersistentObject parent)
            : base(title, parent)
        {
            Attributes = attributes;
            Groups = Attributes.Where(a => a.IsVisible).GroupBy(a => a.Group).Select(g => g.Key).ToArray();
        }

        public PersistentObjectAttribute[] Attributes { get; private set; }

        public PersistentObjectAttributeGroup[] Groups { get; private set; }

        public PersistentObjectAttribute this[string name]
        {
            get
            {
                return Attributes.FirstOrDefault(attr => attr.Name == name);
            }
        }
    }
}