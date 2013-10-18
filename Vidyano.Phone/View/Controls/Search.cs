using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using Microsoft.Phone.Controls;
using Vidyano.ViewModel.Pages;

namespace Vidyano.View.Controls
{
    public class Search : Control
    {
        public static readonly DependencyProperty IsOpenProperty = DependencyProperty.Register("IsOpen", typeof(bool), typeof(Search), new PropertyMetadata(false, IsOpen_Changed));
        private TextBox searchBox;

        public Search()
        {
            SetBinding(IsOpenProperty, new Binding("IsSearchOpen") { Mode = BindingMode.TwoWay });
        }

        public bool IsOpen
        {
            get { return (bool)GetValue(IsOpenProperty); }
            set { SetValue(IsOpenProperty, value); }
        }

        private static void IsOpen_Changed(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var search = d as Search;
            if (search == null)
                return;

            var page = Client.RootFrame.Content as PhoneApplicationPage;
            if (page == null)
                return;

            if (search.IsOpen)
            {
                page.ApplicationBar.IsVisible = false;

                search.searchBox = search.GetTemplateChild("searchBox") as TextBox;
                if (search.searchBox != null)
                {
                    search.searchBox.Focus();
                    search.searchBox.LostFocus += SearchBox_LostFocus;
                    search.searchBox.KeyDown += SearchBox_KeyDown;
                }
            }
            else
            {
                if (search.searchBox != null)
                {
                    search.searchBox.LostFocus -= SearchBox_LostFocus;
                    search.searchBox.KeyDown -= SearchBox_KeyDown;
                }

                Client.RootFrame.Focus();
                page.ApplicationBar.IsVisible = true;
            }

            VisualStateManager.GoToState(search, search.IsOpen ? "Open" : "Closed", true);
        }

        private static void SearchBox_LostFocus(object sender, RoutedEventArgs e)
        {
            var fe = sender as FrameworkElement;
            if (fe != null)
            {
                var page = fe.DataContext as VidyanoPage;
                if (page != null)
                    page.IsSearchOpen = false;
            }
        }

        private static void SearchBox_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                var searchBox = sender as TextBox;
                if (searchBox != null)
                {
                    var page = searchBox.DataContext as VidyanoPage;
                    if (page != null)
                        page.Search.Execute(searchBox.Text);
                }
            }
        }
    }
}