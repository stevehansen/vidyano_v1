using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Vidyano.ViewModel;

namespace Vidyano.View.TemplateSelectors
{
    public class ProgramUnitItemTemplateSelector : DataTemplateSelector
    {
        protected override DataTemplate SelectTemplateCore(object obj, DependencyObject container)
        {
            var item = obj as ProgramUnitItem;
            if (item == null)
                return null;

            object template;
            Application.Current.Resources.TryGetValue("ProgramUnitItemTemplate." + item.Name, out template);

            return (DataTemplate)template ?? new DataTemplate();
        }
    }
}