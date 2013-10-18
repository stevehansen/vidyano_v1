using System;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Navigation;
using Microsoft.Phone.Controls;
using Vidyano.View.Controls;

namespace Vidyano.View
{
    public static class DateTimePickerEx
    {
        public static async Task<DateTime?> OpenDatePicker(this DateTime? source)
        {
            MakeSureLabelsAreInResources();

            var result = source;

            var page = Client.RootFrame.Content as PhoneApplicationPage;
            var waiter = new ManualResetEvent(true);
            if (page != null)
            {
                var pageRootPanel = page.Content as Panel;
                if (pageRootPanel != null)
                {
                    var datePicker = new PersistentObjectAttributeDatePicker();
                    datePicker.Value = source;
                    datePicker.RenderTransform = new TranslateTransform { X = -10000, Y = -10000 };
                    datePicker.Loaded += DatePicker_Loaded;
                    pageRootPanel.Children.Add(datePicker);

                    waiter.Reset();
                    datePicker.ValueChanged += (sender, e) =>
                    {
                        result = e.NewDateTime;
                        waiter.Set();

                        pageRootPanel.Children.Remove(datePicker);
                    };

                    var currentPageSource = Client.RootFrame.CurrentSource;

                    NavigatedEventHandler handler = null;
                    handler = delegate
                    {
                        if (currentPageSource == Client.RootFrame.CurrentSource)
                        {
                            waiter.Set();
                            Client.RootFrame.Navigated -= handler;

                            pageRootPanel.Children.Remove(datePicker);
                        }
                    };

                    Client.RootFrame.Navigated += handler;
                }
            }

            await Task.Factory.StartNew(() => waiter.WaitOne());

            return result;
        }

        private static void DatePicker_Loaded(object sender, RoutedEventArgs e)
        {
            var picker = sender as PersistentObjectAttributeDatePicker;
            if (picker != null)
            {
                picker.Open();
                picker.Loaded -= DatePicker_Loaded;
            }
        }

        public static async Task<DateTime?> OpenTimePicker(this DateTime? source)
        {
            MakeSureLabelsAreInResources();

            var result = source;

            var page = Client.RootFrame.Content as PhoneApplicationPage;
            var waiter = new ManualResetEvent(true);
            if (page != null)
            {
                var pageRootPanel = page.Content as Panel;
                if (pageRootPanel != null)
                {
                    var timePicker = new PersistentObjectAttributeTimePicker();
                    timePicker.Value = source;
                    timePicker.RenderTransform = new TranslateTransform { X = -10000, Y = -10000 };
                    timePicker.Loaded += TimePicker_Loaded;
                    pageRootPanel.Children.Add(timePicker);

                    waiter.Reset();
                    timePicker.ValueChanged += (sender, e) =>
                    {
                        result = e.NewDateTime;
                        waiter.Set();

                        pageRootPanel.Children.Remove(timePicker);
                    };

                    var currentPageSource = Client.RootFrame.CurrentSource;

                    NavigatedEventHandler handler = null;
                    handler = delegate
                    {
                        if (currentPageSource == Client.RootFrame.CurrentSource)
                        {
                            waiter.Set();
                            Client.RootFrame.Navigated -= handler;

                            pageRootPanel.Children.Remove(timePicker);
                        }
                    };

                    Client.RootFrame.Navigated += handler;
                }
            }

            await Task.Factory.StartNew(() => waiter.WaitOne());

            return result;
        }

        private static void TimePicker_Loaded(object sender, RoutedEventArgs e)
        {
            var picker = sender as PersistentObjectAttributeTimePicker;
            if (picker != null)
            {
                picker.Open();
                picker.Loaded -= TimePicker_Loaded;
            }
        }

        private static void MakeSureLabelsAreInResources()
        {
            if (string.IsNullOrEmpty((string)Application.Current.Resources["DateTimePickerOKText"]))
                Application.Current.Resources.Add("DateTimePickerOKText", Service.Current.Messages["OK"]);

            if (string.IsNullOrEmpty((string)Application.Current.Resources["DateTimePickerCancelText"]))
                Application.Current.Resources.Add("DateTimePickerCancelText", Service.Current.Messages["Cancel"]);

            if (string.IsNullOrEmpty((string)Application.Current.Resources["DateTimePickerChooseDate"]))
                Application.Current.Resources.Add("DateTimePickerChooseDate", Service.Current.Messages["ChooseDate"].ToUpper());

            if (string.IsNullOrEmpty((string)Application.Current.Resources["DateTimePickerChooseTime"]))
                Application.Current.Resources.Add("DateTimePickerChooseTime", Service.Current.Messages["ChooseTime"].ToUpper());
        }
    }
}