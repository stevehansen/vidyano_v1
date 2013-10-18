using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Windows.ApplicationModel;
using Windows.ApplicationModel.Activation;
using Windows.ApplicationModel.Search;
using Windows.Storage;
using Windows.UI.ApplicationSettings;
using Windows.UI.Core;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Vidyano.Commands;
using Vidyano.Common;
using Vidyano.ViewModel;
using Vidyano.ViewModel.Pages;
using SignInPage = Vidyano.View.Pages.SignInPage;

namespace Vidyano
{
    public abstract class Client : Application
    {
        private string cache;

        protected Client()
        {
            Suspending += OnSuspending;
            UnhandledException += OnUnhandledException;
        }

        public static Client CurrentClient
        {
            get { return (Client)Current; }
        }

        public Service Service { get; private set; }

        internal CoreDispatcher Dispatcher { get; private set; }

        internal string GlobalSearchQueryText { get; private set; }

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

            Service.Current.Hooks = CreateHooks();

            var rootFrame = Window.Current.Content as Frame;
            if (rootFrame == null)
            {
                rootFrame = new Frame();
                rootFrame.Navigated += async (_, __) => await LaunchPendingGlobalSearchQuery();

                if (args.PreviousExecutionState == ApplicationExecutionState.Terminated)
                    cache = await LoadCache();

                Window.Current.Content = rootFrame;
            }

            if (rootFrame.Content == null)
                rootFrame.Navigate(typeof(SignInPage));

            Window.Current.Activate();
        }

        protected abstract StoreHooks CreateHooks();

