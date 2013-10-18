using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading.Tasks;
using Vidyano.Common;
using Vidyano.View.Pages;
using Vidyano.ViewModel;
using Vidyano.ViewModel.Actions;
using Windows.ApplicationModel;
using Windows.ApplicationModel.DataTransfer;
using Windows.Data.Xml.Dom;
using Windows.Foundation;
using Windows.Security.Credentials;
using Windows.Security.Cryptography;
using Windows.Security.Cryptography.Core;
using Windows.Storage;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;
using Windows.UI.ApplicationSettings;
using Windows.UI.Notifications;
using Windows.UI.Popups;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Media.Imaging;

namespace Vidyano
{
    public class StoreHooks : Hooks
    {
        internal static readonly string vaultCredentialsName = string.Format("Vidyano.{0}", Package.Current.Id.Name);

        private CryptographicKey timestampKey;
        private readonly AsymmetricKeyAlgorithmProvider asym = AsymmetricKeyAlgorithmProvider.OpenAlgorithm(AsymmetricAlgorithmNames.RsaSignPkcs1Sha256);

        public StoreHooks()
        {
            var dispatcher = Window.Current != null ? Window.Current.Dispatcher : null;
            NotifyableBase.Dispatch = async action =>
            {
                if (dispatcher == null || dispatcher.HasThreadAccess)
                    action();
                else
                    await dispatcher.RunAsync(Windows.UI.Core.CoreDispatcherPriority.Normal, () => action());
            };
        }

        internal void InitializeUniqueIdKeyPair(string keypair)
        {
            timestampKey = asym.ImportKeyPair(Convert.FromBase64String(keypair).AsBuffer());
            UniqueId = Convert.ToBase64String(timestampKey.ExportPublicKey(CryptographicPublicKeyBlobType.Capi1PublicKey).ToArray());
        }

        internal string GenerateUniqueIdKeyPair()
        {
            return Convert.ToBase64String(asym.CreateKeyPair(512).Export().ToArray());
        }

        internal override string GetSignedTimeStamp()
        {
            var deviceTime = Service.ToServiceString(DateTimeOffset.Now);
            var buf = CryptographicBuffer.ConvertStringToBinary(deviceTime, BinaryStringEncoding.Utf8);
            var signedData = CryptographicEngine.Sign(timestampKey, buf).ToArray();

            return deviceTime + ";" + Convert.ToBase64String(signedData);
        }

        internal override async Task SignOut()
        {
            try
            {
                var vault = new PasswordVault();

                var vidyanoCredentials = vault.FindAllByResource(vaultCredentialsName).FirstOrDefault();
                if (vidyanoCredentials != null)
                    vault.Remove(vidyanoCredentials);
            }
            catch { }

            await Vidyano.View.Controls.AppBarUserButton.RemoveUserPicture();

            var rootFrame = (Frame)Window.Current.Content;
            while (rootFrame.CanGoBack)
                rootFrame.GoBack();
        }

        internal override object ByteArrayToImageSource(MemoryStream memoryStream)
        {
            var bmi = new BitmapImage();
#pragma warning disable 4014
            bmi.SetSourceAsync(new Common.InMemoryRandomAccessStream(memoryStream));
#pragma warning restore 4014
            return bmi;
        }

        internal override Task<object> UserPictureFromUrl(string url)
        {
            return Vidyano.View.Controls.AppBarUserButton.UserPictureFromUrl(url);
        }

        internal override async Task OnActionCommand(ActionBase action, object obj)
        {
            if (action.Options != null && action.Options.Length > 0)
            {
                var button = obj as Button;
                if (button != null)
                {
                    var popupMenu = new PopupMenu();
                    foreach (var option in action.Options)
                        popupMenu.Commands.Add(new UICommand(option, async c => await action.Execute(c.Label)));

                    var point = button.TransformToVisual(null).TransformPoint(new Point(button.ActualWidth, 0d));
                    await popupMenu.ShowAsync(point);
                    return;
                }
            }

            await action.Execute(null);
        }

