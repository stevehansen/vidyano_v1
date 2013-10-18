using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Media.Imaging;
using Vidyano.Common;
using Vidyano.View.Converters;

namespace Vidyano.View
{
    public static class MultiBinding
    {
        public static readonly DependencyProperty BindingsProperty = DependencyProperty.RegisterAttached("Bindings", typeof(MultiBindingCollection), typeof(MultiBinding), new PropertyMetadata(new MultiBindingCollection(), BindingsCollection_Changed));
        private static readonly DependencyProperty HostProperty = DependencyProperty.RegisterAttached("Host", typeof(MultiBindingHost), typeof(MultiBinding), new PropertyMetadata(null));

        public static MultiBindingCollection GetBindings(DependencyObject obj)
        {
            return (MultiBindingCollection)obj.GetValue(BindingsProperty);
        }

        public static void SetBindings(DependencyObject obj, MultiBindingCollection value)
        {
            obj.SetValue(BindingsProperty, value);
        }

        private static void BindingsCollection_Changed(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var coll = e.NewValue as MultiBindingCollection;
            if (coll != null)
            {
                var fe = d as FrameworkElement;
                if (fe != null)
                {
                    var host = new MultiBindingHost(fe, coll);
                    fe.SetValue(HostProperty, host);
                }
            }
        }

        private class MultiBindingHost : DependencyObject
        {
            public static readonly DependencyProperty DataContextProperty = DependencyProperty.Register("DataContext", typeof(object), typeof(MultiBindingHost), new PropertyMetadata(null, DataContext_Changed));
            private readonly MultiBindingCollection coll;
            private readonly FrameworkElement target;
            private readonly DependencyProperty targetDp;
            private readonly PropertyInfo targetProperty;
            private readonly List<MultiBindingHostValue> values = new List<MultiBindingHostValue>();
            private bool dataContextUpdating;

            public MultiBindingHost(FrameworkElement target, MultiBindingCollection coll)
            {
                this.target = target;
                target.Loaded += Target_Loaded;

                this.coll = coll;
                targetDp = (DependencyProperty)target.GetType().GetRuntimeProperty(coll.TargetProperty + "Property").GetValue(null);
                targetProperty = target.GetType().GetRuntimeProperty(coll.TargetProperty);
            }

            public object DataContext
            {
                get { return GetValue(DataContextProperty); }
                set { SetValue(DataContextProperty, value); }
            }

            private static void DataContext_Changed(DependencyObject d, DependencyPropertyChangedEventArgs e)
            {
                var host = d as MultiBindingHost;
                if (host != null)
                {
                    host.dataContextUpdating = true;
                    try
                    {
                        host.values.Clear();
                        foreach (var binding in host.coll)
                        {
                            var value = new MultiBindingHostValue(host);
                            binding.Source = e.NewValue;

                            host.values.Add(value);

                            BindingOperations.SetBinding(value, MultiBindingHostValue.ValueProperty, binding);
                        }
                    }
                    finally
                    {
                        host.dataContextUpdating = false;
                    }

                    host.ValueChanged();
                }
            }

            private void Target_Loaded(object sender, RoutedEventArgs e)
            {
                BindingOperations.SetBinding(this, DataContextProperty, new Binding { Path = new PropertyPath("DataContext"), Source = sender });
            }

            internal void ValueChanged()
            {
                if (!dataContextUpdating)
                {
                    if (!string.IsNullOrEmpty(coll.StringFormat))
                    {
                        var value = string.Format(coll.StringFormat, values.Select(v => v.Value).ToArray());
                        if (targetProperty != null && targetProperty.PropertyType == typeof(ImageSource))
                            target.SetValue(targetDp, new BitmapImage(new Uri(value)));
                        else if (targetProperty != null && targetProperty.PropertyType == typeof(Uri))
                            target.SetValue(targetDp, new Uri(value));
                        else
                            target.SetValue(targetDp, value);
                    }
                    else
                        target.SetValue(targetDp, coll.Converter.Convert(values.Select(v => v.Value).ToArray()));
                }
            }

            private class MultiBindingHostValue : DependencyObject
            {
                public static readonly DependencyProperty ValueProperty = DependencyProperty.Register("Value", typeof(object), typeof(MultiBindingHostValue), new PropertyMetadata(null, Value_Changed));
                private readonly MultiBindingHost host;

                public MultiBindingHostValue(MultiBindingHost host)
                {
                    this.host = host;
                }

                public object Value
                {
                    get { return GetValue(ValueProperty); }
                    set { SetValue(ValueProperty, value); }
                }

                private static void Value_Changed(DependencyObject d, DependencyPropertyChangedEventArgs e)
                {
                    var hostValue = d as MultiBindingHostValue;
                    if (hostValue != null)
                        hostValue.host.ValueChanged();
                }
            }
        }
    }

    public sealed class MultiBindingCollection : List<Binding>, INotifyPropertyChanged
    {
        private IMultiValueConverter _Converter;
        private string _StringFormat;
        private string _TargetProperty;

        public string TargetProperty
        {
            get { return _TargetProperty; }
            set { SetProperty(ref _TargetProperty, value); }
        }

        public string StringFormat
        {
            get { return _StringFormat; }
            set { SetProperty(ref _StringFormat, value); }
        }

        public IMultiValueConverter Converter
        {
            get { return _Converter; }
            set { SetProperty(ref _Converter, value); }
        }

        public event PropertyChangedEventHandler PropertyChanged = delegate { };

        private void SetProperty<T>(ref T storage, T value, [CallerMemberName] string propertyName = null)
        {
            if (Equals(storage, value))
                return;

            storage = value;
            NotifyableBase.Dispatch(() => PropertyChanged(this, new PropertyChangedEventArgs(propertyName)));
        }
    }
}