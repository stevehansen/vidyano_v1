using System;
using System.Collections.Generic;
using System.IO;
using System.IO.IsolatedStorage;
using System.Linq;
using System.Net.NetworkInformation;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Navigation;
using Microsoft.Live;
using Microsoft.Phone.Controls;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Vidyano.Commands;
using Vidyano.Common;

namespace Vidyano.ViewModel.Pages
{
    public class SignInPage : VidyanoPage
    {
        #region Enum

        public enum SignInPageState
        {
            Connecting,
            NoInternet,
            MustBeSignedIn,
            SelectServiceProvider
        }

        #endregion

        #region Fields

        private readonly AutoResetEvent promptServiceProviderWaiter = new AutoResetEvent(false);
        private AutoResetEvent oauthBrowserWaiter;
        private ServiceProvider selectedProvider;

        #endregion

        #region Private Property Backers

        private ClientData _ClientData;
        private IReadOnlyDictionary<string, string> _Messages;
        private string _NoInternetMessageMessage;
        private string _NoInternetMessageTitle;
        private string _NoInternetTryAgain;
        private string _Password;
        private SignInPageState _State;
        private string _UserName;

        #endregion

        protected internal SignInPage(PhoneApplicationPage page)
            : base(page)
        {
            SignIn = new SimpleActionCommand(_ => SelectServiceProvider.Execute(ClientData.VidyanoServiceProvider));
            RetryConnect = new SimpleActionCommand(async _ =>
            {
                if (State == SignInPageState.NoInternet)
                    await Connect();
            });
            SelectServiceProvider = new SimpleActionCommand(provider =>
            {
                selectedProvider = (ServiceProvider)provider;
                promptServiceProviderWaiter.Set();
            });

            Page.BackKeyPress += (_, e) =>
            {
                promptServiceProviderWaiter.Set();
                if (oauthBrowserWaiter != null)
                    oauthBrowserWaiter.Set();

                if (ClientData != null && !String.IsNullOrEmpty(ClientData.DefaultUserName))
                    e.Cancel = true;
            };
        }

        #region Propertie

        public SignInPageState State
        {
            get { return _State; }
            private set { SetProperty(ref _State, value); }
        }

        public string NoInternetMessageTitle
        {
            get { return _NoInternetMessageTitle; }
            private set { SetProperty(ref _NoInternetMessageTitle, value); }
        }

        public string NoInternetMessageMessage
        {
            get { return _NoInternetMessageMessage; }
            private set { SetProperty(ref _NoInternetMessageMessage, value); }
        }

        public string NoInternetTryAgain
        {
            get { return _NoInternetTryAgain; }
            private set { SetProperty(ref _NoInternetTryAgain, value); }
        }

        public ICommand RetryConnect { get; private set; }

        public ICommand SelectServiceProvider { get; private set; }

        public ClientData ClientData
        {
            get { return _ClientData; }
            private set { SetProperty(ref _ClientData, value); }
        }

        public string UserName
        {
            get { return _UserName; }
            private set { SetProperty(ref _UserName, value); }
        }

        public string Password
        {
            get { return _Password; }
            private set { SetProperty(ref _Password, value); }
        }

        public ICommand SignIn { get; private set; }

        public IReadOnlyDictionary<string, string> Messages
        {
            get { return _Messages; }
            private set { SetProperty(ref _Messages, value); }
        }

        #endregion

        #region Private Methods

        internal async Task Connect()
        {
            ClientData = await Service.Current.GetClientData();
            for (var i = 0; i < 5 && ClientData == null && NetworkInterface.GetIsNetworkAvailable(); i++)
                ClientData = await Service.Current.GetClientData();

            if (ClientData != null)
            {
                ClientData.OAuthServiceProviders.Run(p => p.Select = SelectServiceProvider);
                Messages = (ClientData.Languages.FirstOrDefault(l => l.IsDefault) ?? ClientData.Languages.First()).Messages;
                await TrySignIn();
            }
            else
            {
                var noInternetMessage = Service.GetNoInternetMessage();

                NoInternetMessageTitle = noInternetMessage.Title;
                NoInternetMessageMessage = noInternetMessage.Message;
                NoInternetTryAgain = noInternetMessage.TryAgain;

                State = SignInPageState.NoInternet;
            }
        }

        private async Task TrySignIn()
        {
            if (Service.Current.IsUsingDefaultCredentials)
            {
                Service.Current.IsUsingDefaultCredentials = false;
                await OAuthSignIn();
            }

            var connected = Service.Current.IsConnected;
            while (!connected)
                connected = await VaultSignIn() || await DefaultCredentialsSignIn() || await OAuthSignIn();

            string navigationState = null;

            try
            {
                navigationState = Client.CurrentClient.ResumeCache();
            }
            catch { }

            if (!string.IsNullOrEmpty(navigationState))
                Client.RootFrame.SetNavigationState(navigationState);
            else
                await RedirectToHomePage();
        }

