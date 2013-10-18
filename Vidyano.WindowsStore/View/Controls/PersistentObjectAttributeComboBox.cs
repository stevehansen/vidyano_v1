using Vidyano.ViewModel;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeComboBox : ComboBox
    {
        private Popup popup;

        public PersistentObjectAttributeComboBox()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributeComboBox);
            PersistentObjectAttributeControlBase.SetHookDatavalidationStates(this, true);

            SetBinding(ItemsSourceProperty, new Binding { Path = new PropertyPath("Options") });
            SetBinding(SelectedValueProperty, new Binding { Path = new PropertyPath("Value"), Mode = BindingMode.TwoWay });
            DisplayMemberPath = "DisplayValue";
            SelectedValuePath = "Key";
        }

        protected override void OnApplyTemplate()
        {
            base.OnApplyTemplate();

            popup = (Popup)GetTemplateChild("Popup");

            if (popup != null)
                popup.Closed += Popup_Closed;
        }

        private void Popup_Closed(object sender, object e)
        {
            var attr = DataContext as PersistentObjectAttribute;
            if (attr != null)
                VisualStateManager.GoToState(this, attr.HasValidationError ? "DataValidationError" : "NoDataValidationError", true);
        }
    }
}