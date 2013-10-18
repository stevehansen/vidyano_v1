using System;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View
{
    public class PasswordBoxEx
    {
        public static readonly DependencyProperty HintProperty = DependencyProperty.RegisterAttached("Hint", typeof(string), typeof(PasswordBoxEx), new PropertyMetadata(null, Hint_Changed));

        public static string GetHint(DependencyObject obj)
        {
            return (string)obj.GetValue(HintProperty);
        }

        public static void SetHint(DependencyObject obj, string value)
        {
            obj.SetValue(HintProperty, value);
        }

        private static void Hint_Changed(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var box = d as PasswordBox;
            if (box == null)
                return;

            box.ApplyTemplate();
            box.Style = (Style)Application.Current.Resources["PasswordBoxWithHint"];
            box.Loaded += Box_Loaded;

            var hint = box.FindDescendantByName("Hint") as TextBlock;
            if (hint != null)
                hint.Visibility = String.IsNullOrEmpty(box.Password) ? Visibility.Visible : Visibility.Collapsed;
        }

        private static void Box_Loaded(object sender, RoutedEventArgs e)
        {
            var box = sender as PasswordBox;
            if (box == null)
                return;

            box.ApplyTemplate();
            var hint = box.FindDescendantByName("Hint") as TextBlock;
            if (hint != null)
            {
                box.PasswordChanged += Box_PasswordChanged;
                hint.Text = GetHint(box);
                hint.Visibility = String.IsNullOrEmpty(box.Password) ? Visibility.Visible : Visibility.Collapsed;
            }
        }

        private static void Box_PasswordChanged(object sender, RoutedEventArgs e)
        {
            var box = sender as PasswordBox;
            if (box == null)
                return;

            box.ApplyTemplate();
            var hint = box.FindDescendantByName("Hint") as TextBlock;
            if (hint == null)
                return;

            hint.Visibility = String.IsNullOrEmpty(box.Password) ? Visibility.Visible : Visibility.Collapsed;
        }
    }
}