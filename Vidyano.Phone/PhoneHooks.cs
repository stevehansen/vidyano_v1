using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media.Imaging;
using Windows.Storage;
using Windows.System;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using Microsoft.Phone.Tasks;
using Newtonsoft.Json.Linq;
using Vidyano.Commands;
using Vidyano.Common;
using Vidyano.View;
using Vidyano.ViewModel;
using Vidyano.ViewModel.Pages;

namespace Vidyano
{
    public class PhoneHooks : Hooks
    {
        private readonly RSACryptoServiceProvider deviceRsa = new RSACryptoServiceProvider(512);

        public PhoneHooks()
        {
            Service.Current.IsMobile = true;
        }

        internal void InitializeUniqueIdKeyPair(string keypair)
        {
            deviceRsa.ImportCspBlob(Convert.FromBase64String(keypair));
            UniqueId = Convert.ToBase64String(deviceRsa.ExportCspBlob(false));
        }

        internal string GenerateUniqueIdKeyPair()
        {
            return Convert.ToBase64String(deviceRsa.ExportCspBlob(true));
        }

        internal override string GetSignedTimeStamp()
        {
            var deviceTime = Service.ToServiceString(DateTimeOffset.Now);
            var signedData = deviceRsa.SignData(Encoding.UTF8.GetBytes(deviceTime), new SHA256Managed());

            return deviceTime + ";" + Convert.ToBase64String(signedData);
        }

        public override async Task ShowNotification(string notification, NotificationType notificationType)
        {
            var messageBox = new CustomMessageBox
                             {
                                 Caption = Service.Current.Messages[notificationType.ToString()],
                                 Message = notification,
                                 LeftButtonContent = Service.Current.Messages["OK"],
                                 RightButtonContent = Service.Current.Messages["Copy"]
                             };

            var waiter = new AutoResetEvent(false);
            messageBox.Dismissed += (s1, e1) =>
            {
                if (e1.Result == CustomMessageBoxResult.RightButton)
                    Clipboard.SetText(notification);

                waiter.Set();
            };

            messageBox.Show();

            await Task.Factory.StartNew(() => waiter.WaitOne());
        }

        internal override PersistentObject OnConstruct(JObject model)
        {
            return new PhonePersistentObject(model);
        }

        internal override void OnConstruct(PersistentObject po)
        {
            OnConstruct((PhonePersistentObject)po);
        }

        protected virtual void OnConstruct(PhonePersistentObject po) {}

        internal override Query OnConstruct(JObject model, PersistentObject parent, bool asLookup)
        {
            return new PhoneQuery(model, parent, asLookup);
        }

        internal override void OnConstruct(Query query)
        {
            OnConstruct((PhoneQuery)query);
        }

        protected virtual void OnConstruct(PhoneQuery query) {}

        protected internal virtual void OnCreateHomePageApplicationBar(List<ApplicationBarIconButton> buttons, List<ApplicationBarMenuItem> menuItems)
        {
            if (Service.Current.Application["GlobalSearchId"] != null && !string.IsNullOrEmpty(Service.Current.Application["GlobalSearchId"].DisplayValue))
            {
                var searchId = Guid.Parse(Service.Current.Application["GlobalSearchId"].DisplayValue);
                if (searchId != Guid.Empty)
                {
                    var searchButton = new ApplicationBarIconButton();
                    searchButton.IconUri = new Uri("/Assets/ActionIcons/Filter.png", UriKind.RelativeOrAbsolute);
                    searchButton.Text = Service.Current.Messages["Search"];
                    searchButton.Click += delegate { Client.CurrentClient.CurrentPage.IsSearchOpen = true; };
                    searchButton.IsEnabled = true;
                    buttons.Add(searchButton);
                }
            }

            var signInOutMenuItem = new ApplicationBarMenuItem();
            signInOutMenuItem.Text = Service.Current.IsUsingDefaultCredentials ? Service.Current.Messages["SignIn"] : Service.Current.Messages["SignOut"];
            signInOutMenuItem.Click += async delegate { await Service.Current.SignOut(); };

            menuItems.Add(signInOutMenuItem);
        }

        internal override void OnOpen(Query query)
        {
            OnOpen(query as PhoneQuery);
        }

        protected virtual void OnOpen(PhoneQuery query)
        {
            Client.RootFrame.Navigate(new Uri("/Vidyano.Phone;component/View/Pages/QueryPage.xaml?id=" + Client.CurrentClient.AddCachedObject(query), UriKind.Relative));
        }

        internal override void OnOpen(PersistentObject po)
        {
            OnOpen(po as PhonePersistentObject);
        }

