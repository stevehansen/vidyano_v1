using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Vidyano.ViewModel;

namespace Vidyano.View.TemplateSelectors
{
    public class PersistentObjectPageTabTemplateSelector : DataTemplateSelector
    {
        protected override DataTemplate SelectTemplateCore(object obj, DependencyObject container)
        {
            object template = null;
            var tab = (PersistentObjectTab)obj;

            if (tab != null)
            {
                if (!Application.Current.Resources.TryGetValue(string.Format("PersistentObjectTemplate.{0}.Tab[{1}]", tab.Parent.Type, tab.Index), out template))
                {
                    if (obj is PersistentObjectTabAttributes)
                        template = Application.Current.Resources["PersistentObjectTemplate.AttributeTab"];
                    else if (obj is PersistentObjectTabQuery)
                        template = Application.Current.Resources["PersistentObjectTemplate.QueryTab"];
                }
            }

            return (DataTemplate)template ?? new DataTemplate();
        }
    }
}