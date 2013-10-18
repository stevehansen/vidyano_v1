using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Navigation;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using Vidyano.ViewModel;
using Vidyano.View;
using Vidyano.Common;

namespace Vidyano.View.Pages
{
    public partial class PersistentObjectPage : PhoneApplicationPage
    {
        private Vidyano.ViewModel.Pages.PersistentObjectPage vm;

        public PersistentObjectPage()
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

            if (Client.RootFrame.BackStack.Count() < 1 && Settings.Current.StartupPageType == Settings.StartupPageTypeEnum.PersistenObjectPage)
                Application.Current.Terminate();
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            if (PhoneApplicationFrameEx.NavigatePendingStateRestore())
                return;

            if(vm == null)
                vm = new Vidyano.ViewModel.Pages.PersistentObjectPage(this, (PhonePersistentObject)Client.CurrentClient.GetCachedObject<PersistentObject>(NavigationContext.QueryString["id"]));

            DataContext = vm;

            base.OnNavigatedTo(e);
        }
    }
}