        private static async void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            await Service.Current.Hooks.ShowNotification(e.Message, NotificationType.Error);
            e.Handled = true;
        }

        private async void OnSuspending(object sender, SuspendingEventArgs e)
        {
            var deferral = e.SuspendingOperation.GetDeferral();

            Service.Current.CancelPendingServiceCalls();
            await SuspendCache();

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

        private static void SettingsCommandsRequested(SettingsPane sender, SettingsPaneCommandsRequestedEventArgs args)
        {
            ((StoreHooks)Service.Current.Hooks).OnSettingsCommandsRequested(args.Request.ApplicationCommands);
        }

        private async Task HandleSearch(string text, bool global = false)
        {
            var frame = Window.Current.Content as Frame;
            if (frame != null)
            {
                var searchPage = ((Page)frame.Content).DataContext as ISearchPage;
                if (global || searchPage == null)
                {
                    GlobalSearchQueryText = text;
                    await LaunchPendingGlobalSearchQuery();
                }
                else
                    await searchPage.Search(text);
            }
        }

        internal async Task LaunchPendingGlobalSearchQuery()
        {
            if (!string.IsNullOrEmpty(GlobalSearchQueryText) && Service.Application != null)
            {
                string err = null;
                try
                {
                    await new Navigate().Execute(Service.Current.GetPersistentObjectAsync(Service.Application["GlobalSearchId"].DisplayValue, GlobalSearchQueryText));

                    GlobalSearchQueryText = null;
                }
                catch (Exception e)
                {
                    err = e.Message;
                }

                if (!string.IsNullOrEmpty(err))
                    await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
            }
        }

        #region Object Caching Methods

        private const string sessionStateFilename = "sessionState.jsons";
        private readonly Dictionary<string, object> objects = new Dictionary<string, object>();

        internal string AddCachedObject(ViewModelBase o)
        {
            var frame = (Frame)Window.Current.Content;
            o.PreviousState = frame.GetNavigationState();
            o.PagePath = "Page-" + frame.BackStackDepth;

            var nextPageIndex = frame.BackStackDepth + 1;
            var nextPageKey = o.PagePath;
            while (objects.Remove(nextPageKey))
            {
                objects.Remove(nextPageKey + "_Parent");

                nextPageIndex++;
                nextPageKey = "Page-" + nextPageIndex;
            }

            objects[o.PagePath] = o;

            return o.PagePath;
        }

        internal T GetCachedObject<T>(string key) where T : class
        {
            object o;
            objects.TryGetValue(key, out o);

            return o as T;
        }

        internal void CloseCachedObject(ViewModelBase o)
        {
            var frame = (Frame)Window.Current.Content;

            objects.Remove(o.PagePath);

            frame.SetNavigationState(o.PreviousState);
        }

        internal async Task SuspendCache()
        {
            var state = new JObject();

            state["FrameState"] = ((Frame)Window.Current.Content).GetNavigationState();

            var jObjects = new JObject();
            state["Objects"] = jObjects;

            objects.Values.Run(obj => SerializeCacheObject(jObjects, obj));

            var file = await ApplicationData.Current.LocalFolder.CreateFileAsync(sessionStateFilename, CreationCollisionOption.ReplaceExisting);
            using (var sw = new StreamWriter(await file.OpenStreamForWriteAsync()))
            {
                sw.Write(state.ToString(Formatting.None));
                await sw.FlushAsync();
            }
        }

        private static void SerializeCacheObject(JObject jObjects, object obj)
        {
            var po = obj as PersistentObject;
            if (po != null)
            {
                if (jObjects[po.PagePath] != null)
                    return;

                var jPo = new JObject();
                jPo["Type"] = "PersistentObject";
                jPo["Model"] = po.Model;
                if (po.OwnerQuery != null)
                {
                    jPo["OwnerQuery"] = po.OwnerQuery.PagePath;
                    SerializeCacheObject(jObjects, po.OwnerQuery);
                }
                else if (po.OwnerAttributeWithReference != null)
                {
                    jPo["OwnerAttributeWithReference"] = new JObject(new JProperty("Parent", po.OwnerAttributeWithReference.Parent), new JProperty("Name", po.OwnerAttributeWithReference.Name));
                    SerializeCacheObject(jObjects, po.OwnerAttributeWithReference.Parent);
                }

                jObjects[po.PagePath] = jPo;
            }
            else
            {
                var q = obj as Query;
                if (q != null)
                {
                    if (jObjects[q.PagePath] != null)
                        return;

                    var jQuery = new JObject();
                    jQuery["Type"] = "Query";
                    jQuery["Model"] = q.Model;
                    if (q.Parent != null)
                    {
                        if (q.Parent.PagePath == null)
                        {
                            q.Parent.PagePath = q.PagePath + "_Parent";
                            SerializeCacheObject(jObjects, q.Parent);
                        }

                        jQuery["Parent"] = q.Parent.PagePath;
                    }

                    jObjects[q.PagePath] = jQuery;
                }
            }
        }

        internal async Task<string> LoadCache()
        {
            try
            {
                var file = await ApplicationData.Current.LocalFolder.GetFileAsync(sessionStateFilename);
                if (file != null)
                {
                    using (var sr = new StreamReader(await file.OpenStreamForReadAsync()))
                        return sr.ReadToEnd();
                }
            }
            catch {}

            return null;
        }

        internal async Task<string> ResumeCache()
        {
            if (cache == null)
                return null;

            try
            {
                var state = JObject.Parse(cache);

                ((JObject)state["Objects"]).Properties().Run(p =>
                {
                    if ((string)p.Value["Type"] == "PersistentObject")
                    {
                        var po = Service.Current.Hooks.OnConstruct((JObject)p.Value["Model"]);
                        po.PagePath = p.Name;
                        objects[p.Name] = po;

                        var ownerQueryPath = (string)p.Value["OwnerQuery"];
                        if (ownerQueryPath != null)
                            po.OwnerQuery = (Query)objects[ownerQueryPath];

                        var ownerAttributeWithReferencePath = (JObject)p.Value["OwnerAttributeWithReference"];
                        if (ownerAttributeWithReferencePath != null)
                        {
                            var ownerObject = (PersistentObject)objects[(string)ownerAttributeWithReferencePath["Parent"]];
                            po.OwnerAttributeWithReference = ownerObject.GetAttribute((string)ownerAttributeWithReferencePath["Name"]) as PersistentObjectAttributeWithReference;
                        }
                    }
                    else if ((string)p.Value["Type"] == "Query")
                    {
                        var parentPath = (string)p.Value["Parent"];
                        PersistentObject parent = null;

                        if (!string.IsNullOrEmpty(parentPath))
                            parent = (PersistentObject)objects[parentPath];

                        var q = Service.Current.Hooks.OnConstruct((JObject)p.Value["Model"], parent, false);
                        q.PagePath = p.Name;
                        objects[p.Name] = q;
                    }
                });

                var file = await ApplicationData.Current.LocalFolder.GetFileAsync(sessionStateFilename);
                if (file != null)
                {
                    await file.DeleteAsync();
                    cache = null;
                }

                return (string)state["FrameState"];
            }
            catch {}

            return null;
        }

        #endregion
    }
}