        internal static void OpenActionsBar(ActionBase action, bool asSticky = false)
        {
            if (action.Query == null && action.Parent != null)
            {
                ((StorePersistentObject)action.Parent).IsActionsBarSticky = asSticky;
                ((StorePersistentObject)action.Parent).IsActionsBarOpen = true;
            }
            else if (action.Query != null)
            {
                ((StoreQuery)action.Query).IsActionsBarSticky = asSticky;
                ((StoreQuery)action.Query).IsActionsBarOpen = true;
            }
        }

        internal static void CloseActionsBar(ActionBase action)
        {
            if (action.Query == null && action.Parent != null)
            {
                ((StorePersistentObject)action.Parent).IsActionsBarSticky = false;
                ((StorePersistentObject)action.Parent).IsActionsBarOpen = false;
            }
            else if (action.Query != null)
            {
                ((StoreQuery)action.Query).IsActionsBarSticky = false;
                ((StoreQuery)action.Query).IsActionsBarOpen = false;
            }
        }

        internal override void OnOpen(PersistentObject po)
        {
            ((Frame)Window.Current.Content).Navigate(typeof(PersistentObjectPage), Client.CurrentClient.AddCachedObject(po));
        }

        internal override void OnOpen(Query query)
        {
            ((Frame)Window.Current.Content).Navigate(typeof(QueryPage), Client.CurrentClient.AddCachedObject(query));
        }

        internal static void ArrangeActions(ActionBase[] normalActions, ActionBase[] pinndActions, out ActionBase[] leftActions, out ActionBase[] rightActions)
        {
            if (Settings.Current.NormalActionsAlignment == Settings.NormalActionsAlignmentEnum.Right)
            {
                leftActions = (pinndActions ?? new ActionBase[0]).OrderByDescending(a => a.Offset).ThenBy(a => a.IsDependent).ToArray();
                rightActions = (normalActions ?? new ActionBase[0]).OrderByDescending(a => a.Offset).ThenBy(a => a.IsDependent).ToArray();
            }
            else
            {
                leftActions = normalActions;
                rightActions = pinndActions;
            }
        }

        #region AttributeContextMenu

