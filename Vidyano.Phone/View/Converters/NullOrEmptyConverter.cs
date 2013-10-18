using System;
using System.Globalization;
using System.Windows.Data;

namespace Vidyano.View.Converters
{
    public sealed class NullOrEmptyConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return string.IsNullOrEmpty(System.Convert.ToString(value)) ? parameter : value;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }
}