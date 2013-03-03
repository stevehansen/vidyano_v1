using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.TemplateSelectors
{
    public class ProgramUnitItemContainerTemplateSelector: DataTemplateSelector
    {
        protected override Windows.UI.Xaml.DataTemplate SelectTemplateCore(object obj, Windows.UI.Xaml.DependencyObject container)
        {
            var item = obj as ProgramUnitItem;
            if (item == null)
                return null;

            var gvItem = container as GridViewItem;
            if (gvItem != null)
            {
                VariableSizedWrapGrid.SetColumnSpan(gvItem, item.ColumnSpan);
                VariableSizedWrapGrid.SetRowSpan(gvItem, item.RowSpan);
            }

            return (DataTemplate)Application.Current.Resources[item.Template];
        }
    }
}