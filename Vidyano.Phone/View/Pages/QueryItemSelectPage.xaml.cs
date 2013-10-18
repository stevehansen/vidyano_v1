using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Navigation;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using System.Text;
using Vidyano.Common;
using Vidyano.ViewModel;
using System.Threading.Tasks;
using Vidyano.View.Controls;

namespace Vidyano.View.Pages
{
    public partial class QueryItemSelectPage : PhoneApplicationPage
    {
        private Vidyano.ViewModel.Pages.QueryItemSelectPage vm;

        public QueryItemSelectPage()
        {
            InitializeComponent();
        }

        protected override void OnNavigatedFrom(NavigationEventArgs e)
        {
            if (vm != null)
            {
                vm.Dispose();
                vm = null;
            }

            base.OnNavigatedFrom(e);
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = vm = new Vidyano.ViewModel.Pages.QueryItemSelectPage(this);

            base.OnNavigatedTo(e);
        }
    }
}