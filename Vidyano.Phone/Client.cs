using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.IsolatedStorage;
using System.Linq;
using System.Windows;
using System.Windows.Data;
using System.Windows.Navigation;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Vidyano.Common;
using Vidyano.ViewModel;
using Vidyano.ViewModel.Pages;

namespace Vidyano
{
    public abstract class Client : Application
    {
        private const string sessionStateFilename = "sessionState.jsons";
        private readonly Dictionary<string, object> objects = new Dictionary<string, object>();
        private RootFrameViewModelSynchronizer vmSynchronizer;

        /// <summary>
        ///     Constructor for the Application object.
        /// </summary>
        protected Client()
        {
            // Global handler for uncaught exceptions.
            UnhandledException += Application_UnhandledException;

            InitializeComponent();

            // Phone-specific initialization
            InitializePhoneApplication();

            // Show graphics profiling information while debugging.
            if (Debugger.IsAttached)
            {
                // Display the current frame rate counters.
                Current.Host.Settings.EnableFrameRateCounter = true;

                // Show the areas of the app that are being redrawn in each frame.
                //Application.Current.Host.Settings.EnableRedrawRegions = true;

                // Enable non-production analysis visualization mode,
                // which shows areas of a page that are handed off to GPU with a colored overlay.
                //Application.Current.Host.Settings.EnableCacheVisualization = true;

                // Prevent the screen from turning off while under the debugger by disabling
                // the application's idle detection.
                // Caution:- Use this under debug mode only. Application that disables user idle detection will continue to run
                // and consume battery power when the user is not using the phone.
                PhoneApplicationService.Current.UserIdleDetectionMode = IdleDetectionMode.Disabled;
            }

            vmSynchronizer = new RootFrameViewModelSynchronizer(page => CurrentPage = page);

            Startup += Client_Startup;
        }

        /// <summary>
        ///     Provides easy access to the root frame of the Phone Application.
        /// </summary>
        /// <returns>The root frame of the Phone Application.</returns>
        public static TransitionFrame RootFrame { get; private set; }

        private void Client_Startup(object sender, StartupEventArgs e)
        {
            Service.Current.Hooks = CreateHooks();
            Startup -= Client_Startup;
        }

        private void InitializeComponent()
        {
            var appService = new PhoneApplicationService();
            appService.Launching += Application_Launching;
            appService.Closing += Application_Closing;
            appService.Activated += Application_Activated;
            appService.Deactivated += Application_Deactivated;

            ApplicationLifetimeObjects.Add(appService);
        }

        // Code to execute when the application is launching (eg, from Start)
        // This code will not execute when the application is reactivated
        protected virtual void Application_Launching(object sender, LaunchingEventArgs e) {}

        // Code to execute when the application is activated (brought to foreground)
        // This code will not execute when the application is first launched
        protected virtual void Application_Activated(object sender, ActivatedEventArgs e) {}

        // Code to execute when the application is deactivated (sent to background)
        // This code will not execute when the application is closing
        protected virtual void Application_Deactivated(object sender, DeactivatedEventArgs e)
        {
            SuspendCache();
        }

        // Code to execute when the application is closing (eg, user hit Back)
        // This code will not execute when the application is deactivated
        protected virtual void Application_Closing(object sender, ClosingEventArgs e) {}

        // Code to execute if a navigation fails
        private void RootFrame_NavigationFailed(object sender, NavigationFailedEventArgs e)
        {
            if (Debugger.IsAttached)
            {
                // A navigation has failed; break into the debugger
                Debugger.Break();
            }
        }

        // Code to execute on Unhandled Exceptions
        private void Application_UnhandledException(object sender, ApplicationUnhandledExceptionEventArgs e)
        {
            if (Debugger.IsAttached)
            {
                // An unhandled exception has occurred; break into the debugger
                Debugger.Break();
            }
        }

        #region Properties

        public static Client CurrentClient
        {
            get { return (Client)Current; }
        }

        public VidyanoPage CurrentPage { get; private set; }

        #endregion

        #region Phone application initialization

        // Avoid double-initialization
        private bool phoneApplicationInitialized;

        // Do not add any additional code to this method
        private void InitializePhoneApplication()
        {
            if (phoneApplicationInitialized)
                return;

            // Create the frame but don't set it as RootVisual yet; this allows the splash
            // screen to remain active until the application is ready to render.
            RootFrame = new TransitionFrame();
            RootFrame.Navigated += CompleteInitializePhoneApplication;

            // Handle navigation failures
            RootFrame.NavigationFailed += RootFrame_NavigationFailed;

            // Handle reset requests for clearing the backstack
            RootFrame.Navigated += CheckForResetNavigation;

            //RootFrame.Navigate(new Uri("/Vidyano.Phone;component/View/Pages/MainPage.xaml", UriKind.Relative));

            // Ensure we don't initialize again
            phoneApplicationInitialized = true;
        }

        protected abstract PhoneHooks CreateHooks();

        // Do not add any additional code to this method
        private void CompleteInitializePhoneApplication(object sender, NavigationEventArgs e)
        {
            // Set the root visual to allow the application to render
            if (RootVisual != RootFrame)
                RootVisual = RootFrame;

            // Remove this handler since it is no longer needed
            RootFrame.Navigated -= CompleteInitializePhoneApplication;
        }

        private void CheckForResetNavigation(object sender, NavigationEventArgs e)
        {
            // If the app has received a 'reset' navigation, then we need to check
            // on the next navigation to see if the page stack should be reset
            if (e.NavigationMode == NavigationMode.Reset)
                RootFrame.Navigated += ClearBackStackAfterReset;
        }

