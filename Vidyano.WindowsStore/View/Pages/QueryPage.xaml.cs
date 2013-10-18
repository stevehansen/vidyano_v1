using Vidyano.ViewModel;
using Windows.ApplicationModel.Search;
using Windows.UI.Xaml.Navigation;

namespace Vidyano.View.Pages
{
    sealed partial class QueryPage
    {
        private Vidyano.ViewModel.Pages.QueryPage vm;

        public QueryPage()
        {
            if (_contentLoaded)
                return;

            _contentLoaded = true;
            global::Windows.UI.Xaml.Application.LoadComponent(this, new global::System.Uri("ms-appx:///Vidyano.WindowsStore/View/Pages/QueryPage.xaml"), global::Windows.UI.Xaml.Controls.Primitives.ComponentResourceLocation.Nested);

            PART_AppBar = (global::Windows.UI.Xaml.Controls.AppBar)this.FindName("PART_AppBar");
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = vm = new Vidyano.ViewModel.Pages.QueryPage(this, Client.CurrentClient.GetCachedObject<StoreQuery>(e.Parameter as string));
            base.OnNavigatedTo(e);
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (vm != null)
            {
                vm.Dispose();
                vm = null;
            }

            if (e.NavigationMode == NavigationMode.Back && Service.Current.IsConnected && e.SourcePageType == typeof(SignInPage))
                e.Cancel = true;
            else if (Client.CurrentClient.HasSearch)
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = false;

            base.OnNavigatingFrom(e);
        }
    }
}