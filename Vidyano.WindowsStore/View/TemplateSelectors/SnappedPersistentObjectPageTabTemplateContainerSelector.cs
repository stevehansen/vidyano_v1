using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Vidyano.ViewModel;

namespace Vidyano.View.TemplateSelectors
{
    public class SnappedPersistentObjectPageTabTemplateContainerSelector : DataTemplateSelector
    {
        protected override DataTemplate SelectTemplateCore(object obj, DependencyObject container)
        {
            DataTemplate template = null;
            var tab = (PersistentObjectTab)obj;

            if (tab != null)
            {
                if (obj is PersistentObjectTabAttributes)
                    template = (DataTemplate)Application.Current.Resources["SnappedPersistentObjectPageAttributeTabTemplateContainer"];
                else if (obj is PersistentObjectTabQuery)
                    template = (DataTemplate)Application.Current.Resources["SnappedPersistentObjectPageQueryTabTemplateContainer"];
            }

            return template ?? new DataTemplate();
        }
    }
}