using System.Windows;
using System.Windows.Controls;
using Vidyano.View.TemplateSelectors;

namespace Vidyano.View.Controls
{
    public class DynamicContentControl : ContentControl
    {
        public static readonly DependencyProperty ContentTemplateSelectorProperty = DependencyProperty.Register("ContentTemplateSelector", typeof(IDataTemplateSelector), typeof(ContentControl), new PropertyMetadata(null));

        public IDataTemplateSelector ContentTemplateSelector
        {
            get { return (IDataTemplateSelector)GetValue(ContentTemplateSelectorProperty); }
            set { SetValue(ContentTemplateSelectorProperty, value); }
        }

        protected override void OnContentChanged(object oldContent, object newContent)
        {
            base.OnContentChanged(oldContent, newContent);

            if (ContentTemplateSelector != null)
                ContentTemplate = ContentTemplateSelector.SelectTemplate(newContent, this);
        }
    }
}