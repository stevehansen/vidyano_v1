using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.TemplateSelectors
{
    public class ActionIconTemplateSelector : DataTemplateSelector
    {
        protected override DataTemplate SelectTemplateCore(object obj, DependencyObject container)
        {
            var iconName = obj as string;
            if (string.IsNullOrEmpty(iconName))
                return new DataTemplate();

            object template;
            Application.Current.Resources.TryGetValue(iconName, out template);

            return template as DataTemplate ?? new DataTemplate();
        }
    }
}