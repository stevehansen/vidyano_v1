using System.Windows;
using Vidyano.ViewModel;

namespace Vidyano.View.TemplateSelectors
{
    public sealed class ProgramUnitItemTemplateSelector : IDataTemplateSelector
    {
        public DataTemplate SelectTemplate(object obj, DependencyObject container)
        {
            var item = obj as ProgramUnitItem;
            if (item == null)
                return null;

            return (DataTemplate)Application.Current.Resources["ProgramUnitItemTemplate." + item.Name] ?? new DataTemplate();
        }
    }
}