using Windows.System;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Input;
using Vidyano.ViewModel;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeEditableComboBox : PersistentObjectAttributeControlBase
    {
        private ListBox list;
        private Popup popup;
        private TextBox text;

        public PersistentObjectAttributeEditableComboBox()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributeEditableComboBox);
        }

        protected override void OnApplyTemplate()
        {
            base.OnApplyTemplate();

            popup = GetTemplateChild("Popup") as Popup;
            text = GetTemplateChild("Value") as TextBox;
            list = GetTemplateChild("Options") as ListBox;

            VisualStateManager.GoToState(this, "Normal", false);
        }

        protected override void OnTapped(TappedRoutedEventArgs e)
        {
            if (!e.Handled && popup != null)
            {
                var attribute = DataContext as PersistentObjectAttribute;
                if (attribute == null)
                    return;

                text.Text = (string)attribute.Value ?? string.Empty;
                text.TextChanged += TextChanged;
                text.KeyDown += TextKeyDown;

                list.SelectionChanged += SelectionChanged;
                list.SelectionMode = SelectionMode.Single;
                list.IsTapEnabled = true;

                var child = popup.Child as FrameworkElement;
                if (child != null)
                    child.Width = ActualWidth;

                popup.IsOpen = true;
                popup.Closed += Popup_Closed;
                popup.Opened += Popup_Opened;

                e.Handled = true;
            }

            base.OnTapped(e);
        }

        private void DeleteTapped(object sender, TappedRoutedEventArgs e)
        {
            var attr = DataContext as PersistentObjectAttribute;
            if (attr != null && !attr.IsRequired)
            {
                attr.Value = null;
                VisualStateManager.GoToState(this, "ButtonCollapsed", false);

                e.Handled = true;
                Focus(FocusState.Programmatic);
            }
        }

        private void Popup_Closed(object sender, object e)
        {
            popup.Closed -= Popup_Closed;

            text.TextChanged -= TextChanged;
            text.KeyDown -= TextKeyDown;

            list.SelectionChanged -= SelectionChanged;

            Focus(FocusState.Programmatic);
        }

        private void Popup_Opened(object sender, object e)
        {
            text.Focus(FocusState.Programmatic);
        }

        private void TextKeyDown(object sender, KeyRoutedEventArgs e)
        {
            if (popup != null && (e.Key == VirtualKey.Tab || e.Key == VirtualKey.Enter))
                popup.IsOpen = false;
        }

        private void TextChanged(object sender, TextChangedEventArgs e)
        {
            var attribute = DataContext as PersistentObjectAttribute;
            if (attribute != null)
                attribute.Value = text.Text;
        }

        private void SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (list != null && list.SelectedItem != null)
            {
                var attribute = DataContext as PersistentObjectAttribute;
                if (attribute != null)
                {
                    var option = list.SelectedItem as PersistentObjectAttribute.Option;
                    if (option != null)
                    {
                        attribute.Value = text.Text = option.DisplayValue;
                        popup.IsOpen = false;
                    }
                }
            }
        }
    }
}