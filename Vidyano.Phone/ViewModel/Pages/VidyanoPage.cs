using System;
using System.ComponentModel;
using System.Windows;
using System.Windows.Input;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using Vidyano.Commands;
using Vidyano.Common;

namespace Vidyano.ViewModel.Pages
{
    public abstract class VidyanoPage : NotifyableBase, IDisposable
    {
        private bool _IsSearchOpen;
        private PageOrientation _Orientation;

        protected VidyanoPage(PhoneApplicationPage page)
        {
            Page = page;
            Orientation = page.Orientation;

            Search = new SimpleActionCommand(e =>
            {
                IsSearchOpen = false;
                OnSearch(e as string);
            });

            page.Loaded += Page_Loaded;
            page.Unloaded += Page_Unloaded;
        }

        protected internal PhoneApplicationPage Page { get; private set; }

        public bool IsSearchOpen
        {
            get { return _IsSearchOpen; }
            set { SetProperty(ref _IsSearchOpen, value); }
        }

        public ICommand Search { get; private set; }

        public PageOrientation Orientation
        {
            get { return _Orientation; }
            set { SetProperty(ref _Orientation, value); }
        }

        public virtual void Dispose() {}

        private void Page_Loaded(object sender, RoutedEventArgs e)
        {
            Service.Current.PropertyChanged += Service_PropertyChanged;
            Page.OrientationChanged += Page_OrientationChanged;
            SystemTray.SetProgressIndicator(Page, new ProgressIndicator
                                                  {
                                                      IsVisible = Service.Current.IsBusy,
                                                      IsIndeterminate = true,
                                                  });
        }

        private void Page_Unloaded(object sender, RoutedEventArgs e)
        {
            Service.Current.PropertyChanged -= Service_PropertyChanged;
            Page.OrientationChanged -= Page_OrientationChanged;
        }

        private void Service_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == "IsBusy")
                SystemTray.GetProgressIndicator(Page).IsVisible = Service.Current.IsBusy;
        }

        private void Page_OrientationChanged(object sender, OrientationChangedEventArgs e)
        {
            Orientation = e.Orientation;
        }

        protected virtual void OnSearch(string searchText) {}
    }
}