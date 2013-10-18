using Windows.UI.Xaml.Navigation;

namespace Vidyano.View.Pages
{
    public sealed partial class SignInPage
    {
        private Vidyano.ViewModel.Pages.SignInPage vm;

        public SignInPage()
        {
            if (_contentLoaded)
                return;

            _contentLoaded = true;
            global::Windows.UI.Xaml.Application.LoadComponent(this, new global::System.Uri("ms-appx:///Vidyano.WindowsStore/View/Pages/SignInPage.xaml"), global::Windows.UI.Xaml.Controls.Primitives.ComponentResourceLocation.Nested);
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (!Service.Current.IsConnected)
                e.Cancel = true;
            else if (vm != null)
            {
                vm.Dispose();
                vm = null;
            }

            base.OnNavigatingFrom(e);
        }

        protected async override void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = vm = new Vidyano.ViewModel.Pages.SignInPage(this);
            await vm.Connect();

            base.OnNavigatedTo(e);
        }
    }
}