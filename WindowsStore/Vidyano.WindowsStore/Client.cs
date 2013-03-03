using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.Common;
using Vidyano.View;
using Vidyano.ViewModel;
using Windows.ApplicationModel;
using Windows.ApplicationModel.Activation;
using Windows.ApplicationModel.Search;
using Windows.Foundation;
using Windows.Security.Credentials;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;
using Windows.UI.ApplicationSettings;
using Windows.UI.Core;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano
{
    public abstract class Client : Application
    {
        protected Client()
        {
            this.Suspending += OnSuspending;
            this.UnhandledException += OnUnhandledException;
        }

        public static Client CurrentClient
        {
            get
            {
                return (Client)Client.Current;
            }
        }

        public Service Service { get; private set; }

        internal CoreDispatcher Dispatcher { get; private set; }

        internal string GlobalSearchQueryText { get; private set; }

        public Hooks Hooks { get; protected set; }

        internal bool HasSearch { get; private set; }

        protected override async void OnLaunched(LaunchActivatedEventArgs args)
        {
            base.OnLaunched(args);

            await Initialize(args);
        }

        private async Task Initialize(IActivatedEventArgs args)
        {
            Service = (Service)Resources["☁"];
            if (Service == null)
                throw new Exception("Failed to locate Service resource.");

            NotifyableBase.UIDispatcher = Window.Current.Dispatcher;
            var rootFrame = Window.Current.Content as Frame;

            string cache = null;
            if (rootFrame == null)
            {
                rootFrame = new Frame();
                rootFrame.Navigated += async (_, __) => await LaunchPendingGlobalSearchQuery();

                //#if !DEBUG
                if (args.PreviousExecutionState == ApplicationExecutionState.Terminated)
                    //#endif
                    cache = await Service.Current.LoadCache();

                Window.Current.Content = rootFrame;
            }

            if (rootFrame.Content == null)
                rootFrame.Navigate(typeof(SignInPage), cache);

            Window.Current.Activate();
        }

        private void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Hooks.ShowNotification(e.Message, NotificationType.Error);
            e.Handled = true;
        }

        private static async void OnSuspending(object sender, SuspendingEventArgs e)
        {
            var deferral = e.SuspendingOperation.GetDeferral();

            Service.Current.CancelPendingServiceCalls();
            await Service.Current.SuspendCache();

            deferral.Complete();
        }

        protected override async void OnSearchActivated(SearchActivatedEventArgs args)
        {
            base.OnSearchActivated(args);
            await Initialize(args);

            if (!string.IsNullOrEmpty(args.QueryText))
                await HandleSearch(args.QueryText, true);
        }

        protected override void OnWindowCreated(WindowCreatedEventArgs args)
        {
            Dispatcher = Window.Current.Dispatcher;

            try
            {
                // Register QuerySubmitted handler for the window at window creation time and only registered once so that the app can receive user queries at any time.
                SearchPane.GetForCurrentView().QuerySubmitted += SearchQuerySubmitted;

                HasSearch = true;
            }
            catch
            {
                HasSearch = false;
            }

            // Register SettingsPane handler for the application.
            SettingsPane.GetForCurrentView().CommandsRequested += SettingsCommandsRequested;
        }

        private async void SearchQuerySubmitted(object sender, SearchPaneQuerySubmittedEventArgs args)
        {
            await HandleSearch(args.QueryText);
        }

        private void SettingsCommandsRequested(SettingsPane sender, SettingsPaneCommandsRequestedEventArgs args)
        {
            Hooks.OnSettingsCommandsRequested(args.Request.ApplicationCommands);
        }

        private async Task HandleSearch(string text, bool global = false)
        {
            var frame = Window.Current.Content as Frame;
            if (frame != null)
            {
                var queryPage = frame.Content as QueryPage;
                var queryItemSelectPage = frame.Content as QueryItemSelectPage;
                if (global || (queryPage == null && queryItemSelectPage == null))
                {
                    GlobalSearchQueryText = text;
                    await LaunchPendingGlobalSearchQuery();
                }
                else
                {
                    if (queryPage != null)
                        await queryPage.Query.SearchTextAsync(text);
                    else if (queryItemSelectPage != null)
                        await queryItemSelectPage.Lookup.SearchTextAsync(text);
                }
            }
        }

        internal async Task LaunchPendingGlobalSearchQuery()
        {
            if (!string.IsNullOrEmpty(GlobalSearchQueryText) && Service.Application != null)
            {
                string err = null;
                try
                {
                    await new Commands.Navigate().Execute(Service.Current.GetPersistentObjectAsync(Service.Application["GlobalSearchId"].DisplayValue, GlobalSearchQueryText));

                    GlobalSearchQueryText = null;
                }
                catch (Exception e)
                {
                    err = e.Message;
                }

                if (!string.IsNullOrEmpty(err))
                    ((Client)Current).Hooks.ShowNotification(err, NotificationType.Error);
            }
        }
    }
}