using System;
using System.Globalization;
using System.Windows.Data;

namespace Vidyano.View.Converters
{
    public sealed class CharacterCasingConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            var str = value as string;
            if (!string.IsNullOrEmpty(str))
            {
                if ((string)parameter == "Upper")
                    return str.ToUpperInvariant();
                if ((string)parameter == "Lower")
                    return str.ToLowerInvariant();
            }

            return str;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }
}