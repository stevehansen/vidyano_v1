using System.Windows;

namespace Vidyano.View.TemplateSelectors
{
    public interface IDataTemplateSelector
    {
        DataTemplate SelectTemplate(object obj, DependencyObject container);
    }
}