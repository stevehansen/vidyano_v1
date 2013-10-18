using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace Vidyano.View.Converters
{
    /// <summary>
    ///     Value converter that translates true to <see cref="Visibility.Visible" /> and false to <see cref="Visibility.Collapsed" />.
    /// </summary>
    public sealed class BooleanToVisibilityConverter : IValueConverter
    {
        public bool IsNegated { get; set; }

        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return (value is bool && (bool)value) ^ IsNegated ? Visibility.Visible : Visibility.Collapsed;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }
}