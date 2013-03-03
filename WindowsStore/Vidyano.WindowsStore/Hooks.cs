using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.Common;
using Vidyano.View;
using Vidyano.ViewModel;
using Windows.ApplicationModel.DataTransfer;
using Windows.Data.Xml.Dom;
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

namespace Vidyano
{
    public class Hooks
    {
        #region AttributeContextMenu

        internal void AttributeContextMenu(AttributeContextMenuArgs args)
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
            if (attr.Parent.IsInEdit && !attr.IsReadOnly &&
                attr.Type == DataTypes.Image)
            {
                args.Commands.Add(new UICommand(Service.Current.Messages["ChangeImage"], async _ =>
                {
                    if (((ApplicationView.Value != ApplicationViewState.Snapped) || ApplicationView.TryUnsnap()))
                    {
                        var filePicker = new FileOpenPicker();
                        filePicker.FileTypeFilter.Add(".jpg");
                        filePicker.FileTypeFilter.Add(".jepg");
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
                            savePicker.FileTypeChoices.Add(Service.Current.Messages["File"], new List<string>() { parts[0].Substring(parts[0].LastIndexOf('.')) });
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
            if (attr.Type == DataTypes.Reference && !string.IsNullOrEmpty(attr.DisplayValue) && attrWithRef.Lookup.CanRead && (!attr.Parent.IsInEdit || !attrWithRef.SelectInPlace))
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
                        var frame = Windows.UI.Xaml.Window.Current.Content as Frame;
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

        protected internal virtual async Task OnAction(ExecuteActionArgs e)
        {
            if (e.Action == "ExportToExcel" && !e.IsHandled)
            {
                var po = await e.ExecuteServiceRequest();
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
                                using (var stream = await fileToSave.OpenAsync(Windows.Storage.FileAccessMode.ReadWrite))
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

        #region Notifications

        public virtual async void ShowNotification(string notification, NotificationType notificationType, bool asDialog = false)
        {
            var notifier = ToastNotificationManager.CreateToastNotifier();
            if (!asDialog && notifier.Setting == NotificationSetting.Enabled && Service.Current != null)
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
                toastNotification.Activated += (sender, args) => { ShowNotification(notification, notificationType, true); };
                notifier.Show(toastNotification);
            }
            else
            {
                var showDialog = new Action(async () =>
                {
                    var dialog = new MessageDialog(notification, notificationType.ToString());
                    await dialog.ShowAsync();
                });

                if (Service.UIDispatcher == null || Service.UIDispatcher.HasThreadAccess)
                    showDialog();
                else
                    await Service.UIDispatcher.RunAsync(Windows.UI.Core.CoreDispatcherPriority.Normal, new Windows.UI.Core.DispatchedHandler(showDialog));
            }
        }

        #endregion

        #region SettingsPane

        public event EventHandler<bool> SettingsVisibilityChanged = delegate { };

        protected internal virtual void OnSettingsCommandsRequested(IList<SettingsCommand> commands)
        {
            if (Service.Current.IsConnected)
            {
                commands.Add(new SettingsCommand("SignOut",
                    Service.Current.IsConnectedUsingDefaultCredentials ? Service.Current.Messages["SignIn"] : Service.Current.Messages["SignOut"],
                    new UICommandInvokedHandler(cmd => Service.Current.SignOut())));
            }

            Settings.Current.Flyouts.Run(f =>
            {
                var label = Service.Current.Messages != null ? Service.Current.Messages[f.LabelMessageKey] : f.LabelMessageKey;
                commands.Add(new SettingsCommand(f, label,
                    new UICommandInvokedHandler(cmd =>
                    {
                        var popup = new Popup();
                        popup.IsLightDismissEnabled = true;

                        f.Settings = Settings.Current;
                        var settingsPage = new SettingsPage { DataContext = f };

                        settingsPage.Width = popup.Width = SettingsPage.PaneWidth;
                        settingsPage.Height = popup.Height = (Window.Current.Content as Frame).ActualHeight;

                        popup.Child = settingsPage;

                        popup.SetValue(Canvas.LeftProperty, (Window.Current.Content as Frame).ActualWidth - SettingsPage.PaneWidth);
                        popup.SetValue(Canvas.TopProperty, 0);

                        popup.Opened += (_, __) => ((Client)Client.Current).Hooks.SettingsVisibilityChanged(settingsPage, true);
                        popup.Closed += (_, __) => ((Client)Client.Current).Hooks.SettingsVisibilityChanged(settingsPage, false);

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
                    })));
            });
        }

        #endregion

        #region QueryResultItemClick

        protected internal virtual void OnQueryItemClicked(object sender, QueryItemClickedArgs e)
        {
        }

        #endregion

        #region Construct

        protected internal virtual void OnConstruct(PersistentObject po)
        {
            
        }

        protected internal virtual void OnConstruct(Query query)
        {

        }

        #endregion

        #region ProgramUnitItems

#pragma warning disable 1998
        protected internal virtual async Task OnLoadProgramUnitItems(IList<ProgramUnitItem> items)
        {
        }
#pragma warning restore 1998

        #endregion
    }
}