using Microsoft.Live;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Vidyano.Common;
using Vidyano.ViewModel;
using Windows.ApplicationModel;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Security.Credentials;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

namespace Vidyano.View
{
    public sealed partial class SignInPage
    {
        #region Private Fields

        private string cache;
        private JObject language = null;

        #endregion

        #region No Internet Messages

        private static Dictionary<string, NoInternetMessage> noInternetMessages = new Dictionary<string, NoInternetMessage>
        {
            { "en", new NoInternetMessage("Unable to connect to the server.", "Please check your internet connection settings and try again.", "Try again") },
            { "ar", new NoInternetMessage("غير قادر على الاتصال بالخادم", "يرجى التحقق من إعدادات الاتصال بإنترنت ثم حاول مرة أخرى", "حاول مرة أخرى") },
            { "bg", new NoInternetMessage("Не може да се свърже със сървъра", "Проверете настройките на интернет връзката и опитайте отново", "Опитайте отново") },
            { "ca", new NoInternetMessage("No es pot connectar amb el servidor", "Si us plau aturi les seves escenes de connexió d'internet i provi una altra vegada", "Provi una altra vegada") },
            { "cs", new NoInternetMessage("Nelze se připojit k serveru", "Zkontrolujte nastavení připojení k Internetu a akci opakujte", "Zkuste to znovu") },
            { "da", new NoInternetMessage("Kunne ikke oprettes forbindelse til serveren", "Kontroller indstillingerne for internetforbindelsen, og prøv igen", "Prøv igen") },
            { "nl", new NoInternetMessage("Kan geen verbinding maken met de server", "Controleer de instellingen van uw internet-verbinding en probeer opnieuw", "Opnieuw proberen") },
            { "et", new NoInternetMessage("Ei saa ühendust serveriga", "Palun kontrollige oma Interneti-ühenduse sätteid ja proovige uuesti", "Proovi uuesti") },
            { "fa", new NoInternetMessage("قادر به اتصال به سرویس دهنده", "لطفاً تنظیمات اتصال اینترنت را بررسی کرده و دوباره سعی کنید", "دوباره امتحان کن") },
            { "fi", new NoInternetMessage("Yhteyttä palvelimeen", "Tarkista internet-yhteysasetukset ja yritä uudelleen", "Yritä uudestaan") },
            { "fr", new NoInternetMessage("Impossible de se connecter au serveur", "S'il vous plaît vérifier vos paramètres de connexion internet et réessayez", "Réessayez") },
            { "de", new NoInternetMessage("Keine Verbindung zum Server herstellen", "Überprüfen Sie die Einstellungen für die Internetverbindung und versuchen Sie es erneut", "Wiederholen") },
            { "el", new NoInternetMessage("Δεν είναι δυνατή η σύνδεση με το διακομιστή", "Ελέγξτε τις ρυθμίσεις σύνδεσης στο internet και προσπαθήστε ξανά", "Δοκίμασε ξανά") },
            { "ht", new NoInternetMessage("Pat kapab pou li konekte li pou sèvè a", "Souple tcheke ou paramètres kouche sou entènèt Et eseye ankò", "eseye ankò") },
            { "he", new NoInternetMessage("אין אפשרות להתחבר לשרת", "נא בדוק את הגדרות החיבור לאינטרנט ונסה שוב", "נסה שוב") },
            { "hi", new NoInternetMessage("सर्वर से कनेक्ट करने में असमर्थ", "कृपया अपना इंटरनेट कनेक्शन सेटिंग्स की जाँच करें और पुन: प्रयास करें", "फिर कोशिश करो") },
            { "hu", new NoInternetMessage("Nem lehet kapcsolódni a szerverhez", "Kérjük, ellenőrizze az internetes kapcsolat beállításait, és próbálja újra", "próbáld újra") },
            { "id", new NoInternetMessage("Tidak dapat terhubung ke server", "Silakan periksa setelan sambungan internet Anda dan coba lagi", "Coba lagi") },
            { "it", new NoInternetMessage("Impossibile connettersi al server", "Si prega di controllare le impostazioni della connessione internet e riprovare", "Riprova") },
            { "ja", new NoInternetMessage("サーバーに接続できません。", "インターネット接続設定を確認して、やり直してください。", "もう一度やり直してください") },
            { "ko", new NoInternetMessage("서버에 연결할 수 없습니다.", "인터넷 연결 설정을 확인 하 고 다시 시도 하십시오", "다시 시도") },
            { "lv", new NoInternetMessage("Nevar izveidot savienojumu ar serveri", "Lūdzu, pārbaudiet interneta savienojuma iestatījumus un mēģiniet vēlreiz", "mēģini vēlreiz") },
            { "lt", new NoInternetMessage("Nepavyko prisijungti prie serverio", "Patikrinkite interneto ryšio parametrus ir bandykite dar kartą", "pabandyk dar kartą") },
            { "no", new NoInternetMessage("Kan ikke koble til serveren", "Kontroller innstillingene for Internett-tilkoblingen og prøv igjen", "prøv igjen") },
            { "pl", new NoInternetMessage("Nie można połączyć się z serwerem", "Proszę sprawdzić ustawienia połączenia internetowego i spróbuj ponownie", "Próbuj ponownie") },
            { "pt", new NoInternetMessage("Incapaz de conectar ao servidor", "Por favor, verifique suas configurações de conexão de internet e tente novamente", "Tentar novamente") },
            { "ro", new NoInternetMessage("Imposibil de conectat la server", "Vă rugăm să verificaţi setările de conexiune la internet şi încercaţi din nou", "încearcă din nou") },
            { "ru", new NoInternetMessage("Не удается подключиться к серверу", "Пожалуйста, проверьте параметры подключения к Интернету и повторите попытку", "Повторить") },
            { "sk", new NoInternetMessage("Nedá sa pripojiť k serveru", "Skontrolujte nastavenie internetového pripojenia a skúste to znova", "skús znova") },
            { "sl", new NoInternetMessage("Ne morem se povezati s strežnikom", "Preverite nastavitve internetne povezave in poskusite znova", "poskusi znova") },
            { "es", new NoInternetMessage("No se puede conectar al servidor", "Por favor, compruebe la configuración de conexión a internet e inténtelo de nuevo", "Vuelve a intentarlo") },
            { "sv", new NoInternetMessage("Det gick inte att ansluta till servern", "Kontrollera inställningarna för Internetanslutningen och försök igen", "Försök igen") },
            { "th", new NoInternetMessage("สามารถเชื่อมต่อกับเซิร์ฟเวอร์", "กรุณาตรวจสอบการตั้งค่าการเชื่อมต่ออินเทอร์เน็ตของคุณ และลองอีกครั้ง", "ลองอีกครั้ง") },
            { "tr", new NoInternetMessage("Sunucuya bağlantı kurulamıyor", "Lütfen Internet bağlantı ayarlarınızı denetleyin ve yeniden deneyin", "Yeniden Deneyin") },
            { "uk", new NoInternetMessage("Не вдалося підключитися до сервера", "Перевірте параметри підключення до Інтернету та повторіть спробу", "Спробуй ще раз") },
            { "vi", new NoInternetMessage("Không thể kết nối đến máy chủ", "Hãy kiểm tra cài đặt kết nối internet của bạn và thử lại", "Thử lại") },
        };