        internal async void AttributeContextMenu(AttributeContextMenuArgs args)
        {
            var attr = args.Attribute;
            var attrWithRef = args.Attribute as PersistentObjectAttributeWithReference;

            #region Email

            // Send Email
            if (!attr.Parent.IsInEdit && !string.IsNullOrEmpty(attr.DisplayValue) &&
                DataTypes.Text.Contains(attr.Type) && (attr.Rules.Contains("IsEmail") || attr.Rules.Contains("IsValidEmail")))
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["SendEmail"], async _ =>
                    {
                        var mail = new Uri("mailto:" + attr.DisplayValue);
                        await Windows.System.Launcher.LaunchUriAsync(mail);
                    }));
            }

            #endregion

            #region Url

            // Send Url
            if (!attr.Parent.IsInEdit && !string.IsNullOrEmpty(attr.DisplayValue) &&
                DataTypes.Text.Contains(attr.Type) && (attr.Rules.Contains("IsUrl") || attr.Rules.Contains("IsValidUrl")))
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["OpenUrl"], async _ => await Windows.System.Launcher.LaunchUriAsync(new Uri(attr.DisplayValue))));
            }

            #endregion

            #region Copy

            // Copy
            if (!attr.Parent.IsInEdit && !string.IsNullOrEmpty(attr.DisplayValue) &&
                (DataTypes.Text.Contains(attr.Type) || DataTypes.Numeric.Contains(attr.Type) || DataTypes.Dates.Contains(attr.Type)))
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["Copy"], _ =>
                {
                    var package = new DataPackage();
                    package.SetText(attr.DisplayValue);

                    Clipboard.SetContent(package);
                }));
            }

            #endregion

            #region Images

            // Change Image
            if (attr.Type == DataTypes.Image)
            {
                if (attr.Parent.IsInEdit && !attr.IsReadOnly)
                {
                    args.Commands.Add(new UICommand(Service.Current.Messages["ChangeImage"], async _ =>
                    {
                        if (((ApplicationView.Value != ApplicationViewState.Snapped) || ApplicationView.TryUnsnap()))
                        {
                            var filePicker = new FileOpenPicker();
                            filePicker.FileTypeFilter.Add(".jpg");
                            filePicker.FileTypeFilter.Add(".jpeg");
                            filePicker.FileTypeFilter.Add(".png");
                            filePicker.FileTypeFilter.Add(".gif");
                            filePicker.ViewMode = PickerViewMode.Thumbnail;
                            filePicker.SuggestedStartLocation = PickerLocationId.PicturesLibrary;

                            var file = await filePicker.PickSingleFileAsync();
                            if (file != null)
                            {
                                using (var stream = await file.OpenReadAsync())
                                {
                                    using (var dataReader = new DataReader(stream))
                                    {
                                        var bytes = new byte[stream.Size];
                                        await dataReader.LoadAsync((uint)stream.Size);
                                        dataReader.ReadBytes(bytes);

                                        attr.Value = Convert.ToBase64String(bytes);
                                    }
                                }
                            }
                        }
                    }));

                    args.AutoExecuteFirst = args.Commands.Count == 1;
                }
                else
                {
                    var previewFile = await ApplicationData.Current.TemporaryFolder.CreateFileAsync("preview.png", CreationCollisionOption.ReplaceExisting);
                    await FileIO.WriteBytesAsync(previewFile, Convert.FromBase64String(attr.ValueDirect));
                    await Windows.System.Launcher.LaunchFileAsync(previewFile);
                }
            }

            // Remove Image
            if (attr.Parent.IsInEdit && !attr.IsReadOnly && !attr.IsRequired &&
                attr.Type == DataTypes.Image && attr.Value != null)
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["RemoveImage"], _ => attr.Value = null));
            }

            #endregion

            #region BinaryFile

            // Change File
            if (attr.Parent.IsInEdit && !attr.IsReadOnly &&
                attr.Type == DataTypes.BinaryFile && attr.Value != null)
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["ChangeFile"], async _ =>
                    {
                        var str = (attr.Value as String) ?? string.Empty;
                        var parts = str.Split(new[] { '|' }, StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length == 2 && !string.IsNullOrEmpty(parts[0]) && !string.IsNullOrEmpty(parts[1]))
                        {
                            if (((ApplicationView.Value != ApplicationViewState.Snapped) || ApplicationView.TryUnsnap()))
                            {
                                var filePicker = new FileOpenPicker();
                                filePicker.ViewMode = PickerViewMode.List;
                                filePicker.FileTypeFilter.Add("*");
                                filePicker.SuggestedStartLocation = PickerLocationId.DocumentsLibrary;

                                var file = await filePicker.PickSingleFileAsync();
                                if (file != null)
                                {
                                    using (var stream = await file.OpenReadAsync())
                                    {
                                        using (var dataReader = new DataReader(stream))
                                        {
                                            var bytes = new byte[stream.Size];
                                            await dataReader.LoadAsync((uint)stream.Size);
                                            dataReader.ReadBytes(bytes);

                                            attr.Value = file.Name + "|" + Convert.ToBase64String(bytes);
                                        }
                                    }
                                }
                            }
                        }
                    }));

                args.AutoExecuteFirst = args.Commands.Count == 1;
            }

            // Save File
            if (attr.Type == DataTypes.BinaryFile && attr.Value != null)
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["Save"], async _ =>
                {
                    var str = (args.Attribute.Value as String) ?? string.Empty;
                    var parts = str.Split(new[] { '|' }, StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length == 2 && !string.IsNullOrEmpty(parts[0]) && !string.IsNullOrEmpty(parts[1]))
                    {
                        if (((ApplicationView.Value != ApplicationViewState.Snapped) || ApplicationView.TryUnsnap()))
                        {
                            var savePicker = new FileSavePicker();
                            savePicker.FileTypeChoices.Add(Service.Current.Messages["File"], new List<string> { parts[0].Substring(parts[0].LastIndexOf('.')) });
                            savePicker.SuggestedStartLocation = PickerLocationId.DocumentsLibrary;
                            savePicker.SuggestedFileName = parts[0];

                            var file = await savePicker.PickSaveFileAsync();
                            if (file != null)
                                await FileIO.WriteBytesAsync(file, Convert.FromBase64String(parts[1]));
                        }
                    }
                }));
            }

            #endregion

            #region Reference

            // Open Reference
            if (attr.Type == DataTypes.Reference && !string.IsNullOrEmpty(attr.DisplayValue) && attrWithRef != null && attrWithRef.Lookup.CanRead && (!attr.Parent.IsInEdit || !attrWithRef.SelectInPlace))
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["OpenReference"], async _ =>
                {
                    try
                    {
                        await new Commands.Navigate().Execute(Service.Current.GetPersistentObjectAsync(attrWithRef.Lookup.PersistentObject.Id, attrWithRef.ObjectId));
                    }
                    catch (Exception ex)
                    {
                        attrWithRef.Parent.SetNotification(ex.Message);
                    }
                }));

                args.AutoExecuteFirst = true;
            }

            // Change Reference
            if (attr.Parent.IsInEdit && !attr.IsReadOnly &&
                attr.Type == DataTypes.Reference && attrWithRef != null && !attrWithRef.SelectInPlace)
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["ChangeReference"], _ =>
                    {
                        var frame = Window.Current.Content as Frame;
                        if (frame != null)
                        {
                            attrWithRef.Lookup.SelectedItems.Clear();

                            frame.Navigate(typeof(QueryItemSelectPage), new JObject(
                                new JProperty("Parent", attrWithRef.Parent.PagePath),
                                new JProperty("Attribute", attrWithRef.Name),
                                new JProperty("PreviousState", frame.GetNavigationState())).ToString(Formatting.None));
                        }
                    }));
            }

            // New Reference
            if (attr.Parent.IsInEdit && !attr.IsReadOnly &&
                attr.Type == DataTypes.Reference && attrWithRef != null && !attrWithRef.SelectInPlace && attrWithRef.CanAddNewReference)
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["NewReference"], async _ =>
                {
                    var parameters = new Dictionary<string, string> { { "PersistentObjectAttributeId", attrWithRef.Id } };
                    var po = await Service.Current.ExecuteActionAsync("Query.New", attrWithRef.Parent, attrWithRef.Lookup, null, parameters);

                    if (po != null)
                    {
                        po.OwnerAttributeWithReference = attrWithRef;
                        ((System.Windows.Input.ICommand)new Commands.Navigate()).Execute(po);
                    }
                }));
            }

            // Remove Reference
            if (attr.Parent.IsInEdit && !string.IsNullOrEmpty(attr.DisplayValue) && !attr.IsReadOnly &&
                attr.Type == DataTypes.Reference && attrWithRef != null && !attrWithRef.SelectInPlace && attrWithRef.CanRemoveReference)
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["RemoveReference"], async _ =>
                    {
                        await attrWithRef.ChangeReference(null);
                    }));
            }

            #endregion

            OnAttributeContextMenu(args);
        }

        protected virtual void OnAttributeContextMenu(AttributeContextMenuArgs args)
        {
        }

        #endregion

        #region Service Action Hooks

        protected internal override async Task OnAction(ExecuteActionArgs e)
        {
            if (e.Action == "ExportToExcel" && !e.IsHandled)
            {
                await e.ExecuteServiceRequest();

                Exception error = null;
                try
                {
                    if (e.Result != null)
                    {
                        try
                        {
                            var savePicker = new FileSavePicker();
                            savePicker.SuggestedFileName = e.Query.Name + ".xlsx";
                            savePicker.FileTypeChoices.Add("Excel File", new List<string> { ".xlsx" });
                            savePicker.DefaultFileExtension = ".xlsx";

                            var fileToSave = await savePicker.PickSaveFileAsync();
                            if (fileToSave != null)
                            {
                                using (var stream = await fileToSave.OpenAsync(FileAccessMode.ReadWrite))
                                {
                                    using (var outputStream = stream.GetOutputStreamAt(0))
                                    {
                                        using (var dataWriter = new DataWriter(outputStream))
                                        {
                                            var data = e.Result["excelFile"].ValueDirect;
                                            data = data.Substring(data.IndexOf('|') + 1);
                                            dataWriter.WriteBytes(Convert.FromBase64String(data));
                                            await dataWriter.StoreAsync();
                                            dataWriter.DetachStream();
                                        }
                                    }
                                    await stream.FlushAsync();
                                }
                                await Windows.System.Launcher.LaunchFileAsync(fileToSave);
                            }
                        }
                        finally
                        {
                            e.Result = null;
                        }
                    }
                }
                catch (Exception ex)
                {
                    error = ex;
                }

                if (error != null)
                {
                    var dialog = new MessageDialog(Service.Current.Messages["CouldNotOpenExcelFile"], string.Empty);
                    dialog.Commands.Add(new UICommand(Service.Current.Messages["OK"]));
                    await dialog.ShowAsync();
                }

                e.IsHandled = true;
            }
        }

        #endregion

        protected internal override async void OnStream(string name, Stream stream)
        {
            if (((ApplicationView.Value != ApplicationViewState.Snapped) || ApplicationView.TryUnsnap()))
            {
                var fileName = !string.IsNullOrEmpty(name) ? name : "unknown.bin";

                var savePicker = new FileSavePicker();
                savePicker.FileTypeChoices.Add(Service.Current.Messages["File"], new List<string> { fileName.Substring(fileName.LastIndexOf('.')) });
                savePicker.SuggestedStartLocation = PickerLocationId.DocumentsLibrary;
                savePicker.SuggestedFileName = fileName;

                var file = await savePicker.PickSaveFileAsync();
                if (file != null)
                {
                    using (var fileStream = await file.OpenAsync(FileAccessMode.ReadWrite))
                    {
                        using (var outputStream = fileStream.AsStreamForWrite())
                        {
                            await stream.CopyToAsync(outputStream);
                            await outputStream.FlushAsync();
                        }
                    }
                }
            }
        }

        #region Notifications

