using Windows.ApplicationModel.Search;
using Windows.UI.Xaml.Navigation;

namespace Vidyano.View.Pages
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class QueryItemSelectPage
    {
        private Vidyano.ViewModel.Pages.QueryItemSelectPage vm;

        public QueryItemSelectPage()
        {
            if (_contentLoaded)
                return;

            _contentLoaded = true;
            global::Windows.UI.Xaml.Application.LoadComponent(this, new global::System.Uri("ms-appx:///Vidyano.WindowsStore/View/Pages/QueryItemSelectPage.xaml"), global::Windows.UI.Xaml.Controls.Primitives.ComponentResourceLocation.Nested);
        }

        protected async override void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = vm = new Vidyano.ViewModel.Pages.QueryItemSelectPage(this);
            await vm.Initialize(e.Parameter as string);
        }

        protected override void OnNavigatedFrom(NavigationEventArgs e)
        {
            if (Client.CurrentClient.HasSearch)
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = false;

            if (vm != null)
            {
                vm.Dispose();
                vm = null;
            }
        }
    }
}