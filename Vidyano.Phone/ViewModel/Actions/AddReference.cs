using System;
using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    sealed class AddReference : QueryAction
    {
        public AddReference(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
        }

        public override async Task Execute(object option)
        {
            await Task.Delay(0);

            if (Query.PagePath == null)
                Client.CurrentClient.AddCachedObject(Query);

            Client.RootFrame.Navigate(new Uri("/Vidyano.Phone;component/View/Pages/QueryItemSelectPage.xaml?query=" + Query.PagePath, UriKind.Relative));
        }
    }
}