using System;
using System.Globalization;
using System.Windows.Data;

namespace Vidyano.View.Converters
{
    public sealed class TranslatableBooleanConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            var yes = false;
            if (value is bool)
                yes = (bool)value;

            var str = value as string;
            if (str != null)
                yes = string.Equals(str, "On");

            return (string)parameter == "YesNo" ? Service.Current.Messages[yes ? "Yes" : "No"] : Service.Current.Messages[yes ? "True" : "False"];
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }
}