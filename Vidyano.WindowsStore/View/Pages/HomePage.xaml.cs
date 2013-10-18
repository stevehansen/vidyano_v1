using Windows.UI.Xaml.Navigation;

namespace Vidyano.View.Pages
{
    sealed partial class HomePage
    {
        private Vidyano.ViewModel.Pages.HomePage vm;

        public HomePage()
        {
            if (_contentLoaded)
                return;

            _contentLoaded = true;
            global::Windows.UI.Xaml.Application.LoadComponent(this, new global::System.Uri("ms-appx:///Vidyano.WindowsStore/View/Pages/HomePage.xaml"), global::Windows.UI.Xaml.Controls.Primitives.ComponentResourceLocation.Nested);
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

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);

            if (Service.Current.IsConnected)
            {
                DataContext = vm = new Vidyano.ViewModel.Pages.HomePage(this);
                await vm.Initialize(e.NavigationMode == NavigationMode.Back);
            }
        }
    }
}