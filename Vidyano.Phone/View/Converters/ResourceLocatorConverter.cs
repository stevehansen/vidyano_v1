using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace Vidyano.View.Converters
{
    public sealed class ResourceLocatorConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return Application.Current.Resources[value];
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }
}