        protected virtual void OnOpen(PhonePersistentObject po)
        {
            Client.RootFrame.Navigate(new Uri("/Vidyano.Phone;component/View/Pages/PersistentObjectPage.xaml?id=" + Client.CurrentClient.AddCachedObject(po), UriKind.Relative));
        }

        internal override object ByteArrayToImageSource(MemoryStream memoryStream)
        {
            var bmi = new BitmapImage();
            bmi.SetSource(memoryStream);

            return bmi;
        }

#pragma warning disable 1998
        internal override async Task SignOut()
        {
            SignInPage.RememberCredentials(null, null);
            Client.RootFrame.SetNavigationState(string.Empty);
        }
#pragma warning restore 1998

        protected internal override async void OnStream(string name, Stream stream)
        {
            var folder = ApplicationData.Current.LocalFolder;
            var file = await folder.CreateFileAsync(name, CreationCollisionOption.ReplaceExisting);
            using (var s = await file.OpenStreamForWriteAsync())
                stream.CopyTo(s);

            await Launcher.LaunchFileAsync(file);
        }

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
                            var data = e.Result["excelFile"].ValueDirect;
                            var parts = data.Split('|');
                            var bytes = Convert.FromBase64String(parts[1]);
                            var fileName = parts[0];

                            var folder = ApplicationData.Current.LocalFolder;
                            var file = await folder.CreateFileAsync(fileName, CreationCollisionOption.ReplaceExisting);
                            using (var s = await file.OpenStreamForWriteAsync())
                                await s.WriteAsync(bytes, 0, bytes.Length);

                            await Launcher.LaunchFileAsync(file);
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
                    await Service.Current.Hooks.ShowNotification(error.Message, NotificationType.Error);

