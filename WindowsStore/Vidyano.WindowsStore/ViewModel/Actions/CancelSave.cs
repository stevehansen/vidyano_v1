using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    class CancelSave : ActionBase
    {
        public CancelSave(Definition definition, PersistentObject parent, Query query) :
            base(definition, parent, query)
        {
        }

#pragma warning disable 1998
        public override async Task Execute(object option)
#pragma warning restore 1998
        {
            Service.Current.CloseCachedObject(Parent);
        }
    }
}