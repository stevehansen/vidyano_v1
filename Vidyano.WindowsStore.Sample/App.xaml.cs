using System;
using System.Threading.Tasks;
using Windows.ApplicationModel.Background;

namespace Vidyano.WindowsStore.Sample
{
    /// <summary>
    /// Provides application-specific behavior to supplement the default Application class.
    /// </summary>
    sealed partial class App
    {
#if DEBUG
        //private FirstFloor.XamlSpy.XamlSpyService service;
#endif

        /// <summary>
        /// Initializes the singleton application object.  This is the first line of authored code
        /// executed, and as such is the logical equivalent of main() or WinMain().
        /// </summary>
        public App()
        {
#if DEBUG
            //this.service = new FirstFloor.XamlSpy.XamlSpyService(this) { Password = "12511" };
#endif
            InitializeComponent();
        }

        protected override StoreHooks CreateHooks()
        {
            return new AppHooks();
        }

        protected override void OnWindowCreated(Windows.UI.Xaml.WindowCreatedEventArgs args)
        {
            base.OnWindowCreated(args);

#if DEBUG
            //this.service.StartService();
#endif

            RegisterBackgroundTask();
        }

        private static async void RegisterBackgroundTask()
        {
            try
            {
                var backgroundAccessStatus = await BackgroundExecutionManager.RequestAccessAsync();
                if (backgroundAccessStatus == BackgroundAccessStatus.AllowedMayUseActiveRealTimeConnectivity ||
                    backgroundAccessStatus == BackgroundAccessStatus.AllowedWithAlwaysOnRealTimeConnectivity)
                {
                    foreach (var task in BackgroundTaskRegistration.AllTasks)
                    {
                        if (task.Value.Name == taskName)
                            task.Value.Unregister(true);
                    }

                    var taskBuilder = new BackgroundTaskBuilder();
                    taskBuilder.Name = taskName;
                    taskBuilder.TaskEntryPoint = taskEntryPoint;
                    taskBuilder.SetTrigger(new TimeTrigger(15, false));
                    taskBuilder.Register();
                }
            }
            catch (Exception)
            {
            }
        }

        private const string taskName = "BackgroundTask";
        private const string taskEntryPoint = "Vidyano.WindowsStore.Sample.Background.BackgroundTask";
    }
}
