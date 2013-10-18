using System.Windows.Input;
using Windows.UI.ApplicationSettings;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls.Primitives;

namespace Vidyano.View.Pages
{
    public sealed partial class SettingsPage
    {
        public const double PaneWidth = 341d;

        public SettingsPage()
        {
            if (_contentLoaded)
                return;

            GoBack = new SettingsPage.GoBackCommand(this);

            _contentLoaded = true;
            global::Windows.UI.Xaml.Application.LoadComponent(this, new global::System.Uri("ms-appx:///Vidyano.WindowsStore/View/Pages/SettingsPage.xaml"), global::Windows.UI.Xaml.Controls.Primitives.ComponentResourceLocation.Nested);
        }

        public ICommand GoBack { get; private set; }

        class GoBackCommand : ICommand
        {
            private readonly SettingsPage page;

            internal GoBackCommand(SettingsPage page)
            {
                this.page = page;
            }

            public bool CanExecute(object parameter)
            {
                return true;
            }

            public event System.EventHandler CanExecuteChanged = delegate { };

            public void Execute(object parameter)
            {
                var popup = page.Parent as Popup;
                if (popup != null)
                    popup.IsOpen = false;

                SettingsPane.Show();
            }
        }
    }
}