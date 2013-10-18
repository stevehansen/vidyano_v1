using System;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Data;

namespace Vidyano.View.Converters
{
    public class ResourceLocatorConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            object result;
            Application.Current.Resources.TryGetValue(value, out result);

            return result;
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            throw new NotSupportedException();
        }
    }
}