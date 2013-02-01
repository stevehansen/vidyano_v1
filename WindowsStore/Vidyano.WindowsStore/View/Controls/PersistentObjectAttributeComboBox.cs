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

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeComboBox : ComboBox
    {
        public PersistentObjectAttributeComboBox()
        {
            this.DefaultStyleKey = typeof(PersistentObjectAttributeComboBox);
            PersistentObjectAttributeControlBase.SetHookDatavalidationStates(this, true);

            SetBinding(ItemsSourceProperty, new Binding { Path = new PropertyPath("Options") });
            SetBinding(SelectedValueProperty, new Binding { Path = new PropertyPath("Value"), Mode = BindingMode.TwoWay });
            DisplayMemberPath = "DisplayValue";
            SelectedValuePath = "Key";
        }

        private Border border;
        private Popup popup;
        protected override void OnApplyTemplate()
        {
            base.OnApplyTemplate();
            border = (Border)GetTemplateChild("BorderElement");

            if (border != null)
            {
            }

            popup = (Popup)GetTemplateChild("Popup");

            if (popup != null)
                popup.Closed += popup_Closed;
        }

        void popup_Closed(object sender, object e)
        {
            var attr =DataContext as PersistentObjectAttribute;
            if(attr != null){
                VisualStateManager.GoToState(this, attr.HasValidationError ? "DataValidationError" : "NoDataValidationError", true);
            }
        }
    }
}