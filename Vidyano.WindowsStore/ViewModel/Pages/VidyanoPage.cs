using System;
using System.Windows.Input;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Vidyano.Commands;
using Vidyano.Common;
using Vidyano.View;

namespace Vidyano.ViewModel.Pages
{
    public abstract class VidyanoPage : NotifyableBase, IDisposable
    {
        protected static readonly DataTemplate EmptyTemplate = new DataTemplate();
        private static readonly GoBack GoBackCommand = new GoBack();
        private static readonly GoHome GoHomeCommand = new GoHome();

        private DataTemplate _Template;
        private ApplicationViewState _ViewState;

        private AppBar bottomBar, topBar;

        internal VidyanoPage(LayoutAwarePage page)
        {
            Page = page;
            Page.SizeChanged += Page_SizeChanged;

            ViewState = ApplicationView.Value;
        }

        protected LayoutAwarePage Page { get; private set; }

        public ICommand GoBack
        {
            get { return GoBackCommand; }
        }

        public ICommand GoHome
        {
            get { return GoHomeCommand; }
        }

        public DataTemplate Template
        {
            get { return _Template; }
            protected set { SetProperty(ref _Template, value); }
        }

        public ApplicationViewState ViewState
        {
            get { return _ViewState; }
            private set { SetProperty(ref _ViewState, value); }
        }

        public virtual void Dispose()
        {
            Page.SizeChanged -= Page_SizeChanged;
        }

        protected virtual void OnApplicationViewStateChanged() {}

        private void Page_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            ViewState = ApplicationView.Value;
            if (ViewState == ApplicationViewState.Snapped)
            {
                if (Page.TopAppBar != null)
                {
                    topBar = Page.TopAppBar;
                    Page.TopAppBar = null;
                }
                if (Page.BottomAppBar != null)
                {
                    bottomBar = Page.BottomAppBar;
                    Page.BottomAppBar = null;
                }
            }
            else if (topBar != null || bottomBar != null)
            {
                Page.TopAppBar = topBar;
                Page.BottomAppBar = bottomBar;

                topBar = null;
                bottomBar = null;
            }

            OnApplicationViewStateChanged();
        }
    }
}