using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;
using Vidyano.Common;

namespace Vidyano.ViewModel
{
    public abstract class PersistentObjectTab : NotifyableBase
    {
        private object _NavigationTarget;

        protected PersistentObjectTab(string title, PersistentObject parent)
        {
            Title = title;
            Parent = parent;

            Navigate = new Commands.Navigate();
        }

        public ICommand Navigate { get; private set; }

        public object NavigationTarget { get { return _NavigationTarget; } protected set { SetProperty(ref _NavigationTarget, value); } }

        public string Title { get; private set; }

        public PersistentObject Parent { get; private set; }

        internal int Index { get; set; }
    }
}