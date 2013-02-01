using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    class CancelEdit : ActionBase
    {
        public CancelEdit(Definition definition, PersistentObject parent, Query query) :
            base(definition, parent, query)
        {
            CanExecute = parent.IsInEdit;
        }

#pragma warning disable 1998
        public override async Task Execute(object parameter)
#pragma warning restore 1998
        {
            Parent.CancelEdit();
        }
    }
}