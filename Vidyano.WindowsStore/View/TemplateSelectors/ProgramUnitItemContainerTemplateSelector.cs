using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Vidyano.ViewModel;

namespace Vidyano.View.TemplateSelectors
{
    public class ProgramUnitItemContainerTemplateSelector : DataTemplateSelector
    {
        protected override DataTemplate SelectTemplateCore(object obj, DependencyObject container)
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