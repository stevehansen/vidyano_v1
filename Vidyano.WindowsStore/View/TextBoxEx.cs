using System;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View
{
    public class TextBoxEx
    {
        public static readonly DependencyProperty HintProperty = DependencyProperty.RegisterAttached("Hint", typeof(string), typeof(TextBoxEx), new PropertyMetadata(null, Hint_Changed));

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
            var box = d as TextBox;
            if (box == null)
                return;

            box.ApplyTemplate();
            box.Style = (Style)Application.Current.Resources["TextBoxWithHint"];
            box.Loaded += Box_Loaded;

            var hint = box.FindDescendantByName("Hint") as TextBlock;
            if (hint != null)
                hint.Visibility = String.IsNullOrEmpty(box.Text) ? Visibility.Visible : Visibility.Collapsed;
        }

        private static void Box_Loaded(object sender, RoutedEventArgs e)
        {
            var box = sender as TextBox;
            if (box == null)
                return;

            box.ApplyTemplate();
            var hint = box.FindDescendantByName("Hint") as TextBlock;
            if (hint != null)
            {
                box.TextChanged += Box_TextChanged;
                hint.Text = GetHint(box);
                hint.Visibility = String.IsNullOrEmpty(box.Text) ? Visibility.Visible : Visibility.Collapsed;
            }
        }

        private static void Box_TextChanged(object sender, RoutedEventArgs e)
        {
            var box = sender as TextBox;
            if (box == null)
                return;

            box.ApplyTemplate();
            var hint = box.FindDescendantByName("Hint") as TextBlock;
            if (hint == null)
                return;

            hint.Visibility = String.IsNullOrEmpty(box.Text) ? Visibility.Visible : Visibility.Collapsed;
        }
    }
}