        internal async Task RedirectToHomePage()
        {
            string err;
            do
            {
                try
                {
                    switch (Settings.Current.StartupPageType)
                    {
                        case Settings.StartupPageTypeEnum.HomePage:
                            {
                                Client.RootFrame.Navigate(new Uri("/Vidyano.Phone;component/View/Pages/HomePage.xaml", UriKind.Relative));
                                break;
                            }

                        case Settings.StartupPageTypeEnum.PersistenObjectPage:
                            {
                                await new Navigate().Execute(Service.Current.GetPersistentObjectAsync(Settings.Current.StartupPageArgument, string.Empty));
                                break;
                            }

                        case Settings.StartupPageTypeEnum.QueryPage:
                            {
                                await new Navigate().Execute(Service.Current.GetQueryAsync(Settings.Current.StartupPageArgument, string.Empty));
                                break;
                            }
                    }

                    err = null;
                }
                catch (Exception e)
                {
                    err = e.Message;
                }

                if (err != null)
                    await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
            }
            while (err != null);
        }

        private async Task<bool> VaultSignIn()
        {
            try
            {
                Service.Current.IsUsingDefaultCredentials = false;

                var vidyanoCredentials = GetRememberedCredentials();
                if (vidyanoCredentials != null)
                {
                    var data = JObject.Parse(vidyanoCredentials.Item2);
                    ((PhoneHooks)Service.Current.Hooks).InitializeUniqueIdKeyPair((string)data["uniqueIdKeyPair"]);

                    await Service.Current.SignInUsingAuthTokenAsync(vidyanoCredentials.Item1, (string)data["authToken"]);
                }
            }
            catch { }

            return Service.Current.IsConnected;
        }

        private async Task<bool> DefaultCredentialsSignIn()
        {
            try
            {
                if (!string.IsNullOrEmpty(ClientData.DefaultUserName))
                {
                    Service.Current.IsUsingDefaultCredentials = true;
                    await Service.Current.SignInUsingCredentialsAsync(ClientData.DefaultUserName, null);
                }
            }
            catch
            {
                Service.Current.IsUsingDefaultCredentials = Service.Current.IsConnected;
            }

            return Service.Current.IsConnected;
        }

        private async Task<bool> OAuthSignIn()
        {
            if (!ClientData.HasVidyanoProvider && ClientData.OAuthServiceProviders.Length == 1)
                return await OAuthSignIn(ClientData.OAuthServiceProviders[0]);

            string err = null;

            try
            {
                State = SignInPageState.SelectServiceProvider;

                await Task.Factory.StartNew(() => promptServiceProviderWaiter.WaitOne());

                State = SignInPageState.Connecting;

                Service.Current.IsBusy = true;

                if (selectedProvider != null)
                    return await OAuthSignIn(selectedProvider);
            }
            catch (Exception ex)
            {
                err = ex.Message;
            }
            finally
            {
                Service.Current.IsBusy = false;
            }

            if (!String.IsNullOrEmpty(err))
            {
                MessageBox.Show(err, Messages["SignInError"], MessageBoxButton.OK);
                await OAuthSignIn();
            }

            return Service.Current.IsConnected;
        }

