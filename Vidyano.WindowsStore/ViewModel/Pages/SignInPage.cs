using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Input;
using Windows.Security.Authentication.Web;
using Windows.Security.Credentials;
using Windows.System;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Input;
using Microsoft.Live;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Vidyano.Commands;
using Vidyano.Common;
using Vidyano.View;
using Windows.ApplicationModel.Search;

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

        #region Private Fields

        private readonly AutoResetEvent promptServiceProviderWaiter = new AutoResetEvent(false);
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

        public SignInPage(LayoutAwarePage page)
            : base(page)
        {
            Template = (DataTemplate)Application.Current.Resources["SignInPage"];
            try
            {
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = false;
            }
            catch
            {
                // Throws an "Element not found" exception, even though this is called after OnLaunched
            }

            SignIn = new SimpleActionCommand(async _ => await TrySignIn());
            CancelSignIn = new ActionCommand(_ => promptServiceProviderWaiter.Set(), _ => ClientData != null && !String.IsNullOrEmpty(ClientData.DefaultUserName), this, "ClientData");
            RetryConnect = new SimpleActionCommand(async _ => await Connect());
            SelectServiceProvider = new ActionCommand(provider =>
            {
                selectedProvider = (ServiceProvider)provider;
                promptServiceProviderWaiter.Set();
            }, provider =>  (provider is ServiceProvider && ((ServiceProvider)provider).Name != "Vidyano") || (!String.IsNullOrEmpty(Password) && !String.IsNullOrEmpty(UserName)), this, "UserName", "Password");

            page.KeyUp += Page_KeyUp;
        }

        public override void Dispose()
        {
            base.Dispose();

            Page.KeyUp -= Page_KeyUp;
        }

        private void Page_KeyUp(object sender, KeyRoutedEventArgs e)
        {
            if (ClientData != null && ClientData.HasVidyanoProvider && e.Key == VirtualKey.Enter)
                SelectServiceProvider.Execute(ClientData.VidyanoServiceProvider);
        }

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

            var navigationState = await Client.CurrentClient.ResumeCache();
            
            if (!string.IsNullOrEmpty(navigationState))
                Page.Frame.SetNavigationState(navigationState);
            else
            {
                string err = null;
                try
                {
                    switch (Settings.Current.StartupPageType)
                    {
                        case Settings.StartupPageTypeEnum.HomePage:
                            {
                                Page.Frame.Navigate(typeof(View.Pages.HomePage));
                                break;
                            }

                        case Settings.StartupPageTypeEnum.PersistentObjectPage:
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
                }
                catch (Exception e)
                {
                    err = e.Message;
                }

                if (err != null)
                    await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
            }
        }

        private static async Task<bool> VaultSignIn()
        {
            try
            {
                Service.Current.IsUsingDefaultCredentials = false;
                var vault = new PasswordVault();

                var vidyanoCredentials = vault.FindAllByResource(StoreHooks.vaultCredentialsName).FirstOrDefault();
                if (vidyanoCredentials != null)
                {
                    vidyanoCredentials.RetrievePassword();

                    var data = JObject.Parse(vidyanoCredentials.Password);
                    ((StoreHooks)Service.Current.Hooks).InitializeUniqueIdKeyPair((string)data["uniqueIdKeyPair"]);
                    await Service.Current.SignInUsingAuthTokenAsync(vidyanoCredentials.UserName, (string)data["authToken"]);
                }
            }
            catch { }

            return Service.Current.IsConnected;
        }

        private async Task<bool> DefaultCredentialsSignIn()
        {
            await Vidyano.View.Controls.AppBarUserButton.RemoveUserPicture();

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
            while (true)
            {
                if (!ClientData.HasVidyanoProvider && ClientData.OAuthServiceProviders.Length == 1)
                    return await OAuthSignIn(ClientData.OAuthServiceProviders[0]);

                string err = null;

                try
                {
                    State = SignInPageState.SelectServiceProvider;

                    var tb = Page.FindDescendantByName("UserName") as TextBox;
                    if (tb != null)
                        tb.Focus(FocusState.Programmatic);

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
                    var dialog = new MessageDialog(err, Messages["SignInError"]);
                    var retry = false;
                    dialog.Commands.Add(new UICommand(Messages["RetrySignIn"], _ => retry = true));
                    dialog.Commands.Add(new UICommand(Messages["CancelSignIn"]));

                    await dialog.ShowAsync();

                    if (retry)
                        continue;
                }

                return Service.Current.IsConnected;
            }
        }

        private async Task<bool> OAuthSignIn(ServiceProvider provider)
        {
            while (true)
            {
                string err = null;

                try
                {
                    Service.Current.IsBusy = true;

                    var hooks = (StoreHooks)Service.Current.Hooks;
                    var unqueIdKeyPair = hooks.GenerateUniqueIdKeyPair();
                    hooks.InitializeUniqueIdKeyPair(unqueIdKeyPair);

                    switch (provider.Name)
                    {
                        case "Vidyano":
                            await Service.Current.SignInUsingCredentialsAsync(UserName, Password);
                            break;

                        case "Microsoft":
                            var client = new LiveAuthClient();
                            LiveLoginResult liveLoginResult = null;
                            try
                            {
                                liveLoginResult = await client.LoginAsync(new[] { "wl.basic", "wl.emails" });
                            }
                            catch (NullReferenceException)
                            {
                                throw new Exception("The app is not configured correctly to use Live Connect services. To configure your app, please follow the instructions on http://go.microsoft.com/fwlink/?LinkId=220871.");
                            }

                            if (liveLoginResult != null && liveLoginResult.Status == LiveConnectSessionStatus.Connected)
                                await Service.Current.SignInUsingAccessTokenAsync(liveLoginResult.Session.AccessToken);

                            break;

                        default:
                            var responseData = await OAuthBrowserSignIn(new Uri(provider.Parameters["requestUri"]), new Uri(provider.Parameters["redirectUri"]));
                            if (responseData != null)
                                await Service.Current.SignInUsingAccessTokenAsync(responseData, provider.Name);
                            break;
                    }

                    if (Service.Current.IsConnected)
                    {
                        var vault = new PasswordVault();
                        try
                        {
                            vault.FindAllByResource(StoreHooks.vaultCredentialsName).ToArray().Run(vault.Remove);
                        }
                        catch { }

                        var password = new JObject();
                        password["authToken"] = Service.Current.AuthToken;
                        password["uniqueIdKeyPair"] = unqueIdKeyPair;

                        vault.Add(new PasswordCredential(StoreHooks.vaultCredentialsName, Service.Current.User, password.ToString(Formatting.None)));
                    }
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
                    var dialog = new MessageDialog(err, Messages["SignInError"]);
                    var retry = false;
                    dialog.Commands.Add(new UICommand(Messages["RetrySignIn"], _ => retry = true));
                    dialog.Commands.Add(new UICommand(Messages["CancelSignIn"]));

                    await dialog.ShowAsync();

                    if (retry)
                        continue;

                    await TrySignIn();
                }

                return Service.Current.IsConnected;
            }
        }

        private static async Task<string> OAuthBrowserSignIn(Uri requestUri, Uri redirectUri)
        {
            var result = await WebAuthenticationBroker.AuthenticateAsync(WebAuthenticationOptions.None, requestUri, redirectUri);
            return result.ResponseStatus == WebAuthenticationStatus.Success ? result.ResponseData.Split('#')[0].Replace(redirectUri.ToString() + "?code=", null) : null;
        }

        #region Properties

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

        public ICommand SignIn { get; private set; }

        public ICommand CancelSignIn { get; private set; }

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
            set { SetProperty(ref _UserName, value); }
        }

        public string Password
        {
            get { return _Password; }
            set { SetProperty(ref _Password, value); }
        }

        public IReadOnlyDictionary<string, string> Messages
        {
            get { return _Messages; }
            private set { SetProperty(ref _Messages, value); }
        }

        #endregion
    }
}