using System.Windows;
using Vidyano.ViewModel;

namespace Vidyano.View.TemplateSelectors
{
    public sealed class ProgramUnitItemContainerTemplateSelector : IDataTemplateSelector
    {
        public DataTemplate SelectTemplate(object obj, DependencyObject container)
        {
            var item = obj as ProgramUnitItem;
            return item != null ? (DataTemplate)Application.Current.Resources[item.Template] : null;
        }
    }
}