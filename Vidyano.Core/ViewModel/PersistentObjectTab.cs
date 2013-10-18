using Vidyano.Common;

namespace Vidyano.ViewModel
{
    public abstract class PersistentObjectTab : NotifyableBase
    {
        protected PersistentObjectTab(string title, PersistentObject parent)
        {
            IsActionBarVisible = true;
            Title = title;
            Parent = parent;
        }

        public string Title { get; set; }

        public bool HasTitle
        {
            get
            {
                return !string.IsNullOrEmpty(Title);
            }
        }

        public bool IsActionBarVisible { get; set; }

        public PersistentObject Parent { get; private set; }

        internal int Index { get; set; }
    }
}