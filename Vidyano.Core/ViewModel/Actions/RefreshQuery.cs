using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    sealed class RefreshQuery : QueryAction
    {
        public RefreshQuery(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
        }

        public override async Task Execute(object option)
        {
            await Query.RefreshQueryAsync();
        }
    }
}