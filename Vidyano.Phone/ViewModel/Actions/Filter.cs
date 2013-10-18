using System.Threading.Tasks;
using System.Windows;
using Vidyano.ViewModel.Pages;

namespace Vidyano.ViewModel.Actions
{
    sealed class Filter : QueryAction
    {
        public Filter(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
            definition.DisplayName = Service.Current.Messages["Search"];
            definition.IsPinned = false;
        }

        public override async Task Execute(object option)
        {
            await Task.Delay(0);

            var searchPage = ((FrameworkElement)Client.RootFrame.Content).DataContext as VidyanoPage;
            if (searchPage != null)
                searchPage.IsSearchOpen = true;
        }
    }
}