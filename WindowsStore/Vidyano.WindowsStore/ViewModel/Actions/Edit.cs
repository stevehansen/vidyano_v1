using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    class Edit : ActionBase
    {
        public Edit(Definition definition, PersistentObject parent, Query query) :
            base(definition, parent, query)
        {
        }

        internal override Definition[] DependentActions
        {
            get
            {
                return new[] { Service.Current.Actions["EndEdit"], Service.Current.Actions["CancelEdit"] };
            }
        }

#pragma warning disable 1998
        public override async Task Execute(object parameter)
#pragma warning restore 1998
        {
            Parent.Edit();
        }
    }
}