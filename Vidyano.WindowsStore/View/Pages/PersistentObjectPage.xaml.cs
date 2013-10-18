using Vidyano.ViewModel;
using Windows.UI.Xaml.Navigation;

namespace Vidyano.View.Pages
{
    sealed partial class PersistentObjectPage
    {
        private Vidyano.ViewModel.Pages.PersistentObjectPage vm;

        public PersistentObjectPage()
        {
            if (_contentLoaded)
                return;

            _contentLoaded = true;
            global::Windows.UI.Xaml.Application.LoadComponent(this, new global::System.Uri("ms-appx:///Vidyano.WindowsStore/View/Pages/PersistentObjectPage.xaml"), global::Windows.UI.Xaml.Controls.Primitives.ComponentResourceLocation.Nested);

            PART_AppBar = (global::Windows.UI.Xaml.Controls.AppBar)this.FindName("PART_AppBar");
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (e.NavigationMode == NavigationMode.Back && Service.Current.IsConnected && e.SourcePageType == typeof(SignInPage))
                e.Cancel = true;
            else if (vm != null)
            {
                vm.Dispose();
                vm = null;
            }

            base.OnNavigatingFrom(e);
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = vm = new Vidyano.ViewModel.Pages.PersistentObjectPage(this, Client.CurrentClient.GetCachedObject<StorePersistentObject>(e.Parameter as string));
            base.OnNavigatedTo(e);
        }
    }
}