using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeEditableComboBox : PersistentObjectAttributeControlBase
    {
        private TextBox text;
        private ListBox list;
        private Popup popup;

        public PersistentObjectAttributeEditableComboBox()
        {
            this.DefaultStyleKey = typeof(PersistentObjectAttributeEditableComboBox);
        }

        protected override void OnApplyTemplate()
        {
            base.OnApplyTemplate();

            popup = GetTemplateChild("Popup") as Popup;
            text = GetTemplateChild("Value") as TextBox;
            list = GetTemplateChild("Options") as ListBox;

            VisualStateManager.GoToState(this, "Normal", false);
        }

        protected override void OnTapped(Windows.UI.Xaml.Input.TappedRoutedEventArgs e)
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
            if (!attr.IsRequired)
            {
                attr.Value = null;
                VisualStateManager.GoToState(this, "ButtonCollapsed", false);

                e.Handled = true;
                Focus(Windows.UI.Xaml.FocusState.Programmatic);
            }
        }

        private void Popup_Closed(object sender, object e)
        {
            popup.Closed -= Popup_Closed;

            text.TextChanged -= TextChanged;
            text.KeyDown -= TextKeyDown;

            list.SelectionChanged -= SelectionChanged;

            Focus(Windows.UI.Xaml.FocusState.Programmatic);
        }

        void Popup_Opened(object sender, object e)
        {
            text.Focus(Windows.UI.Xaml.FocusState.Programmatic);
        }

        private void TextKeyDown(object sender, Windows.UI.Xaml.Input.KeyRoutedEventArgs e)
        {
            if (popup != null && (e.Key == Windows.System.VirtualKey.Tab || e.Key == Windows.System.VirtualKey.Enter))
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