#pragma warning disable 1998
        public override async Task ShowNotification(string notification, NotificationType notificationType)
#pragma warning restore 1998
        {
            var notifier = ToastNotificationManager.CreateToastNotifier();
            if (notifier.Setting == NotificationSetting.Enabled && Service.Current != null)
            {
                var toastXml = new XmlDocument();

                var toast = toastXml.CreateElement("toast");
                toastXml.AppendChild(toast);

                var visual = toastXml.CreateElement("visual");
                visual.SetAttribute("version", "1");
                visual.SetAttribute("lang", "en-US");
                toast.AppendChild(visual);

                var binding = toastXml.CreateElement("binding");
                binding.SetAttribute("template", "ToastImageAndText02");
                visual.AppendChild(binding);

                var image = toastXml.CreateElement("image");
                image.SetAttribute("id", "1");
                image.SetAttribute("src", @"Assets/Notification" + Service.Current.Messages[notificationType.ToString()] + ".png");
                binding.AppendChild(image);

                var notificationTypeText = toastXml.CreateElement("text");
                notificationTypeText.SetAttribute("id", "1");
                notificationTypeText.InnerText = notificationType.ToString();
                binding.AppendChild(notificationTypeText);

                var notificationText = toastXml.CreateElement("text");
                notificationText.SetAttribute("id", "2");
                notificationText.InnerText = notification;
                binding.AppendChild(notificationText);

                var toastNotification = new ToastNotification(toastXml);
                toastNotification.Activated += (sender, args) => ShowNotificationAsDialog(notification, notificationType);
                notifier.Show(toastNotification);
            }
            else
                ShowNotificationAsDialog(notification, notificationType);
        }

        protected internal virtual void ShowNotificationAsDialog(string notification, NotificationType notificationType)
        {
            var showDialog = new Action(async () =>
            {
                var dialog = new MessageDialog(notification, notificationType.ToString());
                await dialog.ShowAsync();
            });

            NotifyableBase.Dispatch(showDialog);
        }

        #endregion

        #region SettingsPane

        public event EventHandler<bool> SettingsVisibilityChanged = delegate { };

        protected internal virtual void OnSettingsCommandsRequested(IList<SettingsCommand> commands)
        {
            Settings.Current.Flyouts.Run(f =>
            {
                var label = Service.Current.Messages != null ? Service.Current.Messages[f.LabelMessageKey] : f.LabelMessageKey;
                commands.Add(new SettingsCommand(f, label,
                    cmd =>
                    {
                        var popup = new Popup();
                        popup.IsLightDismissEnabled = true;

                        f.Settings = Settings.Current;
                        var settingsPage = new SettingsPage { DataContext = f };

                        settingsPage.Width = popup.Width = SettingsPage.PaneWidth;
                        settingsPage.Height = popup.Height = ((Frame)Window.Current.Content).ActualHeight;

                        popup.Child = settingsPage;

                        popup.SetValue(Canvas.LeftProperty, ((Frame)Window.Current.Content).ActualWidth - SettingsPage.PaneWidth);
                        popup.SetValue(Canvas.TopProperty, 0);

                        popup.Opened += (_, __) => ((StoreHooks)Service.Current.Hooks).SettingsVisibilityChanged(settingsPage, true);
                        popup.Closed += (_, __) => ((StoreHooks)Service.Current.Hooks).SettingsVisibilityChanged(settingsPage, false);

                        WindowActivatedEventHandler activatedHandler = null;
                        activatedHandler = (_, e) =>
                        {
                            if (e.WindowActivationState == Windows.UI.Core.CoreWindowActivationState.Deactivated)
                            {
                                Window.Current.Activated -= activatedHandler;
                                popup.IsOpen = false;
                            }
                        };

                        Window.Current.Activated += activatedHandler;

                        popup.IsOpen = true;
                    }));
            });
        }

        #endregion

        #region QueryResultItemClick

        protected internal virtual void OnQueryItemClicked(object sender, QueryItemClickedArgs e)
        {
        }

        #endregion

        #region Construct

        internal override PersistentObject OnConstruct(JObject model)
        {
            return new StorePersistentObject(model);
        }

        internal override void OnConstruct(PersistentObject po)
        {
            OnConstruct((StorePersistentObject)po);
        }

        protected virtual void OnConstruct(StorePersistentObject po)
        {
        }

        internal override Query OnConstruct(JObject model, PersistentObject parent, bool asLookup)
        {
            return new StoreQuery(model, parent, asLookup);
        }

        internal override void OnConstruct(Query q)
        {
            var query = (StoreQuery)q;

            query.Items = new QueryItemsSource(query);
            query.CanSemanticZoom = true;
            if (query.TotalItems == 0 && query.HasSearched || !query.AutoQuery)
                query.IsActionsBarOpen = query.IsActionsBarSticky = true;

            OnConstruct(query);
        }

        protected virtual void OnConstruct(StoreQuery query)
        {
        }

        #endregion
    }
}