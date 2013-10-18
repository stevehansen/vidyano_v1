using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Windows.Networking.PushNotifications;
using Vidyano.ViewModel;

namespace Vidyano.WindowsStore.Sample
{
    class AppHooks : StoreHooks
    {
        private PushNotificationChannel channel;

        public AppHooks()
        {
            GetChannel();
        }

        private async void GetChannel()
        {
            channel = null;

            try
            {
                channel = await PushNotificationChannelManager.CreatePushNotificationChannelForApplicationAsync();
            }
            catch (Exception ex)
            {
                // Could not create a channel. 
                Debug.WriteLine(ex.Message);
            }
        }

        protected override void OnSessionUpdated(PersistentObject session)
        {
            base.OnSessionUpdated(session);

            if (channel != null)
                session.SetAttributeValue("ChannelUri", channel.Uri);
        }

        protected override async Task OnInitialized()
        {
            await base.OnInitialized();

            if (channel != null)
            {
                var scope = await Service.Current.GetPersistentObjectAsync("Scope");
                scope.SetAttributeValue("ChannelUri", channel.Uri);
                await scope.Save();
            }
        }
    }
}