        private async Task<bool> OAuthSignIn(ServiceProvider provider)
        {
            string err = null;

            try
            {
                Service.Current.IsBusy = true;

                var hooks = (PhoneHooks)Service.Current.Hooks;
                var unqueIdKeyPair = hooks.GenerateUniqueIdKeyPair();
                hooks.InitializeUniqueIdKeyPair(unqueIdKeyPair);

                switch (provider.Name)
                {
                    case "Vidyano":
                        {
                            await Service.Current.SignInUsingCredentialsAsync(UserName, Password);
                            break;
                        }

                    case "Microsoft":
                        {
                            var client = new LiveAuthClient(provider.Parameters["clientID"]);
                            var result = await client.LoginAsync(new[] { "wl.basic", "wl.emails" });
                            if (result.Status == LiveConnectSessionStatus.Connected)
                                await Service.Current.SignInUsingAccessTokenAsync(result.Session.AccessToken);
                            break;
                        }

                    case "Acs":
                        {
                            var responseUrl = await ExternalAuthenticationSignIn(new Uri(provider.Parameters["requestUri"]), new Uri(provider.Parameters["redirectUri"]), ExternalAuthentication.Acs);
                            if (responseUrl != null)
                            {
                                var splitUrl = responseUrl.Split(new[] { "#!/SignInWithToken/" }, StringSplitOptions.RemoveEmptyEntries);
                                if (splitUrl.Length == 2)
                                {
                                    var parts = splitUrl[1].Split('/');
                                    if (parts.Length == 2)
                                    {
                                        var userNameBytes = Convert.FromBase64String(parts[0]);
                                        var userName = Encoding.UTF8.GetString(userNameBytes, 0, userNameBytes.Length);
                                        await Service.Current.SignInUsingAuthTokenAsync(userName, parts[1]);
                                    }
                                }
                            }

                            break;
                        }

                    default:
                        {
                            var responseUrl = await ExternalAuthenticationSignIn(new Uri(provider.Parameters["requestUri"]), new Uri(provider.Parameters["redirectUri"]), ExternalAuthentication.Acs);
                            var responseData = responseUrl.Split('#')[0].Replace(provider.Parameters["redirectUri"] + "?code=", null);
                            if (responseData != null)
                                await Service.Current.SignInUsingAccessTokenAsync(responseData, provider.Name);

                            break;
                        }
                }

                if (Service.Current.IsConnected)
                {
                    var password = new JObject();
                    password["authToken"] = Service.Current.AuthToken;
                    password["uniqueIdKeyPair"] = unqueIdKeyPair;

                    RememberCredentials(Service.Current.User, password.ToString(Formatting.None));
                }
            }
            catch (LiveAuthException) { }
            catch (Exception ex)
            {
                err = ex.Message;
            }
            finally
            {
                Service.Current.IsBusy = false;
            }

            if (!String.IsNullOrEmpty(err))
            {
                MessageBox.Show(err, Messages["SignInError"], MessageBoxButton.OK);
                await OAuthSignIn();
            }

            return Service.Current.IsConnected;
        }

        private async Task<string> ExternalAuthenticationSignIn(Uri requestUri, Uri redirectUri, ExternalAuthentication authenticationType)
        {
            var browser = Page.FindName("oauthBrowser") as WebBrowser;
            if (browser == null)
                return null;

            oauthBrowserWaiter = new AutoResetEvent(false);
            string responseUrl = null;

            EventHandler<NavigatingEventArgs> navigating = (sender, e) =>
            {
                var url = e.Uri.ToString();
                if ((authenticationType == ExternalAuthentication.OAuth && url.StartsWith(redirectUri.ToString())) ||
                    (authenticationType == ExternalAuthentication.Acs && url.Contains("#!/SignInWithToken/")))
                {
                    responseUrl = url.ToString();
                    e.Cancel = true;
                    oauthBrowserWaiter.Set();
                }
            };

            NavigationFailedEventHandler failed = (sender, e) => oauthBrowserWaiter.Set();

            browser.NavigationFailed += failed;
            browser.Navigating += navigating;

            try
            {
                browser.IsScriptEnabled = true;
                browser.Visibility = Visibility.Visible;
                browser.Navigate(requestUri);

                await Task.Factory.StartNew(() => oauthBrowserWaiter.WaitOne());
            }
            catch { }
            finally
            {
                browser.Navigating -= navigating;
                browser.NavigationFailed -= failed;
                browser.Visibility = Visibility.Collapsed;

                oauthBrowserWaiter = null;
            }

            return responseUrl;
        }

        internal static void RememberCredentials(string user, string token)
        {
            if (user == null || token == null)
            {
                IsolatedStorageFile.GetUserStoreForApplication().DeleteFile("credentials.js");
                return;
            }

            var encToken = ProtectedData.Protect(Encoding.UTF8.GetBytes(token), null);

            var credentials = new JObject();
            credentials["user"] = user;
            credentials["token"] = Convert.ToBase64String(encToken);

            var file = IsolatedStorageFile.GetUserStoreForApplication();
            using (var str = new IsolatedStorageFileStream("credentials.js", FileMode.Create, file))
            using (var strWriter = new StreamWriter(str))
            {
                strWriter.Write(credentials.ToString(Formatting.None));
                strWriter.Flush();
            }
        }

        private static Tuple<string, string> GetRememberedCredentials()
        {
            var file = IsolatedStorageFile.GetUserStoreForApplication();
            try
            {
                using (var str = new IsolatedStorageFileStream("credentials.js", FileMode.Open, file))
                using (var strReader = new StreamReader(str))
                {
                    var credentials = JObject.Parse(strReader.ReadToEnd());

                    var tokenData = ProtectedData.Unprotect(Convert.FromBase64String((string)credentials["token"]), null);
                    var token = Encoding.UTF8.GetString(tokenData, 0, tokenData.Length);

                    return Tuple.Create((string)credentials["user"], token);
                }
            }
            catch
            {
                return null;
            }
        }

        #endregion
    }
}