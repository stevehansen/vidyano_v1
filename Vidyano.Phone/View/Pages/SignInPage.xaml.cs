using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Navigation;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using System.Globalization;
using Microsoft.Live;
using Vidyano.Common;
using Vidyano.ViewModel;
using System.Text;
using System.Security.Cryptography;
using System.IO.IsolatedStorage;
using System.IO;
using Vidyano.Commands;
using System.Threading;
using System.Windows.Media;

namespace Vidyano.View.Pages
{
    public partial class SignInPage : PhoneApplicationPage
    {
        private Vidyano.ViewModel.Pages.SignInPage vm;

        public SignInPage()
        {
            this.InitializeComponent();
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

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = vm = new Vidyano.ViewModel.Pages.SignInPage(this);

            // For App consistency, clear the entire page stack
            while (Client.RootFrame.RemoveBackEntry() != null) { ; /* do nothing */ }

            if (PhoneApplicationFrameEx.NavigatePendingStateRestore())
                return;

            if (!Service.Current.IsConnected)
                await vm.Connect();
            else
                await vm.RedirectToHomePage();

            base.OnNavigatedTo(e);
        }
    }
}