using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Threading.Tasks;
using Windows.Foundation;
using Windows.Storage;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.Controls
{
    public class AppBarUserButton : Button
    {
        private const string userPictureFileName = "UserPicture.dat";

        public static readonly DependencyProperty FirstNamePartProperty = DependencyProperty.Register("FirstNamePart", typeof(string), typeof(AppBarUserButton), new PropertyMetadata(null));
        public static readonly DependencyProperty SecondNamePartProperty = DependencyProperty.Register("SecondNamePart", typeof(string), typeof(AppBarUserButton), new PropertyMetadata(null));
        public static readonly DependencyProperty SecondNamePartVisibilityProperty = DependencyProperty.Register("SecondNamePartVisibility", typeof(Visibility), typeof(AppBarUserButton), new PropertyMetadata(Visibility.Collapsed));

        public AppBarUserButton()
        {
            DefaultStyleKey = typeof(AppBarUserButton);

            if (!Service.Current.IsConnected)
                return;

            if (!Service.Current.IsUsingDefaultCredentials)
            {
                var name = (string)Service.Current.Application["FriendlyUserName"].Value;
                if (!string.IsNullOrEmpty(name))
                {
                    var nameParts = name.Split(new[] { ' ' }, 2);
                    FirstNamePart = nameParts[0];
                    if (nameParts.Length == 2)
                    {
                        SecondNamePart = nameParts[1];
                        SecondNamePartVisibility = Windows.UI.Xaml.Visibility.Visible;
                    }
                }
            }
            else
                FirstNamePart = Service.Current.Messages["SignIn"];

            this.Click += AppBarUserButton_Click;
        }

        protected override void OnPointerEntered(Windows.UI.Xaml.Input.PointerRoutedEventArgs e)
        {
            VisualStateManager.GoToState(this, "PointerOver", true);
            base.OnPointerEntered(e);
        }

        protected override void OnPointerExited(Windows.UI.Xaml.Input.PointerRoutedEventArgs e)
        {
            VisualStateManager.GoToState(this, "Normal", true);
            base.OnPointerExited(e);
        }

        public string FirstNamePart
        {
            get { return (string)GetValue(FirstNamePartProperty); }
            set { SetValue(FirstNamePartProperty, value); }
        }

        public string SecondNamePart
        {
            get { return (string)GetValue(SecondNamePartProperty); }
            set { SetValue(SecondNamePartProperty, value); }
        }

        public Visibility SecondNamePartVisibility
        {
            get { return (Visibility)GetValue(SecondNamePartVisibilityProperty); }
            set { SetValue(SecondNamePartVisibilityProperty, value); }
        }

        private async void AppBarUserButton_Click(object sender, RoutedEventArgs e)
        {
            if (Service.Current.IsUsingDefaultCredentials)
            {
                await Service.Current.SignOut();
                return;
            }

            var popupMenu = new PopupMenu();
            popupMenu.Commands.Add(new UICommand(Service.Current.IsUsingDefaultCredentials ? Service.Current.Messages["SignIn"] : Service.Current.Messages["SignOut"], async cmd => await Service.Current.SignOut()));

            var position = this.TransformToVisual(null).TransformPoint(new Point(0, 0));
            await popupMenu.ShowForSelectionAsync(new Rect(position, new Size(ActualWidth, ActualHeight)), Placement.Below);
        }

        internal static async Task<object> UserPictureFromUrl(string url)
        {
            try
            {
                var file = await ApplicationData.Current.LocalFolder.GetFileAsync(userPictureFileName);
                if (file != null)
                    return Service.Current.Hooks.ByteArrayToImageSource(new MemoryStream((await FileIO.ReadBufferAsync(file)).ToArray()));
            }
            catch { }

            if (!string.IsNullOrEmpty(url))
            {
                try
                {
                    var bytes = await new HttpClient().GetByteArrayAsync(url);
                    var result = Service.Current.Hooks.ByteArrayToImageSource(new MemoryStream(bytes));

                    await FileIO.WriteBytesAsync(await ApplicationData.Current.LocalFolder.CreateFileAsync(userPictureFileName, CreationCollisionOption.ReplaceExisting), bytes);

                    return result;
                }
                catch { }
            }

            return Service.Current.Hooks.ByteArrayToImageSource(new MemoryStream(Convert.FromBase64String((string)Application.Current.Resources["DefaultUserPicture"])));
        }

        internal static async Task RemoveUserPicture()
        {
            try
            {
                var file = await ApplicationData.Current.LocalFolder.GetFileAsync(userPictureFileName);
                if (file != null)
                    await file.DeleteAsync();
            }
            catch { }
        }
    }
}