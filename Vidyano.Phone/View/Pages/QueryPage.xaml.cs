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
using Vidyano.View;

namespace Vidyano.View.Pages
{
    public partial class QueryPage : PhoneApplicationPage
    {
        private Vidyano.ViewModel.Pages.QueryPage vm;

        public QueryPage()
        {
            InitializeComponent();
        }

        protected override void OnRemovedFromJournal(JournalEntryRemovedEventArgs e)
        {
            if (vm != null)
            {
                vm.Dispose();
                vm = null;
            }

            base.OnRemovedFromJournal(e);

            if (Client.RootFrame.BackStack.Count() < 1 && Settings.Current.StartupPageType == Settings.StartupPageTypeEnum.QueryPage)
                Application.Current.Terminate();
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            if (PhoneApplicationFrameEx.NavigatePendingStateRestore())
                return;

            if(vm == null)
                vm = new Vidyano.ViewModel.Pages.QueryPage(this, Client.CurrentClient.GetCachedObject<Query>(NavigationContext.QueryString["id"]));


            DataContext = vm;

            base.OnNavigatedTo(e);
        }
    }
}