        class NoInternetMessage
        {
            public NoInternetMessage(string title, string message, string tryAgain)
            {
                Title = title;
                Message = message;
                TryAgain = tryAgain;
            }

            public string Title { get; private set; }
            public string Message { get; private set; }
            public string TryAgain { get; private set; }
        }

        #endregion

        public SignInPage()
        {
            this.InitializeComponent();
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (!Service.Current.IsConnected)
                e.Cancel = true;

            base.OnNavigatingFrom(e);
        }

        protected async override void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);

            cache = e.Parameter as string;

            await Connect();
        }

        private async Task Connect()
        {
            VisualStateManager.GoToState(this, "Connecting", false);

            var languages = await Service.Current.GetLanguages();
            if (languages != null)
            {
                language = languages.Count == 1 ? (JObject)languages.Properties().First().Value : (JObject)languages[CultureInfo.CurrentUICulture.TwoLetterISOLanguageName];
                if (language == null) // Fallback to default language
                    language = (JObject)languages.Properties().Select(l => l.Value).FirstOrDefault(l => l["isDefault"] != null && (bool)l["isDefault"]);

                mustBeSignedInMessage.Text = (string)language["messages"]["MustBeSignedIn"];
                signIn.Content = (string)language["messages"]["SignIn"];

                await SignIn();
            }
            else
            {
                NoInternetMessage noInternetMessage = noInternetMessages.TryGetValue(CultureInfo.CurrentUICulture.TwoLetterISOLanguageName, out noInternetMessage) ? noInternetMessage : noInternetMessages["en"];

                noInternetMessageTitle.Text = noInternetMessage.Title;
                noInternetMessageMessage.Text = noInternetMessage.Message;
                tryAgain.Content = noInternetMessage.TryAgain;

                VisualStateManager.GoToState(this, "NoInternet", false);
            }
        }

        private async Task SignIn()
        {
            if (Service.Current.IsConnectedUsingDefaultCredentials)
            {
                Service.Current.IsConnectedUsingDefaultCredentials = false;
                if (Settings.Current.UseLiveConnect)
                    await LiveSignIn();
                else
                    await UISignIn();
            }

            var connected = Service.Current.IsConnected;
            if (!connected)
                connected = await VaultSignIn() || await DefaultCredentialsSignIn() || (Settings.Current.UseLiveConnect ? await LiveSignIn() : await UISignIn());

            if (connected)
            {
                string navigationState = null;

                try
                {
                    if (!string.IsNullOrEmpty(cache))
                        navigationState = await Service.Current.ResumeCache(cache);
                }
                catch
                {
                }

                if (!string.IsNullOrEmpty(navigationState))
                    Frame.SetNavigationState(navigationState);
                else
                {
                    try
                    {
                        switch (Settings.Current.StartupPageType)
                        {
                            case Settings.StartupPageTypeEnum.HomePage:
                                {
                                    Frame.Navigate(typeof(HomePage));
                                    break;
                                }

                            case Settings.StartupPageTypeEnum.PersistenObjectPage:
                                {
                                    await new Commands.Navigate().Execute(Service.Current.GetPersistentObjectAsync(Settings.Current.StartupPageArgument, string.Empty));
                                    break;
                                }

                            case Settings.StartupPageTypeEnum.QueryPage:
                                {
                                    await new Commands.Navigate().Execute(Service.Current.GetQueryAsync(Settings.Current.StartupPageArgument, string.Empty));
                                    break;
                                }
                        }
                    }
                    catch (Exception e)
                    {
                        ((Client)Client.Current).Hooks.ShowNotification(e.Message, NotificationType.Error);
                    }
                }
            }
            else
                VisualStateManager.GoToState(this, "MustBeSignedIn", false);
        }

        private static async Task<bool> VaultSignIn()
        {
            try
            {
                Service.Current.IsConnectedUsingDefaultCredentials = false;
                var vault = new PasswordVault();

                var vidyanoCredentials = vault.FindAllByResource(Service.vaultCredentialsName).FirstOrDefault();
                if (vidyanoCredentials != null)
                {
                    vidyanoCredentials.RetrievePassword();
                    await Service.Current.SignInAsync(vidyanoCredentials.UserName, null, vidyanoCredentials.Password);
                }
            }
            catch
            {
            }

            return Service.Current.IsConnected;
        }

        private static async Task<bool> DefaultCredentialsSignIn()
        {
            try
            {
                if (!string.IsNullOrEmpty(Settings.Current.DefaultUserName) && !string.IsNullOrEmpty(Settings.Current.DefaultPassword))
                {
                    await Service.Current.SignInAsync(Settings.Current.DefaultUserName, Settings.Current.DefaultPassword, null);
                    if (Service.Current.IsConnected)
                        Service.Current.IsConnectedUsingDefaultCredentials = true;
                }
            }
            catch
            {
            }

            return Service.Current.IsConnected;
        }

        private async Task<bool> LiveSignIn()
        {
            string err = null;

            try
            {
                var result = await Service.Current.LiveSignInAsync("wl.basic", "wl.emails");
                if (result.Status == LiveConnectSessionStatus.Connected)
                    await Service.Current.SignInAsync(null, null, null, result.Session.AccessToken);

                if (Service.Current.IsConnected)
                {
                    var vault = new PasswordVault();
                    vault.Add(new PasswordCredential(Service.vaultCredentialsName, Service.Current.User, Service.Current.AuthToken));
                }
            }
            catch (Exception ex)
            {
                err = ex.Message;
            }

            if (!String.IsNullOrEmpty(err))
            {
                var dialog = new MessageDialog(err, (string)language["messages"]["SignInError"]);
                var retry = false;
                dialog.Commands.Add(new UICommand((string)language["messages"]["RetrySignIn"], _ => retry = true));
                dialog.Commands.Add(new UICommand((string)language["messages"]["CancelSignIn"]));

                await dialog.ShowAsync();

                if (retry)
                    return await LiveSignIn();
            }

            return Service.Current.IsConnected;
        }

        private async Task<bool> UISignIn()
        {
            string err = null;

            try
            {
                VisualStateManager.GoToState(this, "Connecting", false);

                var options = new Windows.Security.Credentials.UI.CredentialPickerOptions
                {
                    AuthenticationProtocol = Windows.Security.Credentials.UI.AuthenticationProtocol.Basic,
                    CredentialSaveOption = Windows.Security.Credentials.UI.CredentialSaveOption.Selected,
                    CallerSavesCredential = true,
                    Caption = !string.IsNullOrEmpty(Settings.Current.AppName) ? Settings.Current.AppName : "Vidyano",
                    Message = (string)language["messages"]["SignIn"],
                    TargetName = "."
                };

                var results = await Windows.Security.Credentials.UI.CredentialPicker.PickAsync(options);
                if (results.Credential != null)
                {
                    await Service.Current.SignInAsync(results.CredentialUserName, results.CredentialPassword);

                    if (Service.Current.IsConnected)
                    {
                        var vault = new PasswordVault();

                        try
                        {
                            vault.FindAllByResource(Service.vaultCredentialsName).Run(vault.Remove);
                        }
                        catch { }

                        if (results.CredentialSaveOption == Windows.Security.Credentials.UI.CredentialSaveOption.Selected)
                            vault.Add(new PasswordCredential(Service.vaultCredentialsName, Service.Current.User, Service.Current.AuthToken));
                    }
                }
            }
            catch (Exception ex)
            {
                err = ex.Message;
            }

            if (!String.IsNullOrEmpty(err))
            {
                var dialog = new MessageDialog(err, (string)language["messages"]["SignInError"]);
                var retry = false;
                dialog.Commands.Add(new UICommand((string)language["messages"]["RetrySignIn"], _ => retry = true));
                dialog.Commands.Add(new UICommand((string)language["messages"]["CancelSignIn"]));

                await dialog.ShowAsync();

                if (retry)
                    return await UISignIn();
            }

            return Service.Current.IsConnected;
        }

        private async void SignIn_Click(object sender, RoutedEventArgs e)
        {
            await SignIn();
        }

        private async void TryAgain_Click(object sender, RoutedEventArgs e)
        {
            await Connect();
        }
    }
}
