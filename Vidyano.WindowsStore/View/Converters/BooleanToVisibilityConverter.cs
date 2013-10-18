using System;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Data;

namespace Vidyano.View.Converters
{
    /// <summary>
    ///     Value converter that translates true to <see cref="Visibility.Visible" /> and false to
    ///     <see cref="Visibility.Collapsed" />.
    /// </summary>
    public sealed class BooleanToVisibilityConverter : IValueConverter
    {
        public bool IsNegated { get; set; }

        public object Convert(object value, Type targetType, object parameter, string language)
        {
            return (value is bool && (bool)value) ^ IsNegated ? Visibility.Visible : Visibility.Collapsed;
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            throw new NotSupportedException();
        }
    }
}