using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Navigation;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using Vidyano.Common;
using Vidyano.ViewModel;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Data;

namespace Vidyano.View.Pages
{
    public partial class HomePage : PhoneApplicationPage
    {
        private Vidyano.ViewModel.Pages.HomePage vm;

        public HomePage()
        {
            InitializeComponent();
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (e.NavigationMode == NavigationMode.Back && Service.Current.IsConnected && e.Uri.OriginalString.Contains("SignInPage.xaml"))
            {
                Client.CurrentClient.SuspendCache();
                Client.CurrentClient.Terminate();
            }
            else if (vm != null)
            {
                vm.Dispose();
                vm = null;
            }

            base.OnNavigatingFrom(e);
        }

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            if (PhoneApplicationFrameEx.NavigatePendingStateRestore())
                return;

            if (Service.Current.IsConnected)
            {
                DataContext = vm = new Vidyano.ViewModel.Pages.HomePage(this);

                await vm.Initialize(e.NavigationMode == NavigationMode.Back);
            }

            base.OnNavigatedTo(e);
        }

        protected override void OnTap(System.Windows.Input.GestureEventArgs e)
        {
            var fe = e.OriginalSource as FrameworkElement;
            if (fe != null)
            {
                var item = fe.DataContext as ProgramUnitItem;
                if (item != null)
                    item.Open();
            }

            base.OnTap(e);
        }
    }
}