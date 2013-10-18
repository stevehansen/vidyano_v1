using System.Windows;
using Vidyano.ViewModel;

namespace Vidyano.View.TemplateSelectors
{
    public sealed class PersistentObjectPageTabTemplateSelector : IDataTemplateSelector
    {
        public DataTemplate SelectTemplate(object obj, DependencyObject container)
        {
            var tab = (PersistentObjectTab)obj;

            DataTemplate template = null;
            if (tab != null)
            {
                template = (DataTemplate)Application.Current.Resources[string.Format("PersistentObjectTemplate.{0}.Tab[{1}]", tab.Parent.Type, tab.Index)];
                if (template == null)
                {
                    if (obj is PersistentObjectTabAttributes)
                        template = (DataTemplate)Application.Current.Resources["PersistentObjectTemplate.AttributeTab"];
                    else if (obj is PersistentObjectTabQuery)
                        template = (DataTemplate)Application.Current.Resources["PersistentObjectTemplate.QueryTab"];
                }
            }

            return template ?? new DataTemplate();
        }
    }
}