        private void ClearBackStackAfterReset(object sender, NavigationEventArgs e)
        {
            // Unregister the event so it doesn't get called again
            RootFrame.Navigated -= ClearBackStackAfterReset;

            // Only clear the stack for 'new' (forward) and 'refresh' navigations
            if (e.NavigationMode != NavigationMode.New && e.NavigationMode != NavigationMode.Refresh)
                return;

            // For UI consistency, clear the entire page stack
            while (RootFrame.RemoveBackEntry() != null)
                ; // do nothing
        }

        #endregion

        #region Object Caching Methods

        internal string AddCachedObject(ViewModelBase o, string pagePath = null)
        {
            o.PreviousState = RootFrame.GetNavigationState();
            o.PagePath = pagePath ?? ("Page-" + RootFrame.BackStack.Count());
            if (pagePath == null)
            {
                var nextPageIndex = RootFrame.BackStack.Count() + 1;
                var nextPageKey = o.PagePath;
                do
                {
                    var forwardStack = objects.Where(fw => fw.Key.StartsWith(nextPageKey)).ToArray();
                    if (forwardStack.Length == 0)
                        break;

                    forwardStack.Run(fw => objects.Remove(fw.Key));
                    nextPageIndex++;
                    nextPageKey = "Page-" + nextPageIndex;
                }
                while (true);
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
            objects.Remove(o.PagePath);

            RootFrame.SetNavigationState(o.PreviousState);
        }

        internal void SuspendCache()
        {
            var state = new JObject();

            state["FrameState"] = RootFrame.GetNavigationState();

            var jObjects = new JObject();
            state["Objects"] = jObjects;

            objects.Values.Run(obj => SerializeCacheObject(jObjects, obj));

            var file = IsolatedStorageFile.GetUserStoreForApplication();
            using (var str = new IsolatedStorageFileStream(sessionStateFilename, FileMode.Create, file))
            using (var strWriter = new StreamWriter(str))
            {
                strWriter.Write(state.ToString(Formatting.None));
                strWriter.Flush();
            }
        }

        private void SerializeCacheObject(JObject jObjects, object obj)
        {
            var po = obj as PersistentObject;
            if (po != null)
            {
                if (po.PagePath == null)
                    throw new ArgumentException("Object has no PagePath.", "obj");

                if (jObjects[po.PagePath] != null)
                    return;

                var jPo = new JObject();
                jPo["Type"] = "PersistentObject";
                jPo["Model"] = po.Model;
                if (po.OwnerQuery != null)
                {
                    if (po.OwnerQuery.PagePath == null)
                        po.OwnerQuery.PagePath = po.PagePath + "_OwnerQuery";

                    jPo["OwnerQuery"] = po.OwnerQuery.PagePath;
                    SerializeCacheObject(jObjects, po.OwnerQuery);
                }
                else if (po.OwnerAttributeWithReference != null)
                {
                    if (po.OwnerAttributeWithReference.Parent.PagePath == null)
                        po.OwnerAttributeWithReference.Parent.PagePath = po.PagePath + "_OwnerAttributeWithReference";

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
                    if (q.PagePath == null)
                        throw new ArgumentException("Query has no PagePath.", "obj");

                    if (jObjects[q.PagePath] != null)
                        return;

                    var jQuery = new JObject();
                    jQuery["Type"] = "Query";
                    jQuery["Model"] = q.Model;
                    if (q.Parent != null)
                    {
                        if (q.Parent.PagePath == null)
                            q.Parent.PagePath = q.PagePath + "_Parent";

                        jQuery["Parent"] = q.Parent.PagePath;
                        SerializeCacheObject(jObjects, q.Parent);
                    }

                    jObjects[q.PagePath] = jQuery;
                }
            }
        }

        internal string ResumeCache()
        {
            string cache = null;
            var file = IsolatedStorageFile.GetUserStoreForApplication();
            try
            {
                if (file.FileExists(sessionStateFilename))
                {
                    using (var str = new IsolatedStorageFileStream(sessionStateFilename, FileMode.Open, file))
                    using (var strReader = new StreamReader(str))
                        cache = strReader.ReadToEnd();
                }
            }
            catch {}

            if (string.IsNullOrEmpty(cache))
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

                file.DeleteFile(sessionStateFilename);

                return (string)state["FrameState"];
            }
            catch {}

            return null;
        }

        #endregion

        #region RootFrameViewModelSynchronizer

        private class RootFrameViewModelSynchronizer : FrameworkElement
        {
            public static readonly DependencyProperty ViewModelProperty = DependencyProperty.Register("ViewModel", typeof(object), typeof(RootFrameViewModelSynchronizer), new PropertyMetadata(null, ViewModel_Changed));
            private readonly Action<VidyanoPage> pageChanged;

            public RootFrameViewModelSynchronizer(Action<VidyanoPage> pageChanged)
            {
                this.pageChanged = pageChanged;
                SetBinding(ViewModelProperty, new Binding("Content.DataContext") { Source = RootFrame });
            }

            public object ViewModel
            {
                get { return GetValue(ViewModelProperty); }
                set { SetValue(ViewModelProperty, value); }
            }

            private static void ViewModel_Changed(DependencyObject d, DependencyPropertyChangedEventArgs e)
            {
                var synchronizer = (RootFrameViewModelSynchronizer)d;
                synchronizer.pageChanged(e.NewValue as VidyanoPage);
            }
        }

        #endregion
    }
}