                e.IsHandled = true;
            }
        }

        protected internal virtual void AttributeContextMenu(AttributeContextMenuArgs args)
        {
            var attr = args.Attribute;
            var attrWithRef = args.Attribute as PersistentObjectAttributeWithReference;

            #region Email

            // Send Email
            if (!attr.Parent.IsInEdit && !string.IsNullOrEmpty(attr.DisplayValue) &&
                DataTypes.Text.Contains(attr.Type) && (attr.Rules.Contains("IsEmail") || attr.Rules.Contains("IsValidEmail")))
            {
                args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["SendEmail"], async _ =>
                {
                    var mail = new Uri("mailto:" + attr.DisplayValue);
                    await Launcher.LaunchUriAsync(mail);
                }));
            }

            #endregion

            #region Copy

            // Copy
            if (!attr.Parent.IsInEdit && !string.IsNullOrEmpty(attr.DisplayValue) &&
                (DataTypes.Text.Contains(attr.Type) || DataTypes.Numeric.Contains(attr.Type) || DataTypes.Dates.Contains(attr.Type)))
                args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["Copy"], _ => Clipboard.SetText(attr.DisplayValue)));

            #endregion

            #region DateTimeOffset

            if (attr.Parent.IsInEdit && !attr.IsReadOnly &&
                (attr.ClrType == typeof(DateTime) || attr.ClrType == typeof(DateTime?) ||
                 attr.ClrType == typeof(DateTimeOffset) || attr.ClrType == typeof(DateTimeOffset?) ||
                 attr.ClrType == typeof(TimeSpan) || attr.ClrType == typeof(TimeSpan?)))
            {
                DateTime? date = null;
                DateTimeOffset? offset = null;
                var isOffset = false;
                var isTime = false;
                var nullable = false;

                if (attr.ClrType == typeof(DateTime))
                    date = (DateTime)attr.Value;
                else if (attr.ClrType == typeof(DateTime?))
                {
                    date = (DateTime?)attr.Value;
                    nullable = true;
                }
                else if (attr.ClrType == typeof(TimeSpan))
                {
                    isTime = true;
                    date = new DateTime(((TimeSpan)attr.Value).Ticks);
                }
                else if (attr.ClrType == typeof(TimeSpan?))
                {
                    isTime = true;
                    nullable = true;
                    var ts = (TimeSpan?)attr.Value;
                    if (ts.HasValue)
                        date = new DateTime(ts.Value.Ticks);
                }
                else if (attr.ClrType == typeof(DateTimeOffset))
                {
                    isOffset = true;
                    offset = (DateTimeOffset)attr.Value;
                    date = offset.Value.DateTime;
                }
                else if (attr.ClrType == typeof(DateTimeOffset?))
                {
                    isOffset = true;
                    offset = (DateTimeOffset?)attr.Value;
                    date = offset.HasValue ? new DateTime?(offset.Value.DateTime) : null;
                    nullable = true;
                }

                if (attr.Type.Contains("Date"))
                {
                    args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["SetDate"], async _ =>
                    {
                        var newDate = await date.OpenDatePicker();
                        if (newDate.HasValue && newDate.Value != date.GetValueOrDefault())
                        {
                            if (!isOffset)
                                attr.Value = newDate;
                            else
                                attr.Value = offset.HasValue ? new DateTimeOffset(newDate.Value, offset.Value.Offset) : new DateTimeOffset(newDate.Value);
                        }
                    }));
                }

                if (attr.Type.Contains("Time"))
                {
                    args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["SetTime"], async _ =>
                    {
                        var newTime = await date.OpenTimePicker();
                        if (newTime.HasValue && newTime.Value != date.GetValueOrDefault())
                        {
                            if (!isOffset && !isTime)
                                attr.Value = newTime;
                            else if (isTime)
                                attr.Value = new TimeSpan(newTime.Value.TimeOfDay.Hours, newTime.Value.TimeOfDay.Minutes, newTime.Value.TimeOfDay.Seconds);
                            else if (isOffset)
                                attr.Value = offset.HasValue ? new DateTimeOffset(newTime.Value, offset.Value.Offset) : new DateTimeOffset(newTime.Value);
                        }
                    }));
                }

                if (isOffset)
                {
                    args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["SetTimeZone"], async _ =>
                    {
                        string err = null;
                        try
                        {
                            var timeZoneQuery = Client.CurrentClient.GetCachedObject<Query>("94b37097-6496-4d32-ae0b-99770defa828");
                            if (timeZoneQuery == null)
                            {
                                timeZoneQuery = await Service.Current.GetQueryAsync("94b37097-6496-4d32-ae0b-99770defa828");
                                if (timeZoneQuery != null)
                                    Client.CurrentClient.AddCachedObject(timeZoneQuery, "94b37097-6496-4d32-ae0b-99770defa828");
                            }

                            Client.RootFrame.Navigate(new Uri("/Vidyano.Phone;component/View/Pages/QueryItemSelectPage.xaml?parent=" + attr.Parent.PagePath + "&attribute=" + attr.Name, UriKind.Relative));
                        }
                        catch (Exception e)
                        {
                            err = e.Message;
                        }

                        if (!string.IsNullOrEmpty(err))
                            await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
                    }));
                }

                if (attr.Value != null && !attr.IsRequired && nullable)
                    args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["Clear"], _ => attr.Value = null));

                args.AutoExecuteFirst = args.Commands.Count == 1;
            }

            #endregion

            #region Images

            // Open Image
            if (attr.ValueDirect != null && !attr.IsReadOnly && attr.Type == DataTypes.Image)
            {
                string ext = null;
                if (attr.ValueDirect.StartsWith("iVBOR"))
                    ext = ".png";
                else if (attr.ValueDirect.StartsWith("/9j/"))
                    ext = ".jpg";
                else if (attr.ValueDirect.StartsWith("R0lGOD"))
                    ext = ".gif";

                if (ext != null)
                {
                    args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["OpenImage"], async _ =>
                    {
                        var folder = ApplicationData.Current.LocalFolder;
                        var file = await folder.CreateFileAsync(attr.Name + ext, CreationCollisionOption.ReplaceExisting);
                        using (var s = await file.OpenStreamForWriteAsync())
                        {
                            var bytes = Convert.FromBase64String(attr.ValueDirect);
                            await s.WriteAsync(bytes, 0, bytes.Length);
                        }

                        await Launcher.LaunchFileAsync(file);
                    }));

                    args.AutoExecuteFirst = args.Commands.Count == 1;
                }
            }

            // Change Image
            if (attr.Parent.IsInEdit && !attr.IsReadOnly &&
                attr.Type == DataTypes.Image)
            {
                args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["ChangeImage"], _ =>
                {
                    var chooser = new PhotoChooserTask();
                    chooser.ShowCamera = true;

                    int maxCaptureWidth = 720, maxCaptureHeight = 720;
                    var captSize = attr.TypeHints["MaxCaptureResolution"];
                    if (captSize != null)
                    {
                        if (captSize != "Auto")
                        {
                            var parts = captSize.Split(new[] { 'x', 'X' }, StringSplitOptions.RemoveEmptyEntries);
                            if (parts.Length == 2)
                            {
                                if (!int.TryParse(parts[0], out maxCaptureWidth) || !int.TryParse(parts[1], out maxCaptureHeight))
                                    maxCaptureWidth = maxCaptureHeight = 720;
                            }
                        }
                        else
                            maxCaptureWidth = maxCaptureHeight = 0;
                    }

                    if (maxCaptureWidth > 0 && maxCaptureHeight > 0)
                    {
                        chooser.PixelWidth = maxCaptureWidth;
                        chooser.PixelHeight = maxCaptureHeight;
                    }

                    chooser.Completed += (sender, e) =>
                    {
                        if (e.ChosenPhoto == null)
                            return;

                        var memoryStream = new MemoryStream();
                        e.ChosenPhoto.CopyTo(memoryStream);
                        attr.Value = Convert.ToBase64String(memoryStream.ToArray());
                    };

                    chooser.Show();
                }));

                args.AutoExecuteFirst = args.Commands.Count == 1;
            }

            // Remove Image
            if (attr.Parent.IsInEdit && !attr.IsReadOnly && !attr.IsRequired &&
                attr.Type == DataTypes.Image && attr.Value != null)
                args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["RemoveImage"], _ => attr.Value = null));

            #endregion

            #region BinaryFile

            // Open File
            if (attr.Type == DataTypes.BinaryFile && attr.Value != null)
            {
                args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["Open"], async _ =>
                {
                    var str = (args.Attribute.Value as String) ?? string.Empty;
                    var parts = str.Split(new[] { '|' }, StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length == 2 && !string.IsNullOrEmpty(parts[0]) && !string.IsNullOrEmpty(parts[1]))
                    {
                        var folder = ApplicationData.Current.LocalFolder;
                        var file = await folder.CreateFileAsync(parts[0], CreationCollisionOption.ReplaceExisting);
                        using (var s = await file.OpenStreamForWriteAsync())
                        {
                            var bytes = Convert.FromBase64String(parts[1]);
                            await s.WriteAsync(bytes, 0, bytes.Length);
                        }

                        await Launcher.LaunchFileAsync(file);
                    }
                }));

                args.AutoExecuteFirst = true;
            }

            #endregion

            #region Reference

            // Open Reference
            if (attr.Type == DataTypes.Reference && !string.IsNullOrEmpty(attr.DisplayValue) && attrWithRef.Lookup.CanRead && (!attr.Parent.IsInEdit || !attrWithRef.SelectInPlace))
            {
                args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["OpenReference"], async _ =>
                {
                    try
                    {
                        await new Navigate().Execute(Service.Current.GetPersistentObjectAsync(attrWithRef.Lookup.PersistentObject.Id, attrWithRef.ObjectId));
                    }
                    catch (Exception ex)
                    {
                        attrWithRef.Parent.SetNotification(ex.Message);
                    }
                }));

                args.AutoExecuteFirst = args.Commands.Count == 1;
            }

            // Change Reference
            if (attr.Parent.IsInEdit && !attr.IsReadOnly &&
                attr.Type == DataTypes.Reference && attrWithRef != null)
            {
                args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages[attr.Value != null ? "ChangeReference" : "SetReference"], _ =>
                {
                    attrWithRef.Lookup.SelectedItems.Clear();

                    Client.RootFrame.Navigate(new Uri("/Vidyano.Phone;component/View/Pages/QueryItemSelectPage.xaml?parent=" + attrWithRef.Parent.PagePath + "&attribute=" + attrWithRef.Name + "&navigationState=" + Convert.ToBase64String(Encoding.UTF8.GetBytes(Client.RootFrame.GetNavigationState())), UriKind.Relative));
                }));

                args.AutoExecuteFirst = args.Commands.Count == 1;
            }

            // New Reference
            if (attr.Parent.IsInEdit && !attr.IsReadOnly &&
                attr.Type == DataTypes.Reference && attrWithRef != null && attrWithRef.CanAddNewReference)
            {
                args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["NewReference"], async _ =>
                {
                    var parameters = new Dictionary<string, string> { { "PersistentObjectAttributeId", attrWithRef.Id } };
                    var po = await Service.Current.ExecuteActionAsync("Query.New", attrWithRef.Parent, attrWithRef.Lookup, null, parameters);

                    if (po != null)
                    {
                        po.OwnerAttributeWithReference = attrWithRef;
                        ((ICommand)new Navigate()).Execute(po);
                    }
                }));

                args.AutoExecuteFirst = args.Commands.Count == 1;
            }

            // Remove Reference
            if (attr.Parent.IsInEdit && !string.IsNullOrEmpty(attr.DisplayValue) && !attr.IsReadOnly &&
                attr.Type == DataTypes.Reference && attrWithRef != null && attrWithRef.CanRemoveReference)
            {
                args.Commands.Add(new AttributeContextMenuCommand(Service.Current.Messages["RemoveReference"], async _ => { await attrWithRef.ChangeReference(null); }));

                args.AutoExecuteFirst = args.Commands.Count == 1;
            }

            #endregion
        }
    }
}